import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";
import { expoIdsSql, expoNamesSql, parseExpoIds, setBuyerExpoNames } from "@/lib/server/buyer-expos-repo";
import { formatBuyerNumber } from "@/lib/buyer-number";
import { assignMissingBuyerNumbers } from "@/lib/server/buyer-numbers";
import { overallStatus } from "@/lib/buyer-form";
import { shrinkDocumentDataUrl } from "@/lib/server/document-image";
import {
  FormError,
  findFormItem,
  getCustomDocument,
  getCustomDocumentData,
  getCustomDocumentStates,
  getCustomValues,
  formTablesReady,
  getFormItems,
  setCustomDocument,
  setCustomDocumentReview,
} from "@/lib/server/buyer-form-repo";

// The order documents are shown and exported in: passport, visa, business licence and card,
// buyer photo, Canton Fair card, invoice / order list, latest entry stamp photo.
export const DOCUMENT_FIELDS = [
  "passportFront",
  "visaPage",
  "businessLicense",
  "businessCard",
  "buyerPhoto",
  "cantonFairCard",
  "invoiceOrderList",
  "latestEntryStamp",
] as const;

export type DocumentField = (typeof DOCUMENT_FIELDS)[number];

export function isBuiltinDocument(key: string): key is DocumentField {
  return (DOCUMENT_FIELDS as readonly string[]).includes(key);
}

// A document an admin added must exist in the form settings (shown or hidden).
async function requireCustomDocument(key: string): Promise<void> {
  const item = await findFormItem(key);
  if (!item || item.kind !== "document") throw new FormError("not_found", 404);
}

/** Is this a document we know (built-in or added by an admin), and is it shown to buyers? */
export async function documentAccess(key: string): Promise<{ exists: boolean; active: boolean }> {
  const item = await findFormItem(key);
  if (!item || item.kind !== "document") return { exists: false, active: false };
  return { exists: true, active: item.active };
}

const DOCUMENT_COLUMNS: Record<DocumentField, string> = {
  businessLicense: "doc_business_license",
  businessCard: "doc_business_card",
  passportFront: "doc_passport_front",
  visaPage: "doc_visa_page",
  cantonFairCard: "doc_canton_fair_card",
  buyerPhoto: "doc_buyer_photo",
  invoiceOrderList: "doc_invoice_order_list",
  latestEntryStamp: "doc_latest_entry_stamp",
};

export type DocumentReviewStatus = "pending" | "verified" | "rejected";

const DOCUMENT_STATUS_COLUMNS: Record<DocumentField, string> = {
  businessLicense: "doc_business_license_status",
  businessCard: "doc_business_card_status",
  passportFront: "doc_passport_front_status",
  visaPage: "doc_visa_page_status",
  cantonFairCard: "doc_canton_fair_card_status",
  buyerPhoto: "doc_buyer_photo_status",
  invoiceOrderList: "doc_invoice_order_list_status",
  latestEntryStamp: "doc_latest_entry_stamp_status",
};

const DOCUMENT_NOTE_COLUMNS: Record<DocumentField, string> = {
  businessLicense: "doc_business_license_note",
  businessCard: "doc_business_card_note",
  passportFront: "doc_passport_front_note",
  visaPage: "doc_visa_page_note",
  cantonFairCard: "doc_canton_fair_card_note",
  buyerPhoto: "doc_buyer_photo_note",
  invoiceOrderList: "doc_invoice_order_list_note",
  latestEntryStamp: "doc_latest_entry_stamp_note",
};

// The eighth document (migration 058). The site can go live a few minutes before the deploy job
// has applied a migration, so until the new columns exist the app carries on with the first
// seven documents instead of failing on columns that are not there yet. Checked once the columns
// are found; while they are missing, looked at again at most every 30 seconds.
const STAMP_COLUMNS = ["doc_latest_entry_stamp", "doc_latest_entry_stamp_status", "doc_latest_entry_stamp_note", "has_doc_latest_entry_stamp"];
let stampColumnsFound = false;
let stampCheckedAt = 0;

