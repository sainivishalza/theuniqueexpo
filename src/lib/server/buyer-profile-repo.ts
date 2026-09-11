import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";

export const DOCUMENT_FIELDS = [
  "businessLicense",
  "businessCard",
  "passportFront",
  "visaPage",
  "cantonFairCard",
  "buyerPhoto",
] as const;

export type DocumentField = (typeof DOCUMENT_FIELDS)[number];

const DOCUMENT_COLUMNS: Record<DocumentField, string> = {
  businessLicense: "doc_business_license",
  businessCard: "doc_business_card",
  passportFront: "doc_passport_front",
  visaPage: "doc_visa_page",
  cantonFairCard: "doc_canton_fair_card",
  buyerPhoto: "doc_buyer_photo",
};

export type DocumentReviewStatus = "pending" | "verified" | "rejected";

const DOCUMENT_STATUS_COLUMNS: Record<DocumentField, string> = {
  businessLicense: "doc_business_license_status",
  businessCard: "doc_business_card_status",
  passportFront: "doc_passport_front_status",
  visaPage: "doc_visa_page_status",
  cantonFairCard: "doc_canton_fair_card_status",
  buyerPhoto: "doc_buyer_photo_status",
};

const DOCUMENT_NOTE_COLUMNS: Record<DocumentField, string> = {
  businessLicense: "doc_business_license_note",
  businessCard: "doc_business_card_note",
  passportFront: "doc_passport_front_note",
  visaPage: "doc_visa_page_note",
  cantonFairCard: "doc_canton_fair_card_note",
  buyerPhoto: "doc_buyer_photo_note",
};

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
}

export interface DocumentReview {
  status: DocumentReviewStatus;
  note: string;
}

export interface BuyerProfile extends BuyerProfileFields {
  userId: number;
  hasDocument: Record<DocumentField, boolean>;
  documentReview: Record<DocumentField, DocumentReview>;
  updatedAt: number;
}

function emptyDocumentReview(): Record<DocumentField, DocumentReview> {
  return DOCUMENT_FIELDS.reduce((acc, field) => {
    acc[field] = { status: "pending", note: "" };
    return acc;
  }, {} as Record<DocumentField, DocumentReview>);
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
};

function mapRow(row: RowDataPacket): BuyerProfile {
  return {
    userId: row.user_id,
    companyName: row.company_name || "",
    nationality: row.nationality || "",
    passportNumber: row.passport_number || "",
    annualTurnover: row.annual_turnover || "",
    purchaseIntention: row.purchase_intention || "",
    otherPurchaseIntention: row.other_purchase_intention || "",
    contactPerson: row.contact_person || "",
    registrationCode: row.registration_code || "",
    hasDocument: {
      businessLicense: !!row.doc_business_license,
      businessCard: !!row.doc_business_card,
      passportFront: !!row.doc_passport_front,
      visaPage: !!row.doc_visa_page,
      cantonFairCard: !!row.doc_canton_fair_card,
      buyerPhoto: !!row.doc_buyer_photo,
    },
    documentReview: {
      businessLicense: { status: row.doc_business_license_status || "pending", note: row.doc_business_license_note || "" },
      businessCard: { status: row.doc_business_card_status || "pending", note: row.doc_business_card_note || "" },
      passportFront: { status: row.doc_passport_front_status || "pending", note: row.doc_passport_front_note || "" },
      visaPage: { status: row.doc_visa_page_status || "pending", note: row.doc_visa_page_note || "" },
      cantonFairCard: { status: row.doc_canton_fair_card_status || "pending", note: row.doc_canton_fair_card_note || "" },
      buyerPhoto: { status: row.doc_buyer_photo_status || "pending", note: row.doc_buyer_photo_note || "" },
    },
    updatedAt: Math.floor(new Date(row.updated_at).getTime() / 1000),
  };
}

const SELECT_SUMMARY_COLUMNS =
  "user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person, registration_code, " +
  "doc_business_license, doc_business_card, doc_passport_front, doc_visa_page, doc_canton_fair_card, doc_buyer_photo, " +
  "doc_business_license_status, doc_business_license_note, doc_business_card_status, doc_business_card_note, " +
  "doc_passport_front_status, doc_passport_front_note, doc_visa_page_status, doc_visa_page_note, " +
  "doc_canton_fair_card_status, doc_canton_fair_card_note, doc_buyer_photo_status, doc_buyer_photo_note, " +
  "updated_at";

