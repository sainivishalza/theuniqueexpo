import { NextResponse } from "next/server";
import { rateLimitOrNull } from "@/lib/server/rate-limit";
import { recordVital } from "@/lib/server/web-vitals";
import { isVital, PAGE_GROUP_RE } from "@/lib/web-vitals";

// One page-speed measure from a visitor's browser (sent by WebVitalsReporter). Anyone can call it, so it only accepts a known
// measure, a believable number, a kind of page and phone/desktop; it is limited per address; and it never answers with anything.
export async function POST(request: Request) {
  const limited = await rateLimitOrNull(request, "web-vitals", 60, 10 * 60_000, { memoryOnly: true });
  if (limited) return new NextResponse(null, { status: 204 });
  const text = await request.text().catch(() => "");
  if (text.length > 500) return new NextResponse(null, { status: 204 });
  let b: { name?: unknown; value?: unknown; page?: unknown; device?: unknown } | null = null;
  try {
    b = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  if (!b || !isVital(b.name) || typeof b.value !== "number" || typeof b.page !== "string" || !PAGE_GROUP_RE.test(b.page) || (b.device !== "phone" && b.device !== "desktop")) {
    return new NextResponse(null, { status: 204 });
  }
  await recordVital({ metric: b.name, value: b.value, page: b.page, device: b.device });
  return new NextResponse(null, { status: 204 });
}
