import { NextResponse } from "next/server";
import { getFaqItems } from "@/lib/server/faq-content-repo";

export async function GET() {
  const items = await getFaqItems();
  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } }
  );
}