async function stampColumnsReady(): Promise<boolean> {
  if (stampColumnsFound) return true;
  if (Date.now() - stampCheckedAt < 30_000) return false;
  stampCheckedAt = Date.now();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS n FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'buyer_profiles' AND column_name IN (${STAMP_COLUMNS.map(() => "?").join(",")})`,
    STAMP_COLUMNS
  );
  stampColumnsFound = Number(rows[0]?.n) === STAMP_COLUMNS.length;
  return stampColumnsFound;
}

// The documents the database can serve right now.
async function activeDocumentFields(): Promise<readonly DocumentField[]> {
  return (await stampColumnsReady()) ? DOCUMENT_FIELDS : DOCUMENT_FIELDS.filter((f) => f !== "latestEntryStamp");
}

export interface BuyerProfileFields {
  companyName: string;
  nationality: string;
  passportNumber: string;
  annualTurnover: string;
  purchaseIntention: string;
  otherPurchaseIntention: string;
  contactPerson: string;
  // Raw value from an unlabeled column in the original Canton Fair
  // spreadsheet (a bare letter for most rows) -- meaning not confirmed,
  // kept as free text rather than assumed. Admin-only, not shown to the
  // buyer themselves since they wouldn't know what it means either.
  registrationCode: string;
  // Which expo(s) this buyer's data came from, as "A, B". Read-only: built
  // from the admin-managed expo list (Admin -> Buyer Expos) so a renamed expo
  // shows its new name everywhere. Change a buyer's expos with expoIds (admin
  // edit) -- or pass names to upsertBuyerProfileFields, which sets them.
  sourceExhibitions: string;
  departureCity: string;
  attendanceDay: string;
  meetingOrVisiting: string;
  passportName: string;
  gender: string;
  wechatId: string;
  overseasCompanyAddress: string;
  companyField: string;
  jobTitle: string;
  // A separate business-contact email, distinct from the account login
  // email (users.email) -- named contactEmail in the DB/API to avoid ever
  // confusing the two.
  contactEmail: string;
  phoneNumber: string;
  dateOfBirth: string;
  visaType: string;
  visaExpireDate: string;
}

export interface DocumentReview {
  status: DocumentReviewStatus;
  note: string;
}

export interface BuyerProfile extends BuyerProfileFields {
  userId: number;
  expoIds: number[];
  // Keyed by document: the built-in ones and any an admin added (Admin -> Buyer form settings).
  hasDocument: Record<string, boolean>;
  documentReview: Record<string, DocumentReview>;
  // Answers to the extra information fields an admin added, by field key.
  custom: Record<string, string>;
  updatedAt: number;
}

function emptyDocumentReview(): Record<string, DocumentReview> {
  return DOCUMENT_FIELDS.reduce((acc, field) => {
    acc[field] = { status: "pending", note: "" };
    return acc;
  }, {} as Record<string, DocumentReview>);
}

const EMPTY_FIELDS: BuyerProfileFields = {
  companyName: "",
  nationality: "",
  passportNumber: "",
  annualTurnover: "",
  purchaseIntention: "",
  otherPurchaseIntention: "",
  contactPerson: "",
  registrationCode: "",
  sourceExhibitions: "",
  departureCity: "",
  attendanceDay: "",
  meetingOrVisiting: "",
  passportName: "",
  gender: "",
  wechatId: "",
  overseasCompanyAddress: "",
  companyField: "",
  jobTitle: "",
  contactEmail: "",
  phoneNumber: "",
  dateOfBirth: "",
  visaType: "",
  visaExpireDate: "",
};

function mapRow(row: RowDataPacket): BuyerProfile {
  return {
    userId: row.user_id,
    expoIds: parseExpoIds(row.expo_ids),
    companyName: row.company_name || "",
    nationality: row.nationality || "",
    passportNumber: row.passport_number || "",
    annualTurnover: row.annual_turnover || "",
    purchaseIntention: row.purchase_intention || "",
    otherPurchaseIntention: row.other_purchase_intention || "",
    contactPerson: row.contact_person || "",
    registrationCode: row.registration_code || "",
    sourceExhibitions: row.source_exhibitions || "",
    departureCity: row.departure_city || "",
    attendanceDay: row.attendance_day || "",
    meetingOrVisiting: row.meeting_or_visiting || "",
    passportName: row.passport_name || "",
    gender: row.gender || "",
    wechatId: row.wechat_id || "",
    overseasCompanyAddress: row.overseas_company_address || "",
    companyField: row.company_field || "",
    jobTitle: row.job_title || "",
    contactEmail: row.contact_email || "",
    phoneNumber: row.phone_number || "",
    dateOfBirth: row.date_of_birth || "",
    visaType: row.visa_type || "",
    visaExpireDate: row.visa_expire_date || "",
    hasDocument: {
      businessLicense: !!row.doc_business_license,
      businessCard: !!row.doc_business_card,
      passportFront: !!row.doc_passport_front,
      visaPage: !!row.doc_visa_page,
      cantonFairCard: !!row.doc_canton_fair_card,
      buyerPhoto: !!row.doc_buyer_photo,
      invoiceOrderList: !!row.doc_invoice_order_list,
      latestEntryStamp: !!row.doc_latest_entry_stamp,
    },
    documentReview: {
      businessLicense: { status: row.doc_business_license_status || "pending", note: row.doc_business_license_note || "" },
      businessCard: { status: row.doc_business_card_status || "pending", note: row.doc_business_card_note || "" },
      passportFront: { status: row.doc_passport_front_status || "pending", note: row.doc_passport_front_note || "" },
      visaPage: { status: row.doc_visa_page_status || "pending", note: row.doc_visa_page_note || "" },
      cantonFairCard: { status: row.doc_canton_fair_card_status || "pending", note: row.doc_canton_fair_card_note || "" },
      buyerPhoto: { status: row.doc_buyer_photo_status || "pending", note: row.doc_buyer_photo_note || "" },
      invoiceOrderList: { status: row.doc_invoice_order_list_status || "pending", note: row.doc_invoice_order_list_note || "" },
      latestEntryStamp: { status: row.doc_latest_entry_stamp_status || "pending", note: row.doc_latest_entry_stamp_note || "" },
    },
    custom: {},
    updatedAt: Math.floor(new Date(row.updated_at).getTime() / 1000),
  };
}

// Adds what an admin added to the form: their documents and the answers to their extra fields.
async function withCustom(profile: BuyerProfile): Promise<BuyerProfile> {
  const [items, states, values] = await Promise.all([getFormItems(), getCustomDocumentStates([profile.userId]), getCustomValues([profile.userId])]);
  const mine = states.get(profile.userId) ?? {};
  const hasDocument = { ...profile.hasDocument };
  const documentReview = { ...profile.documentReview };
  for (const item of items) {
    if (item.kind !== "document" || item.builtin) continue;
    const state = mine[item.key];
    hasDocument[item.key] = !!state;
    documentReview[item.key] = state ? { status: state.status, note: state.note } : { status: "pending", note: "" };
  }
  return { ...profile, hasDocument, documentReview, custom: values.get(profile.userId) ?? {} };
}

function summaryColumns(stamp: boolean): string {
  return (
  "user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person, registration_code, " +
  `${expoNamesSql("buyer_profiles.user_id")} AS source_exhibitions, ${expoIdsSql("buyer_profiles.user_id")} AS expo_ids, ` +
  "departure_city, attendance_day, meeting_or_visiting, passport_name, gender, wechat_id, overseas_company_address, company_field, job_title, contact_email, phone_number, " +
  "date_of_birth, visa_type, visa_expire_date, " +
  "doc_business_license, doc_business_card, doc_passport_front, doc_visa_page, doc_canton_fair_card, doc_buyer_photo, doc_invoice_order_list, " +
  "doc_business_license_status, doc_business_license_note, doc_business_card_status, doc_business_card_note, " +
  "doc_passport_front_status, doc_passport_front_note, doc_visa_page_status, doc_visa_page_note, " +
  "doc_canton_fair_card_status, doc_canton_fair_card_note, doc_buyer_photo_status, doc_buyer_photo_note, " +
  "doc_invoice_order_list_status, doc_invoice_order_list_note, " +
  (stamp ? "doc_latest_entry_stamp, doc_latest_entry_stamp_status, doc_latest_entry_stamp_note, " : "") +
  "updated_at"
  );
}

export async function getBuyerProfile(userId: number): Promise<BuyerProfile | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${summaryColumns(await stampColumnsReady())} FROM buyer_profiles WHERE user_id = ? LIMIT 1`,
    [userId]
  );
  const row = rows[0];
  return row ? withCustom(mapRow(row)) : null;
}

