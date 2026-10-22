import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/server/audit-log";
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
    const note = text(body.note, 500);
    await refundPurchase(auth.admin.id, id, note);
    logAdminAction(request, auth.admin, "purchase_refunded", { targetType: "purchase", targetId: id, details: note });
    return NextResponse.json({ success: true });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
