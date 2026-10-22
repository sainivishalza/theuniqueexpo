import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getAttentionCounts } from "@/lib/server/admin-attention";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  return NextResponse.json(await getAttentionCounts(), { headers: { "Cache-Control": "no-store" } });
}
