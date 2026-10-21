import { NextResponse } from "next/server";
import { getWaitingCount } from "@/lib/server/wallet-admin-repo";
import { requireWalletAdmin, walletErrorResponse } from "@/lib/server/wallet-api";

// How many top-ups, withdrawals and expense claims wait for an admin (the number on the menu).
export async function GET(request: Request) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  try {
    return NextResponse.json({ waiting: await getWaitingCount() }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
