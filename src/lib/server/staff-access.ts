import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { isStaffPreset, type StaffPreset } from "@/lib/staff-access";

// Which part of the back office each admin account may use. No row = full access (every admin before this existed).
// The answer is remembered for a few seconds so a busy admin screen does not ask the database for every request; a
// change made on this server shows at once, on another within the cache time.

const CACHE_MS = 5000;
const cache = new Map<number, { preset: StaffPreset; at: number }>();

export function forgetStaffPreset(userId?: number): void {
  if (userId === undefined) cache.clear();
  else cache.delete(userId);
}

export async function getStaffPreset(userId: number): Promise<StaffPreset> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.preset;
  let preset: StaffPreset = "full";
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT preset FROM admin_staff_access WHERE user_id = ?", [userId]);
    if (rows[0] && isStaffPreset(rows[0].preset)) preset = rows[0].preset;
  } catch (err) {
    // Before the table exists everyone has full access, as before.
    if ((err as { code?: string }).code !== "ER_NO_SUCH_TABLE") throw err;
  }
  cache.set(userId, { preset, at: Date.now() });
  return preset;
}

export interface StaffRow {
  id: number;
  name: string;
  email: string;
  suspended: boolean;
  preset: StaffPreset;
}

export async function listStaff(): Promise<StaffRow[]> {
  let rows: RowDataPacket[];
  try {
    [rows] = await pool.query<RowDataPacket[]>("SELECT u.id, u.name, u.email, u.status, a.preset FROM users u LEFT JOIN admin_staff_access a ON a.user_id = u.id WHERE u.role = 'admin' ORDER BY u.name, u.id");
  } catch (err) {
    if ((err as { code?: string }).code !== "ER_NO_SUCH_TABLE") throw err;
    [rows] = await pool.query<RowDataPacket[]>("SELECT id, name, email, status, NULL AS preset FROM users WHERE role = 'admin' ORDER BY name, id");
  }
  return rows.map((r) => ({ id: Number(r.id), name: String(r.name), email: String(r.email), suspended: r.status === "suspended", preset: isStaffPreset(r.preset) ? r.preset : "full" }));
}

export async function setStaffPreset(userId: number, preset: StaffPreset, byAdmin: number): Promise<"ok" | "not_admin" | "unavailable"> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT 1 FROM users WHERE id = ? AND role = 'admin'", [userId]);
  if (rows.length === 0) return "not_admin";
  try {
    if (preset === "full") await pool.query("DELETE FROM admin_staff_access WHERE user_id = ?", [userId]);
    else await pool.query("INSERT INTO admin_staff_access (user_id, preset, updated_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE preset = VALUES(preset), updated_by = VALUES(updated_by)", [userId, preset, byAdmin]);
  } catch (err) {
    if ((err as { code?: string }).code === "ER_NO_SUCH_TABLE") return "unavailable";
    throw err;
  }
  forgetStaffPreset(userId);
  return "ok";
}