// The buyer dashboard/admin detail view should always have something to
// render, even for a buyer who hasn't filled anything in yet.
export async function getBuyerProfileOrEmpty(userId: number): Promise<BuyerProfile> {
  const existing = await getBuyerProfile(userId);
  if (existing) return existing;
  return withCustom({
    userId,
    expoIds: [],
    ...EMPTY_FIELDS,
    hasDocument: {
      businessLicense: false,
      businessCard: false,
      passportFront: false,
      visaPage: false,
      cantonFairCard: false,
      buyerPhoto: false,
      invoiceOrderList: false,
      latestEntryStamp: false,
    },
    documentReview: emptyDocumentReview(),
    custom: {},
    updatedAt: 0,
  });
}

export type OverallVerificationStatus = "not_started" | "pending_review" | "action_needed" | "verified";

// Every field an admin can search a buyer by (see listBuyerProfilesForAdmin
// below and the admin buyer-profiles page's search box) -- account fields
// plus every buyer_profiles column that isn't a document or its review
// status/note.
export interface AdminBuyerProfileRow {
  userId: number;
  // The buyer's registration number as shown (TUE0001) and as a plain number.
  buyerNumber: string;
  buyerNo: number | null;
  expoIds: number[];
  name: string;
  email: string;
  status: "active" | "suspended";
  // Reward points in the buyer's wallet (0 when they have none yet).
  rewardPoints: number;
  companyName: string;
  nationality: string;
  passportNumber: string;
  passportName: string;
  gender: string;
  wechatId: string;
  departureCity: string;
  attendanceDay: string;
  meetingOrVisiting: string;
  jobTitle: string;
  companyField: string;
  overseasCompanyAddress: string;
  contactEmail: string;
  phoneNumber: string;
  registrationCode: string;
  sourceExhibitions: string;
  annualTurnover: string;
  contactPerson: string;
  dateOfBirth: string;
  visaType: string;
  visaExpireDate: string;
  purchaseIntention: string;
  otherPurchaseIntention: string;
  documentsUploaded: number;
  verificationStatus: OverallVerificationStatus;
  // Per-document upload + review state, so the admin list table can show a
  // status column for each of the 7 documents without a second request.
  documents: Record<string, { uploaded: boolean; status: DocumentReviewStatus }>;
  // Answers to the extra information fields an admin added, by field key.
  custom: Record<string, string>;
}

