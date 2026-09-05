import { NextResponse } from "next/server";
import { getPublishedPostBySlug } from "@/lib/server/blog-repo";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(
    { post },
    { headers: { "Cache-Control": "public, max-age=20, stale-while-revalidate=60" } }
  );
}
