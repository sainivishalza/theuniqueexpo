import { NextResponse } from "next/server";
import { forgetSuppressed, ingestBounceMessages } from "@/lib/server/email-bounces";
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit";
import { reminderKeyMatches } from "@/lib/server/reminders";

const MAX_MESSAGES = 50;
const MAX_MESSAGE_CHARS = 60_000;

// Started by the "Mail bounces" GitHub workflow with the same key as the daily reminders (Admin -> Email). The body is
// { messages: ["<raw bounce message>", ...] }.
export async function POST(request: Request) {
  const limited = await checkRateLimit(`cron-bounces:${getClientIp(request)}`, 30, 60 * 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const key = request.headers.get("x-reminder-key") ?? "";
  if (!(await reminderKeyMatches(key))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const messages: unknown = body?.messages;
  if (!Array.isArray(messages) || messages.length > MAX_MESSAGES || messages.some((m) => typeof m !== "string")) {
    return NextResponse.json({ error: "invalid", detail: `send up to ${MAX_MESSAGES} messages as text` }, { status: 400 });
  }
  const result = await ingestBounceMessages((messages as string[]).map((m) => m.slice(0, MAX_MESSAGE_CHARS)));
  forgetSuppressed();
  return NextResponse.json(result);
}
