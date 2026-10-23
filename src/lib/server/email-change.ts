import { createHash, randomBytes } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { isPlaceholderEmail } from "@/lib/login-id";
import { EMAIL_RE, isMailEnabled, sendMailInBackground } from "@/lib/server/mail";
import { asLocale, renderEmail, type EmailLocale } from "@/lib/server/notifications";

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

export type ChangeEmailResult = "sent" | "invalid" | "same" | "mail_off" | "no_email" | "unavailable";

// "Change my e-mail": a person who already has a real address asks for another. As above, the link goes to the NEW
// address and only a hash of it is kept, together with the address the account has now (the link works only while the
// account still has it). An address that belongs to another account gets the normal answer and no mail.
export async function requestEmailChange(userId: number, name: string, currentEmail: string, rawEmail: string, locale: EmailLocale): Promise<ChangeEmailResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email) || isPlaceholderEmail(email)) return "invalid";
  if (isPlaceholderEmail(currentEmail)) return "no_email";
  if (email === currentEmail.trim().toLowerCase()) return "same";
  if (!(await isMailEnabled())) return "mail_off";

  const [taken] = await pool.query<RowDataPacket[]>("SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1", [email, userId]);
  if (taken.length > 0) return "sent";

  const token = randomBytes(32).toString("base64url");
  await pool.query("DELETE FROM email_changes WHERE user_id = ?", [userId]);
  try {
    await pool.query("INSERT INTO email_changes (user_id, new_email, token_hash, expires_at, old_email) VALUES (?, ?, ?, ?, ?)", [
      userId,
      email,
      hashToken(token),
      Date.now() + EMAIL_LINK_MINUTES * 60_000,
      currentEmail.trim().toLowerCase(),
    ]);
  } catch (err) {
    // The column does not exist until migration 067 has run.
    if ((err as { code?: string }).code === "ER_BAD_FIELD_ERROR") return "unavailable";
    throw err;
  }
  const mail = await renderEmail(locale, "confirmEmailChange", name, { minutes: EMAIL_LINK_MINUTES }, { path: `/confirm-email?token=${token}` });
  sendMailInBackground({ to: email, kind: "confirmEmailChange", userId, ...mail });
  return "sent";
}

// Tells the address an account used to have that it was changed (so a change nobody asked for is noticed).
async function noticeToOldAddress(userId: number, oldEmail: string, newEmail: string, name: string): Promise<void> {
  if (!oldEmail || isPlaceholderEmail(oldEmail) || !(await isMailEnabled())) return;
  let locale: EmailLocale = "en";
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT preferred_locale FROM users WHERE id = ?", [userId]);
    locale = asLocale(rows[0]?.preferred_locale);
  } catch {
    // an older database without the language column: English
  }
  const mail = await renderEmail(locale, "emailChanged", name, { email: newEmail }, { path: "/login" });
  sendMailInBackground({ to: oldEmail, kind: "emailChanged", userId, ...mail });
}

export async function isEmailLinkValid(token: string): Promise<boolean> {
  if (!TOKEN_RE.test(token)) return false;
  const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM email_changes WHERE token_hash = ? AND expires_at > ?", [hashToken(token), Date.now()]);
  return rows.length > 0;
}

export type ConfirmResult =
  | { ok: true; email: string; changed: boolean; userId: number; name: string; role: string; previousEmail: string }
  | { ok: false; code: "invalid_token" | "email_taken" };

// Uses the link. Returns the new address, or the reason it could not be used. A link from "add your e-mail" only
// works for an account that still has no real address; a link from "change my e-mail" only while the account still
// has the address it had when the link was asked for.
export async function confirmEmailAddition(token: string): Promise<ConfirmResult> {
  if (!TOKEN_RE.test(token)) return { ok: false, code: "invalid_token" };
  const conn = await pool.getConnection();
  let notice: { userId: number; oldEmail: string; newEmail: string; name: string } | null = null;
  try {
    await conn.beginTransaction();
    let rows: RowDataPacket[];
    try {
      [rows] = await conn.query<RowDataPacket[]>(
        "SELECT id, user_id, new_email, old_email FROM email_changes WHERE token_hash = ? AND expires_at > ? FOR UPDATE",
        [hashToken(token), Date.now()]
      );
    } catch (err) {
      // Before migration 067 there is no old_email: only "add your e-mail" links exist.
      if ((err as { code?: string }).code !== "ER_BAD_FIELD_ERROR") throw err;
      [rows] = await conn.query<RowDataPacket[]>(
        "SELECT id, user_id, new_email, NULL AS old_email FROM email_changes WHERE token_hash = ? AND expires_at > ? FOR UPDATE",
        [hashToken(token), Date.now()]
      );
    }
    const row = rows[0];
    if (!row) {
      await conn.rollback();
      return { ok: false, code: "invalid_token" };
    }
    const [[current]] = await conn.query<RowDataPacket[]>("SELECT email, name, role FROM users WHERE id = ? FOR UPDATE", [row.user_id]);
    const changing = !!row.old_email;
    const usable = !!current && (changing ? String(current.email).toLowerCase() === String(row.old_email).toLowerCase() : isPlaceholderEmail(String(current.email)));
    if (!usable) {
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
    const previousEmail = String(current.email);
    if (changing) notice = { userId: Number(row.user_id), oldEmail: previousEmail, newEmail: String(row.new_email), name: String(current.name || "") };
    return { ok: true, email: String(row.new_email), changed: changing, userId: Number(row.user_id), name: String(current.name || ""), role: String(current.role || ""), previousEmail };
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
    if (notice) noticeToOldAddress(notice.userId, notice.oldEmail, notice.newEmail, notice.name).catch((e) => console.error("Could not tell the old e-mail address", e));
  }
}
