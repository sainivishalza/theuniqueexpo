import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { deleteBuyerExpo, renameBuyerExpo, ExpoNameError } from "@/lib/server/buyer-expos-repo";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  try {
    await renameBuyerExpo(id, body?.name);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ExpoNameError) return NextResponse.json({ error: err.code }, { status: err.code === "not_found" ? 404 : 400 });
    console.error("Rename buyer expo failed:", err);
    return NextResponse.json({ error: "Could not rename expo" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const id = Number((await params).id);
  if (!Number.isInteger(id) || !(await deleteBuyerExpo(id))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
