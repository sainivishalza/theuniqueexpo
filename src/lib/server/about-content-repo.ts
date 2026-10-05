import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { safeParseJson } from "@/lib/server/db-helpers";
import { ABOUT_LOCALES, DEFAULT_ABOUT_CONTENT, normalizeAboutContent, resolveAboutTranslation, type AboutContent } from "@/lib/about-content";
import { DEFAULT_ABOUT_TRANSLATIONS } from "@/lib/about-translations";

async function loadAboutContent(): Promise<AboutContent> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT content FROM about_content WHERE id = 1 LIMIT 1");
  const row = rows[0];
  if (!row) return DEFAULT_ABOUT_CONTENT;
  return normalizeAboutContent(safeParseJson(row.content));
}

// Public page: pass the visitor's locale to get Russian/Chinese text laid
// over the English (the hero image always comes from the English row).
export async function getAboutContent(locale?: string): Promise<AboutContent> {
  const content = await loadAboutContent();
  const translation = locale ? resolveAboutTranslation(content, locale, DEFAULT_ABOUT_TRANSLATIONS) : null;
  const { translations: _unused, ...base } = content;
  void _unused;
  return translation ? { ...base, ...translation } : base;
}

// Admin editor: English plus the text each language currently shows.
export async function getAboutContentForAdmin(): Promise<AboutContent> {
  const content = await loadAboutContent();
  const translations: NonNullable<AboutContent["translations"]> = {};
  for (const loc of ABOUT_LOCALES) {
    const t = resolveAboutTranslation(content, loc, DEFAULT_ABOUT_TRANSLATIONS);
    if (t) translations[loc] = t;
  }
  return { ...content, translations };
}

export async function updateAboutContent(content: AboutContent): Promise<void> {
  await pool.query(
    `INSERT INTO about_content (id, content) VALUES (1, ?)
     ON DUPLICATE KEY UPDATE content = VALUES(content)`,
    [JSON.stringify(content)]
  );
}