// A buyer's overall status is a rollup of the documents currently asked for (overallStatus in
// @/lib/buyer-form): any rejection needs the buyer's attention, every required document uploaded
// and verified is done, and anything in between is still awaiting review.

// Whether each document has been uploaded, WITHOUT reading the document: the images are
// base64 text in MEDIUMTEXT columns (hundreds of KB each), and the admin list covers
// every buyer, so selecting them just to tick "uploaded" pulled gigabytes into the
// server once a couple of thousand buyers had documents. Migration 055 adds a stored
// has_doc_* flag column per document that the database keeps in step by itself.
function documentPresenceSql(useFlagColumns: boolean, fields: readonly DocumentField[]): string {
  return fields.map((f) => {
    const column = DOCUMENT_COLUMNS[f];
    // Until the migration has run on a server, ask the database for the length instead
    // (the image still never reaches the app).
    return useFlagColumns ? `p.has_${column}` : `(LENGTH(p.${column}) > 0) AS has_${column}`;
  }).join(", ");
}

function adminListQuery(useFlagColumns: boolean, fields: readonly DocumentField[]): string {
  return `SELECT u.id AS user_id, u.buyer_no, u.name, u.email, u.status,
            p.company_name, p.nationality, p.passport_number, p.passport_name, p.gender, p.wechat_id,
            p.departure_city, p.attendance_day, p.meeting_or_visiting, p.job_title, p.company_field,
            p.overseas_company_address, p.contact_email, p.phone_number, p.registration_code, p.annual_turnover, p.contact_person,
            ${expoNamesSql("u.id")} AS source_exhibitions, ${expoIdsSql("u.id")} AS expo_ids,
            p.date_of_birth, p.visa_type, p.visa_expire_date, p.purchase_intention, p.other_purchase_intention,
            ${documentPresenceSql(useFlagColumns, fields)},
            ${fields.map((f) => `p.${DOCUMENT_STATUS_COLUMNS[f]}`).join(", ")},
            COALESCE(w.balance, 0) AS reward_points
     FROM users u
     LEFT JOIN buyer_profiles p ON p.user_id = u.id
     LEFT JOIN wallets w ON w.user_id = u.id
     WHERE u.role = 'buyer'
     ORDER BY u.created_at DESC`;
}

