import { NextResponse } from "next/server";
import { isValidClientKey } from "@/lib/wallet";
import { buyTourWithPoints, listMyPurchases } from "@/lib/server/wallet-repo";
import { limitOrNull, readJson, requireBuyer, walletErrorResponse, walletFail } from "@/lib/server/wallet-api";

export async function GET(request: Request) {
  const auth = await requireBuyer(request);
  if (auth.response) return auth.response;
  try {
    return NextResponse.json({ items: await listMyPurchases(auth.user.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return walletErrorResponse(err);
  }
}

// Pay for a package with points. The price is read from the package at the moment of
// buying -- the screen never sends one.
export async function POST(request: Request) {
  const auth = await requireBuyer(request);
  if (auth.response) return auth.response;
  const body = await readJson(request);
  if (!body) return walletFail("invalid_input");
  const tourId = body.tourId;
  if (typeof tourId !== "number" || !Number.isSafeInteger(tourId) || tourId <= 0) return walletFail("invalid_input");
  if (!isValidClientKey(body.key)) return walletFail("invalid_input");
  const limited = limitOrNull(auth.user.id, "purchase", 20, 60 * 60 * 1000);
  if (limited) return limited;
  try {
    const result = await buyTourWithPoints(auth.user.id, tourId, body.key);
    return NextResponse.json(result, { status: result.replayed ? 200 : 201 });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
