import { NextResponse } from "next/server";
import { isValidClientKey } from "@/lib/wallet";
import { parseCny, parseTicketNo } from "@/lib/ticket-refund";
import { createTrainClaim } from "@/lib/server/wallet-repo";
import { getBuyerRefundOptions, listMyTrainClaims } from "@/lib/server/ticket-refunds";
import { isValidUploadedDocument } from "@/lib/server/validate-upload";
import { limitOrNull, MAX_WALLET_IMAGE_BYTES, readJson, requireBuyer, text, walletErrorResponse, walletFail } from "@/lib/server/wallet-api";

// What this buyer can claim a train ticket for (the exhibitions that refund tickets and that they are registered for),
// the ending of their passport number (our team uses it to get the e-invoice from 12306), and their earlier requests.
export async function GET(request: Request) {
  const auth = await requireBuyer(request);
  if (auth.response) return auth.response;
  try {
    const [options, claims] = await Promise.all([getBuyerRefundOptions(auth.user.id), listMyTrainClaims(auth.user.id)]);
    return NextResponse.json({ ...options, claims }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return walletErrorResponse(err);
  }
}

// Send the station receipt (and the e-invoice and amount, if the buyer already has them). Our team gets the invoice from 12306
// and attaches it; nothing is paid until an admin approves.
export async function POST(request: Request) {
  const auth = await requireBuyer(request);
  if (auth.response) return auth.response;
  const body = await readJson(request);
  if (!body || !isValidClientKey(body.key)) return walletFail("invalid_input");

  const exhibitionId = body.exhibitionId;
  if (typeof exhibitionId !== "number" || !Number.isSafeInteger(exhibitionId) || exhibitionId <= 0) return walletFail("invalid_input");
  // The amount and the e-invoice are optional: our team gets the invoice from 12306 with the buyer's passport number.
  const hasAmount = body.amount !== undefined && body.amount !== null && body.amount !== "";
  const amountCny = hasAmount ? parseCny(body.amount) : null;
  if (hasAmount && amountCny === null) return walletFail("invalid_amount");
  const ticketNo = parseTicketNo(body.ticketNo);
  if (ticketNo === null) return walletFail("invalid_input");
  const hasInvoice = body.invoice !== undefined && body.invoice !== null && body.invoice !== "";
  if (!isValidUploadedDocument(body.receipt, MAX_WALLET_IMAGE_BYTES)) return walletFail("invalid_input");
  if (hasInvoice && (!isValidUploadedDocument(body.invoice, MAX_WALLET_IMAGE_BYTES) || body.invoice === body.receipt)) return walletFail("invalid_input");
  // An invoice without its amount cannot be checked.
  if (hasInvoice && amountCny === null) return walletFail("invalid_amount");

  const limited = await limitOrNull(auth.user.id, "ticket-refund", 20, 24 * 60 * 60 * 1000);
  if (limited) return limited;
  try {
    const result = await createTrainClaim(auth.user.id, {
      exhibitionId,
      receipt: body.receipt as string,
      invoice: hasInvoice ? (body.invoice as string) : null,
      amountCny,
      ticketNo,
      qrText: text(body.qrText, 500),
      key: body.key,
    });
    return NextResponse.json(result, { status: result.replayed ? 200 : 201 });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
