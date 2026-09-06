import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getSiteTheme, updateSiteTheme } from "@/lib/server/site-theme-repo";
import { normalizeSiteTheme } from "@/lib/site-theme";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const theme = await getSiteTheme();
  return NextResponse.json({ theme });
}

export async function PUT(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const body = await request.json();
  await updateSiteTheme(normalizeSiteTheme(body));
  return NextResponse.json({ ok: true });
}
