import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { isDuplicateEntryError } from "@/lib/db";
import { listTours, createTour } from "@/lib/server/tours-repo";
import { slugify } from "@/lib/slugify";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const tours = await listTours();
  return NextResponse.json({ tours });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const body = await request.json();
  if (!body.title || !body.slug || !body.startDate || !body.endDate) {
    return NextResponse.json({ error: "title, slug, startDate, and endDate are required" }, { status: 400 });
  }
  body.slug = slugify(body.slug);
  if (!body.slug) {
    return NextResponse.json({ error: "Slug must contain at least one letter or number" }, { status: 400 });
  }

  try {
    const id = await createTour(body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      return NextResponse.json({ error: "A tour with that slug already exists" }, { status: 409 });
    }
    console.error("Create tour error:", err);
    return NextResponse.json({ error: "Failed to create tour" }, { status: 500 });
  }
}
