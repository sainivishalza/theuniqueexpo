import pool from "@/lib/db";
import { DEFAULT_TOUR_REGISTRATION_FIELDS } from "@/lib/default-tour-registration-form";

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
  price: string;
  currency: string;
  groupSize: string;
  organizer: string;
  color: string;
  image?: string;
  galleryImages?: string[];
}

function toDateStr(d: any) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString().split("T")[0];
}

function formatDates(start: any, end: any) {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric" };
  if (s.getMonth() === e.getMonth()) {
    return `${s.toLocaleDateString("en-US", opts)}–${e.getDate()}, ${e.getFullYear()}`;
  }
  return `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString("en-US", opts)}, ${e.getFullYear()}`;
}

function safeParseArray(text: any): string[] {
  if (!text) return [];
  if (Array.isArray(text)) return text;
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeParseJson(text: any): any {
  if (!text) return null;
  if (typeof text === "object") return text;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function mapTourRow(row: any) {
  return {
    id: String(row.id),
    slug: row.slug,
    title: row.title,
    dates: formatDates(row.start_date, row.end_date),
    startDate: toDateStr(row.start_date),
    endDate: toDateStr(row.end_date),
    duration: row.duration,
    departureCity: row.departure_city,
    destination: row.destination,
    description: row.description,
    highlights: safeParseArray(row.highlights),
    price: row.price,
    currency: row.currency,
    groupSize: row.group_size,
    organizer: row.organizer,
    color: row.color,
    image: row.image,
    galleryImages: safeParseArray(row.gallery_images),
    registrationEnabled: row.registration_enabled === undefined ? true : !!row.registration_enabled,
    registrationFormSchema: safeParseJson(row.registration_form_schema),
    updatedAt: row.updated_at ? Math.floor(new Date(row.updated_at).getTime() / 1000) : 0,
  };
}

// List views only ever render a thumbnail -- point the image at the
// dedicated image endpoint instead of embedding raw base64 (same reasoning
// as listExhibitions).
export async function listTours() {
  const [rows] = await pool.query(
    `SELECT id, slug, title, start_date, end_date, duration, departure_city, destination, description,
            highlights, price, currency, group_size, organizer, color, registration_enabled, updated_at,
            IF(LEFT(image, 5) = 'data:', CONCAT('/api/tours/', slug, '/image?v=', UNIX_TIMESTAMP(updated_at)), image) AS image
     FROM tours ORDER BY start_date ASC`
  );
  return (rows as any[]).map(mapTourRow);
}

export async function getTourBySlugOrId(slugOrId: string) {
  const [rows] = await pool.query(
    "SELECT * FROM tours WHERE slug = ? OR id = ? LIMIT 1",
    [slugOrId, Number(slugOrId) || 0]
  );
  const row = (rows as any[])[0];
  return row ? mapTourRow(row) : null;
}

export async function getTourImageValue(slugOrId: string): Promise<string | null> {
  const [rows] = await pool.query(
    "SELECT image FROM tours WHERE slug = ? OR id = ? LIMIT 1",
    [slugOrId, Number(slugOrId) || 0]
  );
  const row = (rows as any[])[0];
  return row ? row.image : null;
}

export async function getTourGalleryImageValue(slugOrId: string, index: number): Promise<string | null> {
  const [rows] = await pool.query(
    "SELECT gallery_images FROM tours WHERE slug = ? OR id = ? LIMIT 1",
    [slugOrId, Number(slugOrId) || 0]
  );
  const row = (rows as any[])[0];
  if (!row) return null;
  const images = safeParseArray(row.gallery_images);
  return images[index] || null;
}

export async function createTour(input: TourInput) {
  const [result] = await pool.query(
    `INSERT INTO tours (slug, title, start_date, end_date, duration, departure_city, destination, description, highlights, price, currency, group_size, organizer, color, image, gallery_images, registration_form_schema)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.slug, input.title, input.startDate, input.endDate, input.duration, input.departureCity,
      input.destination, input.description, JSON.stringify(input.highlights || []), input.price,
      input.currency, input.groupSize, input.organizer, input.color, input.image || "",
      JSON.stringify(input.galleryImages || []),
      // New tours start with the standard travel-planning questionnaire --
      // admins can edit/prune it per tour via the registration-form builder.
      JSON.stringify(DEFAULT_TOUR_REGISTRATION_FIELDS),
    ]
  );
  return (result as any).insertId;
}

export async function updateTour(id: number, input: TourInput) {
  await pool.query(
    `UPDATE tours SET slug=?, title=?, start_date=?, end_date=?, duration=?, departure_city=?, destination=?,
       description=?, highlights=?, price=?, currency=?, group_size=?, organizer=?, color=?, image=?, gallery_images=?
     WHERE id=?`,
    [
      input.slug, input.title, input.startDate, input.endDate, input.duration, input.departureCity,
      input.destination, input.description, JSON.stringify(input.highlights || []), input.price,
      input.currency, input.groupSize, input.organizer, input.color, input.image || "",
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
