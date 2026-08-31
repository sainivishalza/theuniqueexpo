import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { mapExhibitionRow } from "@/lib/server/exhibitions-repo";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [rows] = await pool.query("SELECT * FROM exhibitions WHERE slug = ? OR id = ? LIMIT 1", [slug, Number(slug) || 0]);
  const exhibition = (rows as any[])[0];
  if (!exhibition) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // Short cache so visiting Exhibition -> Floor Plan -> Hotels -> back
  // doesn't re-fetch the same exhibition four times; admin's edit-open
  // flow tolerates a few seconds of staleness here.
  return NextResponse.json(
    { exhibition: mapExhibitionRow(exhibition) },
    { headers: { "Cache-Control": "public, max-age=20, stale-while-revalidate=60" } }
  );
}
