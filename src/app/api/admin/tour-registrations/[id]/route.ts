import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/server/audit-log";
import { requireAdmin } from "@/lib/auth-server";
import { getTourRegistrationById, updateTourRegistrationStatus } from "@/lib/server/tour-registrations-repo";
import { notifyTourRegistrationDecision } from "@/lib/server/notifications";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  const registration = await getTourRegistrationById(Number(id));
  if (!registration) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ registration });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  const { status } = await request.json();
  if (!["pending", "approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const before = await getTourRegistrationById(Number(id));
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await updateTourRegistrationStatus(Number(id), status);
  // The buyer hears about a real decision, not about saving the same status again.
  if ((status === "approved" || status === "rejected") && before.status !== status) notifyTourRegistrationDecision(Number(id), status === "approved");
  logAdminAction(request, admin, "tour_registration_status", { targetType: "tour_registration", targetId: id, details: status });
  return NextResponse.json({ ok: true });
}
