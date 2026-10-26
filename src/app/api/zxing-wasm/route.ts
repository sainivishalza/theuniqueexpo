import { readFile } from "node:fs/promises";
import path from "node:path";

// The QR reader's WebAssembly file. The same file also sits in public/vendor, but the host answers requests for files there
// itself, labelled as plain text, and browsers start WebAssembly fastest when it is labelled application/wasm: so the reader
// loads it from here, where the label can be set. scripts/check-zxing-wasm.mjs keeps the file equal to the installed package's.
let cached: Buffer | null = null;

export async function GET() {
  try {
    cached ??= await readFile(path.join(process.cwd(), "public", "vendor", "zxing_reader.wasm"));
  } catch {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return new Response(new Uint8Array(cached), {
    headers: { "Content-Type": "application/wasm", "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff" },
  });
}
