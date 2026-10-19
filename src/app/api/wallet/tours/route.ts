import { NextResponse } from "next/server";
import { listPayableTours } from "@/lib/server/wallet-repo";
import { requireBuyer, walletErrorResponse } from "@/lib/server/wallet-api";

// Packages that can be bought with points.
export async function GET(request: Request) {
  const auth = await requireBuyer(request);
  if (auth.response) return auth.response;
  try {
    return NextResponse.json({ items: await listPayableTours() }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
