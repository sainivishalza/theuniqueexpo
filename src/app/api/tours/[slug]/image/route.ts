import { NextResponse } from "next/server";
import { getTourImageValue } from "@/lib/server/tours-repo";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const image = await getTourImageValue(slug);

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
