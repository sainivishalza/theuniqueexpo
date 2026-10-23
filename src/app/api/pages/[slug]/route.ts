import { NextResponse } from "next/server";
import { isValidSitePageSlug } from "@/lib/site-pages";
import { getSitePage } from "@/lib/server/site-pages-repo";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isValidSitePageSlug(slug)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const locale = new URL(request.url).searchParams.get("locale") || undefined;
  const content = await getSitePage(slug, locale);
  return NextResponse.json(
    { content },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=180, stale-while-revalidate=900" } }
  );
}
