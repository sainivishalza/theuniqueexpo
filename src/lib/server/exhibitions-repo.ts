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
  };
}

export async function listExhibitions() {
  const [rows] = await pool.query("SELECT * FROM exhibitions ORDER BY start_date ASC");
  return (rows as any[]).map(mapExhibitionRow);
}

export async function createExhibition(input: ExhibitionInput) {
  const [result] = await pool.query(
    `INSERT INTO exhibitions (slug, title, start_date, end_date, venue, city, country, industry, description, highlights, exhibitors, visitors, organizer, website, color, image)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.slug, input.title, input.startDate, input.endDate, input.venue, input.city, input.country,
      input.industry, input.description, JSON.stringify(input.highlights || []), input.exhibitors,
      input.visitors, input.organizer, input.website, input.color, input.image || "",
    ]
  );
  return (result as any).insertId;
}

export async function updateExhibition(id: number, input: ExhibitionInput) {
  await pool.query(
    `UPDATE exhibitions SET slug=?, title=?, start_date=?, end_date=?, venue=?, city=?, country=?, industry=?, description=?, highlights=?, exhibitors=?, visitors=?, organizer=?, website=?, color=?, image=?
     WHERE id=?`,
    [
      input.slug, input.title, input.startDate, input.endDate, input.venue, input.city, input.country,
      input.industry, input.description, JSON.stringify(input.highlights || []), input.exhibitors,
      input.visitors, input.organizer, input.website, input.color, input.image || "", id,
    ]
  );
}

export async function deleteExhibition(id: number) {
  await pool.query("DELETE FROM exhibitions WHERE id = ?", [id]);
}
