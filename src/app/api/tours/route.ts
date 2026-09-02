import { NextResponse } from "next/server";
import { listTours } from "@/lib/server/tours-repo";

export async function GET() {
  const tours = await listTours();
  return NextResponse.json(
    { tours },
    { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } }
  );
}
