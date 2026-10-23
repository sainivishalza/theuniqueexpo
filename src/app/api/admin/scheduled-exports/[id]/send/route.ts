import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { logAdminAction } from "@/lib/server/audit-log";
import { isMailEnabled } from "@/lib/server/mail";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { listScheduledExports, sendReportNow } from "@/lib/server/scheduled-exports";

// "Send now": the report goes out at once to its recipients, whatever the schedule.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Not found", code: "not_found" }, { status: 404 });
  if (!(await isMailEnabled())) return NextResponse.json({ error: "E-mail is switched off", code: "mail_off" }, { status: 409 });
  const limited = await checkRateLimit(`report-send:${admin.id}`, 10, 60 * 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Too many sends in the last hour", code: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });
  const status = await sendReportNow(id);
  if (status === null) return NextResponse.json({ error: "Not found", code: "not_found" }, { status: 404 });
  logAdminAction(request, admin, "scheduled_export_sent_now", { targetType: "scheduled_export", targetId: id, details: status });
  return NextResponse.json({ ok: status === "sent", status, exports: await listScheduledExports() });
}
