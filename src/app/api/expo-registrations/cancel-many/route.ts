import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { cancelMyRegistration } from "@/lib/server/expo-registrations-repo";
import { checkRateLimit } from "@/lib/server/rate-limit";

const MAX_AT_ONCE = 40;
const noStore = { "Cache-Control": "no-store" };

// The signed-in person cancels several of their own registrations at once. Each one is cancelled by the same rule
// as a single cancel (a registration that was already reviewed, or whose exhibition is over, stays as it is), and
// only ever their own: someone else's id is simply reported as not cancelled.
export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized", code: "unauthorized" }, { status: 401, headers: noStore });
  const body = await request.json().catch(() => null);
  const raw = (body as { ids?: unknown } | null)?.ids;
  const ids = Array.isArray(raw) ? Array.from(new Set(raw.filter((v): v is number => Number.isInteger(v) && v > 0))) : [];
  if (ids.length === 0 || ids.length > MAX_AT_ONCE) return NextResponse.json({ error: "invalid_input", code: "invalid_input" }, { status: 400, headers: noStore });
  const limited = await checkRateLimit(`bulk-cancel:${user.id}`, 30, 60 * 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "rate_limited", code: "rate_limited" }, { status: 429, headers: { ...noStore, "Retry-After": String(limited.retryAfterSeconds) } });

  const cancelled: number[] = [];
  const notCancelled: number[] = [];
  for (const id of ids) {
    try {
      (await cancelMyRegistration(id, user.id) ? cancelled : notCancelled).push(id);
    } catch (err) {
      console.error("Bulk cancel failed for", id, err);
      notCancelled.push(id);
    }
  }
  return NextResponse.json({ cancelled, notCancelled }, { headers: noStore });
}
