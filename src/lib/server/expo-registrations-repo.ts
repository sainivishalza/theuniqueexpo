import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";
import { safeParseArray, safeParseJson, stripFileAnswers } from "@/lib/server/db-helpers";
import { translateString } from "@/lib/server/content-translations";
import { formatBuyerNumber } from "@/lib/buyer-number";
import type { ExpoRegistration, ExpoRegistrationInput } from "@/lib/expo-registrations";
import {
  availableActions,
  type ConfirmAttendanceInput,
  type EffectiveStatus,
  type MyRegistration,
  type RegistrationStatus,
} from "@/lib/registration-lifecycle";

// All times are stored in UTC (UTC_TIMESTAMP), and confirm_by is a plain date.
// An approved registration whose confirm-by date is behind us reads "expired".
const EFFECTIVE_STATUS_SQL = `CASE WHEN r.status = 'approved' AND r.confirm_by IS NOT NULL AND r.confirm_by < UTC_DATE() THEN 'expired' ELSE r.status END`;

// "2026-10-18 12:00:00" (UTC, as stored) -> "2026-10-18T12:00:00Z"
function iso(value: unknown): string | null {
  if (!value) return null;
  const text = String(value);
  return text.includes("T") ? text : `${text.replace(" ", "T")}Z`;
}

function dateOnly(value: unknown): string | null {
  return value ? String(value).slice(0, 10) : null;
}

function mapRow(row: RowDataPacket): ExpoRegistration {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    buyerNumber: formatBuyerNumber(row.buyer_no),
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
    effectiveStatus: (row.effective_status || row.status) as EffectiveStatus,
    createdAt: row.created_at,
    approvedAt: iso(row.approved_at),
    confirmBy: dateOnly(row.confirm_by),
    confirmedAt: iso(row.confirmed_at),
    arrivalDate: dateOnly(row.arrival_date),
    arrivalNote: row.arrival_note ?? null,
    docTicket: row.doc_ticket ?? null,
    checkedInAt: iso(row.checked_in_at),
    checkedOutAt: iso(row.checked_out_at),
    cancelledAt: iso(row.cancelled_at),
    feedbackRating: row.feedback_rating ?? null,
    feedbackComment: row.feedback_comment ?? null,
    feedbackAt: iso(row.feedback_at),
    customAnswers: safeParseJson(row.custom_answers) as Record<string, unknown> | null,
    formSchemaSnapshot: safeParseJson(row.form_schema_snapshot),
  };
}

// Lightweight row for admin list views — omits the large base64 document blobs.
function mapSummaryRow(row: RowDataPacket) {
  const formSchemaSnapshot = safeParseJson(row.form_schema_snapshot);
  return {
    id: String(row.id),
    buyerNumber: formatBuyerNumber(row.buyer_no),
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
    status: row.status as RegistrationStatus,
    effectiveStatus: (row.effective_status || row.status) as EffectiveStatus,
    createdAt: row.created_at,
    approvedAt: iso(row.approved_at),
    confirmBy: dateOnly(row.confirm_by),
    confirmedAt: iso(row.confirmed_at),
    arrivalDate: dateOnly(row.arrival_date),
    arrivalNote: row.arrival_note ?? null,
    hasTicket: !!row.has_ticket,
    checkedInAt: iso(row.checked_in_at),
    checkedOutAt: iso(row.checked_out_at),
    cancelledAt: iso(row.cancelled_at),
    feedbackRating: row.feedback_rating ?? null,
    feedbackComment: row.feedback_comment ?? null,
    feedbackAt: iso(row.feedback_at),
    customAnswers: stripFileAnswers(safeParseJson(row.custom_answers), formSchemaSnapshot),
    formSchemaSnapshot,
  };
}

