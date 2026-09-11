import fs from "node:fs";
import path from "node:path";
import { createWorker, type Worker } from "tesseract.js";

// tesseract.js has to load its English language model before it can OCR
// anything. By default it fetches this over the network from jsdelivr's
// CDN on first use, with no built-in timeout -- a stalled connection
// (confirmed happening in practice: a real batch on this host hung for
// over an hour with zero progress and no error) leaves the whole batch
// stuck forever. Bundling the trained-data file directly and pointing
// cachePath at it makes tesseract.js treat it as an already-cached file
// (see tesseract.js's worker-script/index.js: it checks
// `${cachePath}/${lang}.traineddata` on disk before ever attempting a
// network fetch), so no network call happens at all, on this host or any
// other.
//
// Bundling alone didn't fix production, though: this host's real serving
// process is Passenger/hbuilds, and the deploy script itself already
// documented (see hostinger-deploy-remote.sh) that Passenger's serving
// process's cwd is a "nodejs" *subdirectory* of the actual checked-out app
// root, not the root itself -- so `process.cwd()` there does not point at
// the same tree that `src/...` lives under, the cache read silently misses,
// and tesseract.js falls through to the network fetch that hangs/times out
// again. Search upward from a few different candidate starting points for
// the actual app root (identified by containing the bundled file) instead
// of assuming process.cwd() *is* that root.
export const TESSDATA_RELATIVE = path.join("src", "lib", "server", "photo-organizer", "tessdata");
export const TESSDATA_FILE_RELATIVE = path.join(TESSDATA_RELATIVE, "eng.traineddata");

export function findTessdataDir(): string {
  const startingPoints = [process.cwd(), __dirname];
  for (const start of startingPoints) {
    let dir = start;
    for (let i = 0; i < 10; i++) {
      if (fs.existsSync(path.join(dir, TESSDATA_FILE_RELATIVE))) {
        return path.join(dir, TESSDATA_RELATIVE);
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  // Nothing found -- fall back to the original assumption so the error
  // message/behavior below is at least deterministic, and log loudly so
  // the next failure comes with real evidence instead of another guess.
  const fallback = path.join(process.cwd(), TESSDATA_RELATIVE);
  console.error(
    `[photo-organizer/ocr] could not locate bundled tessdata by walking up from ` +
      `process.cwd()=${process.cwd()} or __dirname=${__dirname}; falling back to ${fallback}, ` +
      `which likely doesn't exist -- OCR will probably fall through to the network fetch and time out.`,
  );
  return fallback;
}

const TESSDATA_DIR = findTessdataDir();
console.log(`[photo-organizer/ocr] resolved tessdata dir: ${TESSDATA_DIR}`);

// Defense in depth in case the bundled file is ever missing/corrupted and
// tesseract.js falls back to its network path anyway -- fail loudly
// within a bounded time instead of hanging the batch indefinitely again.
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)),
  ]);
}

// A passport's printed name (and its MRZ transliteration) is always in
// Latin script even when the rest of the document isn't, so a single
// English-trained worker is enough -- and reusing one worker across an
// entire batch avoids re-initializing tesseract's model for every image.
export async function createOcrWorker(): Promise<Worker> {
  return withTimeout(createWorker("eng", 1, { cachePath: TESSDATA_DIR }), 60_000, "Loading the OCR language model");
}

export async function ocrImage(worker: Worker, filePath: string): Promise<string> {
  const { data } = await withTimeout(worker.recognize(filePath), 45_000, "Reading text from an image");
  return data.text;
}
