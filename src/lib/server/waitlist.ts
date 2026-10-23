import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { notifyUser } from "@/lib/server/notifications";

// Places and the waiting list. An exhibition may take a limited number of buyers (exhibitions.buyer_quota). A place is
// held by a registration that is approved (and not past its confirm-by date), confirmed or attended. A registration
// made while every place is held is flagged as waiting: it is still reviewed like any other, but the buyer is told they
// are on the waiting list. When a place frees up (a cancellation, a rejection, an expired approval, more places), the
// registrations that waited longest are let into the normal queue and told. Everything here tolerates the columns not
// existing yet (before migration 068): there are simply no limits then.

const HOLDS_A_PLACE_SQL = `(status IN ('confirmed','attended') OR (status = 'approved' AND (confirm_by IS NULL OR confirm_by >= UTC_DATE())))`;

function isMissingColumn(err: unknown): boolean {
  return (err as { code?: string }).code === "ER_BAD_FIELD_ERROR";
}

async function quotaOf(exhibitionId: number): Promise<number> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT buyer_quota FROM exhibitions WHERE id = ?", [exhibitionId]);
    return Number(rows[0]?.buyer_quota) > 0 ? Number(rows[0].buyer_quota) : 0;
  } catch (err) {
    if (isMissingColumn(err)) return 0;
    throw err;
  }
}

export async function placesTaken(exhibitionId: number): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM expo_registrations WHERE exhibition_id = ? AND ${HOLDS_A_PLACE_SQL}`, [exhibitionId]);
  return Number(rows[0]?.n ?? 0);
}

export interface PlaceSummary {
  /** 0 = no limit. */
  quota: number;
  taken: number;
  waitlisted: number;
}

export async function placeSummary(exhibitionId: number): Promise<PlaceSummary> {
  const quota = await quotaOf(exhibitionId);
  const taken = await placesTaken(exhibitionId);
  let waitlisted = 0;
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM expo_registrations WHERE exhibition_id = ? AND status = 'pending' AND waitlisted = 1", [exhibitionId]);
    waitlisted = Number(rows[0]?.n ?? 0);
  } catch (err) {
    if (!isMissingColumn(err)) throw err;
  }
  return { quota, taken, waitlisted };
}

/** Which of these registrations are waiting for a place (only ones still pending count). */
export async function waitlistFlags(ids: number[]): Promise<Set<number>> {
  if (ids.length === 0) return new Set();
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM expo_registrations WHERE waitlisted = 1 AND status = 'pending' AND id IN (?)", [ids]);
    return new Set(rows.map((r) => Number(r.id)));
  } catch (err) {
    if (isMissingColumn(err)) return new Set();
    throw err;
  }
}

/**
 * Called right after a registration is made (or made again): flags it as waiting when every place is held, and tells the
 * buyer. Returns whether it is waiting.
 */
export async function applyWaitlistOnRegistration(registrationId: number, exhibitionId: number): Promise<boolean> {
  try {
    const quota = await quotaOf(exhibitionId);
    // A registration made again after a cancellation starts clean.
    await pool.query("UPDATE expo_registrations SET waitlisted = 0, waitlisted_at = NULL WHERE id = ?", [registrationId]);
    if (!quota || (await placesTaken(exhibitionId)) < quota) return false;
    const [marked] = await pool.query<ResultSetHeader>("UPDATE expo_registrations SET waitlisted = 1, waitlisted_at = UTC_TIMESTAMP() WHERE id = ? AND status = 'pending'", [registrationId]);
    if (marked.affectedRows === 0) return false;
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT r.user_id, e.title, e.slug FROM expo_registrations r JOIN exhibitions e ON e.id = r.exhibition_id WHERE r.id = ?",
      [registrationId]
    );
    if (rows[0]) notifyUser(rows[0].user_id, "registrationWaitlisted", { expo: String(rows[0].title) }, { path: `/exhibitions/${String(rows[0].slug)}` });
    return true;
  } catch (err) {
    if (isMissingColumn(err)) return false;
    throw err;
  }
}

/**
 * Lets the registrations that waited longest into the normal queue, as many as there are free places (places not held and
 * not already claimed by registrations in the queue). With no limit at all, everyone waiting is let in. Safe to call often.
 */
export async function promoteFromWaitlist(exhibitionId: number): Promise<number> {
  try {
    const quota = await quotaOf(exhibitionId);
    let free = Number.MAX_SAFE_INTEGER;
    if (quota) {
      const taken = await placesTaken(exhibitionId);
      const [queued] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM expo_registrations WHERE exhibition_id = ? AND status = 'pending' AND waitlisted = 0", [exhibitionId]);
      free = quota - taken - Number(queued[0]?.n ?? 0);
    }
    if (free <= 0) return 0;
    const [waiting] = await pool.query<RowDataPacket[]>(
      `SELECT r.id, r.user_id, e.title, e.slug FROM expo_registrations r JOIN exhibitions e ON e.id = r.exhibition_id
       WHERE r.exhibition_id = ? AND r.status = 'pending' AND r.waitlisted = 1 ORDER BY r.waitlisted_at, r.id LIMIT ${Math.min(free, 500)}`,
      [exhibitionId]
    );
    let promoted = 0;
    for (const w of waiting) {
      // Claimed first, so two runs at once never tell the same buyer twice.
      const [claim] = await pool.query<ResultSetHeader>("UPDATE expo_registrations SET waitlisted = 0 WHERE id = ? AND waitlisted = 1 AND status = 'pending'", [w.id]);
      if (claim.affectedRows !== 1) continue;
      notifyUser(w.user_id, "waitlistPlaceOpened", { expo: String(w.title) }, { path: `/exhibitions/${String(w.slug)}` });
      promoted += 1;
    }
    return promoted;
  } catch (err) {
    if (isMissingColumn(err)) return 0;
    throw err;
  }
}

/** The exhibitions (ids) this buyer is waiting for a place at. */
export async function waitlistedExhibitionsOf(userId: number): Promise<Set<number>> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT exhibition_id FROM expo_registrations WHERE user_id = ? AND status = 'pending' AND waitlisted = 1", [userId]);
    return new Set(rows.map((r) => Number(r.exhibition_id)));
  } catch (err) {
    if (isMissingColumn(err)) return new Set();
    throw err;
  }
}

/** Exhibitions that have anyone waiting (for the daily check: an approval can expire without anybody doing anything). */
export async function exhibitionsWithWaitlist(): Promise<number[]> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT DISTINCT exhibition_id FROM expo_registrations WHERE waitlisted = 1 AND status = 'pending'");
    return rows.map((r) => Number(r.exhibition_id));
  } catch (err) {
    if (isMissingColumn(err)) return [];
    throw err;
  }
}

export function promoteQuietly(exhibitionId: number): void {
  promoteFromWaitlist(exhibitionId).catch((err) => console.error("Waiting list promotion failed:", err));
}
