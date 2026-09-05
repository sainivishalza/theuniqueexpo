import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { safeParseJson } from "@/lib/server/db-helpers";
import { DEFAULT_SITE_PAGE_CONTENT, normalizeSitePageContent, type SitePageContent } from "@/lib/site-pages";

export async function getSitePage(slug: string): Promise<SitePageContent> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT content FROM site_pages WHERE slug = ? LIMIT 1", [slug]);
  const row = rows[0];
  if (!row) return DEFAULT_SITE_PAGE_CONTENT[slug] || normalizeSitePageContent(slug, null);
  return normalizeSitePageContent(slug, safeParseJson(row.content));
}

export async function updateSitePage(slug: string, content: SitePageContent): Promise<void> {
  await pool.query(
    `INSERT INTO site_pages (slug, content) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE content = VALUES(content)`,
    [slug, JSON.stringify(content)]
  );
}
