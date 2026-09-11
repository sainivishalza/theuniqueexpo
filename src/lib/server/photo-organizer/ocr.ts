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
const TESSDATA_DIR = path.join(process.cwd(), "src", "lib", "server", "photo-organizer", "tessdata");

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
