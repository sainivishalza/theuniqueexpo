import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { logAdminAction } from "@/lib/server/audit-log";
import { mergeBuyers } from "@/lib/server/buyer-duplicates";
import { checkRateLimit } from "@/lib/server/rate-limit";

// Merges one buyer account (merge) into another (keep). Cannot be taken back, so the screen asks first.
export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const keep = Number(body?.keep), merge = Number(body?.merge);
  if (!Number.isInteger(keep) || !Number.isInteger(merge) || keep <= 0 || merge <= 0 || keep === merge) return NextResponse.json({ error: "Choose two different accounts", code: "invalid" }, { status: 400 });
  const limited = await checkRateLimit(`merge:${admin.id}`, 20, 60 * 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Too many merges in the last hour", code: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
  const result = await mergeBuyers({ id: admin.id, name: admin.name }, keep, merge);
  if (!result.ok) return NextResponse.json({ error: result.code, code: result.code }, { status: result.code === "failed" ? 500 : 409 });
  logAdminAction(request, admin, "buyers_merged", { targetType: "user", targetId: keep, details: `account ${merge} merged into ${keep}` });
  return NextResponse.json({ ok: true, summary: result.summary });
}
