import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { deletePendingDocument } from "@/lib/server/buyer-pending-documents-repo";

// Called once the matching photo has actually been uploaded to the buyer's
// profile (see setBuyerDocument) -- clears the "still expected" marker so
// the pending list only ever shows what's genuinely still missing.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { id } = await params;
  await deletePendingDocument(Number(id));
  return NextResponse.json({ success: true });
}
