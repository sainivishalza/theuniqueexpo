import { NextResponse } from "next/server";
import { markWithdrawalPaid, rejectWithdrawal } from "@/lib/server/wallet-repo";
import { getWithdrawalQr } from "@/lib/server/wallet-admin-repo";
import { notifyWalletRequest } from "@/lib/server/notifications";
import { positiveId, readJson, requireWalletAdmin, text, walletErrorResponse, walletFail } from "@/lib/server/wallet-api";

// The buyer's Alipay / WeChat QR code, to scan when paying them.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  const id = positiveId((await params).id);
  if (!id) return walletFail("not_found");
  try {
    const qr = await getWithdrawalQr(id);
    return NextResponse.json({ qr: qr ?? "" }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return walletErrorResponse(err);
  }
}

// "Paid" (the money was sent) or "reject" (the points go back to the buyer).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  const id = positiveId((await params).id);
  const body = await readJson(request);
  if (!id || !body) return walletFail("invalid_input");
  try {
    if (body.action === "paid") {
      const reference = text(body.reference, 150);
      await markWithdrawalPaid(auth.admin.id, id, reference, text(body.note, 500));
      notifyWalletRequest("wallet_withdrawals", id, "withdrawalPaid", { reason: reference });
    } else if (body.action === "reject") {
      const note = text(body.note, 500);
      await rejectWithdrawal(auth.admin.id, id, note);
      notifyWalletRequest("wallet_withdrawals", id, "withdrawalRejected", { reason: note });
    } else {
      return walletFail("invalid_input");
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
