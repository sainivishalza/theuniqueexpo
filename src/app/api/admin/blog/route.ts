import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/server/audit-log";
import { requireAdmin } from "@/lib/auth-server";
import { isDuplicateEntryError } from "@/lib/db";
import { listAllPosts, createPost } from "@/lib/server/blog-repo";
import { slugify } from "@/lib/slugify";
import { optimizeImageFields } from "@/lib/server/site-image";
import { isValidImageField } from "@/lib/server/validate-upload";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const posts = await listAllPosts();
  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const body = await request.json();
  if (!body.title || !body.slug || !body.category || !body.content) {
    return NextResponse.json({ error: "title, slug, category, and content are required" }, { status: 400 });
  }
  body.slug = slugify(body.slug);
  if (!body.slug) {
    return NextResponse.json({ error: "Slug must contain at least one letter or number" }, { status: 400 });
  }
  await optimizeImageFields(body, ["coverImage"]);
  if (!isValidImageField(body.coverImage)) {
    return NextResponse.json({ error: "Cover image must be a valid image file or URL" }, { status: 400 });
  }

  try {
    const id = await createPost(body);
    logAdminAction(request, admin, "blog_post_created", { targetType: "blog_post", targetId: id, details: String(body.title ?? "") });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      return NextResponse.json({ error: "A post with that slug already exists" }, { status: 409 });
    }
    console.error("Create blog post error:", err);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
