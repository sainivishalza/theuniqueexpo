import { createHash, randomBytes } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { isPlaceholderEmail } from "@/lib/login-id";
import { isMailEnabled } from "@/lib/server/mail";
import { notifyUser, type EmailLocale } from "@/lib/server/notifications";
import { setUserPasswordHash } from "@/lib/server/users-repo";

// "Forgot password": a single-use link is e-mailed to the address on the account. Only the SHA-256 of the
// link's secret is stored, so reading the database does not give anyone a working link; a link works once
// and for one hour; asking again replaces the earlier link.

export const RESET_LINK_MINUTES = 60;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

// Creates the link and sends it, if an account with this e-mail address exists and can receive mail.
// Says nothing either way: the caller answers every request the same.
export async function sendPasswordResetLink(email: string, locale: EmailLocale): Promise<void> {
  if (!(await isMailEnabled())) return;
  const [rows] = await pool.query<RowDataPacket[]>("SELECT id, status FROM users WHERE email = ? LIMIT 1", [email]);
  const user = rows[0];
  if (!user || user.status === "suspended" || isPlaceholderEmail(email)) return;

  const token = randomBytes(32).toString("base64url");
  await pool.query("DELETE FROM password_resets WHERE user_id = ?", [user.id]);
  await pool.query("INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)", [
    user.id,
    hashToken(token),
    Date.now() + RESET_LINK_MINUTES * 60_000,
  ]);
  notifyUser(user.id, "passwordReset", { minutes: RESET_LINK_MINUTES }, { path: `/reset-password?token=${token}` }, locale);
}

export async function isResetTokenValid(token: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return false;
  const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM password_resets WHERE token_hash = ? AND expires_at > ?", [hashToken(token), Date.now()]);
  return rows.length > 0;
}

// Uses the link: sets the new password and ends every other use of any link of that account.
// Returns the account id, or null when the link is wrong, used or expired.
export async function consumeResetToken(token: string, newPasswordHash: string): Promise<number | null> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // The delete decides who uses the link: of two requests with the same link only one removes the row.
    const [rows] = await conn.query<RowDataPacket[]>("SELECT id, user_id FROM password_resets WHERE token_hash = ? AND expires_at > ? FOR UPDATE", [hashToken(token), Date.now()]);
    const row = rows[0];
    if (!row) {
      await conn.rollback();
      return null;
    }
    // The password is saved before the link is removed: if saving fails, the link still works.
    await setUserPasswordHash(row.user_id, newPasswordHash);
    await conn.query("DELETE FROM password_resets WHERE user_id = ?", [row.user_id]);
    await conn.commit();
    return row.user_id as number;
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}