// What the buyer sees about their own registration (no uploaded documents).
function mapMyRow(row: RowDataPacket, locale?: string): MyRegistration {
  const status = (row.effective_status || row.status) as EffectiveStatus;
  const expoEnded = !!row.expo_ended;
  const checkInOpen = !!row.check_in_open;
  const checkedInAt = iso(row.checked_in_at);
  const checkedOutAt = iso(row.checked_out_at);
  return {
    id: String(row.id),
    exhibitionId: row.exhibition_id,
    exhibitionSlug: row.exhibition_slug,
    exhibitionTitle: translateString(row.exhibition_title, locale),
    exhibitionStart: dateOnly(row.exhibition_start) || "",
    exhibitionEnd: dateOnly(row.exhibition_end) || "",
    status,
    registrationType: row.registration_type ?? null,
    usesCustomForm: !!row.custom_answers,
    createdAt: iso(row.created_at) || "",
    approvedAt: iso(row.approved_at),
    confirmBy: dateOnly(row.confirm_by),
    confirmedAt: iso(row.confirmed_at),
    arrivalDate: dateOnly(row.arrival_date),
    arrivalNote: row.arrival_note ?? null,
    hasTicket: !!row.has_ticket,
    checkedInAt,
    checkedOutAt,
    cancelledAt: iso(row.cancelled_at),
    feedbackRating: row.feedback_rating ?? null,
    feedbackComment: row.feedback_comment ?? null,
    feedbackAt: iso(row.feedback_at),
    actions: availableActions({ status, checkedIn: !!checkedInAt, feedbackGiven: !!row.feedback_at, expoEnded }),
    canCheckIn: status === "confirmed" && checkInOpen,
    canCheckOut: status === "attended" && !!checkedInAt && !checkedOutAt,
  };
}

const MY_SELECT = `
  SELECT r.id, r.exhibition_id, r.registration_type, r.custom_answers, r.status, r.created_at, r.approved_at, r.confirm_by,
         r.confirmed_at, r.arrival_date, r.arrival_note, (r.doc_ticket IS NOT NULL AND r.doc_ticket <> '') AS has_ticket,
         r.checked_in_at, r.checked_out_at, r.cancelled_at, r.feedback_rating, r.feedback_comment, r.feedback_at,
         ${EFFECTIVE_STATUS_SQL} AS effective_status,
         e.slug AS exhibition_slug, e.title AS exhibition_title, e.start_date AS exhibition_start, e.end_date AS exhibition_end,
         (e.end_date < UTC_DATE()) AS expo_ended,
         (UTC_DATE() BETWEEN DATE_SUB(e.start_date, INTERVAL 1 DAY) AND DATE_ADD(e.end_date, INTERVAL 1 DAY)) AS check_in_open
  FROM expo_registrations r
  JOIN exhibitions e ON e.id = r.exhibition_id`;

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
    "SELECT id, status FROM expo_registrations WHERE exhibition_id = ? AND user_id = ? LIMIT 1",
    [exhibitionId, userId]
  );
  return (rows[0] as { id: number; status: RegistrationStatus } | undefined) || null;
}

// Clears everything that happened to an earlier registration, for a form that is
// being submitted again after the buyer cancelled it.
const RESET_LIFECYCLE_SQL = `status = 'pending', created_at = CURRENT_TIMESTAMP, approved_at = NULL, confirm_by = NULL, confirmed_at = NULL,
  arrival_date = NULL, arrival_note = NULL, doc_ticket = NULL, checked_in_at = NULL, checked_out_at = NULL, cancelled_at = NULL,
  feedback_rating = NULL, feedback_comment = NULL, feedback_at = NULL`;

const DEFAULT_FORM_SET_SQL = `registration_type = ?, gender = ?, full_name = ?, nationality = ?, passport_number = ?,
  company_name = ?, company_website = ?, phone = ?, email = ?, company_type = ?, company_type_other = ?, company_scale = ?,
  company_intro = ?, purpose_of_visit = ?, info_source = ?, info_source_other = ?, exporting_markets = ?, exporting_market_other = ?,
  doc_passport_front = ?, doc_business_card = ?, doc_visa_page = ?, doc_business_license = ?, doc_order_list = ?,
  custom_answers = NULL, form_schema_snapshot = NULL`;

function defaultFormValues(input: ExpoRegistrationInput) {
  return [
    input.registrationType, input.gender, input.fullName, input.nationality, input.passportNumber,
    input.companyName, input.companyWebsite, input.phone, input.email, input.companyType, input.companyTypeOther,
    input.companyScale, input.companyIntro, input.purposeOfVisit, input.infoSource, input.infoSourceOther,
    JSON.stringify(input.exportingMarkets || []), input.exportingMarketOther,
    input.docPassportFront, input.docBusinessCard, input.docVisaPage, input.docBusinessLicense, input.docOrderList || null,
  ];
}

