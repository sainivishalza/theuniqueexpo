import { NextResponse } from "next/server";
import { getReferralSettings } from "@/lib/server/referrals";

// What someone who arrives through a buyer's invitation link is offered, for the sign-up page. Only the switch, the bonus
// for the new buyer and the stage it is paid at: nothing about who invited them.
export async function GET() {
  try {
    const s = await getReferralSettings();
    return NextResponse.json({ enabled: s.enabled, referredPoints: s.referredPoints, trigger: s.trigger }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ enabled: false, referredPoints: 0, trigger: "attended" }, { headers: { "Cache-Control": "no-store" } });
  }
}
