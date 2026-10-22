import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { isMailEnabled } from "@/lib/server/mail";
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit";
import { detectLocale } from "@/lib/server/notifications";
import { accountNeedsEmail, requestEmailAddition } from "@/lib/server/email-change";

// Does this signed-in person need to add an e-mail address, and can the site send the confirmation?
export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized", code: "unauthorized" }, { status: 401 });
  const [needed, enabled] = await Promise.all([accountNeedsEmail(user.id), isMailEnabled()]);
  return NextResponse.json({ needed, enabled }, { headers: { "Cache-Control": "no-store" } });
}

// Sends a confirmation link to the address the person typed.
export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized", code: "unauthorized" }, { status: 401 });

  const byUser = await checkRateLimit(`add-email:${user.id}`, 5, 60 * 60_000);
  const byAddress = await checkRateLimit(`add-email-ip:${getClientIp(request)}`, 15, 60 * 60_000);
  const blocked = !byUser.allowed ? byUser : !byAddress.allowed ? byAddress : null;
  if (blocked) return NextResponse.json({ error: "rate_limited", code: "rate_limited" }, { status: 429, headers: { "Retry-After": String(blocked.retryAfterSeconds) } });

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  const result = await requestEmailAddition(user.id, user.name, email, detectLocale(request) ?? "en");
  if (result === "invalid") return NextResponse.json({ error: "invalid_email", code: "invalid_email" }, { status: 400 });
  if (result === "has_email") return NextResponse.json({ error: "has_email", code: "has_email" }, { status: 409 });
  if (result === "mail_off") return NextResponse.json({ error: "mail_off", code: "mail_off" }, { status: 503 });
  return NextResponse.json({ ok: true });
}
