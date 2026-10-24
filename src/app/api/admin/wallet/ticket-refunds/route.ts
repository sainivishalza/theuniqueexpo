import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/server/audit-log";
import { parseRefundRules } from "@/lib/ticket-refund";
import { listRefundExhibitions, setRefundRules } from "@/lib/server/ticket-refunds";
import { positiveId, readJson, requireWalletAdmin, walletErrorResponse, walletFail } from "@/lib/server/wallet-api";

// Every exhibition with its train-ticket refund rule.
export async function GET(request: Request) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  try {
    return NextResponse.json({ exhibitions: await listRefundExhibitions() }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return walletErrorResponse(err);
  }
}

// { id, mode: "none" | "refund", percent: 1..100, maxPoints: 0 = no limit } for one exhibition.
export async function PUT(request: Request) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  const body = await readJson(request);
  if (!body) return walletFail("invalid_input");
  const id = typeof body.id === "number" ? positiveId(String(body.id)) : null;
  const rules = parseRefundRules(body);
  if (!id || !rules) return walletFail("invalid_input");
  try {
    if (!(await setRefundRules(id, rules))) return walletFail("not_found");
    logAdminAction(request, auth.admin, "ticket_refund_rules", {
      targetType: "exhibition",
      targetId: id,
      details: rules.mode === "refund" ? `refund ${rules.percent}%, limit ${rules.maxPoints || "none"}` : "we arrange transport",
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
