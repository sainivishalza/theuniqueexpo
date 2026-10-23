import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { HEALTHY_SHARE, MIN_SAMPLES, plausible, rate, type Vital } from "@/lib/web-vitals";

// Page speed measured in real visitors' browsers (see WebVitalsReporter): counted per day, kind of page, device and measure.
// Everything tolerates the table not existing yet (migration 086).

const KEEP_DAYS = 90;

export async function recordVital(input: { metric: Vital; value: number; page: string; device: "phone" | "desktop" }): Promise<void> {
  if (!plausible(input.metric, input.value)) return;
  const r = rate(input.metric, input.value);
  try {
    await pool.query(
      `INSERT INTO web_vitals_daily (day, page, device, metric, good, needs, poor, total_value) VALUES (UTC_DATE(), ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE good = good + VALUES(good), needs = needs + VALUES(needs), poor = poor + VALUES(poor), total_value = total_value + VALUES(total_value)`,
      [input.page, input.device, input.metric, r === "good" ? 1 : 0, r === "needs" ? 1 : 0, r === "poor" ? 1 : 0, input.value]
    );
  } catch (err) {
    if ((err as { code?: string }).code !== "ER_NO_SUCH_TABLE") console.error("could not record a page-speed measure:", err);
  }
}

export interface PageSpeedRow {
  page: string;
  device: string;
  metric: string;
  samples: number;
  good: number;
  needs: number;
  poor: number;
  average: number;
  goodShare: number;
  healthy: boolean | null;
}

/** null until migration 086 has run. */
export async function getPageSpeed(days: number): Promise<PageSpeedRow[] | null> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT page, device, metric, SUM(good) AS good, SUM(needs) AS needs, SUM(poor) AS poor, SUM(total_value) AS total
       FROM web_vitals_daily WHERE day > DATE_SUB(UTC_DATE(), INTERVAL ? DAY)
       GROUP BY page, device, metric ORDER BY page, device, metric`,
      [days]
    );
    return rows.map((r) => {
      const good = Number(r.good), needs = Number(r.needs), poor = Number(r.poor);
      const samples = good + needs + poor;
      const share = samples > 0 ? good / samples : 0;
      return {
        page: String(r.page), device: String(r.device), metric: String(r.metric), samples, good, needs, poor,
        average: samples > 0 ? Number(r.total) / samples : 0,
        goodShare: share,
        // No verdict from a handful of visits.
        healthy: samples >= MIN_SAMPLES ? share >= HEALTHY_SHARE : null,
      };
    });
  } catch (err) {
    if ((err as { code?: string }).code === "ER_NO_SUCH_TABLE") return null;
    throw err;
  }
}

/** Things worth a look in the daily health e-mail: measures with enough page views that are not healthy, worst first. */
export async function pageSpeedIssues(days = 7): Promise<{ page: string; device: string; metric: string; goodShare: number; samples: number }[]> {
  const rows = (await getPageSpeed(days).catch(() => null)) ?? [];
  return rows
    .filter((r) => r.healthy === false && ["LCP", "INP", "CLS"].includes(r.metric))
    .sort((a, b) => a.goodShare - b.goodShare)
    .slice(0, 5)
    .map(({ page, device, metric, goodShare, samples }) => ({ page, device, metric, goodShare, samples }));
}

export async function pruneWebVitals(): Promise<number> {
  try {
    const [res] = await pool.query("DELETE FROM web_vitals_daily WHERE day < DATE_SUB(UTC_DATE(), INTERVAL ? DAY)", [KEEP_DAYS]);
    return (res as { affectedRows?: number }).affectedRows ?? 0;
  } catch (err) {
    if ((err as { code?: string }).code === "ER_NO_SUCH_TABLE") return 0;
    throw err;
  }
}
