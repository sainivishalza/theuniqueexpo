import { NextResponse } from "next/server";
import { listRecentReviews } from "@/lib/server/tour-reviews-repo";

export async function GET() {
  const reviews = await listRecentReviews(6);
  return NextResponse.json(
    { reviews },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=180, stale-while-revalidate=900" } }
  );
}
