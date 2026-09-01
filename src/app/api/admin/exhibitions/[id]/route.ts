import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { updateExhibition, deleteExhibition } from "@/lib/server/exhibitions-repo";
import { slugify } from "@/lib/slugify";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  if (!body.title || !body.slug || !body.startDate || !body.endDate) {
    return NextResponse.json({ error: "title, slug, startDate, and endDate are required" }, { status: 400 });
  }
  body.slug = slugify(body.slug);
  if (!body.slug) {
    return NextResponse.json({ error: "Slug must contain at least one letter or number" }, { status: 400 });
  }

  try {
    await updateExhibition(Number(id), body);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "An exhibition with that slug already exists" }, { status: 409 });
    }
    console.error("Update exhibition error:", err);
    return NextResponse.json({ error: "Failed to update exhibition" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  await deleteExhibition(Number(id));
  return NextResponse.json({ ok: true });
}
