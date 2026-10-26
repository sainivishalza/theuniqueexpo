// Reading QR codes out of pictures in the browser: a live camera frame or a photo (of a train receipt, an e-ticket...).
//
// The reader is ZXing (the C++ library, as WebAssembly), served from this site (public/vendor/zxing_reader.wasm). It reads dense,
// tilted, shadowed codes that the small JavaScript readers (jsQR) cannot -- a photo of a 12306 receipt, for example. Where
// WebAssembly cannot start (an old browser, a blocked file), jsQR is used instead, so scanning never depends on it.
// Both are loaded only when a picture is about to be read.

type Zx = typeof import("zxing-wasm/reader");
type JsQr = (data: Uint8ClampedArray, width: number, height: number, options?: { inversionAttempts?: "dontInvert" | "onlyInvert" | "attemptBoth" | "invertFirst" }) => { data: string } | null;

export const ZXING_WASM_URL = "/vendor/zxing_reader.wasm";

export type QrSource = HTMLVideoElement | HTMLImageElement | ImageBitmap;

let zxLoading: Promise<Zx | null> | null = null;
function loadZxing(): Promise<Zx | null> {
  zxLoading ??= (async () => {
    try {
      const zx = await import("zxing-wasm/reader");
      await zx.prepareZXingModule({
        overrides: { locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? ZXING_WASM_URL : prefix + path) },
        fireImmediately: true,
      });
      return zx;
    } catch {
      zxLoading = null; // try again next time
      return null;
    }
  })();
  return zxLoading;
}

let jsQrLoading: Promise<JsQr> | null = null;
function loadJsQr(): Promise<JsQr> {
  jsQrLoading ??= import("jsqr").then((m) => m.default as unknown as JsQr);
  return jsQrLoading;
}

// What share of the picture (from the middle) to look at, and how wide to make it for the reader.
type Look = { share: number; width: number };
const CAMERA_LOOKS: Look[] = [{ share: 1, width: 1280 }, { share: 0.6, width: 900 }];
const PHOTO_LOOKS: Look[] = [{ share: 1, width: 1600 }, { share: 1, width: 900 }, { share: 0.6, width: 900 }];

export type QrReader = (source: QrSource, sourceWidth: number, sourceHeight: number) => Promise<string | null>;

/** A reader for camera frames (fast, looks a few times) or for a photo (looks harder, once). */
export async function createQrReader(kind: "camera" | "photo"): Promise<QrReader> {
  const zx = await loadZxing();
  const jsQR = zx ? null : await loadJsQr();
  const canvas = document.createElement("canvas");
  const looks = kind === "camera" ? CAMERA_LOOKS : PHOTO_LOOKS;
  return async (source, sourceWidth, sourceHeight) => {
    if (sourceWidth < 1 || sourceHeight < 1) return null;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    for (const look of looks) {
      const sw = Math.round(sourceWidth * look.share);
      const sh = Math.round(sourceHeight * look.share);
      const scale = Math.min(1, look.width / sw);
      canvas.width = Math.max(1, Math.round(sw * scale));
      canvas.height = Math.max(1, Math.round(sh * scale));
      ctx.drawImage(source, Math.round((sourceWidth - sw) / 2), Math.round((sourceHeight - sh) / 2), sw, sh, 0, 0, canvas.width, canvas.height);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      if (zx) {
        const found = await zx.readBarcodes(frame, { formats: ["QRCode"], tryHarder: true, tryRotate: true, tryInvert: true, tryDownscale: true, maxNumberOfSymbols: 1 });
        if (found[0]?.text) return found[0].text;
      } else if (jsQR) {
        const found = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: kind === "photo" ? "attemptBoth" : "dontInvert" });
        if (found?.data) return found.data;
      }
    }
    return null;
  };
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image"));
    img.src = src;
  });
}

// The page's security rules allow pictures from data: links but not from blob: links, so a chosen photo is opened as an image
// bitmap (no link needed) or, where the browser has none, through a data: link.
async function openPhoto(file: Blob): Promise<{ source: ImageBitmap | HTMLImageElement; width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, width: bitmap.width, height: bitmap.height };
    } catch {
      // fall through to the data: link
    }
  }
  const img = await loadImage(await readAsDataUrl(file));
  return { source: img, width: img.naturalWidth, height: img.naturalHeight };
}

/** The text of the QR code in a photo the person took or picked, or null when none can be read. */
export async function readQrFromFile(file: Blob): Promise<string | null> {
  try {
    const photo = await openPhoto(file);
    const text = await (await createQrReader("photo"))(photo.source, photo.width, photo.height);
    if ("close" in photo.source) photo.source.close();
    return text;
  } catch {
    return null;
  }
}

/** The same for a picture already held as a data URL (a receipt the buyer uploaded). */
export async function readQrFromDataUrl(dataUrl: string): Promise<string | null> {
  if (!dataUrl.startsWith("data:image")) return null;
  try {
    const img = await loadImage(dataUrl);
    return await (await createQrReader("photo"))(img, img.naturalWidth, img.naturalHeight);
  } catch {
    return null;
  }
}
