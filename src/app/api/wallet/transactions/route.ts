import { NextResponse } from "next/server";
import { ensureWallet, listMyTransactions } from "@/lib/server/wallet-repo";
import { positiveId, requireBuyer, walletErrorResponse } from "@/lib/server/wallet-api";

// The buyer's own statement, newest first, 30 at a time (?before=<id> for older).
export async function GET(request: Request) {
  const auth = await requireBuyer(request);
  if (auth.response) return auth.response;
  try {
    const before = positiveId(new URL(request.url).searchParams.get("before") ?? "") ?? undefined;
    await ensureWallet(auth.user.id);
    return NextResponse.json(await listMyTransactions(auth.user.id, before), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
