import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getTourRegistrationById, updateTourRegistrationStatus } from "@/lib/server/tour-registrations-repo";

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

  await updateTourRegistrationStatus(Number(id), status);
  return NextResponse.json({ ok: true });
}
