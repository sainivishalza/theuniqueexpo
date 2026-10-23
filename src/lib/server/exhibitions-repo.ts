import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";
import { toDateOnlyString, safeParseArray, safeParseJson, slugLookupValues } from "@/lib/server/db-helpers";
import { formatDateRange, formatDateRangeShort } from "@/lib/date-format";
import type { CustomFormSchema } from "@/lib/custom-registration-form";
import { translateString } from "@/lib/server/content-translations";
import { registrationWindow } from "@/lib/registration-window";

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
  const registrationSwitchedOn = row.registration_enabled === undefined ? true : !!row.registration_enabled;
  const window = registrationWindow({ switchedOn: registrationSwitchedOn, opens: toDateOnlyString(row.registration_opens) || null, closes: toDateOnlyString(row.registration_closes) || null });
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
    // Names, venues, cities and industries are entered once in English; the
    // Russian/Chinese versions come from the content catalog (admin screens
    // call this without a locale and always see the English originals).
    title: translateString(row.title, locale),
    // Written for the page's language ("29–31 марта 2026 г."); admin screens pass no locale and get English.
    dates: formatDateRange(row.start_date, row.end_date, locale),
    // The same without the year, for the small date tag on cards.
    datesShort: formatDateRangeShort(row.start_date, row.end_date, locale),
    startDate: toDateOnlyString(row.start_date),
    endDate: toDateOnlyString(row.end_date),
    venue: translateString(row.venue ?? "", locale),
    city: translateString(row.city ?? "", locale),
    country: translateString(row.country ?? "", locale),
    industry: translateString(row.industry ?? "", locale),
    description: description ?? "",
    highlights,
    descriptionRu,
    descriptionZh,
    highlightsRu,
    highlightsZh,
    exhibitors: row.exhibitors ?? 0,
    visitors: translateString(row.visitors ?? "", locale),
    organizer: row.organizer ?? "",
    website: row.website ?? "",
    color: row.color || "#075b4f",
    image: row.image ?? "",
    galleryImages: safeParseArray(row.gallery_images),
    // Registration can be made now: switched on by the admin AND inside the opening / closing days, if any were set.
    registrationEnabled: window.open,
    // The admin's own switch, whatever the dates say (the admin form shows this one).
    registrationSwitchedOn,
    registrationState: window.state,
    registrationOpens: window.opens,
    registrationCloses: window.closes,
    registrationDaysToClose: window.daysToClose,
    registrationDaysToOpen: window.daysToOpen,
    // How many buyers it takes (0 = no limit).
    buyerQuota: Number(row.buyer_quota) > 0 ? Number(row.buyer_quota) : 0,
    // Editions of one event share a series name (set by the admin).
    series: String(row.series ?? ""),
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
  const columns = `id, slug, title, start_date, end_date, venue, city, country, industry, description,
            highlights, description_ru, description_zh, highlights_ru, highlights_zh,
            exhibitors, visitors, organizer, website, color, registration_enabled, registration_form_schema,
            updated_at,
            IF(LEFT(image, 5) = 'data:', CONCAT('/api/exhibitions/', slug, '/image?v=', UNIX_TIMESTAMP(updated_at)), image) AS image`;
  let rows: RowDataPacket[];
  try {
    [rows] = await pool.query<RowDataPacket[]>(`SELECT ${columns}, registration_opens, registration_closes, buyer_quota, series FROM exhibitions ORDER BY start_date ASC`);
  } catch (err) {
    // Until migration 068 has run there are no opening / closing days or places: the list works as before.
    if ((err as { code?: string }).code !== "ER_BAD_FIELD_ERROR") throw err;
    [rows] = await pool.query<RowDataPacket[]>(`SELECT ${columns} FROM exhibitions ORDER BY start_date ASC`);
  }
  return rows.map((row) => mapExhibitionRow(row, locale));
}

export async function getExhibitionBySlugOrId(slugOrId: string, locale?: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM exhibitions WHERE slug IN (?, ?, ?) OR id = ? ORDER BY slug = ? DESC LIMIT 1",
    [...slugLookupValues(slugOrId), Number(slugOrId) || 0, slugOrId]
  );
  const row = rows[0];
  return row ? mapExhibitionRow(row, locale) : null;
}

// Targeted lookup for the dedicated image-serving route -- avoids pulling
// every other column just to read the (potentially huge) image value.
export async function getExhibitionImageValue(slugOrId: string): Promise<string | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT image FROM exhibitions WHERE slug IN (?, ?, ?) OR id = ? ORDER BY slug = ? DESC LIMIT 1",
    [...slugLookupValues(slugOrId), Number(slugOrId) || 0, slugOrId]
  );
  const row = rows[0];
  return row ? row.image : null;
}

// Targeted lookup for the dedicated gallery-image-serving route -- same
// reasoning as getExhibitionImageValue above.
export async function getExhibitionGalleryImageValue(slugOrId: string, index: number): Promise<string | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT gallery_images FROM exhibitions WHERE slug IN (?, ?, ?) OR id = ? ORDER BY slug = ? DESC LIMIT 1",
    [...slugLookupValues(slugOrId), Number(slugOrId) || 0, slugOrId]
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
  input: { registrationEnabled: boolean; registrationFormSchema: unknown; registrationOpens?: string | null; registrationCloses?: string | null; buyerQuota?: number | null; series?: string | null }
) {
  const schema = input.registrationFormSchema ? JSON.stringify(input.registrationFormSchema) : null;
  try {
    await pool.query(
      "UPDATE exhibitions SET registration_enabled = ?, registration_form_schema = ?, registration_opens = ?, registration_closes = ?, buyer_quota = ?, series = ? WHERE id = ?",
      [input.registrationEnabled, schema, input.registrationOpens || null, input.registrationCloses || null, input.buyerQuota && input.buyerQuota > 0 ? input.buyerQuota : null, input.series?.trim() || null, id]
    );
  } catch (err) {
    // Before migration 068 only the switch and the form can be saved.
    if ((err as { code?: string }).code !== "ER_BAD_FIELD_ERROR") throw err;
    await pool.query("UPDATE exhibitions SET registration_enabled = ?, registration_form_schema = ? WHERE id = ?", [input.registrationEnabled, schema, id]);
  }
}
