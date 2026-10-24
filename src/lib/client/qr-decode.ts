// Reads the QR code out of a photo the buyer uploaded (a data URL), in the browser, with the phone's own QR reader
// (BarcodeDetector, available on most Android browsers). Where the browser has none -- or the photo is too glary or blurred
// to read -- it returns null and the screen tells the buyer to scan the paper receipt with the camera or the 12306 app, so
// nothing depends on this working.

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
  if (!Native) return null;
  try {
    const img = await loadImage(dataUrl);
    const found = await new Native({ formats: ["qr_code"] }).detect(img);
    return found[0]?.rawValue ? found[0].rawValue : null;
  } catch {
    return null;
  }
}
