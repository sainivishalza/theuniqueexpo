import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit";
import { consumeResetToken, isResetTokenValid } from "@/lib/server/password-reset";
import { notifyPasswordChanged } from "@/lib/server/notifications";
import { passwordProblem } from "@/lib/password";

const ATTEMPTS = 20;
const WINDOW_MS = 60 * 60 * 1000;

function fail(code: string, status: number, headers?: Record<string, string>) {
  return NextResponse.json({ error: code, code }, { status, headers });
}

// Is this link still good? (So the page can say "this link has expired" before the person types anything.)
export async function GET(request: Request) {
  const limited = await checkRateLimit(`reset-check:${getClientIp(request)}`, ATTEMPTS * 3, WINDOW_MS);
  if (!limited.allowed) return fail("rate_limited", 429, { "Retry-After": String(limited.retryAfterSeconds) });
  const token = new URL(request.url).searchParams.get("token") ?? "";
  return NextResponse.json({ valid: await isResetTokenValid(token) }, { headers: { "Cache-Control": "no-store" } });
}

// Sets the new password with the link from the e-mail. The person is not signed in by this: they sign in with the new password.
export async function POST(request: Request) {
  const limited = await checkRateLimit(`reset:${getClientIp(request)}`, ATTEMPTS, WINDOW_MS);
  if (!limited.allowed) return fail("rate_limited", 429, { "Retry-After": String(limited.retryAfterSeconds) });

  const body = await request.json().catch(() => null);
  const token = body?.token;
  const next = body?.newPassword;
  const confirm = body?.confirmPassword;
  if (typeof token !== "string" || typeof next !== "string" || typeof confirm !== "string") return fail("invalid_input", 400);

  const problem = passwordProblem(next);
  if (problem) return fail(problem, 400);
  if (next !== confirm) return fail("mismatch", 400);

  const userId = await consumeResetToken(token, await bcrypt.hash(next, 12));
  if (userId === null) return fail("invalid_token", 400);
  notifyPasswordChanged(userId, request);
  return NextResponse.json({ success: true });
}
