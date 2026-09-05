import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getCompanyProfile, updateCompanyProfile } from "@/lib/server/company-profile-repo";
import { normalizeCompanyProfile } from "@/lib/company-profile";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const profile = await getCompanyProfile();
  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const body = await request.json();
  if (!body.legalName) {
    return NextResponse.json({ error: "Legal name is required" }, { status: 400 });
  }

  await updateCompanyProfile(normalizeCompanyProfile(body));
  return NextResponse.json({ ok: true });
}
