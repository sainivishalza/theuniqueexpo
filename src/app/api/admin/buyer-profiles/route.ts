import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { listBuyerProfilesForAdmin } from "@/lib/server/buyer-profile-repo";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const profiles = await listBuyerProfilesForAdmin();
  return NextResponse.json({ profiles });
}
