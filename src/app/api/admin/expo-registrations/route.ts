import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getExhibitionBySlugOrId } from "@/lib/server/exhibitions-repo";
import { listRegistrationsForExhibition } from "@/lib/server/expo-registrations-repo";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const exhibitionSlug = searchParams.get("exhibition");
  if (!exhibitionSlug) {
    return NextResponse.json({ error: "Missing exhibition" }, { status: 400 });
  }

  const exhibition = await getExhibitionBySlugOrId(exhibitionSlug);
  if (!exhibition) {
    return NextResponse.json({ error: "Exhibition not found" }, { status: 404 });
  }

  const registrations = await listRegistrationsForExhibition(Number(exhibition.id));
  return NextResponse.json({ exhibition, registrations });
}
