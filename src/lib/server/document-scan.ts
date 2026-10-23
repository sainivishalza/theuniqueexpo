import net from "node:net";

// The safety check every uploaded buyer document goes through (see shrinkDocumentDataUrl in document-image.ts).
//
// Honest about what it is: this is NOT an antivirus. It (1) refuses a PDF that carries active content (scripts, launch
// actions, embedded files, forms that submit data), which a passport scan or a business licence never needs, and (2)
// when a ClamAV scanner is reachable (CLAMD_HOST, optionally CLAMD_PORT) asks it to scan the file and refuses what it
// reports as infected. Pictures are re-encoded by the image step, which drops anything hidden inside them.
//
// CLAMD_REQUIRED=1 makes an unreachable scanner refuse the upload; otherwise the upload goes on without that part and
// the reason is logged, so a scanner that is down never stops buyers from registering.

export type ScanResult = { ok: true } | { ok: false; reason: "active_content" | "infected" | "scanner_unavailable" };

// PDF names that start something or carry a program / a file / a hidden form. Names can be written with #xx escapes
// (/J#61vaScript is /JavaScript), so those are decoded before looking.
const DANGEROUS_PDF_NAMES = /\/(JavaScript|JS|Launch|EmbeddedFile|EmbeddedFiles|RichMedia|XFA|SubmitForm|ImportData|GoToE|GoToR)(?![A-Za-z0-9])/;

export function pdfHasActiveContent(buffer: Buffer): boolean {
  const text = buffer.toString("latin1").replace(/#([0-9A-Fa-f]{2})/g, (_m, hex: string) => String.fromCharCode(parseInt(hex, 16)));
  return DANGEROUS_PDF_NAMES.test(text);
}

function clamdTarget(): { host: string; port: number } | null {
  const host = process.env.CLAMD_HOST?.trim();
  if (!host) return null;
  const port = Number(process.env.CLAMD_PORT || 3310);
  return { host, port: Number.isInteger(port) && port > 0 ? port : 3310 };
}

// ClamAV's INSTREAM protocol: "zINSTREAM\0", then chunks of <4-byte big-endian length><data>, then a zero length.
function clamdScan(buffer: Buffer, target: { host: string; port: number }): Promise<"clean" | "infected" | "error"> {
  return new Promise((resolve) => {
    let answer = "";
    let settled = false;
    const finish = (value: "clean" | "infected" | "error") => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };
    const socket = net.createConnection({ host: target.host, port: target.port });
    socket.setTimeout(10_000, () => finish("error"));
    socket.on("error", () => finish("error"));
    socket.on("data", (chunk) => {
      answer += chunk.toString("utf8");
    });
    socket.on("end", () => {
      if (/FOUND/.test(answer)) finish("infected");
      else if (/\bOK\b/.test(answer)) finish("clean");
      else finish("error");
    });
    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      for (let offset = 0; offset < buffer.length; offset += 64 * 1024) {
        const part = buffer.subarray(offset, offset + 64 * 1024);
        const len = Buffer.alloc(4);
        len.writeUInt32BE(part.length);
        socket.write(len);
        socket.write(part);
      }
      socket.write(Buffer.alloc(4));
    });
  });
}

export async function scanDocument(buffer: Buffer, contentType: string): Promise<ScanResult> {
  if (contentType === "application/pdf" && pdfHasActiveContent(buffer)) return { ok: false, reason: "active_content" };
  const target = clamdTarget();
  if (!target) return { ok: true };
  const verdict = await clamdScan(buffer, target);
  if (verdict === "infected") return { ok: false, reason: "infected" };
  if (verdict === "error") {
    console.error("The virus scanner (CLAMD_HOST) did not answer; the document was checked without it.");
    if (process.env.CLAMD_REQUIRED === "1") return { ok: false, reason: "scanner_unavailable" };
  }
  return { ok: true };
}
