import { NextResponse } from "next/server";
import { isMailPreference, setMailPreferences, verifyUnsubscribeToken } from "@/lib/server/mail-preferences";
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit";

// Turns one kind of optional e-mail off for the person named in the link of an e-mail. The link carries a signature, so no
// sign-in is needed (and nobody can switch off someone else's e-mails by guessing). Used by the page the link opens, and
// by mail programs' own "Unsubscribe" button (a POST to the address in the List-Unsubscribe header).
export async function POST(request: Request) {
  const limited = await checkRateLimit(`unsubscribe:${getClientIp(request)}`, 30, 10 * 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Too many requests", code: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });

  const url = new URL(request.url);
  const body = request.headers.get("content-type")?.includes("application/json") ? await request.json().catch(() => null) : null;
  const userId = Number(body?.u ?? url.searchParams.get("u"));
  const pref = body?.k ?? url.searchParams.get("k");
  const token = body?.t ?? url.searchParams.get("t");
  if (!Number.isInteger(userId) || userId <= 0 || !isMailPreference(pref) || typeof token !== "string" || !verifyUnsubscribeToken(userId, pref, token)) {
    return NextResponse.json({ error: "This link is not valid", code: "invalid_link" }, { status: 400 });
  }
  if (!(await setMailPreferences(userId, { [pref]: false }))) return NextResponse.json({ error: "Not available yet", code: "unavailable" }, { status: 503 });
  return NextResponse.json({ ok: true, preference: pref });
}
