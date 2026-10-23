import { NextResponse } from "next/server";
import { getChinaTravelContent } from "@/lib/server/china-travel-content-repo";

export async function GET() {
  const content = await getChinaTravelContent();
  return NextResponse.json(
    { content },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=180, stale-while-revalidate=900" } }
  );
}
