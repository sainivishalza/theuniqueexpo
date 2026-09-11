import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getConferenceHostingContent, updateConferenceHostingContent } from "@/lib/server/conference-hosting-content-repo";
import { normalizeConferenceHostingContent } from "@/lib/conference-hosting-content";
import { isValidImageField } from "@/lib/server/validate-upload";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const content = await getConferenceHostingContent();
  return NextResponse.json({ content });
}

export async function PUT(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const body = await request.json();
  if (!body.title || !body.subtitle) {
    return NextResponse.json({ error: "Title and subtitle are required" }, { status: 400 });
  }
  if (!isValidImageField(body.heroImage)) {
    return NextResponse.json({ error: "Hero image must be a valid image file or URL" }, { status: 400 });
  }

  await updateConferenceHostingContent(normalizeConferenceHostingContent(body));
  return NextResponse.json({ ok: true });
}
