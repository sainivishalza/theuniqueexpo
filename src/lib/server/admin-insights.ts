import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";

// The numbers behind Admin -> Reports: registrations per day, by country and by exhibition, and how far registrations
// get (registered, approved, confirmed, attended). Optionally for one exhibition.

export const RANGES = [30, 90, 365] as const;
export type Range = (typeof RANGES)[number];

export interface Insights {
  days: Range;
  exhibitionId: number | null;
  /** One entry per day, oldest first, zeros included. */
  perDay: { day: string; count: number }[];
  byCountry: { country: string; count: number }[];
  byExhibition: { id: number; title: string; slug: string; registrations: number; approved: number; attended: number }[];
  funnel: { registered: number; approved: number; confirmed: number; attended: number };
  /** All the registrations in the range (for the percentages). */
  total: number;
  /** Exhibitions to choose from. */
  exhibitions: { id: number; title: string }[];
}

const COUNTRY_SQL = "COALESCE(NULLIF(TRIM(p.nationality), ''), NULLIF(TRIM(u.country), ''))";

export function parseRange(value: unknown): Range {
  const n = Number(value);
  return (RANGES as readonly number[]).includes(n) ? (n as Range) : 30;
}

async function rows(sql: string, params: unknown[] = []): Promise<RowDataPacket[]> {
  try {
    const [r] = await pool.query<RowDataPacket[]>(sql, params);
    return r;
  } catch {
    return [];
  }
}

export async function getInsights(days: Range, exhibitionId: number | null): Promise<Insights> {
  const expoClause = exhibitionId ? " AND r.exhibition_id = ?" : "";
  const expoParams = exhibitionId ? [exhibitionId] : [];
  const since = `r.created_at >= DATE_SUB(UTC_DATE(), INTERVAL ${days - 1} DAY)`;

  const [dayRows, countryRows, expoRows, funnelRows, optionRows] = await Promise.all([
    rows(`SELECT DATE_FORMAT(DATE(r.created_at), '%Y-%m-%d') AS d, COUNT(*) AS n FROM expo_registrations r WHERE ${since}${expoClause} GROUP BY d`, expoParams),
    rows(
      `SELECT ${COUNTRY_SQL} AS c, COUNT(*) AS n FROM expo_registrations r JOIN users u ON u.id = r.user_id LEFT JOIN buyer_profiles p ON p.user_id = r.user_id
       WHERE ${since}${expoClause} GROUP BY c ORDER BY n DESC LIMIT 200`,
      expoParams
    ),
    rows(
      `SELECT e.id, e.title, e.slug, COUNT(*) AS n,
              SUM(r.approved_at IS NOT NULL OR r.status IN ('approved', 'confirmed', 'attended', 'absent')) AS approved,
              SUM(r.status = 'attended') AS attended
       FROM expo_registrations r JOIN exhibitions e ON e.id = r.exhibition_id WHERE ${since}
       GROUP BY e.id, e.title, e.slug ORDER BY n DESC, e.id DESC LIMIT 10`
    ),
    rows(
      `SELECT COUNT(*) AS registered,
              COALESCE(SUM(r.approved_at IS NOT NULL OR r.status IN ('approved', 'confirmed', 'attended', 'absent')), 0) AS approved,
              COALESCE(SUM(r.confirmed_at IS NOT NULL OR r.status IN ('confirmed', 'attended', 'absent')), 0) AS confirmed,
              COALESCE(SUM(r.status = 'attended'), 0) AS attended
       FROM expo_registrations r WHERE ${since}${expoClause}`,
      expoParams
    ),
    rows("SELECT id, title FROM exhibitions ORDER BY start_date DESC, id DESC LIMIT 300"),
  ]);

  const counts = new Map(dayRows.map((r) => [String(r.d), Number(r.n)]));
  const perDay: Insights["perDay"] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10);
    perDay.push({ day, count: counts.get(day) ?? 0 });
  }

  // Ten countries, the rest together as "other"; registrations with no country at all count as unknown.
  const named = countryRows.map((r) => ({ country: r.c ? String(r.c) : "", count: Number(r.n) }));
  const known = named.filter((c) => c.country);
  const unknown = named.filter((c) => !c.country).reduce((sum, c) => sum + c.count, 0);
  const top = known.slice(0, 10);
  const rest = known.slice(10).reduce((sum, c) => sum + c.count, 0) + unknown;
  const byCountry = rest > 0 ? [...top, { country: "", count: rest }] : top;

  const f = funnelRows[0] ?? {};
  const funnel = { registered: Number(f.registered ?? 0), approved: Number(f.approved ?? 0), confirmed: Number(f.confirmed ?? 0), attended: Number(f.attended ?? 0) };
  return {
    days,
    exhibitionId,
    perDay,
    byCountry,
    byExhibition: expoRows.map((r) => ({ id: Number(r.id), title: String(r.title), slug: String(r.slug), registrations: Number(r.n), approved: Number(r.approved ?? 0), attended: Number(r.attended ?? 0) })),
    funnel,
    total: funnel.registered,
    exhibitions: optionRows.map((r) => ({ id: Number(r.id), title: String(r.title) })),
  };
}
