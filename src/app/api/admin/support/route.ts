import { NextResponse } from "next/server";
import { listAdminThreads, type AdminThreadFilter } from "@/lib/server/support";
import { requireWalletAdmin, walletErrorResponse } from "@/lib/server/wallet-api";

const FILTERS: AdminThreadFilter[] = ["waiting", "answered", "closed", "all"];

// The buyers' conversations (?filter=waiting|answered|closed|all, ?q= subject, name or e-mail, ?page=), those waiting for the team first.
export async function GET(request: Request) {
  const auth = await requireWalletAdmin(request);
  if (auth.response) return auth.response;
  const url = new URL(request.url);
  const filter = url.searchParams.get("filter") ?? "waiting";
  const page = Number(url.searchParams.get("page"));
  try {
    const list = await listAdminThreads(FILTERS.includes(filter as AdminThreadFilter) ? (filter as AdminThreadFilter) : "all", url.searchParams.get("q") ?? "", Number.isSafeInteger(page) && page > 0 ? page : 1);
    return NextResponse.json(list, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return walletErrorResponse(err);
  }
}
