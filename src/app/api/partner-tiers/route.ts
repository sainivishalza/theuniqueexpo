import { NextResponse } from "next/server";
import { listPartnerTiers } from "@/lib/server/partner-tiers-repo";

export async function GET() {
  const tiers = await listPartnerTiers();
  // Public, rarely-changing data -- let the browser reuse this across page
  // switches instead of re-querying the DB on every navigation.
  return NextResponse.json(
    { tiers },
    { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } }
  );
}
