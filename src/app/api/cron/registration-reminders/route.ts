import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit";
import { reminderKeyMatches, runRegistrationReminders } from "@/lib/server/reminders";

// Started by the nightly "Registration reminders" GitHub workflow with the key from Admin -> Email.
export async function POST(request: Request) {
  const limited = await checkRateLimit(`cron-reminders:${getClientIp(request)}`, 10, 60 * 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const key = request.headers.get("x-reminder-key") ?? "";
  if (!(await reminderKeyMatches(key))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await runRegistrationReminders());
}
