import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getExhibitionBySlugOrId, updateRegistrationFormConfig } from "@/lib/server/exhibitions-repo";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  const exhibition = await getExhibitionBySlugOrId(id);
  if (!exhibition) return NextResponse.json({ error: "Exhibition not found" }, { status: 404 });

  return NextResponse.json({
    exhibition: { id: exhibition.id, title: exhibition.title, slug: exhibition.slug },
    registrationEnabled: exhibition.registrationEnabled,
    registrationFormSchema: exhibition.registrationFormSchema,
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  const exhibition = await getExhibitionBySlugOrId(id);
  if (!exhibition) return NextResponse.json({ error: "Exhibition not found" }, { status: 404 });

  const { registrationEnabled, registrationFormSchema } = await request.json();

  await updateRegistrationFormConfig(Number(exhibition.id), {
    registrationEnabled: !!registrationEnabled,
    registrationFormSchema: registrationFormSchema || null,
  });

  return NextResponse.json({ ok: true });
}
