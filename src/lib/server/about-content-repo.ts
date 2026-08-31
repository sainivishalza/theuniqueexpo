import pool from "@/lib/db";
import { DEFAULT_ABOUT_CONTENT, normalizeAboutContent, type AboutContent } from "@/lib/about-content";

function safeParseJson(value: any): any {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function getAboutContent(): Promise<AboutContent> {
  const [rows] = await pool.query("SELECT content FROM about_content WHERE id = 1 LIMIT 1");
  const row = (rows as any[])[0];
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
