import { NextResponse } from "next/server";
import { countWaitingForStaff } from "@/lib/server/support";
import { requireWalletAdmin, walletErrorResponse } from "@/lib/server/wallet-api";

// How many conversations are waiting for the team (for the admin menu).
export async function GET(request: Request) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  try {
    return NextResponse.json({ waiting: await countWaitingForStaff() }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
