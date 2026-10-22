import { NextResponse } from "next/server";
import { isValidClientKey, parsePoints, validateWithdrawalDetails, type WithdrawalMethod } from "@/lib/wallet";
import { listMyWithdrawals, requestWithdrawal } from "@/lib/server/wallet-repo";
import { isValidUploadedImage } from "@/lib/server/validate-upload";
import { checkPassword, limitOrNull, MAX_WALLET_IMAGE_BYTES, readJson, requireBuyer, text, walletErrorResponse, walletFail } from "@/lib/server/wallet-api";

export async function GET(request: Request) {
  const auth = await requireBuyer(request);
  if (auth.response) return auth.response;
  try {
    return NextResponse.json({ items: await listMyWithdrawals(auth.user.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return walletErrorResponse(err);
  }
}

// Ask to cash out. The points are taken off the balance straight away (they cannot be
// spent or sent meanwhile) and come back if the request is cancelled or refused.
export async function POST(request: Request) {
  const auth = await requireBuyer(request);
  if (auth.response) return auth.response;
  const body = await readJson(request);
  if (!body) return walletFail("invalid_input");
  const points = parsePoints(body.points);
  if (points === null) return walletFail("invalid_amount");
  if (!isValidClientKey(body.key)) return walletFail("invalid_input");

  const details = {
    method: body.method as WithdrawalMethod,
    qrImage: typeof body.qrImage === "string" ? body.qrImage : "",
    accountName: text(body.accountName, 150),
    bankName: text(body.bankName, 150),
    bankBranch: text(body.bankBranch, 200),
    bankAccount: text(body.bankAccount, 40),
    note: text(body.note, 500),
  };
  const invalid = validateWithdrawalDetails(details, (value) => isValidUploadedImage(value, MAX_WALLET_IMAGE_BYTES));
  if (invalid) return walletFail(invalid);

  const limited = await limitOrNull(auth.user.id, "withdraw", 10, 60 * 60 * 1000);
  if (limited) return limited;
  const wrong = await checkPassword(auth.user.id, body.password);
  if (wrong) return wrong;

  try {
    const result = await requestWithdrawal(auth.user.id, { ...details, points, key: body.key });
    return NextResponse.json(result, { status: result.replayed ? 200 : 201 });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
