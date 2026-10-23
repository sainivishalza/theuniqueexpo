import { NextResponse } from "next/server";
import { requireFullAdmin } from "@/lib/auth-server";
import { logAdminAction } from "@/lib/server/audit-log";
import { adminsWithoutTwoStep, getRequireTwoStep, hasTwoStep, setRequireTwoStep } from "@/lib/server/admin-security";

// "Every admin must use two-step sign-in". Full-access admins only.
async function overview(adminId: number) {
  const required = await getRequireTwoStep();
  return { available: required !== null, requireTwoStep: !!required, withoutTwoStep: await adminsWithoutTwoStep(), ownTwoStep: await hasTwoStep(adminId) };
}

export async function GET(request: Request) {
  const admin = await requireFullAdmin(request);
  if (!admin) return NextResponse.json({ error: "Full admin access required", code: "unauthorized" }, { status: 401 });
  return NextResponse.json(await overview(admin.id), { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  const admin = await requireFullAdmin(request);
  if (!admin) return NextResponse.json({ error: "Full admin access required", code: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (typeof body?.requireTwoStep !== "boolean") return NextResponse.json({ error: "Choose on or off", code: "bad_request" }, { status: 400 });
  // The admin who turns the rule on must have it set up themselves, so they cannot lock themselves out.
  if (body.requireTwoStep && !(await hasTwoStep(admin.id))) return NextResponse.json({ error: "Set up your own two-step sign-in first", code: "own_first" }, { status: 409 });
  if (!(await setRequireTwoStep(body.requireTwoStep, admin.id))) return NextResponse.json({ error: "Not available yet", code: "unavailable" }, { status: 503 });
  logAdminAction(request, admin, "two_step_required_changed", { targetType: "settings", details: body.requireTwoStep ? "on" : "off" });
  return NextResponse.json({ ok: true, ...(await overview(admin.id)) });
}
