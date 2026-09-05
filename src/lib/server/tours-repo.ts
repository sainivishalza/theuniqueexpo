import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "@/lib/db";
import { toDateOnlyString, formatDateRange, safeParseArray, safeParseJson } from "@/lib/server/db-helpers";
import { DEFAULT_TOUR_REGISTRATION_FIELDS } from "@/lib/default-tour-registration-form";
import type { CustomFormSchema } from "@/lib/custom-registration-form";

export interface TourInput {
  slug: string;
  title: string;
  startDate: string;
  endDate: string;
  duration: string;
  departureCity: string;
  destination: string;
  description: string;
  highlights: string[];
  // Optional translations of description/highlights. Blank/omitted falls
  // back to the English fields above when serving that locale.
  descriptionRu?: string;
  descriptionZh?: string;
  highlightsRu?: string[];
  highlightsZh?: string[];
  price: string;
  currency: string;
  groupSize: string;
  organizer: string;
  color: string;
  image?: string;
  galleryImages?: string[];
}

// Picks the description/highlights for the requested locale, falling back
// to English whenever a translation hasn't been filled in yet.
export function mapTourRow(row: RowDataPacket, locale?: string) {
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
    duration: row.duration,
    departureCity: row.departure_city,
    destination: row.destination,
    description,
    highlights,
    descriptionRu,
    descriptionZh,
    highlightsRu,
    highlightsZh,
    price: row.price,
    currency: row.currency,
    groupSize: row.group_size,
    organizer: row.organizer,
    color: row.color,
    image: row.image,
    galleryImages: safeParseArray(row.gallery_images),
    registrationEnabled: row.registration_enabled === undefined ? true : !!row.registration_enabled,
    registrationFormSchema: safeParseJson(row.registration_form_schema) as CustomFormSchema | null,
    updatedAt: row.updated_at ? Math.floor(new Date(row.updated_at).getTime() / 1000) : 0,
  };
}

// List views only ever render a thumbnail -- point the image at the
// dedicated image endpoint instead of embedding raw base64 (same reasoning
// as listExhibitions).
export async function listTours(locale?: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, slug, title, start_date, end_date, duration, departure_city, destination, description,
            highlights, description_ru, description_zh, highlights_ru, highlights_zh,
            price, currency, group_size, organizer, color, registration_enabled, updated_at,
            IF(LEFT(image, 5) = 'data:', CONCAT('/api/tours/', slug, '/image?v=', UNIX_TIMESTAMP(updated_at)), image) AS image
     FROM tours ORDER BY start_date ASC`
  );
  return rows.map((row) => mapTourRow(row, locale));
}

export async function getTourBySlugOrId(slugOrId: string, locale?: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM tours WHERE slug = ? OR id = ? LIMIT 1",
    [slugOrId, Number(slugOrId) || 0]
  );
  const row = rows[0];
  return row ? mapTourRow(row, locale) : null;
}

export async function getTourImageValue(slugOrId: string): Promise<string | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT image FROM tours WHERE slug = ? OR id = ? LIMIT 1",
    [slugOrId, Number(slugOrId) || 0]
  );
  const row = rows[0];
  return row ? row.image : null;
}

export async function getTourGalleryImageValue(slugOrId: string, index: number): Promise<string | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT gallery_images FROM tours WHERE slug = ? OR id = ? LIMIT 1",
    [slugOrId, Number(slugOrId) || 0]
  );
  const row = rows[0];
  if (!row) return null;
  const images = safeParseArray(row.gallery_images);
  return images[index] || null;
}

export async function createTour(input: TourInput) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO tours (slug, title, start_date, end_date, duration, departure_city, destination, description, highlights, description_ru, description_zh, highlights_ru, highlights_zh, price, currency, group_size, organizer, color, image, gallery_images, registration_form_schema)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.slug, input.title, input.startDate, input.endDate, input.duration, input.departureCity,
      input.destination, input.description, JSON.stringify(input.highlights || []),
      input.descriptionRu || null, input.descriptionZh || null,
      input.highlightsRu && input.highlightsRu.length ? JSON.stringify(input.highlightsRu) : null,
      input.highlightsZh && input.highlightsZh.length ? JSON.stringify(input.highlightsZh) : null,
      input.price, input.currency, input.groupSize, input.organizer, input.color, input.image || "",
      JSON.stringify(input.galleryImages || []),
      // New tours start with the standard travel-planning questionnaire --
      // admins can edit/prune it per tour via the registration-form builder.
      JSON.stringify(DEFAULT_TOUR_REGISTRATION_FIELDS),
    ]
  );
  return result.insertId;
}

export async function updateTour(id: number, input: TourInput) {
  await pool.query(
    `UPDATE tours SET slug=?, title=?, start_date=?, end_date=?, duration=?, departure_city=?, destination=?,
       description=?, highlights=?, description_ru=?, description_zh=?, highlights_ru=?, highlights_zh=?, price=?, currency=?, group_size=?, organizer=?, color=?, image=?, gallery_images=?
     WHERE id=?`,
    [
      input.slug, input.title, input.startDate, input.endDate, input.duration, input.departureCity,
      input.destination, input.description, JSON.stringify(input.highlights || []),
      input.descriptionRu || null, input.descriptionZh || null,
      input.highlightsRu && input.highlightsRu.length ? JSON.stringify(input.highlightsRu) : null,
      input.highlightsZh && input.highlightsZh.length ? JSON.stringify(input.highlightsZh) : null,
      input.price, input.currency, input.groupSize, input.organizer, input.color, input.image || "",
      JSON.stringify(input.galleryImages || []), id,
    ]
  );
}

export async function deleteTour(id: number) {
  await pool.query("DELETE FROM tours WHERE id = ?", [id]);
}

export async function updateTourRegistrationConfig(
  id: number,
  input: { registrationEnabled: boolean; registrationFormSchema: unknown }
) {
  await pool.query(
    "UPDATE tours SET registration_enabled = ?, registration_form_schema = ? WHERE id = ?",
    [input.registrationEnabled, input.registrationFormSchema ? JSON.stringify(input.registrationFormSchema) : null, id]
  );
}
