import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getChinaTravelContent, updateChinaTravelContent } from "@/lib/server/china-travel-content-repo";
import { normalizeChinaTravelContent } from "@/lib/china-travel-content";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const content = await getChinaTravelContent();
  return NextResponse.json({ content });
}

export async function PUT(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const body = await request.json();
  await updateChinaTravelContent(normalizeChinaTravelContent(body));
  return NextResponse.json({ ok: true });
}
