import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { setSessionCookie, signSessionToken } from "@/lib/auth-server";
import { checkRateLimit, getClientIp, peekRateLimit, resetRateLimit } from "@/lib/server/rate-limit";
import { detectLocale, rememberLocale } from "@/lib/server/notifications";
import { readChallenge, verifySecondStep } from "@/lib/server/totp";
import { logAdminAction } from "@/lib/server/audit-log";

const ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

function fail(code: string, status: number, headers?: Record<string, string>) {
  return NextResponse.json({ error: code, code }, { status, headers });
}

// The second sign-in step for an admin: the pass from the password step plus the 6-digit code from
// the authenticator app (or a recovery code). Wrong codes are counted per account and per address.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const userId = readChallenge(body?.challenge);
  const code = body?.code;
  if (userId === null) return fail("expired", 401);
  if (typeof code !== "string" || code.trim() === "" || code.length > 40) return fail("invalid_input", 400);

  const userKey = `second-step:${userId}`;
  const ipKey = `second-step-ip:${getClientIp(request)}`;
  const userBlock = await peekRateLimit(userKey, ATTEMPTS);
  const blocked = userBlock.allowed ? await peekRateLimit(ipKey, ATTEMPTS * 4) : userBlock;
  if (!blocked.allowed) return fail("rate_limited", 429, { "Retry-After": String(blocked.retryAfterSeconds) });

  const [rows] = await pool.query<RowDataPacket[]>("SELECT id, name, email, role, country, status FROM users WHERE id = ?", [userId]);
  const row = rows[0];
  if (!row || row.role !== "admin" || row.status === "suspended") return fail("expired", 401);
  const user = { id: row.id as number, name: row.name as string, email: row.email as string, role: row.role as string, country: row.country as string };

  const result = await verifySecondStep(userId, code);
  if (result === "wrong") {
    await checkRateLimit(userKey, ATTEMPTS, WINDOW_MS);
    await checkRateLimit(ipKey, ATTEMPTS * 4, WINDOW_MS);
    logAdminAction(request, user, "sign_in_code_wrong", { targetType: "user", targetId: user.id });
    return fail("wrong_code", 401);
  }
  await resetRateLimit(userKey);
  rememberLocale(user.id, detectLocale(request));
  logAdminAction(request, user, result === "recovery" ? "sign_in_recovery_code" : "sign_in", { targetType: "user", targetId: user.id });
  const response = NextResponse.json({ user, usedRecoveryCode: result === "recovery" });
  setSessionCookie(response, signSessionToken(user));
  return response;
}
