import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { listAllReferrals } from "@/lib/server/partner-referrals-repo";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const referrals = await listAllReferrals();
  return NextResponse.json({ referrals });
}
