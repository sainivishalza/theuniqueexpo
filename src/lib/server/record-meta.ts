import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";

// Internal notes, tags and "assigned to" on buyers and registrations. Only admins ever see them.

export const SUBJECT_TYPES = ["buyer", "registration"] as const;
export type SubjectType = (typeof SUBJECT_TYPES)[number];
export const MAX_NOTE = 2000;
export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 30;

export function parseType(value: unknown): SubjectType | null {
  return typeof value === "string" && (SUBJECT_TYPES as readonly string[]).includes(value) ? (value as SubjectType) : null;
}

export function parseId(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Tags as typed -> tidy list: trimmed, one space between words, no repeats (any letter case), at most 10 of up to 30 characters. */
export function cleanTags(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    if (typeof raw !== "string") return null;
    const tag = raw.replace(/[\u0000-\u001f\u007f,]+/g, " ").replace(/\s+/g, " ").trim();
    if (!tag) continue;
    if (tag.length > MAX_TAG_LENGTH) return null;
    if (seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    out.push(tag);
  }
  return out.length > MAX_TAGS ? null : out;
}

function missingTable(err: unknown): boolean {
  return (err as { code?: string }).code === "ER_NO_SUCH_TABLE";
}

/** Does the buyer / registration exist? */
export async function subjectExists(type: SubjectType, id: number): Promise<boolean> {
  const sql = type === "buyer" ? "SELECT 1 FROM users WHERE id = ? AND role = 'buyer'" : "SELECT 1 FROM expo_registrations WHERE id = ?";
  const [rows] = await pool.query<RowDataPacket[]>(`${sql} LIMIT 1`, [id]);
  return rows.length > 0;
}

export interface RecordMeta {
  notes: { id: number; adminId: number | null; adminName: string; body: string; createdAt: string }[];
  tags: string[];
  assignee: { id: number; name: string } | null;
  /** The admins a record can be given to. */
  admins: { id: number; name: string }[];
}

export async function getMeta(type: SubjectType, id: number): Promise<RecordMeta> {
  const empty: RecordMeta = { notes: [], tags: [], assignee: null, admins: [] };
  const [admins] = await pool.query<RowDataPacket[]>("SELECT id, name FROM users WHERE role = 'admin' AND status <> 'suspended' ORDER BY name, id");
  try {
    const [notes] = await pool.query<RowDataPacket[]>("SELECT id, admin_id, admin_name, body, created_at FROM admin_notes WHERE subject_type = ? AND subject_id = ? ORDER BY id DESC LIMIT 200", [type, id]);
    const [tags] = await pool.query<RowDataPacket[]>("SELECT tag FROM admin_record_tags WHERE subject_type = ? AND subject_id = ? ORDER BY tag", [type, id]);
    const [who] = await pool.query<RowDataPacket[]>(
      "SELECT a.admin_id, u.name FROM admin_record_assignee a JOIN users u ON u.id = a.admin_id WHERE a.subject_type = ? AND a.subject_id = ?",
      [type, id]
    );
    return {
      notes: notes.map((n) => ({ id: Number(n.id), adminId: n.admin_id === null ? null : Number(n.admin_id), adminName: String(n.admin_name), body: String(n.body), createdAt: new Date(n.created_at).toISOString() })),
      tags: tags.map((t) => String(t.tag)),
      assignee: who[0] ? { id: Number(who[0].admin_id), name: String(who[0].name) } : null,
      admins: admins.map((a) => ({ id: Number(a.id), name: String(a.name) })),
    };
  } catch (err) {
    if (missingTable(err)) return { ...empty, admins: admins.map((a) => ({ id: Number(a.id), name: String(a.name) })) };
    throw err;
  }
}

export async function addNote(type: SubjectType, id: number, admin: { id: number; name: string }, body: string): Promise<number> {
  const [res] = await pool.query<ResultSetHeader>("INSERT INTO admin_notes (subject_type, subject_id, admin_id, admin_name, body) VALUES (?, ?, ?, ?, ?)", [type, id, admin.id, admin.name.slice(0, 255), body]);
  return res.insertId;
}

/** A note can be removed by the admin who wrote it. */
export async function deleteNote(noteId: number, adminId: number): Promise<boolean> {
  const [res] = await pool.query<ResultSetHeader>("DELETE FROM admin_notes WHERE id = ? AND admin_id = ?", [noteId, adminId]);
  return res.affectedRows > 0;
}

export async function setTags(type: SubjectType, id: number, tags: string[]): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("DELETE FROM admin_record_tags WHERE subject_type = ? AND subject_id = ?", [type, id]);
    if (tags.length > 0) await conn.query("INSERT INTO admin_record_tags (subject_type, subject_id, tag) VALUES ?", [tags.map((t) => [type, id, t])]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** Gives the record to an admin (null = nobody). Returns false when that is not an active admin. */
export async function setAssignee(type: SubjectType, id: number, adminId: number | null): Promise<boolean> {
  if (adminId === null) {
    await pool.query("DELETE FROM admin_record_assignee WHERE subject_type = ? AND subject_id = ?", [type, id]);
    return true;
  }
  const [rows] = await pool.query<RowDataPacket[]>("SELECT 1 FROM users WHERE id = ? AND role = 'admin' AND status <> 'suspended'", [adminId]);
  if (rows.length === 0) return false;
  await pool.query(
    "INSERT INTO admin_record_assignee (subject_type, subject_id, admin_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE admin_id = VALUES(admin_id)",
    [type, id, adminId]
  );
  return true;
}

/** For filtering a list: every tagged / assigned record of a type at once. */
export async function getOverview(type: SubjectType): Promise<{ tags: Record<string, string[]>; assignees: Record<string, number>; allTags: string[] }> {
  try {
    const [tags] = await pool.query<RowDataPacket[]>("SELECT subject_id, tag FROM admin_record_tags WHERE subject_type = ?", [type]);
    const [who] = await pool.query<RowDataPacket[]>("SELECT subject_id, admin_id FROM admin_record_assignee WHERE subject_type = ?", [type]);
    const byId: Record<string, string[]> = {};
    for (const t of tags) (byId[String(t.subject_id)] ??= []).push(String(t.tag));
    const assignees: Record<string, number> = {};
    for (const w of who) assignees[String(w.subject_id)] = Number(w.admin_id);
    return { tags: byId, assignees, allTags: Array.from(new Set(tags.map((t) => String(t.tag)))).sort((a, b) => a.localeCompare(b)) };
  } catch (err) {
    if (missingTable(err)) return { tags: {}, assignees: {}, allTags: [] };
    throw err;
  }
}
