import { NextResponse } from "next/server";
import { parseBuyerNumber } from "@/lib/buyer-number";
import { findRecipient } from "@/lib/server/wallet-repo";
import { limitOrNull, requireBuyer, walletErrorResponse, walletFail } from "@/lib/server/wallet-api";

// "Who am I about to pay?" -- the scanned wallet code (?code=) or a typed buyer number
// (?number=TUE0042). Shows only a masked name and the buyer number, never an email or
// a phone number.
export async function GET(request: Request) {
  const auth = await requireBuyer(request);
  if (auth.response) return auth.response;
  const limited = limitOrNull(auth.user.id, "lookup", 60, 10 * 60 * 1000);
  if (limited) return limited;
  try {
    const params = new URL(request.url).searchParams;
    const code = params.get("code") ?? "";
    const buyerNo = params.get("number") ? parseBuyerNumber(params.get("number") ?? "") : null;
    if (!code && !buyerNo) return walletFail("recipient_not_found");
    const found = await findRecipient(code ? { code } : { buyerNo: buyerNo! });
    if (!found) return walletFail("recipient_not_found");
    if (found.userId === auth.user.id) return walletFail("self_transfer");
    return NextResponse.json({ name: found.name, buyerNumber: found.buyerNumber });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
