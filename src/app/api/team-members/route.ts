import { NextResponse } from "next/server";
import { listTeamMembers } from "@/lib/server/team-members-repo";

export async function GET() {
  const teamMembers = await listTeamMembers();
  // Public, rarely-changing data -- let the browser reuse this across page
  // switches instead of re-querying the DB on every navigation.
  return NextResponse.json(
    { teamMembers },
    { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } }
  );
}
