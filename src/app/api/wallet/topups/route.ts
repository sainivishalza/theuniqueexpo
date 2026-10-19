import { NextResponse } from "next/server";
import { isValidClientKey, parsePoints } from "@/lib/wallet";
import { createTopup, listMyTopups } from "@/lib/server/wallet-repo";
import { isValidUploadedDocument } from "@/lib/server/validate-upload";
import { limitOrNull, MAX_WALLET_IMAGE_BYTES, readJson, requireBuyer, text, walletErrorResponse, walletFail } from "@/lib/server/wallet-api";

export async function GET(request: Request) {
  const auth = await requireBuyer(request);
  if (auth.response) return auth.response;
  try {
    return NextResponse.json({ items: await listMyTopups(auth.user.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return walletErrorResponse(err);
  }
}

// "I paid you": the points wanted and a picture of the payment. Nothing is added until
// an admin has checked that the money arrived.
export async function POST(request: Request) {
  const auth = await requireBuyer(request);
  if (auth.response) return auth.response;
  const body = await readJson(request);
  if (!body) return walletFail("invalid_input");
  const points = parsePoints(body.points);
  if (points === null) return walletFail("invalid_amount");
  if (!isValidClientKey(body.key)) return walletFail("invalid_input");
  if (!isValidUploadedDocument(body.proof, MAX_WALLET_IMAGE_BYTES)) return walletFail("invalid_input");
  const limited = limitOrNull(auth.user.id, "topup", 20, 24 * 60 * 60 * 1000);
  if (limited) return limited;
  try {
    const result = await createTopup(auth.user.id, {
      points,
      reference: text(body.reference, 150),
      note: text(body.note, 500),
      proof: body.proof as string,
      key: body.key,
    });
    return NextResponse.json(result, { status: result.replayed ? 200 : 201 });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
