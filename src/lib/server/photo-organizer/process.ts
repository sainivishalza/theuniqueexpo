import path from "node:path";
import { extractZip } from "./zip";
import { groupFilenames, identifierFromGroupKey, pickPassportCandidateByFilename } from "./grouping";
import { createOcrWorker, ocrImage } from "./ocr";
import { parseMrzName, heuristicNameFromText } from "./mrz";
import { extractedDir, uploadZipPath } from "./paths";
import {
  setBatchStatus,
  setBatchCounts,
  insertGroups,
  type NewGroup,
  type DetectionStatus,
} from "@/lib/server/photo-organizer-repo";

const IMAGE_EXT_RE = /\.(jpe?g|png|webp|bmp|tiff?)$/i;

function toTitleCase(name: string): string {
  return name
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

// Runs after the upload endpoint has already responded -- this can take
// minutes for a large zip (extraction + OCR per group), so it's tracked
// as an async batch job in the DB rather than something a single HTTP
// request waits on.
export async function processBatch(batchId: number) {
  try {
    await setBatchStatus(batchId, "processing");

    const destDir = extractedDir(batchId);
    const files = await extractZip(uploadZipPath(batchId), destDir);
    const groupMap = groupFilenames(files);

    const worker = await createOcrWorker();
    const newGroups: NewGroup[] = [];

    try {
      for (const [groupKey, groupFiles] of groupMap) {
        const imagesInGroup = groupFiles.filter((f) => IMAGE_EXT_RE.test(f));
        let passportFile = pickPassportCandidateByFilename(groupFiles);

        if (!passportFile) {
          // No filename hint -- check each image in the group for
          // something that reads like an MRZ before giving up.
          for (const candidate of imagesInGroup) {
            const text = await ocrImage(worker, path.join(destDir, candidate));
            if (parseMrzName(text)) {
              passportFile = candidate;
              break;
            }
          }
        }

        let detectedName: string | null = null;
        let detectionStatus: DetectionStatus = "not_found";

        if (passportFile) {
          const text = await ocrImage(worker, path.join(destDir, passportFile));
          const mrz = parseMrzName(text);
          if (mrz && mrz.fullName) {
            detectedName = toTitleCase(mrz.fullName);
            detectionStatus = "detected";
          } else {
            const heuristic = heuristicNameFromText(text);
            if (heuristic) {
              detectedName = toTitleCase(heuristic);
              detectionStatus = "low_confidence";
            }
          }
        }

        newGroups.push({
          groupKey,
          // Falling back to the filename identifier (rather than leaving
          // it blank) means the admin always has *something* reasonable
          // pre-filled on the review screen, even when detection fails
          // outright.
          detectedName: detectedName ?? identifierFromGroupKey(groupKey),
          passportFilename: passportFile,
          fileList: groupFiles,
          detectionStatus,
        });
      }
    } finally {
      await worker.terminate();
    }

    await insertGroups(batchId, newGroups);
    await setBatchCounts(batchId, files.length, newGroups.length);
    await setBatchStatus(batchId, "review");
  } catch (err) {
    console.error("Photo organizer batch processing failed:", err);
    await setBatchStatus(batchId, "failed", err instanceof Error ? err.message : "Unknown error");
  }
}
