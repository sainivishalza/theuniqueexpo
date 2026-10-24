import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/server/audit-log";
import { parseReferralSettings } from "@/lib/referral";
import { getReferralSettings, listReferrals, rejectReferral, saveReferralSettings, settlePending } from "@/lib/server/referrals";
import { readJson, requireWalletAdmin, text, walletErrorResponse, walletFail } from "@/lib/server/wallet-api";

const STATUSES = ["pending", "rewarded", "rejected"] as const;

// The referral programme's rules and every referral, newest first.
export async function GET(request: Request) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "";
  const before = Number(url.searchParams.get("before"));
  try {
    const list = await listReferrals(
      {
        status: (STATUSES as readonly string[]).includes(status) ? (status as (typeof STATUSES)[number]) : undefined,
        q: url.searchParams.get("q") ?? "",
        beforeId: Number.isSafeInteger(before) && before > 0 ? before : undefined,
      },
      50
    );
    return NextResponse.json({ settings: await getReferralSettings(), ...list }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return walletErrorResponse(err);
  }
}

export async function PUT(request: Request) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  const settings = parseReferralSettings(await readJson(request));
  if (!settings) return walletFail("invalid_input");
  try {
    await saveReferralSettings(settings);
    logAdminAction(request, auth.admin, "referral_settings_saved", {
      targetType: "settings",
      details: `${settings.enabled ? "on" : "off"}, pays at ${settings.trigger}, ${settings.referrerPoints}+${settings.referredPoints} points, limit ${settings.maxPerReferrer}`,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return walletErrorResponse(err);
  }
}

// { action: "settle" }  pays every waiting referral that now qualifies;
// { action: "reject", id, note }  turns one waiting referral down.
export async function POST(request: Request) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  const body = await readJson(request);
  if (!body) return walletFail("invalid_input");
  try {
    if (body.action === "settle") {
      const result = await settlePending();
      logAdminAction(request, auth.admin, "referrals_settled", { targetType: "settings", details: `${result.paid} paid, ${result.limited} held by the limit` });
      return NextResponse.json(result);
    }
    if (body.action === "reject") {
      const id = Number(body.id);
      if (!Number.isSafeInteger(id) || id <= 0) return walletFail("invalid_input");
      if (!(await rejectReferral(id, text(body.note, 255)))) return walletFail("already_processed", 409);
      logAdminAction(request, auth.admin, "referral_rejected", { targetType: "referral", targetId: id });
      return NextResponse.json({ success: true });
    }
    return walletFail("invalid_input");
  } catch (err) {
    return walletErrorResponse(err);
  }
}
