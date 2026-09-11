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

export interface BuyerProfile extends BuyerProfileFields {
  userId: number;
  hasDocument: Record<DocumentField, boolean>;
  updatedAt: number;
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
    updatedAt: Math.floor(new Date(row.updated_at).getTime() / 1000),
  };
}

const SELECT_SUMMARY_COLUMNS =
  "user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person, registration_code, " +
  "doc_business_license, doc_business_card, doc_passport_front, doc_visa_page, doc_canton_fair_card, doc_buyer_photo, updated_at";

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
    updatedAt: 0,
  };
}

export interface AdminBuyerProfileRow {
  userId: number;
  name: string;
  email: string;
  status: "active" | "suspended";
  companyName: string;
  nationality: string;
  documentsUploaded: number;
}

export async function listBuyerProfilesForAdmin(): Promise<AdminBuyerProfileRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.id AS user_id, u.name, u.email, u.status,
            p.company_name, p.nationality,
            p.doc_business_license, p.doc_business_card, p.doc_passport_front,
            p.doc_visa_page, p.doc_canton_fair_card, p.doc_buyer_photo
     FROM users u
     LEFT JOIN buyer_profiles p ON p.user_id = u.id
     WHERE u.role = 'buyer'
     ORDER BY u.created_at DESC`
  );
  return rows.map((row) => ({
    userId: row.user_id,
    name: row.name,
    email: row.email,
    status: row.status,
    companyName: row.company_name || "",
    nationality: row.nationality || "",
    documentsUploaded: [
      row.doc_business_license,
      row.doc_business_card,
      row.doc_passport_front,
      row.doc_visa_page,
      row.doc_canton_fair_card,
      row.doc_buyer_photo,
    ].filter(Boolean).length,
  }));
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

export async function setBuyerDocument(userId: number, field: DocumentField, dataUrl: string): Promise<void> {
  const column = DOCUMENT_COLUMNS[field];
  await pool.query<ResultSetHeader>(
    `INSERT INTO buyer_profiles (user_id, ${column}) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE ${column} = VALUES(${column})`,
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
