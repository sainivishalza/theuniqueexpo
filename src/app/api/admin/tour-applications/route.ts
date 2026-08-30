import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { listTourApplications } from "@/lib/server/service-apps-repo";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const applications = await listTourApplications();
  return NextResponse.json({ applications });
}
