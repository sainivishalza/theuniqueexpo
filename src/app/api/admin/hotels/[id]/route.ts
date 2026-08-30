import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { updateHotel, deleteHotel } from "@/lib/server/hotels-repo";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  if (!body.name || !body.city) {
    return NextResponse.json({ error: "name and city are required" }, { status: 400 });
  }

  await updateHotel(Number(id), body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  await deleteHotel(Number(id));
  return NextResponse.json({ ok: true });
}
