import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";
import { toDateOnlyString, formatDateRange, safeParseArray, safeParseJson } from "@/lib/server/db-helpers";
import type { CustomFormSchema } from "@/lib/custom-registration-form";

export interface ExhibitionInput {
  slug: string;
  title: string;
  startDate: string;
  endDate: string;
  venue: string;
  city: string;
  country: string;
  industry: string;
  description: string;
  highlights: string[];
  // Optional translations of description/highlights. Blank/omitted falls
  // back to the English fields above when serving that locale.
  descriptionRu?: string;
  descriptionZh?: string;
  highlightsRu?: string[];
  highlightsZh?: string[];
  exhibitors: number;
  visitors: string;
  organizer: string;
  website: string;
  color: string;
  image?: string;
  galleryImages?: string[];
}

// Picks the description/highlights for the requested locale, falling back
// to English whenever a translation hasn't been filled in yet -- admins
// add exhibitions in English first and translate them over time.
export function mapExhibitionRow(row: RowDataPacket, locale?: string) {
  const descriptionRu = row.description_ru || "";
  const descriptionZh = row.description_zh || "";
  const highlightsRu = safeParseArray(row.highlights_ru);
  const highlightsZh = safeParseArray(row.highlights_zh);
  const description =
    (locale === "ru" && descriptionRu) ||
    (locale === "zh" && descriptionZh) ||
    row.description;
  const highlights =
    (locale === "ru" && highlightsRu.length > 0 && highlightsRu) ||
    (locale === "zh" && highlightsZh.length > 0 && highlightsZh) ||
    safeParseArray(row.highlights);
  return {
    id: String(row.id),
    slug: row.slug,
    title: row.title,
    dates: formatDateRange(row.start_date, row.end_date),
    startDate: toDateOnlyString(row.start_date),
    endDate: toDateOnlyString(row.end_date),
    venue: row.venue,
    city: row.city,
    country: row.country,
    industry: row.industry,
    description,
    highlights,
    descriptionRu,
    descriptionZh,
    highlightsRu,
    highlightsZh,
    exhibitors: row.exhibitors,
    visitors: row.visitors,
    organizer: row.organizer,
    website: row.website,
    color: row.color,
    image: row.image,
    galleryImages: safeParseArray(row.gallery_images),
    registrationEnabled: row.registration_enabled === undefined ? true : !!row.registration_enabled,
    registrationFormSchema: safeParseJson(row.registration_form_schema) as CustomFormSchema | null,
    // Cache-busting value for the image/gallery endpoints below -- their
    // URL is otherwise identical before and after an admin re-uploads a
    // poster, so browsers/CDN would keep serving the old cached bytes.
    updatedAt: row.updated_at ? Math.floor(new Date(row.updated_at).getTime() / 1000) : 0,
  };
}

// List views only ever render a thumbnail, never re-submit the image, so
// never pull the raw column (uploaded posters are base64 and can run into
// the hundreds of KB each -- 20+ of those turned every list fetch into a
// multi-megabyte payload). Point at the dedicated image endpoint instead;
// plain external URLs (short, already cheap) pass through unchanged.
export async function listExhibitions(locale?: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, slug, title, start_date, end_date, venue, city, country, industry, description,
            highlights, description_ru, description_zh, highlights_ru, highlights_zh,
            exhibitors, visitors, organizer, website, color, registration_enabled, registration_form_schema,
            updated_at,
            IF(LEFT(image, 5) = 'data:', CONCAT('/api/exhibitions/', slug, '/image?v=', UNIX_TIMESTAMP(updated_at)), image) AS image
     FROM exhibitions ORDER BY start_date ASC`
  );
  return rows.map((row) => mapExhibitionRow(row, locale));
}

export async function getExhibitionBySlugOrId(slugOrId: string, locale?: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM exhibitions WHERE slug = ? OR id = ? LIMIT 1",
    [slugOrId, Number(slugOrId) || 0]
  );
  const row = rows[0];
  return row ? mapExhibitionRow(row, locale) : null;
}

// Targeted lookup for the dedicated image-serving route -- avoids pulling
// every other column just to read the (potentially huge) image value.
export async function getExhibitionImageValue(slugOrId: string): Promise<string | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT image FROM exhibitions WHERE slug = ? OR id = ? LIMIT 1",
    [slugOrId, Number(slugOrId) || 0]
  );
  const row = rows[0];
  return row ? row.image : null;
}

// Targeted lookup for the dedicated gallery-image-serving route -- same
// reasoning as getExhibitionImageValue above.
export async function getExhibitionGalleryImageValue(slugOrId: string, index: number): Promise<string | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT gallery_images FROM exhibitions WHERE slug = ? OR id = ? LIMIT 1",
    [slugOrId, Number(slugOrId) || 0]
  );
  const row = rows[0];
  if (!row) return null;
  const images = safeParseArray(row.gallery_images);
  return images[index] || null;
}

export async function createExhibition(input: ExhibitionInput) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO exhibitions (slug, title, start_date, end_date, venue, city, country, industry, description, highlights, description_ru, description_zh, highlights_ru, highlights_zh, exhibitors, visitors, organizer, website, color, image, gallery_images)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.slug, input.title, input.startDate, input.endDate, input.venue, input.city, input.country,
      input.industry, input.description, JSON.stringify(input.highlights || []),
      input.descriptionRu || null, input.descriptionZh || null,
      input.highlightsRu && input.highlightsRu.length ? JSON.stringify(input.highlightsRu) : null,
      input.highlightsZh && input.highlightsZh.length ? JSON.stringify(input.highlightsZh) : null,
      input.exhibitors, input.visitors, input.organizer, input.website, input.color, input.image || "",
      JSON.stringify(input.galleryImages || []),
    ]
  );
  return result.insertId;
}

export async function updateExhibition(id: number, input: ExhibitionInput) {
  await pool.query(
    `UPDATE exhibitions SET slug=?, title=?, start_date=?, end_date=?, venue=?, city=?, country=?, industry=?, description=?, highlights=?, description_ru=?, description_zh=?, highlights_ru=?, highlights_zh=?, exhibitors=?, visitors=?, organizer=?, website=?, color=?, image=?, gallery_images=?
     WHERE id=?`,
    [
      input.slug, input.title, input.startDate, input.endDate, input.venue, input.city, input.country,
      input.industry, input.description, JSON.stringify(input.highlights || []),
      input.descriptionRu || null, input.descriptionZh || null,
      input.highlightsRu && input.highlightsRu.length ? JSON.stringify(input.highlightsRu) : null,
      input.highlightsZh && input.highlightsZh.length ? JSON.stringify(input.highlightsZh) : null,
      input.exhibitors, input.visitors, input.organizer, input.website, input.color, input.image || "",
      JSON.stringify(input.galleryImages || []), id,
    ]
  );
}

export async function deleteExhibition(id: number) {
  await pool.query("DELETE FROM exhibitions WHERE id = ?", [id]);
}

export async function updateRegistrationFormConfig(
  id: number,
  input: { registrationEnabled: boolean; registrationFormSchema: unknown }
) {
  await pool.query(
    "UPDATE exhibitions SET registration_enabled = ?, registration_form_schema = ? WHERE id = ?",
    [
      input.registrationEnabled,
      input.registrationFormSchema ? JSON.stringify(input.registrationFormSchema) : null,
      id,
    ]
  );
}
