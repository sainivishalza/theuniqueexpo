// Reads the writing on a picture, in the browser, with tesseract.js. Everything it needs -- its worker, its core and the English
// data -- is served from this site (public/vendor/ocr), so it works under our security rules and offline from any other host. It is
// loaded only when pictures are being sorted. The first start downloads about 11 MB, which the browser then keeps.

const BASE = "/vendor/ocr";

type Worker = import("tesseract.js").Worker;
let starting: Promise<Worker> | null = null;

export function startOcr(): Promise<Worker> {
  starting ??= (async () => {
    const { createWorker } = await import("tesseract.js");
    return createWorker("eng", 1, {
      workerPath: `${BASE}/worker.min.js`,
      corePath: `${BASE}/tesseract-core-simd-lstm.wasm.js`,
      langPath: BASE,
      gzip: true,
      workerBlobURL: false,
    });
  })().catch((err) => {
    starting = null; // try again next time
    throw err;
  });
  return starting;
}

export async function readText(source: HTMLCanvasElement): Promise<string> {
  const worker = await startOcr();
  const { data } = await worker.recognize(source);
  return data.text;
}

export async function stopOcr(): Promise<void> {
  const current = starting;
  starting = null;
  if (current) await current.then((w) => w.terminate()).catch(() => {});
}
