import { createHmac, timingSafeEqual } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";

// What a buyer chooses to be e-mailed about. Everything about their own registrations, documents, wallet and account is
// always e-mailed (and always shown on the website); only these optional ones can be turned off. Each e-mail of an optional
// kind carries a link that turns it off in one step, without signing in.

export const MAIL_PREFERENCES = ["digest", "savedAlerts"] as const;
export type MailPreference = (typeof MAIL_PREFERENCES)[number];
export type MailPreferences = Record<MailPreference, boolean>;

const COLUMN: Record<MailPreference, string> = { digest: "mail_digest", savedAlerts: "mail_saved_alerts" };

export function isMailPreference(value: unknown): value is MailPreference {
  return typeof value === "string" && (MAIL_PREFERENCES as readonly string[]).includes(value);
}

/** The optional preference that controls e-mails of this kind (null: always sent). */
export function preferenceForKind(kind: string): MailPreference | null {
  return kind === "savedRegistrationOpened" || kind === "savedRegistrationClosing" ? "savedAlerts" : kind === "digest" ? "digest" : null;
}

/** null until migration 085 has run. */
export async function getMailPreferences(userId: number): Promise<MailPreferences | null> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT mail_digest, mail_saved_alerts FROM users WHERE id = ?", [userId]);
    if (!rows[0]) return null;
    return { digest: !!rows[0].mail_digest, savedAlerts: !!rows[0].mail_saved_alerts };
  } catch (err) {
    if ((err as { code?: string }).code === "ER_BAD_FIELD_ERROR") return null;
    throw err;
  }
}

/** false when nothing could be saved (the columns are not there yet). */
export async function setMailPreferences(userId: number, changes: Partial<MailPreferences>): Promise<boolean> {
  const sets = MAIL_PREFERENCES.filter((k) => typeof changes[k] === "boolean");
  if (sets.length === 0) return true;
  try {
    await pool.query(`UPDATE users SET ${sets.map((k) => `${COLUMN[k]} = ?`).join(", ")} WHERE id = ?`, [...sets.map((k) => (changes[k] ? 1 : 0)), userId]);
    return true;
  } catch (err) {
    if ((err as { code?: string }).code === "ER_BAD_FIELD_ERROR") return false;
    throw err;
  }
}

/** Does this person want e-mails of this kind? (Always true for the kinds that cannot be turned off.) */
export async function allowsEmail(userId: number, kind: string): Promise<boolean> {
  const pref = preferenceForKind(kind);
  if (!pref) return true;
  const prefs = await getMailPreferences(userId).catch(() => null);
  return prefs ? prefs[pref] : true;
}

// The link in an e-mail proves who it was sent to: a signature of the person and the preference, made with the
// site's secret, so nobody can turn off someone else's e-mails by guessing numbers.
function sign(userId: number, pref: MailPreference): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable must be set");
  return createHmac("sha256", secret).update(`unsubscribe:${userId}:${pref}`).digest("hex").slice(0, 32);
}

export function unsubscribeToken(userId: number, pref: MailPreference): string {
  return sign(userId, pref);
}

export function verifyUnsubscribeToken(userId: number, pref: MailPreference, token: string): boolean {
  if (typeof token !== "string" || token.length !== 32) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(sign(userId, pref));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function unsubscribeQuery(userId: number, pref: MailPreference): string {
  return `u=${userId}&k=${pref}&t=${unsubscribeToken(userId, pref)}`;
}
