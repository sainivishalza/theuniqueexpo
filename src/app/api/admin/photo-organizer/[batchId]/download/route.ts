import { NextResponse } from "next/server";
import fs from "node:fs";
import { Readable } from "node:stream";
import { requireAdmin } from "@/lib/auth-server";
import { getBatch } from "@/lib/server/photo-organizer-repo";
import { outputZipPath } from "@/lib/server/photo-organizer/paths";

// Streams the finished zip rather than reading it into a Buffer first --
// this can be as large as the original upload (up to ~2GB).
export async function GET(request: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  const { batchId } = await params;
  const id = Number(batchId);
  const batch = await getBatch(id);
  if (!batch || batch.status !== "done") {
    return NextResponse.json({ error: "Batch is not finalized yet" }, { status: 409 });
  }

  const filePath = outputZipPath(id);
  let size: number;
  try {
    size = (await fs.promises.stat(filePath)).size;
  } catch {
    return NextResponse.json({ error: "Output file missing" }, { status: 404 });
  }

  const webStream = Readable.toWeb(fs.createReadStream(filePath)) as unknown as ReadableStream;
  const safeName = batch.originalFilename.replace(/\.zip$/i, "") + "-organized.zip";

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(size),
      "Content-Disposition": `attachment; filename="${safeName.replace(/"/g, "")}"`,
    },
  });
}
