import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { previewMerge } from "@/lib/server/buyer-duplicates";

// What merging one account into another would do, before anything changes (?keep=&merge=).
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const keep = Number(params.get("keep")), merge = Number(params.get("merge"));
  if (!Number.isInteger(keep) || !Number.isInteger(merge) || keep <= 0 || merge <= 0) return NextResponse.json({ error: "Choose two accounts", code: "invalid" }, { status: 400 });
  const preview = await previewMerge(keep, merge);
  if (preview === "invalid") return NextResponse.json({ error: "Choose two different buyer accounts", code: "invalid" }, { status: 400 });
  return NextResponse.json({ preview }, { headers: { "Cache-Control": "no-store" } });
}
