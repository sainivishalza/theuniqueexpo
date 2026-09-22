import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { safeParseJson } from "@/lib/server/db-helpers";
import { DEFAULT_CHINA_TRAVEL_CONTENT, normalizeChinaTravelContent, type ChinaTravelContent } from "@/lib/china-travel-content";

export async function getChinaTravelContent(): Promise<ChinaTravelContent> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT content FROM china_travel_content WHERE id = 1 LIMIT 1");
  const row = rows[0];
  if (!row) return DEFAULT_CHINA_TRAVEL_CONTENT;
  return normalizeChinaTravelContent(safeParseJson(row.content));
}

export async function updateChinaTravelContent(content: ChinaTravelContent): Promise<void> {
  await pool.query(
    `INSERT INTO china_travel_content (id, content) VALUES (1, ?)
     ON DUPLICATE KEY UPDATE content = VALUES(content)`,
    [JSON.stringify(content)]
  );
}
