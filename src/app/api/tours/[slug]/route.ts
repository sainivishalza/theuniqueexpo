import { NextResponse } from "next/server";
import { getTourBySlugOrId } from "@/lib/server/tours-repo";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tour = await getTourBySlugOrId(slug);
  if (!tour) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(
    { tour },
    { headers: { "Cache-Control": "public, max-age=20, stale-while-revalidate=60" } }
  );
}
