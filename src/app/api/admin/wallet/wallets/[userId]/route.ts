import { NextResponse } from "next/server";
import { isValidClientKey, parseSignedPoints } from "@/lib/wallet";
import { adjustWallet, setWalletFrozen } from "@/lib/server/wallet-repo";
import { getWalletDetail } from "@/lib/server/wallet-admin-repo";
import { notifyPointsReceived } from "@/lib/server/notifications";
import { positiveId, readJson, requireWalletAdmin, text, walletErrorResponse, walletFail } from "@/lib/server/wallet-api";

// One buyer's wallet with its full statement.
export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  const userId = positiveId((await params).userId);
  if (!userId) return walletFail("not_found");
  try {
    const before = positiveId(new URL(request.url).searchParams.get("before") ?? "") ?? undefined;
    const detail = await getWalletDetail(userId, before);
    if (!detail) return walletFail("not_found");
    return NextResponse.json(detail, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return walletErrorResponse(err);
  }
}

// Add or remove points by hand (always with a reason), or freeze / unfreeze the wallet.
export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  const userId = positiveId((await params).userId);
  const body = await readJson(request);
  if (!userId || !body) return walletFail("invalid_input");
  try {
    if (body.action === "adjust") {
      const delta = parseSignedPoints(body.amount);
      if (delta === null) return walletFail("invalid_amount");
      if (!isValidClientKey(body.key)) return walletFail("invalid_input");
      const note = text(body.note, 200);
      const result = await adjustWallet(auth.admin.id, userId, delta, note, body.key);
      if (delta > 0 && !result.replayed) notifyPointsReceived(userId, delta, note, result.balance);
      return NextResponse.json(result);
    }
    if (body.action === "freeze" || body.action === "unfreeze") {
      await setWalletFrozen(userId, body.action === "freeze");
      return NextResponse.json({ success: true });
    }
    return walletFail("invalid_input");
  } catch (err) {
    return walletErrorResponse(err);
  }
}
