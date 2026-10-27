import { createQrReader, type QrReader } from "./qr-reader";
import { readText } from "./ocr-reader";

// What the browser learns about one picture from the ZIP: its size, a small preview for the review screen, whether it carries
// a QR code and what is written on it. The full picture is only ever held while it is being looked at.

export interface PictureLook {
  width: number;
  height: number;
  // A small JPEG data address (the page's security rules allow data: pictures, not blob: ones).
  thumb: string;
  hasQr: boolean;
  text: string;
}

const READ_WIDTH = 1600;
const THUMB_WIDTH = 200;

export class PictureError extends Error {}

async function decode(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    throw new PictureError("This picture cannot be opened here (for example an iPhone HEIC file)");
  }
}

function draw(bitmap: ImageBitmap, maxWidth: number, maxSide = maxWidth): HTMLCanvasElement {
  const scale = Math.min(1, maxWidth / bitmap.width, maxSide / bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PictureError("The browser cannot draw pictures");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

let qr: Promise<QrReader> | null = null;

/** Opens the picture and reads it. `withText: false` skips the slow part (the writing) and only makes the preview. */
export async function lookAtPicture(blob: Blob, withText: boolean): Promise<PictureLook> {
  const bitmap = await decode(blob);
  try {
    const thumb = draw(bitmap, THUMB_WIDTH, THUMB_WIDTH * 1.5).toDataURL("image/jpeg", 0.7);
    if (!withText) return { width: bitmap.width, height: bitmap.height, thumb, hasQr: false, text: "" };
    qr ??= createQrReader("camera");
    const reader = await qr;
    const hasQr = !!(await reader(bitmap, bitmap.width, bitmap.height).catch(() => null));
    const text = await readText(draw(bitmap, READ_WIDTH, READ_WIDTH * 1.6));
    return { width: bitmap.width, height: bitmap.height, thumb, hasQr, text };
  } finally {
    bitmap.close();
  }
}

const UPLOAD_SIDE = 1600;

/** The picture as a JPEG data address no larger than 1600 px, ready to send to the buyer's profile. */
export async function pictureForUpload(blob: Blob): Promise<string> {
  const bitmap = await decode(blob);
  try {
    return draw(bitmap, UPLOAD_SIDE, UPLOAD_SIDE).toDataURL("image/jpeg", 0.85);
  } finally {
    bitmap.close();
  }
}
