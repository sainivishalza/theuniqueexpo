import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getTourBySlugOrId, updateTourRegistrationConfig } from "@/lib/server/tours-repo";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  const tour = await getTourBySlugOrId(id);
  if (!tour) return NextResponse.json({ error: "Tour not found" }, { status: 404 });

  return NextResponse.json({
    tour: { id: tour.id, title: tour.title, slug: tour.slug },
    registrationEnabled: tour.registrationEnabled,
    registrationFormSchema: tour.registrationFormSchema,
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  const tour = await getTourBySlugOrId(id);
  if (!tour) return NextResponse.json({ error: "Tour not found" }, { status: 404 });

  const { registrationEnabled, registrationFormSchema } = await request.json();

  await updateTourRegistrationConfig(Number(tour.id), {
    registrationEnabled: !!registrationEnabled,
    registrationFormSchema: registrationFormSchema || null,
  });

  return NextResponse.json({ ok: true });
}
