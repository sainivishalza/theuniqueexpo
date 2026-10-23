import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";

// Saved announcement texts. The text is kept in all three languages, as typed (fields such as {name} are filled in
// only when an announcement is sent).

export type Langs = { en: string; ru: string; zh: string };

export interface AnnouncementTemplate {
  id: number;
  name: string;
  subject: Langs;
  message: Langs;
  updatedAt: string;
}

export const MAX_TEMPLATES = 100;

function parseLangs(raw: unknown): Langs {
  try {
    const v = JSON.parse(String(raw ?? "{}"));
    return { en: String(v.en ?? ""), ru: String(v.ru ?? ""), zh: String(v.zh ?? "") };
  } catch {
    return { en: "", ru: "", zh: "" };
  }
}

function missingTable(err: unknown): boolean {
  return (err as { code?: string }).code === "ER_NO_SUCH_TABLE";
}

export async function listTemplates(): Promise<AnnouncementTemplate[]> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT id, name, subject_json, message_json, updated_at FROM announcement_templates ORDER BY name");
    return rows.map((r) => ({ id: Number(r.id), name: String(r.name), subject: parseLangs(r.subject_json), message: parseLangs(r.message_json), updatedAt: new Date(r.updated_at).toISOString() }));
  } catch (err) {
    if (missingTable(err)) return [];
    throw err;
  }
}

/** Saves under a name; a name that exists is replaced. Returns false when the limit is reached or the table is missing. */
export async function saveTemplate(name: string, subject: Langs, message: Langs, adminId: number): Promise<{ id: number; replaced: boolean } | "limit" | "unavailable"> {
  try {
    const [count] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM announcement_templates WHERE name <> ?", [name]);
    if (Number(count[0]?.n ?? 0) >= MAX_TEMPLATES) return "limit";
    const [before] = await pool.query<RowDataPacket[]>("SELECT id FROM announcement_templates WHERE name = ?", [name]);
    await pool.query<ResultSetHeader>(
      `INSERT INTO announcement_templates (name, subject_json, message_json, created_by) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE subject_json = VALUES(subject_json), message_json = VALUES(message_json)`,
      [name, JSON.stringify(subject), JSON.stringify(message), adminId]
    );
    const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM announcement_templates WHERE name = ?", [name]);
    return { id: Number(rows[0]?.id), replaced: before.length > 0 };
  } catch (err) {
    if (missingTable(err)) return "unavailable";
    throw err;
  }
}

export async function deleteTemplate(id: number): Promise<string | null> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT name FROM announcement_templates WHERE id = ?", [id]);
    if (!rows[0]) return null;
    await pool.query("DELETE FROM announcement_templates WHERE id = ?", [id]);
    return String(rows[0].name);
  } catch (err) {
    if (missingTable(err)) return null;
    throw err;
  }
}