export async function listBuyerProfilesForAdmin(): Promise<AdminBuyerProfileRow[]> {
  await assignMissingBuyerNumbers();
  let rows: RowDataPacket[];
  const fields = await activeDocumentFields();
  try {
    [rows] = await pool.query<RowDataPacket[]>(adminListQuery(true, fields));
  } catch (err) {
    // The code can go live a few minutes before the deploy job has applied migration 055.
    if ((err as { code?: string }).code !== "ER_BAD_FIELD_ERROR") throw err;
    [rows] = await pool.query<RowDataPacket[]>(adminListQuery(false, fields));
  }
  // What an admin added to the form: the documents asked for now, and every buyer's custom files
  // (state only, never the files) and answers.
  const [items, customStates, customValues] = await Promise.all([getFormItems(), getCustomDocumentStates(), getCustomValues()]);
  const customDocumentKeys = items.filter((i) => i.kind === "document" && !i.builtin).map((i) => i.key);
  return rows.map((row) => {
    const documents: Record<string, { uploaded: boolean; status: DocumentReviewStatus }> = {
      businessLicense: { uploaded: !!row.has_doc_business_license, status: (row.doc_business_license_status || "pending") as DocumentReviewStatus },
      businessCard: { uploaded: !!row.has_doc_business_card, status: (row.doc_business_card_status || "pending") as DocumentReviewStatus },
      passportFront: { uploaded: !!row.has_doc_passport_front, status: (row.doc_passport_front_status || "pending") as DocumentReviewStatus },
      visaPage: { uploaded: !!row.has_doc_visa_page, status: (row.doc_visa_page_status || "pending") as DocumentReviewStatus },
      cantonFairCard: { uploaded: !!row.has_doc_canton_fair_card, status: (row.doc_canton_fair_card_status || "pending") as DocumentReviewStatus },
      buyerPhoto: { uploaded: !!row.has_doc_buyer_photo, status: (row.doc_buyer_photo_status || "pending") as DocumentReviewStatus },
      invoiceOrderList: { uploaded: !!row.has_doc_invoice_order_list, status: (row.doc_invoice_order_list_status || "pending") as DocumentReviewStatus },
      latestEntryStamp: { uploaded: !!row.has_doc_latest_entry_stamp, status: (row.doc_latest_entry_stamp_status || "pending") as DocumentReviewStatus },
    };
    const mine = customStates.get(row.user_id) ?? {};
    for (const key of customDocumentKeys) {
      documents[key] = mine[key] ? { uploaded: true, status: mine[key].status } : { uploaded: false, status: "pending" };
    }
    const docs = Object.values(documents);
    return {
      userId: row.user_id,
      buyerNumber: formatBuyerNumber(row.buyer_no),
      buyerNo: row.buyer_no ? Number(row.buyer_no) : null,
      expoIds: parseExpoIds(row.expo_ids),
      name: row.name,
      email: row.email,
      status: row.status,
      rewardPoints: Number(row.reward_points ?? 0),
      companyName: row.company_name || "",
      nationality: row.nationality || "",
      passportNumber: row.passport_number || "",
      passportName: row.passport_name || "",
      gender: row.gender || "",
      wechatId: row.wechat_id || "",
      departureCity: row.departure_city || "",
      attendanceDay: row.attendance_day || "",
      meetingOrVisiting: row.meeting_or_visiting || "",
      jobTitle: row.job_title || "",
      companyField: row.company_field || "",
      overseasCompanyAddress: row.overseas_company_address || "",
      contactEmail: row.contact_email || "",
      phoneNumber: row.phone_number || "",
      registrationCode: row.registration_code || "",
      sourceExhibitions: row.source_exhibitions || "",
      annualTurnover: row.annual_turnover || "",
      contactPerson: row.contact_person || "",
      dateOfBirth: row.date_of_birth || "",
      visaType: row.visa_type || "",
      visaExpireDate: row.visa_expire_date || "",
      purchaseIntention: row.purchase_intention || "",
      otherPurchaseIntention: row.other_purchase_intention || "",
      documentsUploaded: docs.filter((d) => d.uploaded).length,
      verificationStatus: overallStatus(documents, items),
      documents,
      custom: customValues.get(row.user_id) ?? {},
    };
  });
}

