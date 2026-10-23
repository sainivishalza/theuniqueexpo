import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";
import { checkRateLimit, getClientIp, peekRateLimit, resetRateLimit } from "@/lib/server/rate-limit";
import { detectLocale } from "@/lib/server/notifications";
import { requestEmailChange } from "@/lib/server/email-change";

const ATTEMPTS = 6;
const WINDOW_MS = 10 * 60 * 1000;

function fail(code: string, status: number, headers?: Record<string, string>) {
  return NextResponse.json({ error: code, code }, { status, headers });
}

// A signed-in person with a real e-mail address asks to use another one. Like changing the password, it needs the
// current password again (a session left open on a shared computer must not be able to take over the account's
// e-mail, which is where password resets go). Wrong passwords are counted (6 in 10 minutes, then a pause).
// The link to confirm goes to the NEW address; nothing changes until it is opened.
export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return fail("unauthorized", 401);

  const key = `change-email:${user.id}`;
  const blocked = await peekRateLimit(key, ATTEMPTS);
  if (!blocked.allowed) return fail("rate_limited", 429, { "Retry-After": String(blocked.retryAfterSeconds) });

  const body = await request.json().catch(() => null);
  const email = body?.email;
  const password = body?.currentPassword;
  if (typeof email !== "string" || typeof password !== "string" || password === "" || password.length > 200) return fail("invalid_input", 400);

  const [rows] = await pool.query<RowDataPacket[]>("SELECT password_hash FROM users WHERE id = ?", [user.id]);
  const hash = rows[0]?.password_hash as string | undefined;
  if (!hash || !(await bcrypt.compare(password, hash))) {
    await checkRateLimit(key, ATTEMPTS, WINDOW_MS);
    return fail("wrong_password", 403);
  }
  await resetRateLimit(key);

  const asked = await checkRateLimit(`change-email-asked:${user.id}`, 5, 60 * 60_000);
  const byIp = await checkRateLimit(`change-email-ip:${getClientIp(request)}`, 15, 60 * 60_000);
  const limited = !asked.allowed ? asked : !byIp.allowed ? byIp : null;
  if (limited) return fail("rate_limited", 429, { "Retry-After": String(limited.retryAfterSeconds) });

  const result = await requestEmailChange(user.id, user.name, user.email, email, detectLocale(request) ?? "en");
  if (result === "invalid") return fail("invalid_email", 400);
  if (result === "same") return fail("same_email", 400);
  if (result === "no_email") return fail("no_email", 409);
  if (result === "mail_off") return fail("mail_off", 503);
  if (result === "unavailable") return fail("unavailable", 503);
  return NextResponse.json({ ok: true });
}
