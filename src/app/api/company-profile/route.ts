import { NextResponse } from "next/server";
import { getCompanyProfile } from "@/lib/server/company-profile-repo";

export async function GET() {
  const profile = await getCompanyProfile();
  return NextResponse.json(
    { profile },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=180, stale-while-revalidate=900" } }
  );
}
