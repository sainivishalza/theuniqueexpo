import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";

// A history of edits to an exhibition's text fields, so a mistake can be undone. Pictures are not part of it (they are
// large). Each entry keeps the exhibition as it was BEFORE one change and the names of the fields that change touched;
// "undo" puts those fields back (and is itself recorded, so an undo can be undone).

export const HISTORY_FIELDS = [
  "slug", "title", "start_date", "end_date", "venue", "city", "country", "industry", "description", "highlights",
  "description_ru", "description_zh", "highlights_ru", "highlights_zh", "exhibitors", "visitors", "organizer", "website", "color",
] as const;
export type HistoryField = (typeof HISTORY_FIELDS)[number];
export type Snapshot = Record<HistoryField, string>;

export const MAX_VERSIONS = 50;

const DATE_FIELDS: HistoryField[] = ["start_date", "end_date"];

function norm(field: HistoryField, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (DATE_FIELDS.includes(field)) return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  return String(value);
}

export async function readSnapshot(exhibitionId: number): Promise<Snapshot | null> {
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT ${HISTORY_FIELDS.join(", ")} FROM exhibitions WHERE id = ?`, [exhibitionId]);
  if (!rows[0]) return null;
  return Object.fromEntries(HISTORY_FIELDS.map((f) => [f, norm(f, rows[0][f])])) as Snapshot;
}

export function changedFields(before: Snapshot, after: Snapshot): HistoryField[] {
  return HISTORY_FIELDS.filter((f) => before[f] !== after[f]);
}

function missingTable(err: unknown): boolean {
  return (err as { code?: string }).code === "ER_NO_SUCH_TABLE";
}

/** Remembers a change that just happened (nothing is saved when nothing changed). Never throws: history is a safety net. */
export async function recordChange(exhibitionId: number, before: Snapshot, after: Snapshot, admin: { id: number; name: string }, kind: "edit" | "undo" = "edit"): Promise<void> {
  const changed = changedFields(before, after);
  if (changed.length === 0) return;
  try {
    await pool.query("INSERT INTO exhibition_versions (exhibition_id, admin_id, admin_name, kind, changed_json, before_json) VALUES (?, ?, ?, ?, ?, ?)", [
      exhibitionId, admin.id, admin.name.slice(0, 255), kind, JSON.stringify(changed), JSON.stringify(before),
    ]);
    await pool.query(
      "DELETE FROM exhibition_versions WHERE exhibition_id = ? AND id NOT IN (SELECT id FROM (SELECT id FROM exhibition_versions WHERE exhibition_id = ? ORDER BY id DESC LIMIT ?) keep)",
      [exhibitionId, exhibitionId, MAX_VERSIONS]
    );
  } catch (err) {
    if (!missingTable(err)) console.error("Could not save exhibition history:", err);
  }
}

export interface VersionView {
  id: number;
  kind: string;
  adminName: string;
  createdAt: string;
  changed: HistoryField[];
}

export async function listVersions(exhibitionId: number): Promise<VersionView[]> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT id, kind, admin_name, changed_json, created_at FROM exhibition_versions WHERE exhibition_id = ? ORDER BY id DESC LIMIT ?", [exhibitionId, MAX_VERSIONS]);
    return rows.map((r) => {
      let changed: HistoryField[] = [];
      try { changed = (JSON.parse(String(r.changed_json)) as string[]).filter((f): f is HistoryField => (HISTORY_FIELDS as readonly string[]).includes(f)); } catch {}
      return { id: Number(r.id), kind: String(r.kind), adminName: String(r.admin_name), createdAt: new Date(r.created_at).toISOString(), changed };
    });
  } catch (err) {
    if (missingTable(err)) return [];
    throw err;
  }
}

export type UndoResult = { ok: true } | { ok: false; reason: "not_found" | "slug_taken" | "nothing_to_undo" };

/** Puts back how the exhibition looked before the given change. */
export async function undoVersion(exhibitionId: number, versionId: number, admin: { id: number; name: string }): Promise<UndoResult> {
  let rows: RowDataPacket[];
  try {
    [rows] = await pool.query<RowDataPacket[]>("SELECT before_json FROM exhibition_versions WHERE id = ? AND exhibition_id = ?", [versionId, exhibitionId]);
  } catch (err) {
    if (missingTable(err)) return { ok: false, reason: "not_found" };
    throw err;
  }
  if (!rows[0]) return { ok: false, reason: "not_found" };
  let wanted: Partial<Snapshot>;
  try { wanted = JSON.parse(String(rows[0].before_json)); } catch { return { ok: false, reason: "not_found" }; }
  const current = await readSnapshot(exhibitionId);
  if (!current) return { ok: false, reason: "not_found" };
  const target = { ...current, ...Object.fromEntries(HISTORY_FIELDS.filter((f) => typeof wanted[f] === "string").map((f) => [f, wanted[f] as string])) } as Snapshot;
  if (changedFields(current, target).length === 0) return { ok: false, reason: "nothing_to_undo" };
  // The empty translations / highlights are stored as NULL like the editor does; dates and numbers as typed.
  const nullable: HistoryField[] = ["description_ru", "description_zh", "highlights_ru", "highlights_zh"];
  const sets = HISTORY_FIELDS.map((f) => `${f} = ?`).join(", ");
  const values = HISTORY_FIELDS.map((f) => (nullable.includes(f) && target[f] === "" ? null : f === "exhibitors" ? Number(target[f]) || 0 : target[f]));
  try {
    await pool.query(`UPDATE exhibitions SET ${sets} WHERE id = ?`, [...values, exhibitionId]);
  } catch (err) {
    if ((err as { code?: string }).code === "ER_DUP_ENTRY") return { ok: false, reason: "slug_taken" };
    throw err;
  }
  await recordChange(exhibitionId, current, target, admin, "undo");
  return { ok: true };
}
