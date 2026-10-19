import { NextResponse } from "next/server";
import { parsePoints } from "@/lib/wallet";
import { reviewExpenseClaim } from "@/lib/server/wallet-repo";
import { getExpenseReceipts } from "@/lib/server/wallet-admin-repo";
import { positiveId, readJson, requireWalletAdmin, text, walletErrorResponse, walletFail } from "@/lib/server/wallet-api";

// The receipts the buyer uploaded.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  const id = positiveId((await params).id);
  if (!id) return walletFail("not_found");
  try {
    const receipts = await getExpenseReceipts(id);
    if (receipts === null) return walletFail("not_found");
    return NextResponse.json({ receipts }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return walletErrorResponse(err);
  }
}

// Approve with a number of points, or reject.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  const id = positiveId((await params).id);
  const body = await readJson(request);
  if (!id || !body) return walletFail("invalid_input");
  try {
    if (body.action === "approve") {
      const points = parsePoints(body.points);
      if (points === null) return walletFail("invalid_amount");
      await reviewExpenseClaim(auth.admin.id, id, { approve: true, points, adminNote: text(body.note, 500) });
    } else if (body.action === "reject") {
      await reviewExpenseClaim(auth.admin.id, id, { approve: false, adminNote: text(body.note, 500) });
    } else {
      return walletFail("invalid_input");
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
