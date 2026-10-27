// Reads the writing on a picture, in the browser, with tesseract.js. Everything it needs -- its worker, its core and the English
// data -- is served from this site (public/vendor/ocr), so it works under our security rules and offline from any other host. It is
// loaded only when pictures are being sorted. The first start downloads about 15 MB, which the browser then keeps.

const BASE = "/vendor/ocr";

type Worker = import("tesseract.js").Worker;
let starting: Promise<Worker> | null = null;

// What the reader is doing while it starts, for the page to show: "download" carries the share of the language data fetched.
export type OcrStartStatus = { step: "start" } | { step: "download"; percent: number } | { step: "ready" };
let listener: ((status: OcrStartStatus) => void) | null = null;

export class OcrError extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new OcrError(`${what} took longer than ${Math.round(ms / 1000)} seconds`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

/** Starts the reader (once). A slow connection gets 5 minutes for the first download. */
export function startOcr(onStatus?: (status: OcrStartStatus) => void): Promise<Worker> {
  if (onStatus) listener = onStatus;
  listener?.({ step: "start" });
  starting ??= withTimeout(
    (async () => {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        workerPath: `${BASE}/worker.min.js`,
        corePath: `${BASE}/tesseract-core-simd-lstm.wasm.js`,
        langPath: BASE,
        gzip: true,
        workerBlobURL: false,
        logger: (m: { status: string; progress: number }) => {
          if (/language/i.test(m.status)) listener?.({ step: "download", percent: Math.round((m.progress || 0) * 100) });
        },
      });
      listener?.({ step: "ready" });
      return worker;
    })(),
    5 * 60_000,
    "Starting the text reader"
  ).catch((err) => {
    starting = null; // try again next time
    throw err instanceof OcrError ? err : new OcrError(err instanceof Error && err.message ? err.message : "The text reader could not start");
  });
  return starting;
}

/** The writing on a picture. Gives up after 90 seconds, so one stuck picture cannot stop everything. */
export async function readText(source: HTMLCanvasElement): Promise<string> {
  const worker = await startOcr();
  const { data } = await withTimeout(worker.recognize(source), 90_000, "Reading one picture");
  return data.text;
}

export async function stopOcr(): Promise<void> {
  const current = starting;
  starting = null;
  listener = null;
  if (current) await current.then((w) => w.terminate()).catch(() => {});
}
