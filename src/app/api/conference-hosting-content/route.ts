import { NextResponse } from "next/server";
import { getConferenceHostingContent } from "@/lib/server/conference-hosting-content-repo";

export async function GET() {
  const content = await getConferenceHostingContent();
  return NextResponse.json(
    { content },
    { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } }
  );
}
