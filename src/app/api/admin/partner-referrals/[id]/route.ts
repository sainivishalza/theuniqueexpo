import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { updateReferral, type ConversionStatus } from "@/lib/server/partner-referrals-repo";

const VALID_STATUSES: ConversionStatus[] = ["signed_up", "booked_booth", "posted_rfq"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const conversionStatus = body.conversionStatus !== undefined ? String(body.conversionStatus) : undefined;
  if (conversionStatus !== undefined && !VALID_STATUSES.includes(conversionStatus as ConversionStatus)) {
    return NextResponse.json({ error: "Invalid conversion status" }, { status: 400 });
  }

  const commission = body.commission !== undefined ? Number(body.commission) : undefined;
  if (commission !== undefined && (Number.isNaN(commission) || commission < 0)) {
    return NextResponse.json({ error: "Commission must be a non-negative number" }, { status: 400 });
  }

  await updateReferral(Number(id), { conversionStatus: conversionStatus as ConversionStatus | undefined, commission });
  return NextResponse.json({ success: true });
}
