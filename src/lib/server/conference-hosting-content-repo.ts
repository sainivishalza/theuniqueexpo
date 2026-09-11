import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { safeParseJson } from "@/lib/server/db-helpers";
import { DEFAULT_CONFERENCE_HOSTING_CONTENT, normalizeConferenceHostingContent, type ConferenceHostingContent } from "@/lib/conference-hosting-content";

export async function getConferenceHostingContent(): Promise<ConferenceHostingContent> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT content FROM conference_hosting_content WHERE id = 1 LIMIT 1");
  const row = rows[0];
  if (!row) return DEFAULT_CONFERENCE_HOSTING_CONTENT;
  return normalizeConferenceHostingContent(safeParseJson(row.content));
}

export async function updateConferenceHostingContent(content: ConferenceHostingContent): Promise<void> {
  await pool.query(
    `INSERT INTO conference_hosting_content (id, content) VALUES (1, ?)
     ON DUPLICATE KEY UPDATE content = VALUES(content)`,
    [JSON.stringify(content)]
  );
}
