import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getAboutContent, updateAboutContent } from "@/lib/server/about-content-repo";
import { normalizeAboutContent } from "@/lib/about-content";
import { isValidImageField } from "@/lib/server/validate-upload";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const content = await getAboutContent();
  return NextResponse.json({ content });
}

export async function PUT(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const body = await request.json();
  if (!body.heading || !body.tagline) {
    return NextResponse.json({ error: "Heading and tagline are required" }, { status: 400 });
  }
  if (!isValidImageField(body.heroImage)) {
    return NextResponse.json({ error: "Hero image must be a valid image file or URL" }, { status: 400 });
  }

  await updateAboutContent(normalizeAboutContent(body));
  return NextResponse.json({ ok: true });
}
