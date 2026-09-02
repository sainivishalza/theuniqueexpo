import pool from "@/lib/db";

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
  exhibitors: number;
  visitors: string;
  organizer: string;
  website: string;
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

export function mapExhibitionRow(row: any) {
  return {
    id: String(row.id),
    slug: row.slug,
    title: row.title,
    dates: formatDates(row.start_date, row.end_date),
    startDate: toDateStr(row.start_date),
    endDate: toDateStr(row.end_date),
    venue: row.venue,
    city: row.city,
    country: row.country,
    industry: row.industry,
    description: row.description,
    highlights: safeParseArray(row.highlights),
    exhibitors: row.exhibitors,
    visitors: row.visitors,
    organizer: row.organizer,
    website: row.website,
    color: row.color,
    image: row.image,
    galleryImages: safeParseArray(row.gallery_images),
    registrationEnabled: row.registration_enabled === undefined ? true : !!row.registration_enabled,
    registrationFormSchema: safeParseJson(row.registration_form_schema),
  };
}

// List views only ever render a thumbnail, never re-submit the image, so
// never pull the raw column (uploaded posters are base64 and can run into
// the hundreds of KB each -- 20+ of those turned every list fetch into a
// multi-megabyte payload). Point at the dedicated image endpoint instead;
// plain external URLs (short, already cheap) pass through unchanged.
export async function listExhibitions() {
  const [rows] = await pool.query(
    `SELECT id, slug, title, start_date, end_date, venue, city, country, industry, description,
            highlights, exhibitors, visitors, organizer, website, color, registration_enabled, registration_form_schema,
            IF(LEFT(image, 5) = 'data:', CONCAT('/api/exhibitions/', slug, '/image'), image) AS image
     FROM exhibitions ORDER BY start_date ASC`
  );
  return (rows as any[]).map(mapExhibitionRow);
}

export async function getExhibitionBySlugOrId(slugOrId: string) {
  const [rows] = await pool.query(
    "SELECT * FROM exhibitions WHERE slug = ? OR id = ? LIMIT 1",
    [slugOrId, Number(slugOrId) || 0]
  );
  const row = (rows as any[])[0];
  return row ? mapExhibitionRow(row) : null;
}

// Targeted lookup for the dedicated image-serving route -- avoids pulling
// every other column just to read the (potentially huge) image value.
export async function getExhibitionImageValue(slugOrId: string): Promise<string | null> {
  const [rows] = await pool.query(
    "SELECT image FROM exhibitions WHERE slug = ? OR id = ? LIMIT 1",
    [slugOrId, Number(slugOrId) || 0]
  );
  const row = (rows as any[])[0];
  return row ? row.image : null;
}

// Targeted lookup for the dedicated gallery-image-serving route -- same
// reasoning as getExhibitionImageValue above.
export async function getExhibitionGalleryImageValue(slugOrId: string, index: number): Promise<string | null> {
  const [rows] = await pool.query(
    "SELECT gallery_images FROM exhibitions WHERE slug = ? OR id = ? LIMIT 1",
    [slugOrId, Number(slugOrId) || 0]
  );
  const row = (rows as any[])[0];
  if (!row) return null;
  const images = safeParseArray(row.gallery_images);
  return images[index] || null;
}

export async function createExhibition(input: ExhibitionInput) {
  const [result] = await pool.query(
    `INSERT INTO exhibitions (slug, title, start_date, end_date, venue, city, country, industry, description, highlights, exhibitors, visitors, organizer, website, color, image, gallery_images)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.slug, input.title, input.startDate, input.endDate, input.venue, input.city, input.country,
      input.industry, input.description, JSON.stringify(input.highlights || []), input.exhibitors,
      input.visitors, input.organizer, input.website, input.color, input.image || "",
      JSON.stringify(input.galleryImages || []),
    ]
  );
  return (result as any).insertId;
}

export async function updateExhibition(id: number, input: ExhibitionInput) {
  await pool.query(
    `UPDATE exhibitions SET slug=?, title=?, start_date=?, end_date=?, venue=?, city=?, country=?, industry=?, description=?, highlights=?, exhibitors=?, visitors=?, organizer=?, website=?, color=?, image=?, gallery_images=?
     WHERE id=?`,
    [
      input.slug, input.title, input.startDate, input.endDate, input.venue, input.city, input.country,
      input.industry, input.description, JSON.stringify(input.highlights || []), input.exhibitors,
      input.visitors, input.organizer, input.website, input.color, input.image || "",
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
