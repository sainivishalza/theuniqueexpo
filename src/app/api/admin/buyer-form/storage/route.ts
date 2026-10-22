import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { documentStorageStats, shrinkStoredDocuments, type ShrinkCursor } from "@/lib/server/document-storage";

// Admin -> Buyer form settings -> "Storage": how much space buyer documents take, and a button that
// shrinks the big old ones (a few files per request; the screen repeats until it is done).
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  return NextResponse.json(await documentStorageStats());
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const c = body?.cursor;
  const cursor: ShrinkCursor | undefined =
    c && Number.isInteger(c.source) && Number.isInteger(c.afterUserId) && c.source >= 0 && c.source <= 20 && c.afterUserId >= 0
      ? { source: c.source, afterUserId: c.afterUserId }
      : undefined;
  return NextResponse.json(await shrinkStoredDocuments(cursor));
}
