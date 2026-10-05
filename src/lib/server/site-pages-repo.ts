import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { safeParseJson } from "@/lib/server/db-helpers";
import { DEFAULT_SITE_PAGE_CONTENT, normalizeSitePageContent, resolveSitePageTranslation, TRANSLATED_LOCALES, type SitePageContent } from "@/lib/site-pages";
import { DEFAULT_SITE_PAGE_TRANSLATIONS } from "@/lib/site-page-translations";

async function loadSitePage(slug: string): Promise<SitePageContent> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT content FROM site_pages WHERE slug = ? LIMIT 1", [slug]);
  const row = rows[0];
  if (!row) return DEFAULT_SITE_PAGE_CONTENT[slug] || normalizeSitePageContent(slug, null);
  return normalizeSitePageContent(slug, safeParseJson(row.content));
}

// Public pages: pass the visitor's locale to get the Russian/Chinese text
// laid over the English (contact details always come from the English row).
export async function getSitePage(slug: string, locale?: string): Promise<SitePageContent> {
  const content = await loadSitePage(slug);
  const translation = locale ? resolveSitePageTranslation(slug, content, locale, DEFAULT_SITE_PAGE_TRANSLATIONS) : null;
  const { translations: _unused, ...base } = content;
  void _unused;
  return translation ? { ...base, ...translation } : base;
}

// Admin editor: the English content plus the translation each language
// currently shows (stored or built-in default), so it can be edited.
export async function getSitePageForAdmin(slug: string): Promise<SitePageContent> {
  const content = await loadSitePage(slug);
  const translations: NonNullable<SitePageContent["translations"]> = {};
  for (const loc of TRANSLATED_LOCALES) {
    const t = resolveSitePageTranslation(slug, content, loc, DEFAULT_SITE_PAGE_TRANSLATIONS);
    if (t) translations[loc] = t;
  }
  return { ...content, translations };
}

export async function updateSitePage(slug: string, content: SitePageContent): Promise<void> {
  await pool.query(
    `INSERT INTO site_pages (slug, content) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE content = VALUES(content)`,
    [slug, JSON.stringify(content)]
  );
}
