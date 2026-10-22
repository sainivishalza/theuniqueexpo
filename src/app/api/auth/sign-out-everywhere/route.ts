import { NextResponse } from "next/server";
import { getSessionUser, setSessionCookie, signSessionToken } from "@/lib/auth-server";
import { endAllSessions } from "@/lib/server/users-repo";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { logAdminAction } from "@/lib/server/audit-log";

// "Sign out of all other devices": any session signed before now ends, this device gets a fresh one.
// For someone who signed in on a shared computer, or lost a phone.
export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized", code: "unauthorized" }, { status: 401 });
  const limited = await checkRateLimit(`sign-out-everywhere:${user.id}`, 10, 60 * 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "rate_limited", code: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
  if (!(await endAllSessions(user.id))) return NextResponse.json({ error: "unavailable", code: "unavailable" }, { status: 503 });
  if (user.role === "admin") logAdminAction(request, user, "signed_out_everywhere", { targetType: "user", targetId: user.id });
  const response = NextResponse.json({ success: true });
  setSessionCookie(response, signSessionToken(user));
  return response;
}
