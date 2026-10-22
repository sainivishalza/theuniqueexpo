// Buyer documents are stored in the database as data: URLs. A phone photo is often 3-6 MB, and
// the browser's own shrinking does not run (the site's Content-Security-Policy blocks the blob:
// pictures it needs), so with thousands of buyers the database, its backups and the Excel / ZIP
// downloads would grow very large. Every stored document picture is therefore shrunk here, on the
// server: longest side at most 1600 px, JPEG, camera data (GPS position, device) removed, and the
// photo turned the right way up. A PDF is kept as it is. If shrinking is not possible the file is
// stored as it came, so an upload never fails only because of this step.

const MAX_SIDE = 1600;
const QUALITY = 80;
const THUMB_SIDE = 240;

export class DocumentFileError extends Error {
  readonly code = "invalid_file";
}

export interface ParsedDataUrl {
  contentType: string;
  buffer: Buffer;
}

export function parseDataUrl(dataUrl: string): ParsedDataUrl | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { contentType: match[1].toLowerCase(), buffer: Buffer.from(match[2], "base64") };
}

export function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length > 5 && buffer.subarray(0, 5).toString("latin1") === "%PDF-";
}

type SharpFn = typeof import("sharp").default;
let sharpPromise: Promise<SharpFn | null> | null = null;
function loadSharp(): Promise<SharpFn | null> {
  sharpPromise ??= import("sharp")
    .then((m) => (m.default ?? m) as SharpFn)
    .catch((err) => {
      console.error("sharp is not available; document pictures are stored as uploaded:", err);
      return null;
    });
  return sharpPromise;
}

// Returns the data URL to store. Throws DocumentFileError when the file is not what it claims to be
// (a "PDF" that is not a PDF, or an "image" that cannot be read as a picture).
export async function shrinkDocumentDataUrl(dataUrl: string): Promise<string> {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) throw new DocumentFileError("Malformed file");

  if (parsed.contentType === "application/pdf") {
    if (!isPdfBuffer(parsed.buffer)) throw new DocumentFileError("Not a PDF file");
    return dataUrl;
  }

  const sharp = await loadSharp();
  if (!sharp) return dataUrl;

  let output: Buffer;
  try {
    output = await sharp(parsed.buffer, { failOn: "error", limitInputPixels: 80_000_000 })
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      // JPEG has no transparency: paint white first so a transparent PNG does not turn black.
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toBuffer();
  } catch {
    throw new DocumentFileError("Not a readable picture");
  }
  // A small picture (a screenshot, a 1-pixel test file) can come out larger as a JPEG: keep it.
  if (output.length >= parsed.buffer.length) return dataUrl;
  return `data:image/jpeg;base64,${output.toString("base64")}`;
}

// A small preview for the admin lists (a 64 x 48 px thumbnail should not download the full picture).
export async function makeThumbnail(buffer: Buffer): Promise<Buffer | null> {
  const sharp = await loadSharp();
  if (!sharp) return null;
  try {
    return await sharp(buffer, { failOn: "none", limitInputPixels: 80_000_000 })
      .rotate()
      .resize({ width: THUMB_SIDE, height: THUMB_SIDE, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 70 })
      .toBuffer();
  } catch {
    return null;
  }
}
