import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { isForeignKeyConstraintError } from "@/lib/db";
import { updatePartnerTier, deletePartnerTier } from "@/lib/server/partner-tiers-repo";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  if (!body.name || !body.tagline || !body.priceLabel) {
    return NextResponse.json({ error: "name, tagline, and priceLabel are required" }, { status: 400 });
  }

  try {
    await updatePartnerTier(Number(id), {
      name: body.name,
      tagline: body.tagline,
      priceLabel: body.priceLabel,
      commissionRate: body.commissionRate || "",
      benefits: Array.isArray(body.benefits) ? body.benefits : [],
      badgeTone: body.badgeTone || "gray",
      displayOrder: Number(body.displayOrder) || 0,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Update partner tier error:", err);
    return NextResponse.json({ error: "Failed to update partner tier" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  try {
    await deletePartnerTier(Number(id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isForeignKeyConstraintError(err)) {
      return NextResponse.json(
        { error: "This tier has applications on file and can't be deleted" },
        { status: 409 }
      );
    }
    console.error("Delete partner tier error:", err);
    return NextResponse.json({ error: "Failed to delete partner tier" }, { status: 500 });
  }
}
