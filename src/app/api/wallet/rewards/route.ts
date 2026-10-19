import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { attendanceRewardFor } from "@/lib/server/wallet-tiers";
import { requireBuyer, walletErrorResponse } from "@/lib/server/wallet-api";

// What this buyer would earn for attending each upcoming exhibition, worked out from
// their departure city (as saved on their profile).
export async function GET(request: Request) {
  const auth = await requireBuyer(request);
  if (auth.response) return auth.response;
  try {
    const [expos] = await pool.query<RowDataPacket[]>(
      `SELECT e.id, e.slug, e.title, e.start_date, e.end_date
       FROM exhibitions e
       WHERE e.end_date >= UTC_DATE() AND (e.attendance_points > 0 OR EXISTS (SELECT 1 FROM exhibition_point_tiers t WHERE t.exhibition_id = e.id))
       ORDER BY e.start_date, e.id`
    );
    const [profile] = await pool.query<RowDataPacket[]>("SELECT departure_city FROM buyer_profiles WHERE user_id = ?", [auth.user.id]);
    const items = [];
    for (const e of expos) {
      const reward = await attendanceRewardFor(e.id, auth.user.id);
      if (reward.points > 0) {
        items.push({
          id: e.id as number, slug: e.slug as string, title: e.title as string,
          startDate: String(e.start_date).slice(0, 10), endDate: String(e.end_date).slice(0, 10),
          points: reward.points, region: reward.region,
        });
      }
    }
    return NextResponse.json({ items, departureCity: profile[0] ? String(profile[0].departure_city ?? "") : "" }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
