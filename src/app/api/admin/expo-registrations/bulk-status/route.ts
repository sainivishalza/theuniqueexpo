import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/server/audit-log";
import { requireAdmin } from "@/lib/auth-server";
import { isValidDateOnly } from "@/lib/registration-lifecycle";
import { decideRegistrations, MAX_BULK_REGISTRATIONS, type Decision } from "@/lib/server/registration-decisions";

// Approve or reject the selected registrations in one go. Approving can carry a confirm-by date for all of them;
// without one each registration gets its own exhibition's default.
export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const ids: number[] = Array.isArray(body?.ids)
    ? Array.from(new Set<number>(body.ids.filter((v: unknown): v is number => Number.isInteger(v) && (v as number) > 0)))
    : [];
  if (ids.length === 0) return NextResponse.json({ error: "Select at least one registration", code: "none" }, { status: 400 });
  if (ids.length > MAX_BULK_REGISTRATIONS) {
    return NextResponse.json({ error: `Select at most ${MAX_BULK_REGISTRATIONS} registrations`, code: "too_many" }, { status: 400 });
  }
  const decision = body?.status as Decision;
  if (decision !== "approved" && decision !== "rejected") return NextResponse.json({ error: "Invalid status", code: "invalid_status" }, { status: 400 });

  let confirmBy: string | null = null;
  if (decision === "approved" && body?.confirmBy !== undefined && body.confirmBy !== null && body.confirmBy !== "") {
    if (!isValidDateOnly(body.confirmBy)) return NextResponse.json({ error: "Please enter a valid confirm-by date", code: "invalid_date" }, { status: 400 });
    confirmBy = body.confirmBy;
  }

  const results = await decideRegistrations(ids, decision, confirmBy);
  const updated = results.filter((r) => r.outcome === "updated");
  if (updated.length > 0) {
    logAdminAction(request, admin, "expo_registrations_bulk_status", {
      targetType: "expo_registration",
      details: `${decision}: ${updated.length} of ${ids.length} selected (ids ${updated.map((r) => r.id).join(",")})`,
    });
  }
  return NextResponse.json({
    updated: updated.length,
    unchanged: results.filter((r) => r.outcome === "unchanged").length,
    skipped: results.filter((r) => r.outcome === "skipped").length,
    notFound: results.filter((r) => r.outcome === "not_found").length,
    results,
  });
}
