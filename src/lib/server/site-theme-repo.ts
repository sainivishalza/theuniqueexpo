import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { safeParseJson } from "@/lib/server/db-helpers";
import { DEFAULT_SITE_THEME, normalizeSiteTheme, type SiteTheme } from "@/lib/site-theme";

export async function getSiteTheme(): Promise<SiteTheme> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT content FROM site_theme WHERE id = 1 LIMIT 1");
  const row = rows[0];
  if (!row) return DEFAULT_SITE_THEME;
  return normalizeSiteTheme(safeParseJson(row.content));
}

export async function updateSiteTheme(theme: SiteTheme): Promise<void> {
  await pool.query(
    `INSERT INTO site_theme (id, content) VALUES (1, ?)
     ON DUPLICATE KEY UPDATE content = VALUES(content)`,
    [JSON.stringify(theme)]
  );
}
