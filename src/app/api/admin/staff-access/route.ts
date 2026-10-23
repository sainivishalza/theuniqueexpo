import { NextResponse } from "next/server";
import { requireFullAdmin } from "@/lib/auth-server";
import { logAdminAction } from "@/lib/server/audit-log";
import { listStaff, setStaffPreset } from "@/lib/server/staff-access";
import { isStaffPreset } from "@/lib/staff-access";

// Who may do what in the back office. Full access only: the admins listed here, and the role each one has.
export async function GET(request: Request) {
  const admin = await requireFullAdmin(request);
  if (!admin) return NextResponse.json({ error: "Full admin access required", code: "unauthorized" }, { status: 401 });
  return NextResponse.json({ staff: await listStaff(), me: admin.id }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  const admin = await requireFullAdmin(request);
  if (!admin) return NextResponse.json({ error: "Full admin access required", code: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const userId = Number(body?.userId);
  if (!Number.isInteger(userId) || userId <= 0 || !isStaffPreset(body?.preset)) return NextResponse.json({ error: "Choose an admin and a role", code: "bad_request" }, { status: 400 });
  // Nobody changes their own role: that is how an admin would lock themselves (and the last full admin) out.
  if (userId === admin.id) return NextResponse.json({ error: "You cannot change your own role", code: "own_role" }, { status: 409 });
  const result = await setStaffPreset(userId, body.preset, admin.id);
  if (result === "not_admin") return NextResponse.json({ error: "That account is not an admin", code: "not_admin" }, { status: 404 });
  if (result === "unavailable") return NextResponse.json({ error: "Roles are not available yet", code: "unavailable" }, { status: 503 });
  logAdminAction(request, admin, "staff_role_set", { targetType: "user", targetId: userId, details: body.preset });
  return NextResponse.json({ ok: true, staff: await listStaff(), me: admin.id });
}
