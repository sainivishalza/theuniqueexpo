import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";

// What the site tells a person, kept for them to read on the website (the same events that are e-mailed).
// Writing one never delays or fails the action it reports.

export type NotificationKind =
  | "registrationReceived"
  | "registrationWaitlisted"
  | "waitlistPlaceOpened"
  | "registrationApproved"
  | "registrationRejected"
  | "registrationReminder"
  | "registrationStartsSoon"
  | "savedRegistrationOpened"
  | "savedRegistrationClosing"
  | "passportExpiring"
  | "visaExpiring"
  | "groupInvite"
  | "tourRegistrationApproved"
  | "tourRegistrationRejected"
  | "documentRejected"
  | "pointsReceived"
  | "topupApproved"
  | "topupRejected"
  | "withdrawalPaid"
  | "withdrawalRejected"
  | "expenseApproved"
  | "expenseRejected"
  | "passwordChanged"
  | "announcement";

export const NOTIFICATION_KINDS: readonly string[] = [
  "registrationReceived", "registrationWaitlisted", "waitlistPlaceOpened", "registrationApproved", "registrationRejected", "registrationReminder", "registrationStartsSoon", "savedRegistrationOpened", "savedRegistrationClosing", "passportExpiring", "visaExpiring", "groupInvite", "tourRegistrationApproved", "tourRegistrationRejected", "documentRejected", "pointsReceived",
  "topupApproved", "topupRejected", "withdrawalPaid", "withdrawalRejected", "expenseApproved", "expenseRejected",
  "passwordChanged", "announcement",
];

// A value is a plain string/number, or (for text an admin wrote) one text per language.
export type NotificationParam = string | number | Record<string, string>;
export type NotificationParams = Record<string, NotificationParam>;

const MAX_PARAMS_BYTES = 6000;

export function addNotification(userId: number, kind: NotificationKind, params: NotificationParams, path: string): void {
  let json = JSON.stringify(params);
  if (Buffer.byteLength(json) > MAX_PARAMS_BYTES) json = "{}";
  void pool
    .query("INSERT INTO user_notifications (user_id, kind, params, path) VALUES (?, ?, ?, ?)", [userId, kind, json, path.slice(0, 200)])
    .catch((err) => {
      // The table does not exist until migration 064 has run.
      if ((err as { code?: string }).code !== "ER_NO_SUCH_TABLE") console.error("could not save a notification:", err);
    });
}

/** One notification for each of these people, in a single statement (an announcement to a few hundred buyers). */
export async function addNotificationForMany(userIds: number[], kind: NotificationKind, params: NotificationParams, path: string): Promise<void> {
  if (userIds.length === 0) return;
  const json = JSON.stringify(params);
  if (Buffer.byteLength(json) > MAX_PARAMS_BYTES) return;
  try {
    for (let i = 0; i < userIds.length; i += 500) {
      const chunk = userIds.slice(i, i + 500);
      await pool.query("INSERT INTO user_notifications (user_id, kind, params, path) VALUES ?", [chunk.map((id) => [id, kind, json, path.slice(0, 200)])]);
    }
  } catch (err) {
    if ((err as { code?: string }).code !== "ER_NO_SUCH_TABLE") console.error("could not save notifications:", err);
  }
}

/** Like addNotificationForMany, but each person gets their own text (an announcement with their name in it). */
export async function addPersonalNotifications(items: { userId: number; params: NotificationParams }[], kind: NotificationKind, path: string): Promise<void> {
  const rows: [number, string, string, string][] = [];
  for (const item of items) {
    const json = JSON.stringify(item.params);
    if (Buffer.byteLength(json) > MAX_PARAMS_BYTES) continue;
    rows.push([item.userId, kind, json, path.slice(0, 200)]);
  }
  try {
    for (let i = 0; i < rows.length; i += 500) {
      await pool.query("INSERT INTO user_notifications (user_id, kind, params, path) VALUES ?", [rows.slice(i, i + 500)]);
    }
  } catch (err) {
    if ((err as { code?: string }).code !== "ER_NO_SUCH_TABLE") console.error("could not save notifications:", err);
  }
}

export interface NotificationView {
  id: number;
  kind: string;
  params: Record<string, string | number>;
  path: string;
  createdAt: number;
  read: boolean;
}

// Texts an admin wrote come with one version per language: the reader gets theirs, else English.
function resolveParams(raw: string | null, locale: string): Record<string, string | number> {
  let parsed: NotificationParams = {};
  try {
    const value = JSON.parse(raw ?? "{}");
    if (value && typeof value === "object" && !Array.isArray(value)) parsed = value;
  } catch {}
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === "string" || typeof value === "number") out[key] = value;
    else if (value && typeof value === "object") out[key] = String(value[locale] || value.en || Object.values(value).find((v) => v) || "");
  }
  return out;
}

export async function listNotifications(userId: number, locale: string, limit = 30, before?: number): Promise<{ items: NotificationView[]; hasMore: boolean; unread: number }> {
  const take = Math.min(Math.max(limit, 1), 100);
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, kind, params, path, UNIX_TIMESTAMP(created_at) AS ts, read_at IS NOT NULL AS is_read
       FROM user_notifications WHERE user_id = ? ${before ? "AND id < ?" : ""} ORDER BY id DESC LIMIT ?`,
      before ? [userId, before, take + 1] : [userId, take + 1]
    );
    return {
      items: rows.slice(0, take).map((r) => ({ id: Number(r.id), kind: String(r.kind), params: resolveParams(r.params, locale), path: String(r.path), createdAt: Number(r.ts), read: !!r.is_read })),
      hasMore: rows.length > take,
      unread: await unreadCount(userId),
    };
  } catch (err) {
    if ((err as { code?: string }).code === "ER_NO_SUCH_TABLE") return { items: [], hasMore: false, unread: 0 };
    throw err;
  }
}

export async function unreadCount(userId: number): Promise<number> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM user_notifications WHERE user_id = ? AND read_at IS NULL", [userId]);
    return Number(rows[0]?.n ?? 0);
  } catch {
    return 0;
  }
}

/** Marks one (own) notification as read; false when it is not theirs or does not exist. */
export async function markRead(userId: number, id: number): Promise<boolean> {
  const [res] = await pool.query<ResultSetHeader>("UPDATE user_notifications SET read_at = COALESCE(read_at, NOW()) WHERE id = ? AND user_id = ?", [id, userId]);
  return res.affectedRows === 1;
}

export async function markAllRead(userId: number): Promise<number> {
  const [res] = await pool.query<ResultSetHeader>("UPDATE user_notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL", [userId]);
  return res.affectedRows;
}
