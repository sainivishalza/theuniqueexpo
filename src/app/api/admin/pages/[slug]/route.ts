import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { isValidSitePageSlug, normalizeSitePageContent } from "@/lib/site-pages";
import { getSitePage, updateSitePage } from "@/lib/server/site-pages-repo";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { slug } = await params;
  if (!isValidSitePageSlug(slug)) {
    return NextResponse.json({ error: "Unknown page" }, { status: 404 });
  }

  const content = await getSitePage(slug);
  return NextResponse.json({ content });
}

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { slug } = await params;
  if (!isValidSitePageSlug(slug)) {
    return NextResponse.json({ error: "Unknown page" }, { status: 404 });
  }

  const body = await request.json();
  if (!body.heading) {
    return NextResponse.json({ error: "Heading is required" }, { status: 400 });
  }

  await updateSitePage(slug, normalizeSitePageContent(slug, body));
  return NextResponse.json({ ok: true });
}
