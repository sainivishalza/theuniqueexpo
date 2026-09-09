import { NextResponse } from "next/server";
import { getTeamMemberPhotoValue } from "@/lib/server/team-members-repo";
import { isAllowedImageContentType } from "@/lib/server/validate-upload";

// Serves a team member's photo as an actual image response instead of
// inline base64 JSON, so browsers can cache it across page navigations --
// same reasoning as /api/exhibitions/[slug]/image.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const photo = await getTeamMemberPhotoValue(Number(id));

  if (!photo) {
    return NextResponse.json({ error: "No photo" }, { status: 404 });
  }

  // Stored as a plain external URL -- just redirect.
  if (!photo.startsWith("data:")) {
    return NextResponse.redirect(photo);
  }

  const match = /^data:([^;]+);base64,(.+)$/.exec(photo);
  if (!match) {
    return NextResponse.json({ error: "Malformed photo data" }, { status: 500 });
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
