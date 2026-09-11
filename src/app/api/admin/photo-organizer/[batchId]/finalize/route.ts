import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { getBatch, listGroupsForBatch, setBatchStatus } from "@/lib/server/photo-organizer-repo";
import { extractedDir, outputZipPath } from "@/lib/server/photo-organizer/paths";
import { buildZip } from "@/lib/server/photo-organizer/zip";

// Builds the final re-zipped file from whatever names the admin confirmed
// on the review screen (confirmed_name defaults to detected_name, which
// itself defaults to the filename identifier -- see process.ts -- so this
// always has a usable name per group, edited or not).
export async function POST(request: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { batchId } = await params;
  const id = Number(batchId);
  const batch = await getBatch(id);
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  if (batch.status !== "review") {
    return NextResponse.json({ error: `Batch is not ready to finalize (status: ${batch.status})` }, { status: 409 });
  }

  await setBatchStatus(id, "finalizing");

  try {
    const groups = await listGroupsForBatch(id);
    await buildZip(
      extractedDir(id),
      groups.map((g) => ({ folderName: g.confirmedName || g.detectedName || g.groupKey, files: g.fileList })),
      outputZipPath(id)
    );
    await setBatchStatus(id, "done");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Photo organizer finalize failed:", err);
    await setBatchStatus(id, "failed", err instanceof Error ? err.message : "Failed to build the output zip");
    return NextResponse.json({ error: "Failed to build the output zip" }, { status: 500 });
  }
}
