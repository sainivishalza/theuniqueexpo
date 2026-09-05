import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { safeParseJson } from "@/lib/server/db-helpers";
import { DEFAULT_ABOUT_CONTENT, normalizeAboutContent, type AboutContent } from "@/lib/about-content";

export async function getAboutContent(): Promise<AboutContent> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT content FROM about_content WHERE id = 1 LIMIT 1");
  const row = rows[0];
  if (!row) return DEFAULT_ABOUT_CONTENT;
  return normalizeAboutContent(safeParseJson(row.content));
}

export async function updateAboutContent(content: AboutContent): Promise<void> {
  await pool.query(
    `INSERT INTO about_content (id, content) VALUES (1, ?)
     ON DUPLICATE KEY UPDATE content = VALUES(content)`,
    [JSON.stringify(content)]
  );
}
