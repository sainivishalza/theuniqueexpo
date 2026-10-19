import { NextResponse } from "next/server";
import { getOverview } from "@/lib/server/wallet-admin-repo";
import { requireWalletAdmin, walletErrorResponse } from "@/lib/server/wallet-api";

export async function GET(request: Request) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  try {
    return NextResponse.json(await getOverview(), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
