import { NextResponse } from "next/server";
import { getWalletBalance } from "@/lib/server/wallet-repo";
import { requireBuyer, walletErrorResponse, walletFail } from "@/lib/server/wallet-api";

// The signed-in buyer's balance, read-only (never creates a wallet): for the wallet pill in the
// headers and the wallet card on the buyer's home.
export async function GET(request: Request) {
  const auth = await requireBuyer(request);
  if (auth.response) return auth.response;
  try {
    const balance = await getWalletBalance(auth.user.id);
    if (!balance) return walletFail("not_found");
    return NextResponse.json(balance, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
