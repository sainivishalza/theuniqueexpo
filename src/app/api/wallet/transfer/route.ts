import { NextResponse } from "next/server";
import { parseBuyerNumber } from "@/lib/buyer-number";
import { isValidClientKey, parsePoints } from "@/lib/wallet";
import { transferPoints } from "@/lib/server/wallet-repo";
import { checkPassword, limitOrNull, readJson, requireBuyer, text, walletErrorResponse, walletFail } from "@/lib/server/wallet-api";

// Send points to another buyer. The points leave this wallet and arrive in theirs in one
// step, or not at all. Needs the account password and a one-time request key.
export async function POST(request: Request) {
  const auth = await requireBuyer(request);
  if (auth.response) return auth.response;
  const body = await readJson(request);
  if (!body) return walletFail("invalid_input");

  const amount = parsePoints(body.amount);
  if (amount === null) return walletFail("invalid_amount");
  if (!isValidClientKey(body.key)) return walletFail("invalid_input");

  const toRaw = body.to && typeof body.to === "object" ? (body.to as Record<string, unknown>) : {};
  const code = typeof toRaw.code === "string" ? toRaw.code : "";
  const buyerNo = typeof toRaw.number === "string" ? parseBuyerNumber(toRaw.number) : null;
  if (!code && !buyerNo) return walletFail("recipient_not_found");

  const limited = await limitOrNull(auth.user.id, "transfer", 30, 60 * 60 * 1000);
  if (limited) return limited;
  const wrong = await checkPassword(auth.user.id, body.password);
  if (wrong) return wrong;

  try {
    const result = await transferPoints({
      fromUserId: auth.user.id,
      to: code ? { code } : { buyerNo: buyerNo! },
      amount,
      note: text(body.note, 100),
      key: body.key,
    });
    return NextResponse.json(result);
  } catch (err) {
    return walletErrorResponse(err);
  }
}
