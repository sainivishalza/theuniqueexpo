import { NextResponse } from "next/server";
import { getChinaTravelContent } from "@/lib/server/china-travel-content-repo";

export async function GET() {
  const content = await getChinaTravelContent();
  return NextResponse.json(
    { content },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } }
  );
}
