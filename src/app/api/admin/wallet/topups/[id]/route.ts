import { NextResponse } from "next/server";
import { parsePoints } from "@/lib/wallet";
import { approveTopup, rejectTopup } from "@/lib/server/wallet-repo";
import { getTopupProof } from "@/lib/server/wallet-admin-repo";
import { notifyWalletRequest } from "@/lib/server/notifications";
import { positiveId, readJson, requireWalletAdmin, text, walletErrorResponse, walletFail } from "@/lib/server/wallet-api";

// The payment proof the buyer uploaded (kept out of the list because it is a full image).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  const id = positiveId((await params).id);
  if (!id) return walletFail("not_found");
  try {
    const proof = await getTopupProof(id);
    if (proof === null) return walletFail("not_found");
    return NextResponse.json({ proof }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return walletErrorResponse(err);
  }
}

// Approve (adds the points) or reject a top-up request.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  const id = positiveId((await params).id);
  const body = await readJson(request);
  if (!id || !body) return walletFail("invalid_input");
  try {
    if (body.action === "approve") {
      const points = parsePoints(body.points);
      if (points === null) return walletFail("invalid_amount");
      await approveTopup(auth.admin.id, id, points, text(body.note, 500));
      notifyWalletRequest("wallet_topups", id, "topupApproved", { points });
    } else if (body.action === "reject") {
      const note = text(body.note, 500);
      await rejectTopup(auth.admin.id, id, note);
      notifyWalletRequest("wallet_topups", id, "topupRejected", { reason: note });
    } else {
      return walletFail("invalid_input");
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
