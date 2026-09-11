import { NextResponse } from "next/server";
import { getIssueCoverImageValue } from "@/lib/server/magazine-repo";
import { isAllowedImageContentType } from "@/lib/server/validate-upload";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const image = await getIssueCoverImageValue(Number(id));

  if (!image) {
    return NextResponse.json({ error: "No cover image" }, { status: 404 });
  }
  if (!image.startsWith("data:")) {
    return NextResponse.redirect(image);
  }

  const match = /^data:([^;]+);base64,(.+)$/.exec(image);
  if (!match) {
    return NextResponse.json({ error: "Malformed image data" }, { status: 500 });
  }
  const [, contentType, base64Data] = match;
  if (!isAllowedImageContentType(contentType)) {
    return NextResponse.json({ error: "Unsupported content type" }, { status: 415 });
  }
  const bytes = Buffer.from(base64Data, "base64");

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Length": String(bytes.length),
    },
  });
}
