import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import type { SiteStats } from "@/lib/site-stats-format";

// The figures shown on the website's home, sign-in and sign-up pages. All of them are counted from the database (never typed in),
// kept for ten minutes so a busy page does not count on every visit. A figure that is still small is not shown (see
// `showable`), so the site never boasts with a number that is not impressive yet.


export type { SiteStats } from "@/lib/site-stats-format";
export { friendlyCount, MINIMUMS, showable } from "@/lib/site-stats-format";

const TTL_MS = 10 * 60_000;
let cache: { at: number; value: SiteStats } | null = null;

async function n(sql: string): Promise<number> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(sql);
    return Number(rows[0]?.n ?? 0);
  } catch {
    return 0;
  }
}

export function forgetSiteStats(): void {
  cache = null;
}

export async function getSiteStats(): Promise<SiteStats> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const [exhibitions, upcomingExhibitions, exhibitors, tours, buyers, buyerCountries] = await Promise.all([
    n("SELECT COUNT(*) AS n FROM exhibitions"),
    n("SELECT COUNT(*) AS n FROM exhibitions WHERE end_date >= UTC_DATE()"),
    n("SELECT COALESCE(SUM(exhibitors), 0) AS n FROM exhibitions WHERE end_date >= UTC_DATE()"),
    n("SELECT COUNT(*) AS n FROM tours"),
    n("SELECT COUNT(*) AS n FROM users WHERE role = 'buyer' AND status <> 'suspended'"),
    n("SELECT COUNT(DISTINCT LOWER(TRIM(COALESCE(NULLIF(bp.nationality, ''), NULLIF(u.country, ''))))) AS n FROM users u LEFT JOIN buyer_profiles bp ON bp.user_id = u.id WHERE u.role = 'buyer' AND u.status <> 'suspended' AND COALESCE(NULLIF(bp.nationality, ''), NULLIF(u.country, '')) IS NOT NULL"),
  ]);
  const value = { exhibitions, upcomingExhibitions, exhibitors, tours, buyers, buyerCountries };
  cache = { at: Date.now(), value };
  return value;
}
