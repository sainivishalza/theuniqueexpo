import { NextResponse } from "next/server";
import { countMyUnread } from "@/lib/server/support";
import { requireBuyer, walletErrorResponse } from "@/lib/server/wallet-api";

// How many answers from our team the buyer has not opened yet (for the menu).
export async function GET(request: Request) {
  const auth = await requireBuyer(request);
  if (auth.response) return auth.response;
  try {
    return NextResponse.json({ unread: await countMyUnread(auth.user.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
