import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { MAX_POINTS } from "@/lib/wallet";

// Attendance points that depend on the buyer's region (see migration 057). An exhibition
// lists its regions in order; the first whose keywords appear in the buyer's departure
// city is used, then the row marked "everywhere else", then the exhibition's single
// attendance_points.

export interface PointTier {
  name: string;
  keywords: string;
  points: number;
  isDefault: boolean;
}

export const MAX_TIERS = 20;

export function splitKeywords(text: string): string[] {
  return text.split(/[,;\n，；、]/).map((k) => k.trim().toLowerCase()).filter(Boolean);
}

// The tier a buyer from `city` falls in, or null when no region matches and there is no
// "everywhere else" row.
export function pickTier(tiers: PointTier[], city: string): PointTier | null {
  const where = city.trim().toLowerCase();
  if (where) {
    for (const tier of tiers) {
      if (tier.isDefault) continue;
      if (splitKeywords(tier.keywords).some((k) => where.includes(k))) return tier;
    }
  }
  return tiers.find((t) => t.isDefault) ?? null;
}

export async function listTiers(exhibitionId: number, conn?: PoolConnection): Promise<PointTier[]> {
  const [rows] = await (conn ?? pool).query<RowDataPacket[]>(
    "SELECT name, keywords, points, is_default FROM exhibition_point_tiers WHERE exhibition_id = ? ORDER BY sort_order, id",
    [exhibitionId]
  );
  return rows.map((r) => ({ name: r.name as string, keywords: r.keywords as string, points: Number(r.points), isDefault: !!r.is_default }));
}

// Replaces an exhibition's regions. Returns an error code, or null when saved.
export async function saveTiers(exhibitionId: number, tiers: PointTier[]): Promise<"invalid_input" | "invalid_amount" | "not_found" | null> {
  if (tiers.length > MAX_TIERS || tiers.filter((t) => t.isDefault).length > 1) return "invalid_input";
  for (const t of tiers) {
    if (!t.name.trim() || t.name.length > 150 || t.keywords.length > 2000) return "invalid_input";
    if (!Number.isSafeInteger(t.points) || t.points < 0 || t.points > MAX_POINTS) return "invalid_amount";
    if (!t.isDefault && splitKeywords(t.keywords).length === 0) return "invalid_input";
  }
  // "Everywhere else" always sits last, whatever order it was sent in.
  const ordered = [...tiers.filter((t) => !t.isDefault), ...tiers.filter((t) => t.isDefault)];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [expo] = await conn.query<RowDataPacket[]>("SELECT id FROM exhibitions WHERE id = ? FOR UPDATE", [exhibitionId]);
    if (!expo[0]) {
      await conn.rollback();
      return "not_found";
    }
    await conn.query("DELETE FROM exhibition_point_tiers WHERE exhibition_id = ?", [exhibitionId]);
    for (let i = 0; i < ordered.length; i++) {
      const t = ordered[i];
      await conn.query(
        "INSERT INTO exhibition_point_tiers (exhibition_id, name, keywords, points, sort_order, is_default) VALUES (?, ?, ?, ?, ?, ?)",
        [exhibitionId, t.name.trim(), t.isDefault ? "" : t.keywords.trim(), t.points, i + 1, t.isDefault ? 1 : 0]
      );
    }
    await conn.commit();
    return null;
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

export interface AttendanceReward {
  points: number;
  region: string; // name of the region that matched, "" when the single rate applies
}

// What this buyer earns for attending this exhibition.
export async function attendanceRewardFor(exhibitionId: number, userId: number, conn?: PoolConnection): Promise<AttendanceReward> {
  const db = conn ?? pool;
  const [expo] = await db.query<RowDataPacket[]>("SELECT attendance_points FROM exhibitions WHERE id = ?", [exhibitionId]);
  const flat = expo[0] ? Number(expo[0].attendance_points) : 0;
  const tiers = await listTiers(exhibitionId, conn);
  if (tiers.length === 0) return { points: flat, region: "" };
  const [profile] = await db.query<RowDataPacket[]>("SELECT departure_city FROM buyer_profiles WHERE user_id = ?", [userId]);
  const tier = pickTier(tiers, profile[0] ? String(profile[0].departure_city ?? "") : "");
  return tier ? { points: tier.points, region: tier.name } : { points: flat, region: "" };
}
