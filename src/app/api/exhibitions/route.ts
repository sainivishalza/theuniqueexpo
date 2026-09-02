import { NextResponse } from "next/server";
import { listExhibitions } from "@/lib/server/exhibitions-repo";

export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get("locale") || undefined;
  const exhibitions = await listExhibitions(locale);
  // Public, rarely-changing data -- let the browser reuse this across page
  // switches instead of re-querying the DB on every navigation.
  return NextResponse.json(
    { exhibitions },
    { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } }
  );
}
