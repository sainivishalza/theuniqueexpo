import { NextResponse } from "next/server";
import { getCityPartnershipsContent } from "@/lib/server/city-partnerships-content-repo";

export async function GET() {
  const content = await getCityPartnershipsContent();
  return NextResponse.json(
    { content },
    { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } }
  );
}
