import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { logAdminAction } from "@/lib/server/audit-log";
import { bulkTourDecision, MAX_BULK_OTHER, parseIds, summarize } from "@/lib/server/bulk-other-decisions";

// Approve or reject the selected tour registrations in one go; each traveller is told once, like a single decision.
export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const ids = parseIds(body?.ids);
  if (ids.length === 0) return NextResponse.json({ error: "Select at least one registration", code: "none" }, { status: 400 });
  if (ids.length > MAX_BULK_OTHER) return NextResponse.json({ error: `Select at most ${MAX_BULK_OTHER} registrations`, code: "too_many" }, { status: 400 });
  const status = body?.status;
  if (status !== "approved" && status !== "rejected") return NextResponse.json({ error: "Invalid status", code: "invalid_status" }, { status: 400 });
  const summary = summarize(await bulkTourDecision(ids, status));
  if (summary.updated > 0) {
    logAdminAction(request, admin, "tour_registrations_bulk_status", { targetType: "tour_registration", details: `${status}: ${summary.updated} of ${ids.length} selected (ids ${summary.results.filter((r) => r.outcome === "updated").map((r) => r.id).join(",")})` });
  }
  return NextResponse.json(summary);
}
