import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit";
import { confirmEmailAddition, isEmailLinkValid } from "@/lib/server/email-change";

// Is this link still good? (The page says so before asking for anything.)
export async function GET(request: Request) {
  const limited = await checkRateLimit(`confirm-email-check:${getClientIp(request)}`, 60, 60 * 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "rate_limited", code: "rate_limited" }, { status: 429 });
  const token = new URL(request.url).searchParams.get("token") ?? "";
  return NextResponse.json({ valid: await isEmailLinkValid(token) }, { headers: { "Cache-Control": "no-store" } });
}

// Uses the link from the e-mail: the address is attached to the account.
export async function POST(request: Request) {
  const limited = await checkRateLimit(`confirm-email:${getClientIp(request)}`, 20, 60 * 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "rate_limited", code: "rate_limited" }, { status: 429 });
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const result = await confirmEmailAddition(token);
  if (!result.ok) return NextResponse.json({ error: result.code, code: result.code }, { status: 400 });
  return NextResponse.json({ success: true, email: result.email });
}
