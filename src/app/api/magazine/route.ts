import { NextResponse } from "next/server";
import { listPublishedIssues } from "@/lib/server/magazine-repo";

export async function GET() {
  const issues = await listPublishedIssues();
  return NextResponse.json(
    { issues },
    { headers: { "Cache-Control": "public, max-age=30, s-maxage=120, stale-while-revalidate=600" } }
  );
}
