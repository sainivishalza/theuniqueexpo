import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { listSubsidyApplications } from "@/lib/server/service-apps-repo";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const applications = await listSubsidyApplications();
  return NextResponse.json({ applications });
}
