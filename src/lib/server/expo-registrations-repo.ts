import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";
import { safeParseArray, safeParseJson, stripFileAnswers } from "@/lib/server/db-helpers";
import type { ExpoRegistration, ExpoRegistrationInput } from "@/lib/expo-registrations";

function mapRow(row: RowDataPacket): ExpoRegistration {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    exhibitionId: row.exhibition_id,
    registrationType: row.registration_type,
    gender: row.gender,
    fullName: row.full_name,
    nationality: row.nationality,
    passportNumber: row.passport_number,
    companyName: row.company_name,
    companyWebsite: row.company_website,
    phone: row.phone,
    email: row.email,
    companyType: row.company_type,
    companyTypeOther: row.company_type_other,
    companyScale: row.company_scale,
    companyIntro: row.company_intro,
    purposeOfVisit: row.purpose_of_visit,
    infoSource: row.info_source,
    infoSourceOther: row.info_source_other,
    exportingMarkets: safeParseArray(row.exporting_markets),
    exportingMarketOther: row.exporting_market_other,
    docPassportFront: row.doc_passport_front,
    docBusinessCard: row.doc_business_card,
    docVisaPage: row.doc_visa_page,
    docBusinessLicense: row.doc_business_license,
    docOrderList: row.doc_order_list,
    status: row.status,
    createdAt: row.created_at,
    customAnswers: safeParseJson(row.custom_answers) as Record<string, unknown> | null,
    formSchemaSnapshot: safeParseJson(row.form_schema_snapshot),
  };
}

// Lightweight row for admin list views — omits the large base64 document blobs.
function mapSummaryRow(row: RowDataPacket) {
  const formSchemaSnapshot = safeParseJson(row.form_schema_snapshot);
  return {
    id: String(row.id),
    exhibitionId: row.exhibition_id,
    registrationType: row.registration_type,
    gender: row.gender,
    fullName: row.full_name,
    nationality: row.nationality,
    passportNumber: row.passport_number,
    companyName: row.company_name,
    companyWebsite: row.company_website,
    phone: row.phone,
    email: row.email,
    companyType: row.company_type === "Other" ? row.company_type_other : row.company_type,
    companyScale: row.company_scale,
    purposeOfVisit: row.purpose_of_visit,
    exportingMarkets: safeParseArray(row.exporting_markets),
    status: row.status,
    createdAt: row.created_at,
    customAnswers: stripFileAnswers(safeParseJson(row.custom_answers), formSchemaSnapshot),
    formSchemaSnapshot,
  };
}

export async function createExpoRegistration(userId: number, input: ExpoRegistrationInput) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO expo_registrations
      (exhibition_id, user_id, registration_type, gender, full_name, nationality, passport_number,
       company_name, company_website, phone, email, company_type, company_type_other, company_scale,
       company_intro, purpose_of_visit, info_source, info_source_other, exporting_markets, exporting_market_other,
       doc_passport_front, doc_business_card, doc_visa_page, doc_business_license, doc_order_list, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      input.exhibitionId, userId, input.registrationType, input.gender, input.fullName, input.nationality,
      input.passportNumber, input.companyName, input.companyWebsite, input.phone, input.email,
      input.companyType, input.companyTypeOther, input.companyScale, input.companyIntro,
      input.purposeOfVisit, input.infoSource, input.infoSourceOther,
      JSON.stringify(input.exportingMarkets || []), input.exportingMarketOther,
      input.docPassportFront, input.docBusinessCard, input.docVisaPage, input.docBusinessLicense,
      input.docOrderList || null,
    ]
  );
  return result.insertId;
}

export async function createCustomExpoRegistration(
  userId: number,
  exhibitionId: number,
  customAnswers: Record<string, unknown>,
  formSchemaSnapshot: unknown
) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO expo_registrations (exhibition_id, user_id, custom_answers, form_schema_snapshot, status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [exhibitionId, userId, JSON.stringify(customAnswers || {}), JSON.stringify(formSchemaSnapshot || [])]
  );
  return result.insertId;
}

export async function findExistingRegistration(exhibitionId: number, userId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM expo_registrations WHERE exhibition_id = ? AND user_id = ? LIMIT 1",
    [exhibitionId, userId]
  );
  return rows[0] || null;
}

// Only considers default-schema registrations — custom-form submissions
// don't carry fields the default form's prefill logic understands.
export async function getLatestRegistrationForUser(userId: number): Promise<ExpoRegistration | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM expo_registrations WHERE user_id = ? AND custom_answers IS NULL ORDER BY created_at DESC LIMIT 1",
    [userId]
  );
  const row = rows[0];
  return row ? mapRow(row) : null;
}

export async function listRegistrationsForExhibition(exhibitionId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM expo_registrations WHERE exhibition_id = ? ORDER BY created_at DESC",
    [exhibitionId]
  );
  return rows.map(mapSummaryRow);
}

export async function getRegistrationById(id: number): Promise<ExpoRegistration | null> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM expo_registrations WHERE id = ? LIMIT 1", [id]);
  const row = rows[0];
  return row ? mapRow(row) : null;
}

export async function updateRegistrationStatus(id: number, status: string) {
  await pool.query("UPDATE expo_registrations SET status = ? WHERE id = ?", [status, id]);
}
