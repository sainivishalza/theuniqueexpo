import { NextResponse } from "next/server";
import { listTours } from "@/lib/server/tours-repo";

export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get("locale") || undefined;
  const tours = await listTours(locale);
  return NextResponse.json(
    { tours },
    { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } }
  );
}
