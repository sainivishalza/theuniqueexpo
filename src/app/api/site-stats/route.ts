import { NextResponse } from "next/server";
import { getSiteStats } from "@/lib/server/site-stats";

// The real figures for the sign-in and sign-up pages (counted from the database, kept for ten minutes).
export async function GET() {
  return NextResponse.json(await getSiteStats(), { headers: { "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=1800" } });
}
