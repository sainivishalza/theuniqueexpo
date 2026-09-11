import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getBatch, listGroupsForBatch, deleteBatch } from "@/lib/server/photo-organizer-repo";
import { deleteBatchFiles } from "@/lib/server/photo-organizer/paths";

// Polled by the admin UI while a batch is processing -- returns just the
// batch's status until it reaches "review", at which point the groups
// (with detected names) come along too.
export async function GET(request: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { batchId } = await params;
  const batch = await getBatch(Number(batchId));
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

  const groups = batch.status === "review" || batch.status === "done" ? await listGroupsForBatch(batch.id) : [];
  return NextResponse.json({ batch, groups });
}

// Cleans up a batch's working files (used after download, or to abandon a
// failed/unwanted batch) -- the DB row and everything under
// tmp/photo-organizer/<id>/ are removed together.
export async function DELETE(request: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { batchId } = await params;
  const id = Number(batchId);
  await deleteBatchFiles(id);
  await deleteBatch(id);
  return NextResponse.json({ success: true });
}
