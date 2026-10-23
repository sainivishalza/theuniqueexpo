import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { parseSegment, resolveSegment, segmentOptions } from "@/lib/server/announcement-segments";

// For announcing to a group: what can be chosen (GET), and how many buyers a choice reaches (POST).
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  return NextResponse.json(await segmentOptions());
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required", code: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const segment = parseSegment(body?.segment);
  if (!segment) return NextResponse.json({ error: "Choose the group again", code: "bad_segment" }, { status: 400 });
  const found = await resolveSegment(segment);
  return NextResponse.json({ count: found.ids.length, withEmail: found.withEmail, firstId: found.ids[0] ?? null, tooMany: found.tooMany });
}
