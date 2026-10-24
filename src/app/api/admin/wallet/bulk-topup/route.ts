import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/server/audit-log";
import { BULK_MAX_BUYERS, BULK_MAX_POINTS, isValidClientKey, parsePoints } from "@/lib/wallet";
import { parsePassportList } from "@/lib/passport-list";
import { resolvePassports } from "@/lib/server/wallet-admin-repo";
import { bulkAdjustWallets } from "@/lib/server/wallet-repo";
import { notifyPointsReceived } from "@/lib/server/notifications";
import { limitOrNull, readJson, requireWalletAdmin, text, walletErrorResponse, walletFail } from "@/lib/server/wallet-api";

// Top up several buyers at once, found by passport number.
//   { action: "check", passports }                       who would be paid, and which numbers are not found
//   { action: "pay", passports, amount, note, key }      pays every buyer found (the numbers are looked up again here:
//                                                        the server never trusts a list of buyers from the screen)
// A number nobody has is reported, never skipped silently; the buyers who were found are paid either way.
export async function POST(request: Request) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  const limited = await limitOrNull(auth.admin.id, "bulk-topup", 30, 60_000);
  if (limited) return limited;
  const body = await readJson(request);
  if (!body || typeof body.passports !== "string" || body.passports.length > 50_000) return walletFail("invalid_input");
  const tokens = parsePassportList(body.passports);
  if (tokens.length < 1 || tokens.length > BULK_MAX_BUYERS) return walletFail("invalid_input");
  try {
    const resolution = await resolvePassports(tokens);
    if (body.action === "check") return NextResponse.json({ ...resolution, typed: tokens.length }, { headers: { "Cache-Control": "no-store" } });
    if (body.action !== "pay") return walletFail("invalid_input");

    const amount = parsePoints(body.amount);
    if (amount === null || amount > BULK_MAX_POINTS) return walletFail("invalid_amount");
    const note = text(body.note, 200);
    if (note.length < 3 || !isValidClientKey(body.key)) return walletFail("invalid_input");
    if (resolution.found.length === 0) return walletFail("not_found");
    const result = await bulkAdjustWallets(auth.admin.id, resolution.found.map((f) => f.userId), amount, note, `pp-${body.key}`);
    for (const id of result.credited) notifyPointsReceived(id, amount, note);
    logAdminAction(request, auth.admin, "points_bulk_topup", {
      targetType: "wallet",
      details: `${amount} points to ${result.credited.length} of ${tokens.length} passport numbers (${resolution.notFound.length} not found): ${note}`,
    });
    return NextResponse.json({
      amount,
      typed: tokens.length,
      paid: result.added,
      failed: result.failed.length,
      notFound: resolution.notFound,
      ambiguous: resolution.ambiguous,
      blocked: resolution.blocked,
    });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
