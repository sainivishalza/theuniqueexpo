import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { isDuplicateEntryError } from "@/lib/db";
import { getPostById, updatePost, deletePost } from "@/lib/server/blog-repo";
import { slugify } from "@/lib/slugify";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  const post = await getPostById(Number(id));
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ post });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  if (!body.title || !body.slug || !body.category || !body.content) {
    return NextResponse.json({ error: "title, slug, category, and content are required" }, { status: 400 });
  }
  body.slug = slugify(body.slug);
  if (!body.slug) {
    return NextResponse.json({ error: "Slug must contain at least one letter or number" }, { status: 400 });
  }

  try {
    await updatePost(Number(id), body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      return NextResponse.json({ error: "A post with that slug already exists" }, { status: 409 });
    }
    console.error("Update blog post error:", err);
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  await deletePost(Number(id));
  return NextResponse.json({ ok: true });
}
