import { NextResponse } from "next/server";
import fs from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { requireAdmin } from "@/lib/auth-server";
import { createBatch, setBatchStatus } from "@/lib/server/photo-organizer-repo";
import { batchDir, uploadZipPath } from "@/lib/server/photo-organizer/paths";
import { processBatch } from "@/lib/server/photo-organizer/process";

// Uploads up to 2GB, so the client sends the raw file as the request body
// (not multipart/form-data) and this streams it straight to disk via
// request.body -- reading it as a Web ReadableStream avoids Next's
// whole-body-buffering formData()/json() helpers, which would otherwise
// hold the entire file in memory at once.
export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });

  if (!request.body) {
    return NextResponse.json({ error: "No file body" }, { status: 400 });
  }

  const originalFilename = request.headers.get("x-filename") || "upload.zip";
  if (!originalFilename.toLowerCase().endsWith(".zip")) {
    return NextResponse.json({ error: "File must be a .zip archive" }, { status: 400 });
  }

  const batchId = await createBatch(originalFilename);

  try {
    await fs.promises.mkdir(batchDir(batchId), { recursive: true });
    const nodeStream = Readable.fromWeb(request.body as Parameters<typeof Readable.fromWeb>[0]);
    await pipeline(nodeStream, fs.createWriteStream(uploadZipPath(batchId)));
  } catch (err) {
    console.error("Photo organizer upload failed:", err);
    await setBatchStatus(batchId, "failed", "Upload failed or was interrupted");
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  // Extraction + OCR can take minutes for a large zip -- don't make the
  // client wait on it; the admin UI polls GET /[batchId] for status.
  processBatch(batchId).catch((err) => console.error("Unhandled photo-organizer processing error:", err));

  return NextResponse.json({ batchId }, { status: 201 });
}
