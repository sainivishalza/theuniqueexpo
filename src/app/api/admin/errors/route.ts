import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { logAdminAction } from "@/lib/server/audit-log";
import { listErrors, setErrorResolved } from "@/lib/server/error-log";

// The errors the website reported (grouped, newest first). ?all=1 includes the ones marked resolved.
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const all = new URL(request.url).searchParams.get("all") === "1";
  return NextResponse.json({ errors: await listErrors({ includeResolved: all }) }, { headers: { "Cache-Control": "no-store" } });
}

// { id, resolved } marks one error resolved (or open again).
export async function PUT(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id <= 0 || typeof body?.resolved !== "boolean") return NextResponse.json({ error: "Choose an error", code: "bad_request" }, { status: 400 });
  if (!(await setErrorResolved(id, body.resolved))) return NextResponse.json({ error: "Not found", code: "not_found" }, { status: 404 });
  logAdminAction(request, admin, body.resolved ? "error_resolved" : "error_reopened", { targetType: "error", targetId: id });
  return NextResponse.json({ ok: true, errors: await listErrors({ includeResolved: new URL(request.url).searchParams.get("all") === "1" }) });
}
