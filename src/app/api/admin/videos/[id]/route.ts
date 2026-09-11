import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { updateVideo, deleteVideo } from "@/lib/server/videos-repo";
import { isValidVideoEmbedUrl } from "@/lib/server/validate-upload";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  if (!body.title || !body.embedUrl) {
    return NextResponse.json({ error: "title and embedUrl are required" }, { status: 400 });
  }
  if (!isValidVideoEmbedUrl(body.embedUrl)) {
    return NextResponse.json({ error: "Embed URL must be a YouTube or Vimeo embed link" }, { status: 400 });
  }

  try {
    await updateVideo(Number(id), {
      title: body.title,
      description: body.description || "",
      embedUrl: body.embedUrl,
      category: body.category || "",
      relatedType: body.relatedType === "exhibition" || body.relatedType === "tour" ? body.relatedType : "",
      relatedId: body.relatedId || "",
      displayOrder: Number(body.displayOrder) || 0,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Update video error:", err);
    return NextResponse.json({ error: "Failed to update video" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  await deleteVideo(Number(id));
  return NextResponse.json({ ok: true });
}
