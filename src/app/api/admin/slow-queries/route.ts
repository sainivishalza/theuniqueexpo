import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { logAdminAction } from "@/lib/server/audit-log";
import { clearSlowQueries, listSlowQueries } from "@/lib/server/slow-queries";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  return NextResponse.json({ queries: await listSlowQueries() }, { headers: { "Cache-Control": "no-store" } });
}

// Starts the list again from empty.
export async function DELETE(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  await clearSlowQueries();
  logAdminAction(request, admin, "slow_queries_cleared", { targetType: "settings" });
  return NextResponse.json({ ok: true, queries: [] });
}
