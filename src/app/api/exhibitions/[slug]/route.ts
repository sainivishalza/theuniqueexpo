import { NextResponse } from "next/server";
import { getExhibitionBySlugOrId } from "@/lib/server/exhibitions-repo";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = new URL(request.url).searchParams.get("locale") || undefined;
  const exhibition = await getExhibitionBySlugOrId(slug, locale);
  if (!exhibition) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // Short cache so visiting Exhibition -> Floor Plan -> Hotels -> back
  // doesn't re-fetch the same exhibition four times; admin's edit-open
  // flow tolerates a few seconds of staleness here.
  return NextResponse.json(
    { exhibition },
    { headers: { "Cache-Control": "public, max-age=20, stale-while-revalidate=60" } }
  );
}