// Edit a registration that is still waiting for review, or submit again one the
// buyer cancelled. Returns false when the registration is not in a state that allows it.
export async function rewriteRegistration(
  id: number,
  userId: number,
  mode: "edit" | "resubmit",
  form: { kind: "default"; input: ExpoRegistrationInput } | { kind: "custom"; answers: Record<string, unknown>; schema: unknown }
): Promise<boolean> {
  const allowed = mode === "edit" ? "status = 'pending'" : "status = 'cancelled'";
  const reset = mode === "resubmit" ? `${RESET_LIFECYCLE_SQL},` : "";
  if (form.kind === "default") {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE expo_registrations SET ${reset} ${DEFAULT_FORM_SET_SQL} WHERE id = ? AND user_id = ? AND ${allowed}`,
      [...defaultFormValues(form.input), id, userId]
    );
    return result.affectedRows > 0;
  }
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE expo_registrations SET ${reset} custom_answers = ?, form_schema_snapshot = ?
     WHERE id = ? AND user_id = ? AND ${allowed}`,
    [JSON.stringify(form.answers || {}), JSON.stringify(form.schema || []), id, userId]
  );
  return result.affectedRows > 0;
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
    `SELECT r.*, u.buyer_no, ${EFFECTIVE_STATUS_SQL} AS effective_status, (r.doc_ticket IS NOT NULL AND r.doc_ticket <> '') AS has_ticket
     FROM expo_registrations r LEFT JOIN users u ON u.id = r.user_id WHERE r.exhibition_id = ? ORDER BY r.created_at DESC`,
    [exhibitionId]
  );
  return rows.map(mapSummaryRow);
}

export async function getRegistrationById(id: number): Promise<ExpoRegistration | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT r.*, u.buyer_no, ${EFFECTIVE_STATUS_SQL} AS effective_status FROM expo_registrations r LEFT JOIN users u ON u.id = r.user_id WHERE r.id = ? LIMIT 1`,
    [id]
  );
  const row = rows[0];
  return row ? mapRow(row) : null;
}

// ---- Buyer side ----------------------------------------------------------

export async function getMyRegistration(exhibitionId: number, userId: number, locale?: string): Promise<MyRegistration | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${MY_SELECT} WHERE r.exhibition_id = ? AND r.user_id = ? LIMIT 1`,
    [exhibitionId, userId]
  );
  return rows[0] ? mapMyRow(rows[0], locale) : null;
}

export async function listMyRegistrations(userId: number, locale?: string): Promise<MyRegistration[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${MY_SELECT} WHERE r.user_id = ? ORDER BY e.start_date DESC, r.id DESC`,
    [userId]
  );
  return rows.map((row) => mapMyRow(row, locale));
}

// Every change below is a single conditional UPDATE, so two taps (or two tabs)
// can never push a registration through a step it is not in.

export async function cancelMyRegistration(id: number, userId: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE expo_registrations r JOIN exhibitions e ON e.id = r.exhibition_id
     SET r.status = 'cancelled', r.cancelled_at = UTC_TIMESTAMP()
     WHERE r.id = ? AND r.user_id = ? AND (
       r.status = 'pending'
       OR (r.status = 'approved' AND (r.confirm_by IS NULL OR r.confirm_by >= UTC_DATE()))
       OR (r.status = 'confirmed' AND r.checked_in_at IS NULL AND e.end_date >= UTC_DATE())
     )`,
    [id, userId]
  );
  return result.affectedRows > 0;
}

export async function confirmMyAttendance(id: number, userId: number, input: ConfirmAttendanceInput): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE expo_registrations r JOIN exhibitions e ON e.id = r.exhibition_id
     SET r.status = 'confirmed', r.confirmed_at = UTC_TIMESTAMP(), r.arrival_date = ?, r.arrival_note = ?, r.doc_ticket = ?
     WHERE r.id = ? AND r.user_id = ? AND r.status = 'approved'
       AND (r.confirm_by IS NULL OR r.confirm_by >= UTC_DATE()) AND e.end_date >= UTC_DATE()`,
    [input.arrivalDate || null, input.arrivalNote?.trim() || null, input.docTicket || null, id, userId]
  );
  return result.affectedRows > 0;
}

export async function submitMyFeedback(id: number, userId: number, rating: number, comment: string): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE expo_registrations r JOIN exhibitions e ON e.id = r.exhibition_id
     SET r.feedback_rating = ?, r.feedback_comment = ?, r.feedback_at = UTC_TIMESTAMP()
     WHERE r.id = ? AND r.user_id = ? AND r.feedback_at IS NULL
       AND (r.status = 'attended' OR (r.status = 'confirmed' AND e.end_date < UTC_DATE()))`,
    [rating, comment.trim() || null, id, userId]
  );
  return result.affectedRows > 0;
}

