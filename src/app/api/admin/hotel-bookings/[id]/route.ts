import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { updateHotelBookingStatus } from "@/lib/server/hotels-repo";

const VALID_STATUSES = ["pending", "confirmed", "cancelled"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  const { status } = await request.json();
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await updateHotelBookingStatus(Number(id), status);
  return NextResponse.json({ ok: true });
}
