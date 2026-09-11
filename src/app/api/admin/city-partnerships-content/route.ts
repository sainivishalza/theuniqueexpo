import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getCityPartnershipsContent, updateCityPartnershipsContent } from "@/lib/server/city-partnerships-content-repo";
import { normalizeCityPartnershipsContent } from "@/lib/city-partnerships-content";
import { isValidImageField } from "@/lib/server/validate-upload";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const content = await getCityPartnershipsContent();
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

  await updateCityPartnershipsContent(normalizeCityPartnershipsContent(body));
  return NextResponse.json({ ok: true });
}
