import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getAdminStats } from "@/lib/server/admin-stats";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  return NextResponse.json(await getAdminStats(), { headers: { "Cache-Control": "no-store" } });
}
