import { readQrFromDataUrl } from "@/lib/client/qr-reader";

// Reads the QR code out of a photo the buyer uploaded (a data URL), in the browser: first with the phone's own QR reader
// (BarcodeDetector, on most Android browsers), then with the reader that comes with the site (ZXing, see qr-reader.ts), which
// copes with a whole receipt photographed at an angle, in shadow, with a dense code. If neither can read it, it returns null
// and the screen tells the buyer to scan the paper receipt with the camera or the 12306 app, so nothing depends on this.

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image"));
    img.src = src;
  });
}

interface Detector {
  detect(source: CanvasImageSource): Promise<{ rawValue?: string }[]>;
}

export async function decodeQrFromDataUrl(dataUrl: string): Promise<string | null> {
  if (!dataUrl.startsWith("data:image")) return null;
  const Native = (window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => Detector }).BarcodeDetector;
  if (Native) {
    try {
      const img = await loadImage(dataUrl);
      const found = await new Native({ formats: ["qr_code"] }).detect(img);
      if (found[0]?.rawValue) return found[0].rawValue;
    } catch {
      // not read by the phone's reader: try the one that comes with the site
    }
  }
  return readQrFromDataUrl(dataUrl);
}
