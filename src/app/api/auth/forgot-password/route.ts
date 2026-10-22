import { NextResponse } from "next/server";
import { isMailEnabled } from "@/lib/server/mail";
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit";
import { detectLocale } from "@/lib/server/notifications";
import { sendPasswordResetLink } from "@/lib/server/password-reset";
import { EMAIL_RE } from "@/lib/server/mail";

const PER_ADDRESS = 5;
const PER_EMAIL = 3;
const WINDOW_MS = 60 * 60 * 1000;

// Does the site send e-mail? (The sign-in page only offers "Forgot password?" when it does.)
export async function GET() {
  return NextResponse.json({ enabled: await isMailEnabled() }, { headers: { "Cache-Control": "no-store" } });
}

// Asks for a reset link. The answer is always the same -- whether or not the address belongs to an
// account -- so this cannot be used to find out who has an account; the link is made and sent after
// the answer has gone out, so even the response time says nothing.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please enter a valid e-mail address.", code: "invalid_email" }, { status: 400 });
  }

  const byAddress = await checkRateLimit(`forgot:${getClientIp(request)}`, PER_ADDRESS, WINDOW_MS);
  if (!byAddress.allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later.", code: "rate_limited" }, { status: 429, headers: { "Retry-After": String(byAddress.retryAfterSeconds) } });
  }
  const byEmail = await checkRateLimit(`forgot-email:${email}`, PER_EMAIL, WINDOW_MS);

  // Past the limit for this e-mail address the answer stays the same, but nothing is sent.
  if (byEmail.allowed) {
    const locale = detectLocale(request) ?? "en";
    sendPasswordResetLink(email, locale).catch((err) => console.error("Password reset link failed:", err));
  }
  return NextResponse.json({ ok: true });
}
