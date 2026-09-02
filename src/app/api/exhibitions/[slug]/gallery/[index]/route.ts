import { NextResponse } from "next/server";
import { getExhibitionGalleryImageValue } from "@/lib/server/exhibitions-repo";

// Serves one gallery photo as an actual image response instead of inline
// base64 JSON -- same reasoning as the poster's image/route.ts: lets
// browsers (and next/image) cache and request it like a normal image
// instead of re-downloading the whole gallery array on every page load.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; index: string }> }
) {
  const { slug, index } = await params;
  const image = await getExhibitionGalleryImageValue(slug, Number(index));

  if (!image) {
    return NextResponse.json({ error: "No image" }, { status: 404 });
  }

  if (!image.startsWith("data:")) {
    return NextResponse.redirect(image);
  }

  const match = /^data:([^;]+);base64,(.+)$/.exec(image);
  if (!match) {
    return NextResponse.json({ error: "Malformed image data" }, { status: 500 });
  }
  const [, contentType, base64Data] = match;
  const bytes = Buffer.from(base64Data, "base64");

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Length": String(bytes.length),
    },
  });
}
