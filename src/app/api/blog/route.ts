import { NextResponse } from "next/server";
import { listPublishedPosts, type BlogCategory } from "@/lib/server/blog-repo";

const VALID_CATEGORIES: BlogCategory[] = ["life-in-china", "relocation-tips", "exhibition-reviews"];

export async function GET(request: Request) {
  const categoryParam = new URL(request.url).searchParams.get("category");
  const category = VALID_CATEGORIES.includes(categoryParam as BlogCategory) ? (categoryParam as BlogCategory) : undefined;
  const posts = await listPublishedPosts(category);
  return NextResponse.json(
    { posts },
    { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } }
  );
}
