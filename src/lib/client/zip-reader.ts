// Reads a .zip file in the browser without loading it: only the list of files at the end is read first, then one file at a time
// is cut out and unpacked when it is needed. A ZIP of several hundred megabytes therefore costs almost no memory, and nothing is
// uploaded. No library and no worker: it uses the browser's own DecompressionStream.

export interface ZipEntry {
  name: string;
  size: number;
  compressedSize: number;
  method: number;
  localOffset: number;
}

const EOCD = 0x06054b50;
const EOCD64 = 0x06064b50;
const EOCD64_LOCATOR = 0x07064b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;

async function bytes(blob: Blob, start: number, end: number): Promise<DataView> {
  const buffer = await blob.slice(start, end).arrayBuffer();
  return new DataView(buffer);
}

// File names are UTF-8 when the archive says so; older tools write the local code page, which for these files is Chinese (GBK).
function decodeName(raw: Uint8Array, utf8Flag: boolean): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(raw);
  } catch {
    if (utf8Flag) return new TextDecoder("utf-8").decode(raw);
  }
  try {
    return new TextDecoder("gbk").decode(raw);
  } catch {
    return new TextDecoder("utf-8").decode(raw);
  }
}

export class ZipError extends Error {}

export async function listZipEntries(file: Blob): Promise<ZipEntry[]> {
  const tailSize = Math.min(file.size, 22 + 0xffff + 20);
  const tailStart = file.size - tailSize;
  const tail = await bytes(file, tailStart, file.size);
  let eocd = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) {
    if (tail.getUint32(i, true) === EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new ZipError("Not a ZIP file");

  let count = tail.getUint16(eocd + 10, true);
  let dirSize = tail.getUint32(eocd + 12, true);
  let dirOffset = tail.getUint32(eocd + 16, true);

  // Archives over 4 GB (or with more than 65,535 files) keep these three numbers in a second, larger record.
  if ((count === 0xffff || dirSize === 0xffffffff || dirOffset === 0xffffffff) && eocd >= 20 && tail.getUint32(eocd - 20, true) === EOCD64_LOCATOR) {
    const recordOffset = Number(tail.getBigUint64(eocd - 20 + 8, true));
    const record = await bytes(file, recordOffset, recordOffset + 56);
    if (record.getUint32(0, true) !== EOCD64) throw new ZipError("Damaged ZIP file");
    count = Number(record.getBigUint64(32, true));
    dirSize = Number(record.getBigUint64(40, true));
    dirOffset = Number(record.getBigUint64(48, true));
  }

  const dir = await bytes(file, dirOffset, dirOffset + dirSize);
  const entries: ZipEntry[] = [];
  let p = 0;
  while (p + 46 <= dir.byteLength && dir.getUint32(p, true) === CENTRAL) {
    const flags = dir.getUint16(p + 8, true);
    const method = dir.getUint16(p + 10, true);
    let compressedSize = dir.getUint32(p + 20, true);
    let size = dir.getUint32(p + 24, true);
    const nameLen = dir.getUint16(p + 28, true);
    const extraLen = dir.getUint16(p + 30, true);
    const commentLen = dir.getUint16(p + 32, true);
    let localOffset = dir.getUint32(p + 42, true);
    const name = decodeName(new Uint8Array(dir.buffer, p + 46, nameLen), (flags & 0x800) !== 0);

    if (size === 0xffffffff || compressedSize === 0xffffffff || localOffset === 0xffffffff) {
      let e = p + 46 + nameLen;
      const extraEnd = e + extraLen;
      while (e + 4 <= extraEnd) {
        const id = dir.getUint16(e, true);
        const len = dir.getUint16(e + 2, true);
        if (id === 0x0001) {
          let q = e + 4;
          if (size === 0xffffffff) { size = Number(dir.getBigUint64(q, true)); q += 8; }
          if (compressedSize === 0xffffffff) { compressedSize = Number(dir.getBigUint64(q, true)); q += 8; }
          if (localOffset === 0xffffffff) { localOffset = Number(dir.getBigUint64(q, true)); }
        }
        e += 4 + len;
      }
    }
    entries.push({ name, size, compressedSize, method, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  if (entries.length === 0 && count > 0) throw new ZipError("Damaged ZIP file");
  return entries;
}

// The unpacked bytes of one file in the ZIP.
export async function readZipEntry(file: Blob, entry: ZipEntry, type = ""): Promise<Blob> {
  const header = await bytes(file, entry.localOffset, entry.localOffset + 30);
  if (header.getUint32(0, true) !== LOCAL) throw new ZipError("Damaged ZIP file");
  const start = entry.localOffset + 30 + header.getUint16(26, true) + header.getUint16(28, true);
  const packed = file.slice(start, start + entry.compressedSize);
  if (entry.method === 0) return packed.slice(0, entry.size, type);
  if (entry.method !== 8) throw new ZipError(`Unsupported compression (${entry.method})`);
  const stream = packed.stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const unpacked = await new Response(stream).blob();
  return type ? unpacked.slice(0, unpacked.size, type) : unpacked;
}
