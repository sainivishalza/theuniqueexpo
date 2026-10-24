import { NextResponse } from "next/server";
import { getMyReferrals } from "@/lib/server/referrals";
import { requireBuyer, walletErrorResponse } from "@/lib/server/wallet-api";

// The signed-in buyer's invitation code, the programme's current rules and the people they invited (names masked).
export async function GET(request: Request) {
  const auth = await requireBuyer(request);
  if (auth.response) return auth.response;
  try {
    return NextResponse.json(await getMyReferrals(auth.user.id), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
