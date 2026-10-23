import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getInsights, parseRange } from "@/lib/server/admin-insights";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const raw = params.get("exhibition");
  const exhibitionId = raw ? Number(raw) : null;
  if (raw && (!Number.isInteger(exhibitionId) || (exhibitionId as number) <= 0)) return NextResponse.json({ error: "Bad exhibition", code: "bad_exhibition" }, { status: 400 });
  return NextResponse.json(await getInsights(parseRange(params.get("days")), exhibitionId), { headers: { "Cache-Control": "no-store" } });
}
