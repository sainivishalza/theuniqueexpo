import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { listSlideshowPhotosForAdmin, createSlideshowPhoto } from "@/lib/server/homepage-slideshow-repo";
import { isValidImageField } from "@/lib/server/validate-upload";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const photos = await listSlideshowPhotosForAdmin();
  return NextResponse.json({ photos });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const body = await request.json();
  if (!isValidImageField(body.image)) {
    return NextResponse.json({ error: "Photo must be a valid image file or URL" }, { status: 400 });
  }

  try {
    const id = await createSlideshowPhoto({
      image: body.image || "",
      caption: typeof body.caption === "string" ? body.caption : "",
      displayOrder: Number(body.displayOrder) || 0,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("Create slideshow photo error:", err);
    return NextResponse.json({ error: "Failed to create slideshow photo" }, { status: 500 });
  }
}
