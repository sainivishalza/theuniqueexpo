import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getFaqItems, updateFaqItems } from "@/lib/server/faq-content-repo";
import { normalizeFaqItems } from "@/lib/faq-content";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const items = await getFaqItems();
  return NextResponse.json({ items });
}

export async function PUT(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const body = await request.json();
  const items = normalizeFaqItems(body.items).filter((item) => item.question && item.answer);
  await updateFaqItems(items);
  return NextResponse.json({ ok: true });
}
