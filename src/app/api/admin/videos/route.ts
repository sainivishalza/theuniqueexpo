import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { listVideos, createVideo } from "@/lib/server/videos-repo";
import { isValidVideoEmbedUrl } from "@/lib/server/validate-upload";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const videos = await listVideos();
  return NextResponse.json({ videos });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const body = await request.json();
  if (!body.title || !body.embedUrl) {
    return NextResponse.json({ error: "title and embedUrl are required" }, { status: 400 });
  }
  if (!isValidVideoEmbedUrl(body.embedUrl)) {
    return NextResponse.json({ error: "Embed URL must be a YouTube or Vimeo embed link" }, { status: 400 });
  }

  try {
    const id = await createVideo({
      title: body.title,
      description: body.description || "",
      embedUrl: body.embedUrl,
      category: body.category || "",
      relatedType: body.relatedType === "exhibition" || body.relatedType === "tour" ? body.relatedType : "",
      relatedId: body.relatedId || "",
      displayOrder: Number(body.displayOrder) || 0,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("Create video error:", err);
    return NextResponse.json({ error: "Failed to create video" }, { status: 500 });
  }
}
