import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { listRfqs, createRfq } from "@/lib/server/rfqs-repo";
import { upgradeReferralStatus } from "@/lib/server/partner-referrals-repo";

export async function GET() {
  const rfqs = await listRfqs();
  return NextResponse.json({ rfqs });
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const body = await request.json();
  if (!body.title || !body.product) {
    return NextResponse.json({ error: "title and product are required" }, { status: 400 });
  }

  const id = await createRfq({ ...body, buyerId: user.id, buyerName: user.name });

  // Best-effort referral-status upgrade -- never let this fail the RFQ.
  upgradeReferralStatus(user.id, "posted_rfq").catch((err) => console.error("Referral status upgrade error:", err));

  return NextResponse.json({ id }, { status: 201 });
}
