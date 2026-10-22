import { NextResponse } from "next/server";
import { isAllowedImageContentType } from "@/lib/server/validate-upload";
import { isPdfBuffer, makeThumbnail, parseDataUrl } from "@/lib/server/document-image";

// Sends a stored document (a data: URL) back as the real file. A picture is shown inline; with
// thumb=true the admin lists get a small preview instead of the whole picture. A PDF is sent as a PDF
// (never sniffed as anything else) so "Open" can show it, and a thumbnail request for a PDF
// answers 204 so the screens draw a PDF tile instead.
export async function documentResponse(value: string, options: { thumb?: boolean } = {}): Promise<NextResponse> {
  const parsed = parseDataUrl(value);
  if (!parsed) return NextResponse.json({ error: "Malformed document data" }, { status: 500 });
  const { contentType, buffer } = parsed;

  if (contentType === "application/pdf") {
    if (!isPdfBuffer(buffer)) return NextResponse.json({ error: "Malformed document data" }, { status: 500 });
    if (options.thumb) return new NextResponse(null, { status: 204, headers: { "X-Document-Type": "pdf" } });
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=\"document.pdf\"",
        "X-Content-Type-Options": "nosniff",
        "X-Document-Type": "pdf",
        "Cache-Control": "private, max-age=3600",
        "Content-Length": String(buffer.length),
      },
    });
  }

  if (!isAllowedImageContentType(contentType)) {
    return NextResponse.json({ error: "Unsupported content type for inline serving" }, { status: 415 });
  }
  let body = buffer;
  let type = contentType;
  if (options.thumb) {
    const small = await makeThumbnail(buffer);
    if (small) {
      body = small;
      type = "image/jpeg";
    }
  }
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": type,
      "X-Content-Type-Options": "nosniff",
      "X-Document-Type": "image",
      "Cache-Control": "private, max-age=3600",
      "Content-Length": String(body.length),
    },
  });
}
