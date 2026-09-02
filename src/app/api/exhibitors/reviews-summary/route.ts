import { NextResponse } from "next/server";
import { getReviewSummaries } from "@/lib/server/exhibitor-reviews-repo";

// Bulk lookup for the directory listing, keyed by slug, so it doesn't fire
// one request per card. GET /api/exhibitors/reviews-summary?slugs=a,b,c
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slugs = (searchParams.get("slugs") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const summaries = await getReviewSummaries(slugs);
  return NextResponse.json({ summaries });
}
