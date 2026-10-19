import { NextResponse } from "next/server";
import { listPurchases } from "@/lib/server/wallet-admin-repo";
import { requireWalletAdmin, walletErrorResponse } from "@/lib/server/wallet-api";

export async function GET(request: Request) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  try {
    const p = new URL(request.url).searchParams;
    return NextResponse.json(await listPurchases(p.get("q") ?? "", Number(p.get("page")) || 1), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
