import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { isDuplicateEntryError } from "@/lib/db";
import { listExhibitions, createExhibition } from "@/lib/server/exhibitions-repo";
import { slugify } from "@/lib/slugify";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const exhibitions = await listExhibitions();
  return NextResponse.json({ exhibitions });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const body = await request.json();
  if (!body.title || !body.slug || !body.startDate || !body.endDate) {
    return NextResponse.json({ error: "title, slug, startDate, and endDate are required" }, { status: 400 });
  }
  // Never trust the client's slug as URL-safe -- it becomes part of every
  // exhibition URL (detail page, register, floor plan, hotels...), so
  // normalize it here regardless of what the admin form already did.
  body.slug = slugify(body.slug);
  if (!body.slug) {
    return NextResponse.json({ error: "Slug must contain at least one letter or number" }, { status: 400 });
  }

  try {
    const id = await createExhibition(body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      return NextResponse.json({ error: "An exhibition with that slug already exists" }, { status: 409 });
    }
    console.error("Create exhibition error:", err);
    return NextResponse.json({ error: "Failed to create exhibition" }, { status: 500 });
  }
}
