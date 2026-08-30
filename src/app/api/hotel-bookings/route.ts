import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { createHotelBooking } from "@/lib/server/hotels-repo";

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const body = await request.json();
  if (!body.hotelId || !body.checkIn || !body.checkOut) {
    return NextResponse.json({ error: "hotelId, checkIn, and checkOut are required" }, { status: 400 });
  }

  const id = await createHotelBooking({ ...body, userId: user.id, userName: user.name });
  return NextResponse.json({ id }, { status: 201 });
}
