import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { logAdminAction } from "@/lib/server/audit-log";
import { listVersions, readSnapshot, undoVersion } from "@/lib/server/exhibition-history";

// The change history of one exhibition (GET), and undoing one change (POST { versionId }).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0 || !(await readSnapshot(id))) return NextResponse.json({ error: "Not found", code: "not_found" }, { status: 404 });
  return NextResponse.json({ versions: await listVersions(id) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const id = Number((await params).id);
  const body = await request.json().catch(() => null);
  const versionId = Number(body?.versionId);
  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(versionId) || versionId <= 0) return NextResponse.json({ error: "Not found", code: "not_found" }, { status: 404 });
  const result = await undoVersion(id, versionId, { id: admin.id, name: admin.name });
  if (!result.ok) {
    const status = result.reason === "slug_taken" ? 409 : result.reason === "nothing_to_undo" ? 409 : 404;
    return NextResponse.json({ error: result.reason, code: result.reason }, { status });
  }
  logAdminAction(request, admin, "exhibition_change_undone", { targetType: "exhibition", targetId: id, details: `version ${versionId}` });
  return NextResponse.json({ ok: true, versions: await listVersions(id) });
}
