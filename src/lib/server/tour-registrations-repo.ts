import pool from "@/lib/db";

function safeParseJson(text: any): any {
  if (!text) return null;
  if (typeof text === "object") return text;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Custom-answer file uploads carry large base64 blobs -- strip them from
// summary rows the same way expo-registrations does, keyed off the field
// types in the schema snapshot.
function stripFileAnswers(customAnswers: any, formSchemaSnapshot: any) {
  if (!customAnswers || !Array.isArray(formSchemaSnapshot)) return customAnswers;
  const fileFieldIds = new Set(
    formSchemaSnapshot.filter((f: any) => f.type === "file").map((f: any) => f.id)
  );
  if (fileFieldIds.size === 0) return customAnswers;
  const stripped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(customAnswers)) {
    stripped[key] = fileFieldIds.has(key) ? (value ? true : value) : value;
  }
  return stripped;
}

function mapRow(row: any) {
  return {
    id: String(row.id),
    tourId: String(row.tour_id),
    userId: String(row.user_id),
    status: row.status,
    createdAt: row.created_at,
    customAnswers: safeParseJson(row.custom_answers),
    formSchemaSnapshot: safeParseJson(row.form_schema_snapshot),
  };
}

function mapSummaryRow(row: any) {
  const formSchemaSnapshot = safeParseJson(row.form_schema_snapshot);
  return {
    id: String(row.id),
    tourId: String(row.tour_id),
    status: row.status,
    createdAt: row.created_at,
    customAnswers: stripFileAnswers(safeParseJson(row.custom_answers), formSchemaSnapshot),
    formSchemaSnapshot,
  };
}

export async function createTourRegistration(
  userId: number,
  tourId: number,
  customAnswers: Record<string, unknown>,
  formSchemaSnapshot: unknown
) {
  const [result] = await pool.query(
    `INSERT INTO tour_registrations (tour_id, user_id, custom_answers, form_schema_snapshot, status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [tourId, userId, JSON.stringify(customAnswers || {}), JSON.stringify(formSchemaSnapshot || [])]
  );
  return (result as any).insertId;
}

export async function findExistingTourRegistration(tourId: number, userId: number) {
  const [rows] = await pool.query(
    "SELECT id FROM tour_registrations WHERE tour_id = ? AND user_id = ? LIMIT 1",
    [tourId, userId]
  );
  return (rows as any[])[0] || null;
}

export async function listRegistrationsForTour(tourId: number) {
  const [rows] = await pool.query(
    "SELECT * FROM tour_registrations WHERE tour_id = ? ORDER BY created_at DESC",
    [tourId]
  );
  return (rows as any[]).map(mapSummaryRow);
}

export async function getTourRegistrationById(id: number) {
  const [rows] = await pool.query("SELECT * FROM tour_registrations WHERE id = ? LIMIT 1", [id]);
  const row = (rows as any[])[0];
  return row ? mapRow(row) : null;
}

export async function updateTourRegistrationStatus(id: number, status: string) {
  await pool.query("UPDATE tour_registrations SET status = ? WHERE id = ?", [status, id]);
}
