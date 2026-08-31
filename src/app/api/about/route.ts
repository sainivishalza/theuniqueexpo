import { NextResponse } from "next/server";
import { getAboutContent } from "@/lib/server/about-content-repo";

export async function GET() {
  const content = await getAboutContent();
  return NextResponse.json(
    { content },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } }
  );
}
