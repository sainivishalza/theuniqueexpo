import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getExhibitionBySlugOrId } from "@/lib/server/exhibitions-repo";
import { defaultConfirmBy, listRegistrationsForExhibition } from "@/lib/server/expo-registrations-repo";
import { checkInPath } from "@/lib/server/expo-checkin";
import { placeSummary } from "@/lib/server/waitlist";

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
  return NextResponse.json({
    exhibition,
    registrations,
    places: await placeSummary(Number(exhibition.id)),
    // Offered when approving, and the page the check-in QR code points at.
    defaultConfirmBy: defaultConfirmBy(exhibition.startDate, exhibition.endDate),
    checkInPath: checkInPath(exhibition.slug, Number(exhibition.id)),
  });
}
