import { NextResponse } from "next/server";
import { listHotels } from "@/lib/server/hotels-repo";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const exhibitionId = searchParams.get("exhibitionId");
  const hotels = await listHotels(exhibitionId ? Number(exhibitionId) : undefined);
  return NextResponse.json({ hotels });
}
