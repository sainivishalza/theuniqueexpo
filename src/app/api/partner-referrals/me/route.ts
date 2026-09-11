import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { listReferralsForPartner } from "@/lib/server/partner-referrals-repo";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const referrals = await listReferralsForPartner(user.id);
  const conversions = referrals.filter((r) => r.conversionStatus !== "signed_up").length;
  const stats = {
    totalReferrals: referrals.length,
    totalCommission: referrals.reduce((sum, r) => sum + r.commission, 0),
    conversionRate: referrals.length ? Math.round((conversions / referrals.length) * 100) : 0,
  };

  return NextResponse.json({ referrals, stats });
}
