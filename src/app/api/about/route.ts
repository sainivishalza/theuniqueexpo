import { NextResponse } from "next/server";
import { getAboutContent } from "@/lib/server/about-content-repo";

export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get("locale") || undefined;
  const content = await getAboutContent(locale);
  return NextResponse.json(
    { content },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } }
  );
}
