import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";
import { checkRateLimit, peekRateLimit, resetRateLimit } from "@/lib/server/rate-limit";
import { setUserPasswordHash } from "@/lib/server/users-repo";
import { MIN_PASSWORD_LENGTH, passwordProblem } from "@/lib/password";

const ATTEMPTS = 6;
const WINDOW_MS = 10 * 60 * 1000;

function fail(code: string, status: number, headers?: Record<string, string>) {
  return NextResponse.json({ error: code, code }, { status, headers });
}

// A signed-in person changes their own password: they must give the current one again (so a
// session left open on a shared computer cannot be used to take over the account), type the new
// one twice, and the new one must be different and long enough. Wrong current passwords are
// counted (6 in 10 minutes, then a pause); correct ones are not. The person stays signed in here.
export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return fail("unauthorized", 401);

  const key = `change-password:${user.id}`;
  const blocked = await peekRateLimit(key, ATTEMPTS);
  if (!blocked.allowed) return fail("rate_limited", 429, { "Retry-After": String(blocked.retryAfterSeconds) });

  const body = await request.json().catch(() => null);
  const current = body?.currentPassword;
  const next = body?.newPassword;
  const confirm = body?.confirmPassword;
  if (typeof current !== "string" || typeof next !== "string" || typeof confirm !== "string" || current === "" || current.length > 200) {
    return fail("invalid_input", 400);
  }

  const [rows] = await pool.query<RowDataPacket[]>("SELECT password_hash FROM users WHERE id = ?", [user.id]);
  const hash = rows[0]?.password_hash as string | undefined;
  if (!hash || !(await bcrypt.compare(current, hash))) {
    await checkRateLimit(key, ATTEMPTS, WINDOW_MS);
    return fail("wrong_password", 403);
  }

  const problem = passwordProblem(next);
  if (problem) return fail(problem, 400);
  if (next !== confirm) return fail("mismatch", 400);
  if (next === current) return fail("same_password", 400);

  await setUserPasswordHash(user.id, await bcrypt.hash(next, 12));
  await resetRateLimit(key);
  return NextResponse.json({ success: true, minLength: MIN_PASSWORD_LENGTH });
}
