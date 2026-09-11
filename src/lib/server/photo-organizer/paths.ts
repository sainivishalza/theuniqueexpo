import fs from "node:fs";
import path from "node:path";

// All working data lives under <repo root>/tmp/photo-organizer/<batchId>/ --
// gitignored, ephemeral, cleaned up by deleteBatchFiles once the admin has
// downloaded the result (or abandoned the batch). Not stored in the DB or
// backed up; if the server restarts mid-batch the admin just re-uploads.
const ROOT = path.join(process.cwd(), "tmp", "photo-organizer");

export function batchDir(batchId: number) {
  return path.join(ROOT, String(batchId));
}

export function uploadZipPath(batchId: number) {
  return path.join(batchDir(batchId), "upload.zip");
}

export function extractedDir(batchId: number) {
  return path.join(batchDir(batchId), "extracted");
}

export function outputZipPath(batchId: number) {
  return path.join(batchDir(batchId), "output.zip");
}

export async function deleteBatchFiles(batchId: number) {
  await fs.promises.rm(batchDir(batchId), { recursive: true, force: true });
}
