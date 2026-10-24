import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { logAdminAction } from "@/lib/server/audit-log";
import { optimizeStoredBatch, storedImageSizes } from "@/lib/server/site-image";
import { checkRateLimit } from "@/lib/server/rate-limit";

// Admin -> Pictures: how big the stored website pictures are, and a few at a time "check" (nothing changes) or "apply" (smaller copies
// replace the originals when they are clearly smaller). The screen repeats the call until `next` is null.
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const sources = await storedImageSizes();
  return NextResponse.json({ sources, totalBytes: sources.reduce((n, s) => n + s.bytes, 0), totalCount: sources.reduce((n, s) => n + s.count, 0) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const cursor = body?.cursor === null || body?.cursor === undefined ? null : String(body.cursor);
  if (cursor !== null && !/^\d{1,3}:\d{1,12}$/.test(cursor)) return NextResponse.json({ error: "Invalid request", code: "bad_request" }, { status: 400 });
  if (typeof body?.apply !== "boolean") return NextResponse.json({ error: "Invalid request", code: "bad_request" }, { status: 400 });
  const limited = await checkRateLimit(`image-optimizer:${admin.id}`, 600, 60 * 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Too many requests", code: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
  const result = await optimizeStoredBatch(cursor, body.apply);
  // One line in the activity log when a run that changes things starts and when it ends.
  if (body.apply && (cursor === null || result.next === null)) {
    logAdminAction(request, admin, cursor === null ? "images_optimize_started" : "images_optimize_finished", { targetType: "settings" });
  }
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
