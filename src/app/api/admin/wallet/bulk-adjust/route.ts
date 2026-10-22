import { NextResponse } from "next/server";
import { BULK_MAX_BUYERS, BULK_MAX_POINTS, isValidClientKey, parsePoints } from "@/lib/wallet";
import { bulkAdjustWallets } from "@/lib/server/wallet-repo";
import { limitOrNull, readJson, requireWalletAdmin, text, walletErrorResponse, walletFail } from "@/lib/server/wallet-api";

// Gives the same number of points to several buyers at once (a welcome bonus, a thank-you).
// Adding only: taking points back stays a one-buyer-at-a-time action with its own reason.
export async function POST(request: Request) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  const limited = await limitOrNull(auth.admin.id, "bulk-adjust", 20, 60_000);
  if (limited) return limited;
  const body = await readJson(request);
  if (!body) return walletFail("invalid_input");
  try {
    const amount = parsePoints(body.amount);
    if (amount === null || amount > BULK_MAX_POINTS) return walletFail("invalid_amount");
    const note = text(body.note, 200);
    if (note.length < 3 || !isValidClientKey(body.key)) return walletFail("invalid_input");
    const raw = body.userIds;
    if (!Array.isArray(raw) || raw.length < 1 || raw.length > BULK_MAX_BUYERS) return walletFail("invalid_input");
    const userIds = raw.filter((id): id is number => typeof id === "number" && Number.isSafeInteger(id) && id > 0);
    if (userIds.length !== raw.length) return walletFail("invalid_input");
    const result = await bulkAdjustWallets(auth.admin.id, userIds, amount, note, body.key);
    return NextResponse.json({ ...result, amount });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
