import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { isDuplicateEntryError } from "@/lib/db";
import { updateIssue, deleteIssue } from "@/lib/server/magazine-repo";
import { isValidImageField } from "@/lib/server/validate-upload";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  if (!body.issueNumber || !body.title) {
    return NextResponse.json({ error: "issueNumber and title are required" }, { status: 400 });
  }
  if (!isValidImageField(body.coverImage)) {
    return NextResponse.json({ error: "Cover image must be a valid image file or URL" }, { status: 400 });
  }

  try {
    await updateIssue(Number(id), {
      issueNumber: Number(body.issueNumber),
      title: body.title,
      coverImage: body.coverImage || "",
      intro: body.intro || "",
      blogPostIds: Array.isArray(body.blogPostIds) ? body.blogPostIds.map(Number) : [],
      status: body.status === "published" ? "published" : "draft",
      publishDate: body.publishDate || "",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      return NextResponse.json({ error: "An issue with that number already exists" }, { status: 409 });
    }
    console.error("Update magazine issue error:", err);
    return NextResponse.json({ error: "Failed to update issue" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  await deleteIssue(Number(id));
  return NextResponse.json({ ok: true });
}
