import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";

// Answers to registration questions the buyer profile has no field for (see migration 065).

export interface ExtraInfoRow {
  key: string;
  label: string;
  kind: string;
  /** A file's data URL is not carried here (it is large): `hasFile` says one is saved. */
  value: string;
  hasFile: boolean;
  updatedAt: number;
}

/** Everything saved for this buyer; files only as a flag. */
export async function listExtraInfo(userId: number): Promise<ExtraInfoRow[]> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT info_key, label, kind, IF(kind = 'file', '', value) AS value, (kind = 'file' AND value IS NOT NULL AND value <> '') AS has_file,
              UNIX_TIMESTAMP(updated_at) AS ts
       FROM buyer_extra_info WHERE user_id = ? ORDER BY updated_at DESC, info_key`,
      [userId]
    );
    return rows.map((r) => ({
      key: String(r.info_key),
      label: String(r.label),
      kind: String(r.kind),
      value: r.value == null ? "" : String(r.value),
      hasFile: !!Number(r.has_file),
      updatedAt: Number(r.ts),
    }));
  } catch (err) {
    // The table does not exist until migration 065 has run.
    if ((err as { code?: string }).code === "ER_NO_SUCH_TABLE") return [];
    throw err;
  }
}

/** One saved value, including a file's data URL. */
export async function getExtraValue(userId: number, key: string): Promise<string | null> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT value FROM buyer_extra_info WHERE user_id = ? AND info_key = ?", [userId, key]);
    return rows[0]?.value == null ? null : String(rows[0].value);
  } catch (err) {
    if ((err as { code?: string }).code === "ER_NO_SUCH_TABLE") return null;
    throw err;
  }
}

export async function saveExtraInfo(userId: number, items: { key: string; label: string; kind: string; value: string }[]): Promise<void> {
  if (items.length === 0) return;
  await pool.query(
    `INSERT INTO buyer_extra_info (user_id, info_key, label, kind, value) VALUES ?
     ON DUPLICATE KEY UPDATE label = VALUES(label), kind = VALUES(kind), value = VALUES(value)`,
    [items.map((i) => [userId, i.key, i.label.slice(0, 255), i.kind, i.value])]
  );
}
