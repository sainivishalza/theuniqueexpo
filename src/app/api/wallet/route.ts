import { NextResponse } from "next/server";
import { getWalletSummary } from "@/lib/server/wallet-repo";
import { requireBuyer, walletErrorResponse, walletFail } from "@/lib/server/wallet-api";

// The signed-in buyer's own wallet: balance, QR code, limits.
export async function GET(request: Request) {
  const auth = await requireBuyer(request);
  if (auth.response) return auth.response;
  try {
    const summary = await getWalletSummary(auth.user.id);
    if (!summary) return walletFail("not_found");
    return NextResponse.json(summary, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
