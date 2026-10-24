import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/server/audit-log";
import { cleanSupportBody } from "@/lib/support";
import { getAdminThread, setThreadStatus, staffReply } from "@/lib/server/support";
import { positiveId, readJson, requireWalletAdmin, walletErrorResponse, walletFail } from "@/lib/server/wallet-api";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  const id = positiveId((await params).id);
  if (!id) return walletFail("not_found");
  try {
    const found = await getAdminThread(id);
    return found ? NextResponse.json(found, { headers: { "Cache-Control": "no-store" } }) : walletFail("not_found");
  } catch (err) {
    return walletErrorResponse(err);
  }
}

// { action: "reply", body } answers the buyer (who is told); { action: "close" | "reopen" } changes the conversation's status.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  const id = positiveId((await params).id);
  const body = await readJson(request);
  if (!id) return walletFail("not_found");
  if (!body) return walletFail("invalid_input");
  try {
    if (body.action === "reply") {
      const text = cleanSupportBody(body.body);
      if (!text) return walletFail("invalid_input");
      if (!(await staffReply(auth.admin.id, id, text))) return walletFail("not_found");
      logAdminAction(request, auth.admin, "support_replied", { targetType: "support", targetId: id });
    } else if (body.action === "close" || body.action === "reopen") {
      if (!(await setThreadStatus(id, body.action === "close" ? "closed" : "open"))) return walletFail("not_found");
      logAdminAction(request, auth.admin, body.action === "close" ? "support_closed" : "support_reopened", { targetType: "support", targetId: id });
    } else {
      return walletFail("invalid_input");
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
