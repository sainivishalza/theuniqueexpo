import { NextResponse } from "next/server";
import { getConferenceHostingContent } from "@/lib/server/conference-hosting-content-repo";
import { translateContent } from "@/lib/server/content-translations";

export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get("locale") || undefined;
  const content = translateContent(await getConferenceHostingContent(), locale);
  return NextResponse.json(
    { content },
    { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } }
  );
}
