import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { isDuplicateEntryError } from "@/lib/db";
import { updateEvent, deleteEvent } from "@/lib/server/events-repo";
import { slugify } from "@/lib/slugify";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  if (!body.title || !body.slug || !body.eventDate) {
    return NextResponse.json({ error: "title, slug, and eventDate are required" }, { status: 400 });
  }
  body.slug = slugify(body.slug);
  if (!body.slug) {
    return NextResponse.json({ error: "Slug must contain at least one letter or number" }, { status: 400 });
  }

  try {
    await updateEvent(Number(id), body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      return NextResponse.json({ error: "An event with that slug already exists" }, { status: 409 });
    }
    console.error("Update event error:", err);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  await deleteEvent(Number(id));
  return NextResponse.json({ ok: true });
}