export type CheckInOutcome = "checked_in" | "checked_out" | "not_confirmed" | "outside_dates" | "already_done" | "no_registration";

// Scanning the exhibition QR code. `action` is explicit so a double tap can never
// check someone in and straight back out.
export async function checkInOrOut(exhibitionId: number, userId: number, action: "check_in" | "check_out"): Promise<CheckInOutcome> {
  const existing = await findExistingRegistration(exhibitionId, userId);
  if (!existing) return "no_registration";

  if (action === "check_in") {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE expo_registrations r JOIN exhibitions e ON e.id = r.exhibition_id
       SET r.status = 'attended', r.checked_in_at = UTC_TIMESTAMP()
       WHERE r.id = ? AND r.user_id = ? AND r.status = 'confirmed'
         AND UTC_DATE() BETWEEN DATE_SUB(e.start_date, INTERVAL 1 DAY) AND DATE_ADD(e.end_date, INTERVAL 1 DAY)`,
      [existing.id, userId]
    );
    if (result.affectedRows > 0) return "checked_in";
    if (existing.status === "attended") return "already_done";
    if (existing.status === "confirmed") return "outside_dates";
    return "not_confirmed";
  }

  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE expo_registrations SET checked_out_at = UTC_TIMESTAMP()
     WHERE id = ? AND user_id = ? AND status = 'attended' AND checked_in_at IS NOT NULL AND checked_out_at IS NULL`,
    [existing.id, userId]
  );
  if (result.affectedRows > 0) return "checked_out";
  return existing.status === "attended" ? "already_done" : "not_confirmed";
}

// ---- Admin side ----------------------------------------------------------

// Default "confirm by" date offered when approving: the day before the show, or
// the first day of the show when that is less than a day away. Null when the show
// is already over.
export function defaultConfirmBy(startDate: string, endDate: string, now: Date = new Date()): string | null {
  const today = now.toISOString().slice(0, 10);
  if (endDate < today) return null;
  const start = new Date(`${startDate}T00:00:00Z`);
  const dayBefore = new Date(start.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return dayBefore > today ? dayBefore : startDate > today ? startDate : today;
}

// The organiser changes a registration's status. Moving to a status stamps the
// matching time, and moving back to "pending" clears the approval.
export async function setRegistrationStatus(id: number, status: RegistrationStatus, confirmBy?: string | null): Promise<boolean> {
  let sets: string;
  const values: unknown[] = [status];
  switch (status) {
    case "approved":
      sets = "approved_at = COALESCE(approved_at, UTC_TIMESTAMP()), confirm_by = ?, cancelled_at = NULL";
      values.push(confirmBy || null);
      break;
    case "pending":
      sets = "approved_at = NULL, confirm_by = NULL, confirmed_at = NULL, checked_in_at = NULL, checked_out_at = NULL, cancelled_at = NULL";
      break;
    case "confirmed":
      sets = "confirmed_at = COALESCE(confirmed_at, UTC_TIMESTAMP()), approved_at = COALESCE(approved_at, UTC_TIMESTAMP()), cancelled_at = NULL";
      break;
    case "attended":
      sets = "checked_in_at = COALESCE(checked_in_at, UTC_TIMESTAMP()), confirmed_at = COALESCE(confirmed_at, UTC_TIMESTAMP()), approved_at = COALESCE(approved_at, UTC_TIMESTAMP()), cancelled_at = NULL";
      break;
    case "cancelled":
      sets = "cancelled_at = COALESCE(cancelled_at, UTC_TIMESTAMP())";
      break;
    default: // rejected, absent
      sets = "cancelled_at = NULL";
  }
  const [result] = await pool.query<ResultSetHeader>(`UPDATE expo_registrations SET status = ?, ${sets} WHERE id = ?`, [...values, id]);
  return result.affectedRows > 0;
}
