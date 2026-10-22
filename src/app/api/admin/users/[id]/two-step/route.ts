import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getUserById } from "@/lib/server/users-repo";
import { disableTwoStep, isTwoStepOn } from "@/lib/server/totp";
import { logAdminAction } from "@/lib/server/audit-log";

// Switches another admin's two-step sign-in off (a lost phone and lost recovery codes). An admin
// cannot do this to themselves here: they use their own Account page, which asks for a code.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  const targetId = Number((await params).id);
  if (targetId === admin.id) return NextResponse.json({ error: "Use your own Account page" }, { status: 400 });
  const target = await getUserById(targetId);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!(await isTwoStepOn(targetId))) return NextResponse.json({ error: "Two-step sign-in is not on" }, { status: 409 });
  await disableTwoStep(targetId);
  logAdminAction(request, admin, "two_step_reset_for_user", { targetType: "user", targetId, details: target.email });
  return NextResponse.json({ success: true });
}
