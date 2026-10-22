import { NextResponse } from "next/server";
import { getRecentNews } from "@/lib/server/wallet-news";
import { requireBuyer, walletErrorResponse } from "@/lib/server/wallet-api";

// The signed-in buyer's recent reward news (points added, withdrawals paid or turned down).
export async function GET(request: Request) {
  const auth = await requireBuyer(request);
  if (auth.response) return auth.response;
  try {
    return NextResponse.json({ items: await getRecentNews(auth.user.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
