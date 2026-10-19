import { NextResponse } from "next/server";
import { refundPurchase } from "@/lib/server/wallet-repo";
import { positiveId, readJson, requireWalletAdmin, text, walletErrorResponse, walletFail } from "@/lib/server/wallet-api";

// Give the points for a purchase back to the buyer.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  const id = positiveId((await params).id);
  const body = await readJson(request);
  if (!id || body?.action !== "refund") return walletFail("invalid_input");
  try {
    await refundPurchase(auth.admin.id, id, text(body.note, 500));
    return NextResponse.json({ success: true });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
