import { NextResponse } from "next/server";
import { cancelTopup } from "@/lib/server/wallet-repo";
import { positiveId, readJson, requireBuyer, walletErrorResponse, walletFail } from "@/lib/server/wallet-api";

// A buyer can withdraw a top-up request that has not been reviewed yet.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBuyer(request);
  if (auth.response) return auth.response;
  const id = positiveId((await params).id);
  const body = await readJson(request);
  if (!id || body?.action !== "cancel") return walletFail("invalid_input");
  try {
    await cancelTopup(auth.user.id, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
