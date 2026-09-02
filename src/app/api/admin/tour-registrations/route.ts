import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getTourBySlugOrId } from "@/lib/server/tours-repo";
import { listRegistrationsForTour } from "@/lib/server/tour-registrations-repo";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tourSlug = searchParams.get("tour");
  if (!tourSlug) {
    return NextResponse.json({ error: "Missing tour" }, { status: 400 });
  }

  const tour = await getTourBySlugOrId(tourSlug);
  if (!tour) {
    return NextResponse.json({ error: "Tour not found" }, { status: 404 });
  }

  const registrations = await listRegistrationsForTour(Number(tour.id));
  return NextResponse.json({ tour, registrations });
}
