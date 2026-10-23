import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { logAdminAction } from "@/lib/server/audit-log";
import { deleteScheduledExport, listScheduledExports, parseExportInput, updateScheduledExport } from "@/lib/server/scheduled-exports";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const id = Number((await params).id);
  const parsed = parseExportInput(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.code, code: parsed.code }, { status: 400 });
  if (!Number.isInteger(id) || id <= 0 || !(await updateScheduledExport(id, parsed.value))) return NextResponse.json({ error: "Not found", code: "not_found" }, { status: 404 });
  logAdminAction(request, admin, "scheduled_export_saved", { targetType: "scheduled_export", targetId: id, details: `${parsed.value.name} (${parsed.value.kind}, ${parsed.value.frequency}${parsed.value.enabled ? "" : ", off"}) to ${parsed.value.recipients.join(", ")}` });
  return NextResponse.json({ ok: true, exports: await listScheduledExports() });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const id = Number((await params).id);
  const name = Number.isInteger(id) && id > 0 ? await deleteScheduledExport(id) : null;
  if (name === null) return NextResponse.json({ error: "Not found", code: "not_found" }, { status: 404 });
  logAdminAction(request, admin, "scheduled_export_deleted", { targetType: "scheduled_export", targetId: id, details: name });
  return NextResponse.json({ ok: true, exports: await listScheduledExports() });
}
