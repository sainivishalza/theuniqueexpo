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
  "user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person, " +
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

// Buyer editing their own profile and admin editing on a buyer's behalf
// share this same upsert -- INSERT..ON DUPLICATE KEY so the first edit
// (buyer has no row yet) and every edit after it both just work.
export async function upsertBuyerProfileFields(userId: number, fields: Partial<BuyerProfileFields>): Promise<void> {
  const merged = { ...EMPTY_FIELDS, ...fields };
  await pool.query<ResultSetHeader>(
    `INSERT INTO buyer_profiles
       (user_id, company_name, nationality, passport_number, annual_turnover, purchase_intention, other_purchase_intention, contact_person)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       company_name = VALUES(company_name),
       nationality = VALUES(nationality),
       passport_number = VALUES(passport_number),
       annual_turnover = VALUES(annual_turnover),
       purchase_intention = VALUES(purchase_intention),
       other_purchase_intention = VALUES(other_purchase_intention),
       contact_person = VALUES(contact_person)`,
    [
      userId,
      merged.companyName,
      merged.nationality,
      merged.passportNumber,
      merged.annualTurnover,
      merged.purchaseIntention,
      merged.otherPurchaseIntention,
      merged.contactPerson,
    ]
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
