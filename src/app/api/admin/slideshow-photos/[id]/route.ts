import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { updateSlideshowPhoto, deleteSlideshowPhoto } from "@/lib/server/homepage-slideshow-repo";
import { isValidImageField } from "@/lib/server/validate-upload";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  if (!isValidImageField(body.image)) {
    return NextResponse.json({ error: "Photo must be a valid image file or URL" }, { status: 400 });
  }

  try {
    await updateSlideshowPhoto(Number(id), {
      image: body.image || "",
      caption: typeof body.caption === "string" ? body.caption : "",
      displayOrder: Number(body.displayOrder) || 0,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Update slideshow photo error:", err);
    return NextResponse.json({ error: "Failed to update slideshow photo" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  await deleteSlideshowPhoto(Number(id));
  return NextResponse.json({ ok: true });
}
