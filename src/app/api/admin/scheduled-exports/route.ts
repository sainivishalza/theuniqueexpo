import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { logAdminAction } from "@/lib/server/audit-log";
import { isMailEnabled } from "@/lib/server/mail";
import { createScheduledExport, listScheduledExports, parseExportInput } from "@/lib/server/scheduled-exports";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  return NextResponse.json({ exports: await listScheduledExports(), mailOn: await isMailEnabled() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const parsed = parseExportInput(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.code, code: parsed.code }, { status: 400 });
  const id = await createScheduledExport(parsed.value, admin.id);
  if (id === "limit") return NextResponse.json({ error: "Too many reports", code: "limit" }, { status: 409 });
  if (id === "unavailable") return NextResponse.json({ error: "Not available yet", code: "unavailable" }, { status: 503 });
  logAdminAction(request, admin, "scheduled_export_saved", { targetType: "scheduled_export", targetId: id, details: `${parsed.value.name} (${parsed.value.kind}, ${parsed.value.frequency}) to ${parsed.value.recipients.join(", ")}` });
  return NextResponse.json({ ok: true, id, exports: await listScheduledExports() });
}
