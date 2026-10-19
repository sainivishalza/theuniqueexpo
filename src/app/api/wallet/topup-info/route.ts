import { NextResponse } from "next/server";
import { getWalletTextSettings } from "@/lib/server/wallet-repo";
import { requireBuyer, walletErrorResponse } from "@/lib/server/wallet-api";

// How a buyer pays the company to top up: the instructions and the company's own
// payment QR codes / bank details, all written by an admin.
export async function GET(request: Request) {
  const auth = await requireBuyer(request);
  if (auth.response) return auth.response;
  try {
    return NextResponse.json(await getWalletTextSettings(), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
