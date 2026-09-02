import { NextResponse } from "next/server";
import { getRfqById } from "@/lib/server/rfqs-repo";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rfq = await getRfqById(Number(id));
  if (!rfq) return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
  return NextResponse.json({ rfq });
}
