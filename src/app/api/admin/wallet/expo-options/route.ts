import { NextResponse } from "next/server";
import { listTopupExpos } from "@/lib/server/topup-expos";
import { requireWalletAdmin, walletErrorResponse } from "@/lib/server/wallet-api";

// The exhibitions (and other expos) an admin can name as the reason of a top-up.
export async function GET(request: Request) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  try {
    return NextResponse.json(await listTopupExpos(), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
