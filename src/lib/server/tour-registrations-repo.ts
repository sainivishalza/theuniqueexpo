import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";
import { safeParseJson, stripFileAnswers } from "@/lib/server/db-helpers";

function mapRow(row: RowDataPacket) {
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

function mapSummaryRow(row: RowDataPacket) {
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
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO tour_registrations (tour_id, user_id, custom_answers, form_schema_snapshot, status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [tourId, userId, JSON.stringify(customAnswers || {}), JSON.stringify(formSchemaSnapshot || [])]
  );
  return result.insertId;
}

export async function findExistingTourRegistration(tourId: number, userId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM tour_registrations WHERE tour_id = ? AND user_id = ? LIMIT 1",
    [tourId, userId]
  );
  return rows[0] || null;
}

export async function listRegistrationsForTour(tourId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM tour_registrations WHERE tour_id = ? ORDER BY created_at DESC",
    [tourId]
  );
  return rows.map(mapSummaryRow);
}

export async function getTourRegistrationById(id: number) {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM tour_registrations WHERE id = ? LIMIT 1", [id]);
  const row = rows[0];
  return row ? mapRow(row) : null;
}

export async function updateTourRegistrationStatus(id: number, status: string) {
  await pool.query("UPDATE tour_registrations SET status = ? WHERE id = ?", [status, id]);
}
