import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { isDuplicateEntryError } from "@/lib/db";
import { listAllIssues, createIssue } from "@/lib/server/magazine-repo";
import { isValidImageField } from "@/lib/server/validate-upload";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const issues = await listAllIssues();
  return NextResponse.json({ issues });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const body = await request.json();
  if (!body.issueNumber || !body.title) {
    return NextResponse.json({ error: "issueNumber and title are required" }, { status: 400 });
  }
  if (!isValidImageField(body.coverImage)) {
    return NextResponse.json({ error: "Cover image must be a valid image file or URL" }, { status: 400 });
  }

  try {
    const id = await createIssue({
      issueNumber: Number(body.issueNumber),
      title: body.title,
      coverImage: body.coverImage || "",
      intro: body.intro || "",
      blogPostIds: Array.isArray(body.blogPostIds) ? body.blogPostIds.map(Number) : [],
      status: body.status === "published" ? "published" : "draft",
      publishDate: body.publishDate || "",
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      return NextResponse.json({ error: "An issue with that number already exists" }, { status: 409 });
    }
    console.error("Create magazine issue error:", err);
    return NextResponse.json({ error: "Failed to create issue" }, { status: 500 });
  }
}
