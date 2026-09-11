import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { listPartnerApplications } from "@/lib/server/partner-applications-repo";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const applications = await listPartnerApplications();
  return NextResponse.json({ applications });
}