export interface BuyerExportProfile extends BuyerProfileFields {
  // Answers to the extra information fields an admin added, by field key.
  custom: Record<string, string>;
  userId: number;
  buyerNumber: string;
  name: string;
  email: string;
  rewardPoints: number;
  // Raw data URL per document (null if never uploaded) -- unlike mapRow's
  // hasDocument/documentReview, an export needs the actual image bytes to
  // embed, not just a boolean.
  documentData: Record<string, string | null>;
  documentStatus: Record<string, DocumentReviewStatus>;
}

// Batched fetch for the Excel/ZIP export tools -- one query for however
// many buyers the admin selected, rather than N round trips.
export async function getBuyerProfilesForExport(userIds: number[]): Promise<BuyerExportProfile[]> {
  if (userIds.length === 0) return [];
  const placeholders = userIds.map(() => "?").join(", ");
  const docColumns = (await activeDocumentFields()).map((f) => `p.${DOCUMENT_COLUMNS[f]}, p.${DOCUMENT_STATUS_COLUMNS[f]}`).join(", ");
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.id AS user_id, u.buyer_no, u.name, u.email,
            p.company_name, p.nationality, p.passport_number, p.annual_turnover, p.purchase_intention, p.other_purchase_intention,
            p.contact_person, p.registration_code, ${expoNamesSql("u.id")} AS source_exhibitions, p.departure_city, p.attendance_day, p.meeting_or_visiting,
            p.passport_name, p.gender, p.wechat_id, p.overseas_company_address, p.company_field, p.job_title, p.contact_email, p.phone_number,
            p.date_of_birth, p.visa_type, p.visa_expire_date, ${docColumns}, COALESCE(w.balance, 0) AS reward_points
     FROM users u
     LEFT JOIN buyer_profiles p ON p.user_id = u.id
     LEFT JOIN wallets w ON w.user_id = u.id
     WHERE u.id IN (${placeholders})
     ORDER BY u.buyer_no IS NULL, u.buyer_no, u.id`,
    userIds
  );
  const [items, customFiles, customStates, customValues] = await Promise.all([getFormItems(), getCustomDocumentData(userIds), getCustomDocumentStates(userIds), getCustomValues(userIds)]);
  const customDocumentKeys = items.filter((i) => i.kind === "document" && !i.builtin).map((i) => i.key);
  return rows.map((row) => {
    const documentData = {} as Record<string, string | null>;
    const documentStatus = {} as Record<string, DocumentReviewStatus>;
    for (const f of DOCUMENT_FIELDS) {
      documentData[f] = row[DOCUMENT_COLUMNS[f]] || null;
      documentStatus[f] = (row[DOCUMENT_STATUS_COLUMNS[f]] || "pending") as DocumentReviewStatus;
    }
    for (const key of customDocumentKeys) {
      documentData[key] = customFiles.get(row.user_id)?.[key] ?? null;
      documentStatus[key] = customStates.get(row.user_id)?.[key]?.status ?? "pending";
    }
    return {
      userId: row.user_id,
      buyerNumber: formatBuyerNumber(row.buyer_no),
      name: row.name,
      email: row.email,
      companyName: row.company_name || "",
      nationality: row.nationality || "",
      passportNumber: row.passport_number || "",
      annualTurnover: row.annual_turnover || "",
      purchaseIntention: row.purchase_intention || "",
      otherPurchaseIntention: row.other_purchase_intention || "",
      contactPerson: row.contact_person || "",
      registrationCode: row.registration_code || "",
      sourceExhibitions: row.source_exhibitions || "",
      departureCity: row.departure_city || "",
      attendanceDay: row.attendance_day || "",
      meetingOrVisiting: row.meeting_or_visiting || "",
      passportName: row.passport_name || "",
      gender: row.gender || "",
      wechatId: row.wechat_id || "",
      overseasCompanyAddress: row.overseas_company_address || "",
      companyField: row.company_field || "",
      jobTitle: row.job_title || "",
      contactEmail: row.contact_email || "",
      phoneNumber: row.phone_number || "",
      dateOfBirth: row.date_of_birth || "",
      visaType: row.visa_type || "",
      visaExpireDate: row.visa_expire_date || "",
      rewardPoints: Number(row.reward_points ?? 0),
      custom: customValues.get(row.user_id) ?? {},
      documentData,
      documentStatus,
    };
  });
}

const FIELD_COLUMNS: Record<Exclude<keyof BuyerProfileFields, "sourceExhibitions">, string> = {
  companyName: "company_name",
  nationality: "nationality",
  passportNumber: "passport_number",
  annualTurnover: "annual_turnover",
  purchaseIntention: "purchase_intention",
  otherPurchaseIntention: "other_purchase_intention",
  contactPerson: "contact_person",
  registrationCode: "registration_code",
  departureCity: "departure_city",
  attendanceDay: "attendance_day",
  meetingOrVisiting: "meeting_or_visiting",
  passportName: "passport_name",
  gender: "gender",
  wechatId: "wechat_id",
  overseasCompanyAddress: "overseas_company_address",
  companyField: "company_field",
  jobTitle: "job_title",
  contactEmail: "contact_email",
  phoneNumber: "phone_number",
  dateOfBirth: "date_of_birth",
  visaType: "visa_type",
  visaExpireDate: "visa_expire_date",
};

// Buyer editing their own profile and admin editing on a buyer's behalf
// share this same upsert -- INSERT..ON DUPLICATE KEY so the first edit
// (buyer has no row yet) and every edit after it both just work. Only the
// keys actually present in `fields` are touched: the buyer's own PATCH
// never sends registrationCode (admin-only), and building the query around
// a fully-defaulted object here would silently blank out whatever an admin
// had set there the next time that buyer saved their own profile.
export async function upsertBuyerProfileFields(userId: number, fields: Partial<BuyerProfileFields>): Promise<void> {
  // sourceExhibitions is not a column any more -- it lists expo names. Given
  // here (e.g. "CPHI, Propak"), it sets the buyer's expos to exactly those.
  if (typeof fields.sourceExhibitions === "string") {
    await setBuyerExpoNames(userId, fields.sourceExhibitions.split(","));
  }
  const keys = (Object.keys(fields) as (keyof BuyerProfileFields)[]).filter(
    (k): k is Exclude<keyof BuyerProfileFields, "sourceExhibitions"> => k !== "sourceExhibitions"
  );
  if (keys.length === 0) return;

  const columns = keys.map((k) => FIELD_COLUMNS[k]);
  const values = keys.map((k) => fields[k]);
  const placeholders = columns.map(() => "?").join(", ");
  const updateClause = columns.map((c) => `${c} = VALUES(${c})`).join(", ");

  await pool.query<ResultSetHeader>(
    `INSERT INTO buyer_profiles (user_id, ${columns.join(", ")})
     VALUES (?, ${placeholders})
     ON DUPLICATE KEY UPDATE ${updateClause}`,
    [userId, ...values]
  );
}

// Any new upload -- by the buyer themselves, by an admin uploading on their
// behalf, or via a bulk import -- is auto-verified by default so an admin
// doesn't have to click through every single document one at a time; the
// review dropdown (setDocumentReview) is still there to flip any specific
// one back to pending or rejected whenever that's actually needed. Always
// clears any previous rejection note, since a fresh upload replacing a
// rejected one shouldn't keep showing stale rejection wording.
export async function setBuyerDocument(userId: number, field: string, uploaded: string): Promise<void> {
  // Shrunk before it is stored (see document-image.ts); throws DocumentFileError for a file that is not what it claims to be.
  const dataUrl = await shrinkDocumentDataUrl(uploaded);
  if (!isBuiltinDocument(field)) {
    await requireCustomDocument(field);
    await setCustomDocument(userId, field, dataUrl);
    return;
  }
  const column = DOCUMENT_COLUMNS[field];
  const statusColumn = DOCUMENT_STATUS_COLUMNS[field];
  const noteColumn = DOCUMENT_NOTE_COLUMNS[field];
  await pool.query<ResultSetHeader>(
    `INSERT INTO buyer_profiles (user_id, ${column}, ${statusColumn}, ${noteColumn}) VALUES (?, ?, 'verified', '')
     ON DUPLICATE KEY UPDATE ${column} = VALUES(${column}), ${statusColumn} = 'verified', ${noteColumn} = ''`,
    [userId, dataUrl]
  );
}

export async function getBuyerDocument(userId: number, field: string): Promise<string | null> {
  if (!isBuiltinDocument(field)) {
    await requireCustomDocument(field);
    return getCustomDocument(userId, field);
  }
  const column = DOCUMENT_COLUMNS[field];
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${column} AS value FROM buyer_profiles WHERE user_id = ? LIMIT 1`,
    [userId]
  );
  return rows[0]?.value || null;
}

