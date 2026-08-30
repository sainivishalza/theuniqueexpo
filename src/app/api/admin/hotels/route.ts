import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { listHotels, createHotel } from "@/lib/server/hotels-repo";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const hotels = await listHotels();
  return NextResponse.json({ hotels });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const body = await request.json();
  if (!body.name || !body.city) {
    return NextResponse.json({ error: "name and city are required" }, { status: 400 });
  }

  const id = await createHotel(body);
  return NextResponse.json({ id }, { status: 201 });
}
