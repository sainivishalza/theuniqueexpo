import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/server/audit-log";
import { parsePoints } from "@/lib/wallet";
import { completeTrainClaim, reviewExpenseClaim } from "@/lib/server/wallet-repo";
import { isValidUploadedDocument } from "@/lib/server/validate-upload";
import { parseCny, parseTicketNo } from "@/lib/ticket-refund";
import { getExpenseReceipts } from "@/lib/server/wallet-admin-repo";
import { notifyTicketInvoiceReady, notifyWalletRequest } from "@/lib/server/notifications";
import { MAX_WALLET_IMAGE_BYTES, positiveId, readJson, requireWalletAdmin, text, walletErrorResponse, walletFail } from "@/lib/server/wallet-api";

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

// Approve with a number of points, reject, or (train-ticket refunds) attach the e-invoice and its amount.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  const id = positiveId((await params).id);
  const body = await readJson(request);
  if (!id || !body) return walletFail("invalid_input");
  try {
    if (body.action === "complete") {
      // A train-ticket refund: the e-invoice our team got from 12306 (when the buyer did not send it) and the amount printed on it.
      const amountCny = parseCny(body.amount);
      if (amountCny === null) return walletFail("invalid_amount");
      const ticketNo = parseTicketNo(body.ticketNo);
      if (ticketNo === null) return walletFail("invalid_input");
      const hasInvoice = body.invoice !== undefined && body.invoice !== null && body.invoice !== "";
      if (hasInvoice && !isValidUploadedDocument(body.invoice, MAX_WALLET_IMAGE_BYTES)) return walletFail("invalid_input");
      const attached = await completeTrainClaim(id, { invoice: hasInvoice ? (body.invoice as string) : null, amountCny, ticketNo });
      if (attached.invoiceAttached) notifyTicketInvoiceReady(attached.userId, attached.exhibition);
      logAdminAction(request, auth.admin, "ticket_invoice_attached", { targetType: "expense", targetId: id, details: `¥${amountCny.toFixed(2)}` });
    } else if (body.action === "approve") {
      const points = parsePoints(body.points);
      if (points === null) return walletFail("invalid_amount");
      await reviewExpenseClaim(auth.admin.id, id, { approve: true, points, adminNote: text(body.note, 500) });
      notifyWalletRequest("wallet_expense_claims", id, "expenseApproved", { points });
      logAdminAction(request, auth.admin, "expense_approved", { targetType: "expense", targetId: id, details: `${points} points` });
    } else if (body.action === "reject") {
      const note = text(body.note, 500);
      await reviewExpenseClaim(auth.admin.id, id, { approve: false, adminNote: note });
      notifyWalletRequest("wallet_expense_claims", id, "expenseRejected", { reason: note });
      logAdminAction(request, auth.admin, "expense_rejected", { targetType: "expense", targetId: id, details: note });
    } else {
      return walletFail("invalid_input");
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