export async function getBuyerProfile(userId: number): Promise<BuyerProfile | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${SELECT_SUMMARY_COLUMNS} FROM buyer_profiles WHERE user_id = ? LIMIT 1`,
    [userId]
  );
  const row = rows[0];
  return row ? mapRow(row) : null;
}

// The buyer dashboard/admin detail view should always have something to
// render, even for a buyer who hasn't filled anything in yet.
export async function getBuyerProfileOrEmpty(userId: number): Promise<BuyerProfile> {
  const existing = await getBuyerProfile(userId);
  if (existing) return existing;
  return {
    userId,
    ...EMPTY_FIELDS,
    hasDocument: {
      businessLicense: false,
      businessCard: false,
      passportFront: false,
      visaPage: false,
      cantonFairCard: false,
      buyerPhoto: false,
    },
    documentReview: emptyDocumentReview(),
    updatedAt: 0,
  };
}

export type OverallVerificationStatus = "not_started" | "pending_review" | "action_needed" | "verified";

export interface AdminBuyerProfileRow {
  userId: number;
  name: string;
  email: string;
  status: "active" | "suspended";
  companyName: string;
  nationality: string;
  documentsUploaded: number;
  verificationStatus: OverallVerificationStatus;
}

// A buyer's overall status is a simple rollup of their 6 documents' own
// review statuses: any rejection needs the buyer's attention regardless of
// how many other documents are fine, an all-verified-and-complete set is
// done, and anything in between (some uploaded, none rejected, not all
// verified yet) is still awaiting review.
function overallVerificationStatus(docs: { uploaded: boolean; status: DocumentReviewStatus }[]): OverallVerificationStatus {
  const uploaded = docs.filter((d) => d.uploaded);
  if (uploaded.length === 0) return "not_started";
  if (uploaded.some((d) => d.status === "rejected")) return "action_needed";
  if (uploaded.length === docs.length && uploaded.every((d) => d.status === "verified")) return "verified";
  return "pending_review";
}

export async function listBuyerProfilesForAdmin(): Promise<AdminBuyerProfileRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.id AS user_id, u.name, u.email, u.status,
            p.company_name, p.nationality,
            p.doc_business_license, p.doc_business_card, p.doc_passport_front,
            p.doc_visa_page, p.doc_canton_fair_card, p.doc_buyer_photo,
            p.doc_business_license_status, p.doc_business_card_status, p.doc_passport_front_status,
            p.doc_visa_page_status, p.doc_canton_fair_card_status, p.doc_buyer_photo_status
     FROM users u
     LEFT JOIN buyer_profiles p ON p.user_id = u.id
     WHERE u.role = 'buyer'
     ORDER BY u.created_at DESC`
  );
  return rows.map((row) => {
    const docs = [
      { uploaded: !!row.doc_business_license, status: (row.doc_business_license_status || "pending") as DocumentReviewStatus },
      { uploaded: !!row.doc_business_card, status: (row.doc_business_card_status || "pending") as DocumentReviewStatus },
      { uploaded: !!row.doc_passport_front, status: (row.doc_passport_front_status || "pending") as DocumentReviewStatus },
      { uploaded: !!row.doc_visa_page, status: (row.doc_visa_page_status || "pending") as DocumentReviewStatus },
      { uploaded: !!row.doc_canton_fair_card, status: (row.doc_canton_fair_card_status || "pending") as DocumentReviewStatus },
      { uploaded: !!row.doc_buyer_photo, status: (row.doc_buyer_photo_status || "pending") as DocumentReviewStatus },
    ];
    return {
      userId: row.user_id,
      name: row.name,
      email: row.email,
      status: row.status,
      companyName: row.company_name || "",
      nationality: row.nationality || "",
      documentsUploaded: docs.filter((d) => d.uploaded).length,
      verificationStatus: overallVerificationStatus(docs),
    };
  });
}

const FIELD_COLUMNS: Record<keyof BuyerProfileFields, string> = {
  companyName: "company_name",
  nationality: "nationality",
  passportNumber: "passport_number",
  annualTurnover: "annual_turnover",
  purchaseIntention: "purchase_intention",
  otherPurchaseIntention: "other_purchase_intention",
  contactPerson: "contact_person",
  registrationCode: "registration_code",
};

// Buyer editing their own profile and admin editing on a buyer's behalf
// share this same upsert -- INSERT..ON DUPLICATE KEY so the first edit
// (buyer has no row yet) and every edit after it both just work. Only the
// keys actually present in `fields` are touched: the buyer's own PATCH
// never sends registrationCode (admin-only), and building the query around
// a fully-defaulted object here would silently blank out whatever an admin
// had set there the next time that buyer saved their own profile.
export async function upsertBuyerProfileFields(userId: number, fields: Partial<BuyerProfileFields>): Promise<void> {
  const keys = Object.keys(fields) as (keyof BuyerProfileFields)[];
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

// Any new upload -- by the buyer themselves or by an admin uploading on
// their behalf -- is content an admin hasn't looked at yet, so it always
// resets that document's review back to "pending" and clears any previous
// rejection note. Otherwise a buyer fixing exactly what a rejection note
// asked for would stay stuck showing "rejected" with stale wording.
export async function setBuyerDocument(userId: number, field: DocumentField, dataUrl: string): Promise<void> {
  const column = DOCUMENT_COLUMNS[field];
  const statusColumn = DOCUMENT_STATUS_COLUMNS[field];
  const noteColumn = DOCUMENT_NOTE_COLUMNS[field];
  await pool.query<ResultSetHeader>(
    `INSERT INTO buyer_profiles (user_id, ${column}, ${statusColumn}, ${noteColumn}) VALUES (?, ?, 'pending', '')
     ON DUPLICATE KEY UPDATE ${column} = VALUES(${column}), ${statusColumn} = 'pending', ${noteColumn} = ''`,
    [userId, dataUrl]
  );
}

export async function getBuyerDocument(userId: number, field: DocumentField): Promise<string | null> {
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
  field: DocumentField,
  status: DocumentReviewStatus,
  note: string
): Promise<void> {
  const statusColumn = DOCUMENT_STATUS_COLUMNS[field];
  const noteColumn = DOCUMENT_NOTE_COLUMNS[field];
  await pool.query<ResultSetHeader>(
    `UPDATE buyer_profiles SET ${statusColumn} = ?, ${noteColumn} = ? WHERE user_id = ?`,
    [status, note, userId]
  );
}
