import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { listHotelBookings } from "@/lib/server/hotels-repo";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const bookings = await listHotelBookings();
  return NextResponse.json({ bookings });
}