// Admin-only: mark one document verified/rejected, with an optional note
// (a rejection reason the buyer sees on their own profile page). Requires
// an existing buyer_profiles row (the buyer must have uploaded something
// first, which is what creates that row), so no INSERT branch needed here.
export async function setDocumentReview(
  userId: number,
  field: string,
  status: DocumentReviewStatus,
  note: string
): Promise<void> {
  if (!isBuiltinDocument(field)) {
    await requireCustomDocument(field);
    await setCustomDocumentReview(userId, field, status, note);
    return;
  }
  const statusColumn = DOCUMENT_STATUS_COLUMNS[field];
  const noteColumn = DOCUMENT_NOTE_COLUMNS[field];
  await pool.query<ResultSetHeader>(
    `UPDATE buyer_profiles SET ${statusColumn} = ?, ${noteColumn} = ? WHERE user_id = ?`,
    [status, note, userId]
  );
}

// Admin: review documents for many buyers at once. "verify" marks every uploaded document still
// waiting for review as verified; "reject" marks one chosen document as rejected, with the reason the
// buyer sees on their profile, for those buyers who uploaded it. Returns how many documents changed.
export async function bulkReviewDocuments(
  userIds: number[],
  action: "verify" | "reject",
  documentKey: string | null,
  note: string
): Promise<{ changed: number; rejectedUserIds: number[] }> {
  if (userIds.length === 0) return { changed: 0, rejectedUserIds: [] };
  let changed = 0;

  if (action === "verify") {
    for (const field of DOCUMENT_FIELDS) {
      const column = DOCUMENT_COLUMNS[field];
      const [r] = await pool.query<ResultSetHeader>(
        `UPDATE buyer_profiles SET ${DOCUMENT_STATUS_COLUMNS[field]} = 'verified'
         WHERE user_id IN (?) AND ${column} IS NOT NULL AND ${column} <> '' AND ${DOCUMENT_STATUS_COLUMNS[field]} = 'pending'`,
        [userIds]
      );
      changed += r.affectedRows;
    }
    if (await formTablesReady()) {
      const [r] = await pool.query<ResultSetHeader>(
        "UPDATE buyer_custom_documents SET status = 'verified' WHERE user_id IN (?) AND status = 'pending'",
        [userIds]
      );
      changed += r.affectedRows;
    }
    return { changed, rejectedUserIds: [] };
  }

  if (!documentKey) throw new FormError("not_found", 404);
  if (isBuiltinDocument(documentKey)) {
    const column = DOCUMENT_COLUMNS[documentKey];
    const where = `user_id IN (?) AND ${column} IS NOT NULL AND ${column} <> '' AND ${DOCUMENT_STATUS_COLUMNS[documentKey]} <> 'rejected'`;
    // Who is about to be rejected (they are told by e-mail), taken before the update changes the statuses.
    const [who] = await pool.query<RowDataPacket[]>(`SELECT user_id FROM buyer_profiles WHERE ${where}`, [userIds]);
    const [r] = await pool.query<ResultSetHeader>(
      `UPDATE buyer_profiles SET ${DOCUMENT_STATUS_COLUMNS[documentKey]} = 'rejected', ${DOCUMENT_NOTE_COLUMNS[documentKey]} = ?
       WHERE ${where}`,
      [note, userIds]
    );
    return { changed: r.affectedRows, rejectedUserIds: who.map((w) => Number(w.user_id)) };
  }
  await requireCustomDocument(documentKey);
  const [who] = await pool.query<RowDataPacket[]>(
    "SELECT user_id FROM buyer_custom_documents WHERE item_key = ? AND user_id IN (?) AND status <> 'rejected'",
    [documentKey, userIds]
  );
  const [r] = await pool.query<ResultSetHeader>(
    "UPDATE buyer_custom_documents SET status = 'rejected', note = ? WHERE item_key = ? AND user_id IN (?) AND status <> 'rejected'",
    [note, documentKey, userIds]
  );
  return { changed: r.affectedRows, rejectedUserIds: who.map((w) => Number(w.user_id)) };
}
