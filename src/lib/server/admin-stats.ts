import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";

export interface AdminStats {
  buyers: { total: number; last7Days: number; last30Days: number };
  /** New buyers per week, oldest first, the last 8 weeks (the last item is the current week). */
  buyersPerWeek: number[];
  registrations: { total: number; last7Days: number; byStatus: Record<string, number> };
  topExhibitions: { id: number; title: string; slug: string; registrations: number }[];
  /** Points held by buyers right now. */
  pointsHeld: number;
}

const WEEKS = 8;

async function one(sql: string): Promise<Record<string, unknown>> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(sql);
    return rows[0] ?? {};
  } catch {
    // A table a deploy has not created yet counts as nothing, never as an error on the admin home.
    return {};
  }
}

async function many(sql: string): Promise<RowDataPacket[]> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(sql);
    return rows;
  } catch {
    return [];
  }
}

// What the admin home shows "at a glance": a few numbers that answer "how is it going?".
export async function getAdminStats(): Promise<AdminStats> {
  const [buyers, regs, held, weekRows, statusRows, topRows] = await Promise.all([
    one(`SELECT COUNT(*) AS total,
                SUM(created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS d7,
                SUM(created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS d30
         FROM users WHERE role = 'buyer'`),
    one("SELECT COUNT(*) AS total, SUM(created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS d7 FROM expo_registrations"),
    one("SELECT COALESCE(SUM(balance), 0) AS held FROM wallets"),
    many(`SELECT FLOOR(DATEDIFF(NOW(), created_at) / 7) AS ago, COUNT(*) AS n
          FROM users WHERE role = 'buyer' AND created_at >= DATE_SUB(NOW(), INTERVAL ${WEEKS * 7} DAY)
          GROUP BY ago`),
    many("SELECT status, COUNT(*) AS n FROM expo_registrations GROUP BY status"),
    many(`SELECT e.id, e.title, e.slug, COUNT(*) AS n
          FROM expo_registrations r JOIN exhibitions e ON e.id = r.exhibition_id
          GROUP BY e.id, e.title, e.slug ORDER BY n DESC, e.id DESC LIMIT 5`),
  ]);
  const perWeek = new Array<number>(WEEKS).fill(0);
  for (const r of weekRows) {
    const ago = Number(r.ago);
    if (ago >= 0 && ago < WEEKS) perWeek[WEEKS - 1 - ago] = Number(r.n);
  }
  return {
    buyers: { total: Number(buyers.total ?? 0), last7Days: Number(buyers.d7 ?? 0), last30Days: Number(buyers.d30 ?? 0) },
    buyersPerWeek: perWeek,
    registrations: {
      total: Number(regs.total ?? 0),
      last7Days: Number(regs.d7 ?? 0),
      byStatus: Object.fromEntries(statusRows.map((r) => [String(r.status), Number(r.n)])),
    },
    topExhibitions: topRows.map((r) => ({ id: Number(r.id), title: String(r.title), slug: String(r.slug), registrations: Number(r.n) })),
    pointsHeld: Number(held.held ?? 0),
  };
}
