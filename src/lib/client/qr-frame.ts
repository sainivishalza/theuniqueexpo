// Reading a QR code out of a camera frame or a photo, in the browser, with jsQR (loaded only when needed; it is the reader an
// iPhone gets, because Safari has no built-in one). One look tries the whole picture and then the middle of it, bigger, because a
// QR code held in front of a phone camera fills the middle and a smaller, sharper copy of it reads far more often than a noisy big one.

type JsQr = (data: Uint8ClampedArray, width: number, height: number, options?: { inversionAttempts?: "dontInvert" | "onlyInvert" | "attemptBoth" | "invertFirst" }) => { data: string } | null;

export type QrSource = HTMLVideoElement | HTMLImageElement | ImageBitmap;

let loading: Promise<JsQr> | null = null;
export function loadJsQr(): Promise<JsQr> {
  loading ??= import("jsqr").then((m) => m.default as unknown as JsQr);
  return loading;
}

// What share of the picture (from the middle) to look at, and how wide to make it for the reader.
const LOOKS: { share: number; width: number }[] = [
  { share: 1, width: 800 },
  { share: 0.7, width: 800 },
  { share: 0.5, width: 640 },
  { share: 1, width: 1280 },
];

export function readQr(jsQR: JsQr, source: QrSource, canvas: HTMLCanvasElement, sourceWidth: number, sourceHeight: number, attemptBoth = false): string | null {
  if (sourceWidth < 1 || sourceHeight < 1) return null;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  for (const look of LOOKS) {
    const sw = Math.round(sourceWidth * look.share);
    const sh = Math.round(sourceHeight * look.share);
    const scale = Math.min(1, look.width / sw);
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));
    ctx.drawImage(source, Math.round((sourceWidth - sw) / 2), Math.round((sourceHeight - sh) / 2), sw, sh, 0, 0, canvas.width, canvas.height);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const found = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: attemptBoth ? "attemptBoth" : "dontInvert" });
    if (found?.data) return found.data;
  }
  return null;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(file);
  });
}

// The page's security rules allow pictures from data: links but not from blob: links, so a chosen photo is opened as an image
// bitmap (no link needed) or, where the browser has none, through a data: link.
async function openPhoto(file: File): Promise<{ source: ImageBitmap | HTMLImageElement; width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, width: bitmap.width, height: bitmap.height };
    } catch {
      // fall through to the data: link
    }
  }
  const url = await readAsDataUrl(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("image"));
    el.src = url;
  });
  return { source: img, width: img.naturalWidth, height: img.naturalHeight };
}

/** The text of the QR code in a photo the person took or picked, or null when none can be read. */
export async function readQrFromFile(file: File): Promise<string | null> {
  try {
    const photo = await openPhoto(file);
    const jsQR = await loadJsQr();
    const text = readQr(jsQR, photo.source, document.createElement("canvas"), photo.width, photo.height, true);
    if ("close" in photo.source) photo.source.close();
    return text;
  } catch {
    return null;
  }
}
