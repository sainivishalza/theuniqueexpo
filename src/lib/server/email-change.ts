import { createHash, randomBytes } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { isPlaceholderEmail } from "@/lib/login-id";
import { EMAIL_RE, isMailEnabled, sendMailInBackground } from "@/lib/server/mail";
import { renderEmail, type EmailLocale } from "@/lib/server/notifications";

// "Add your e-mail": a person whose account has no real e-mail address (a buyer imported from an expo sheet
// signs in with a phone or passport number) can add one. A single-use link is sent to the NEW address, so
// only someone who can read that mailbox can attach it; only a hash of the link is stored.

export const EMAIL_LINK_MINUTES = 60;
const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
const TOKEN_RE = /^[A-Za-z0-9_-]{20,100}$/;

export async function accountNeedsEmail(userId: number): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT email FROM users WHERE id = ?", [userId]);
  return !!rows[0] && isPlaceholderEmail(String(rows[0].email));
}

export type AddEmailResult = "sent" | "invalid" | "has_email" | "mail_off";

// Asks for the link. Says "sent" whether or not the address belongs to another account (so it cannot be
// used to find out who has an account); the link is only really sent when the address is free.
export async function requestEmailAddition(userId: number, name: string, rawEmail: string, locale: EmailLocale): Promise<AddEmailResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email) || isPlaceholderEmail(email)) return "invalid";
  if (!(await isMailEnabled())) return "mail_off";
  if (!(await accountNeedsEmail(userId))) return "has_email";

  const [taken] = await pool.query<RowDataPacket[]>("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
  if (taken.length > 0) return "sent";

  const token = randomBytes(32).toString("base64url");
  await pool.query("DELETE FROM email_changes WHERE user_id = ?", [userId]);
  await pool.query("INSERT INTO email_changes (user_id, new_email, token_hash, expires_at) VALUES (?, ?, ?, ?)", [
    userId,
    email,
    hashToken(token),
    Date.now() + EMAIL_LINK_MINUTES * 60_000,
  ]);
  const mail = await renderEmail(locale, "confirmEmail", name, { minutes: EMAIL_LINK_MINUTES }, { path: `/confirm-email?token=${token}` });
  sendMailInBackground({ to: email, kind: "confirmEmail", userId, ...mail });
  return "sent";
}

export async function isEmailLinkValid(token: string): Promise<boolean> {
  if (!TOKEN_RE.test(token)) return false;
  const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM email_changes WHERE token_hash = ? AND expires_at > ?", [hashToken(token), Date.now()]);
  return rows.length > 0;
}

// Uses the link. Returns the new address, or the reason it could not be used.
export async function confirmEmailAddition(token: string): Promise<{ ok: true; email: string } | { ok: false; code: "invalid_token" | "email_taken" }> {
  if (!TOKEN_RE.test(token)) return { ok: false, code: "invalid_token" };
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT id, user_id, new_email FROM email_changes WHERE token_hash = ? AND expires_at > ? FOR UPDATE",
      [hashToken(token), Date.now()]
    );
    const row = rows[0];
    if (!row) {
      await conn.rollback();
      return { ok: false, code: "invalid_token" };
    }
    const [[current]] = await conn.query<RowDataPacket[]>("SELECT email FROM users WHERE id = ? FOR UPDATE", [row.user_id]);
    // Only an account that still has no real address can take one (the link cannot replace a real address).
    if (!current || !isPlaceholderEmail(String(current.email))) {
      await conn.query("DELETE FROM email_changes WHERE user_id = ?", [row.user_id]);
      await conn.commit();
      return { ok: false, code: "invalid_token" };
    }
    const [taken] = await conn.query<RowDataPacket[]>("SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1", [row.new_email, row.user_id]);
    if (taken.length > 0) {
      await conn.query("DELETE FROM email_changes WHERE user_id = ?", [row.user_id]);
      await conn.commit();
      return { ok: false, code: "email_taken" };
    }
    await conn.query("UPDATE users SET email = ? WHERE id = ?", [row.new_email, row.user_id]);
    await conn.query("DELETE FROM email_changes WHERE user_id = ?", [row.user_id]);
    await conn.commit();
    return { ok: true, email: String(row.new_email) };
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}
