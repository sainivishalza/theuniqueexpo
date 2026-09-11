import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { listPartnerTiers, createPartnerTier } from "@/lib/server/partner-tiers-repo";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const tiers = await listPartnerTiers();
  return NextResponse.json({ tiers });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const body = await request.json();
  if (!body.name || !body.tagline || !body.priceLabel) {
    return NextResponse.json({ error: "name, tagline, and priceLabel are required" }, { status: 400 });
  }

  try {
    const id = await createPartnerTier({
      name: body.name,
      tagline: body.tagline,
      priceLabel: body.priceLabel,
      commissionRate: body.commissionRate || "",
      benefits: Array.isArray(body.benefits) ? body.benefits : [],
      badgeTone: body.badgeTone || "gray",
      displayOrder: Number(body.displayOrder) || 0,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("Create partner tier error:", err);
    return NextResponse.json({ error: "Failed to create partner tier" }, { status: 500 });
  }
}
