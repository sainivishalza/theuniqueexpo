import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getPageSpeed } from "@/lib/server/web-vitals";

// Admin -> Page speed: how fast pages feel to real visitors over the last 7 or 28 days.
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const days = new URL(request.url).searchParams.get("days") === "28" ? 28 : 7;
  const rows = await getPageSpeed(days);
  if (!rows) return NextResponse.json({ available: false, days, rows: [] }, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ available: true, days, rows }, { headers: { "Cache-Control": "no-store" } });
}
