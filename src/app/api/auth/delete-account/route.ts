import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";
import { checkRateLimit, getClientIp, peekRateLimit, resetRateLimit } from "@/lib/server/rate-limit";
import { checkAccountDeletion, deleteAccount } from "@/lib/server/account-deletion";
import { asLocale, detectLocale, renderEmail } from "@/lib/server/notifications";
import { isPlaceholderEmail } from "@/lib/login-id";
import { sendMail } from "@/lib/server/mail";

const ATTEMPTS = 6;
const WINDOW_MS = 10 * 60 * 1000;

function fail(code: string, status: number, extra: Record<string, unknown> = {}, headers?: Record<string, string>) {
  return NextResponse.json({ error: code, code, ...extra }, { status, headers });
}

// What would stop this person deleting their account now (reward points left, money requests waiting), and what deleting does to
// their upcoming registrations. Shown on the page before they are asked for their password.
export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return fail("unauthorized", 401);
  const check = await checkAccountDeletion(user.id);
  if (!check) return fail("unauthorized", 401);
  return NextResponse.json(check, { headers: { "Cache-Control": "no-store" } });
}

// Deletes the signed-in person's own account. Needs the password again and a clear "I understand" (a session left open on a shared
// computer must not be able to erase an account). See src/lib/server/account-deletion.ts for what is removed and what is kept.
export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return fail("unauthorized", 401);

  const key = `delete-account:${user.id}`;
  const blocked = await peekRateLimit(key, ATTEMPTS);
  if (!blocked.allowed) return fail("rate_limited", 429, {}, { "Retry-After": String(blocked.retryAfterSeconds) });
  const byIp = await checkRateLimit(`delete-account-ip:${getClientIp(request)}`, 15, 60 * 60_000);
  if (!byIp.allowed) return fail("rate_limited", 429, {}, { "Retry-After": String(byIp.retryAfterSeconds) });

  const body = await request.json().catch(() => null);
  const password = body?.password;
  if (typeof password !== "string" || password === "" || password.length > 200 || body?.understand !== true) return fail("invalid_input", 400);

  const [rows] = await pool.query<RowDataPacket[]>("SELECT password_hash, preferred_locale FROM users WHERE id = ?", [user.id]);
  const hash = rows[0]?.password_hash as string | undefined;
  if (!hash || !(await bcrypt.compare(password, hash))) {
    await checkRateLimit(key, ATTEMPTS, WINDOW_MS);
    return fail("wrong_password", 403);
  }
  await resetRateLimit(key);

  const locale = detectLocale(request) ?? asLocale(rows[0]?.preferred_locale);
  const result = await deleteAccount(user.id).catch((err) => {
    console.error("Delete account error:", err);
    return null;
  });
  if (!result) return fail("failed", 500);
  if (!result.ok) return fail("blocked", 409, { blockers: result.blockers });

  // The person is told by e-mail at the address the account had (it is gone from the account now, so it is kept only for this message).
  if (user.email && !isPlaceholderEmail(user.email)) {
    renderEmail(locale, "accountDeleted", user.name, {}, { path: "/" })
      .then((mail) => sendMail({ to: user.email, kind: "accountDeleted", userId: null, ...mail }))
      .catch((err) => console.error("Could not send the account-deleted e-mail:", err));
  }
  const response = NextResponse.json({ ok: true, cancelled: result.cancelled });
  response.cookies.set("token", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 0, path: "/" });
  return response;
}
