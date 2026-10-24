import { NextResponse } from "next/server";
import { cleanSupportBody } from "@/lib/support";
import { buyerReply, getMyThread } from "@/lib/server/support";
import { limitOrNull, positiveId, readJson, requireBuyer, walletErrorResponse, walletFail } from "@/lib/server/wallet-api";

// One of the buyer's own conversations with its messages (opening it marks the team's answers as read).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBuyer(request);
  if (auth.response) return auth.response;
  const id = positiveId((await params).id);
  if (!id) return walletFail("not_found");
  try {
    const found = await getMyThread(auth.user.id, id);
    return found ? NextResponse.json(found, { headers: { "Cache-Control": "no-store" } }) : walletFail("not_found");
  } catch (err) {
    return walletErrorResponse(err);
  }
}

// The buyer writes again: { body }. A closed conversation is opened again.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBuyer(request);
  if (auth.response) return auth.response;
  const id = positiveId((await params).id);
  const body = await readJson(request);
  const text = body ? cleanSupportBody(body.body) : null;
  if (!id) return walletFail("not_found");
  if (!text) return walletFail("invalid_input");
  const limited = await limitOrNull(auth.user.id, "support-reply", 40, 24 * 60 * 60 * 1000);
  if (limited) return limited;
  try {
    return (await buyerReply(auth.user.id, id, text)) ? NextResponse.json({ success: true }) : walletFail("not_found");
  } catch (err) {
    return walletErrorResponse(err);
  }
}
