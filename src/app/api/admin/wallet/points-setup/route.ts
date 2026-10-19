import { NextResponse } from "next/server";
import { MAX_POINTS } from "@/lib/wallet";
import { getPointsSetup, setExhibitionPoints, setTourPoints } from "@/lib/server/wallet-admin-repo";
import { positiveId, readJson, requireWalletAdmin, walletErrorResponse, walletFail } from "@/lib/server/wallet-api";

export async function GET(request: Request) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  try {
    return NextResponse.json(await getPointsSetup(), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return walletErrorResponse(err);
  }
}

// Set the points one exhibition rewards for attending, or the price of one tour in points.
// 0 turns it off.
export async function PUT(request: Request) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  const body = await readJson(request);
  if (!body) return walletFail("invalid_input");
  const id = typeof body.id === "number" ? positiveId(String(body.id)) : null;
  const points = body.points;
  if (!id || (body.type !== "exhibition" && body.type !== "tour")) return walletFail("invalid_input");
  if (typeof points !== "number" || !Number.isSafeInteger(points) || points < 0 || points > MAX_POINTS) return walletFail("invalid_amount");
  try {
    const found = body.type === "exhibition" ? await setExhibitionPoints(id, points) : await setTourPoints(id, points);
    return found ? NextResponse.json({ success: true }) : walletFail("not_found");
  } catch (err) {
    return walletErrorResponse(err);
  }
}
