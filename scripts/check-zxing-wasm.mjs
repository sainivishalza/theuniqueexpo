// The QR reader's WebAssembly file is served from this site (public/vendor/zxing_reader.wasm) and must be exactly the one that
// belongs to the installed zxing-wasm package: a mismatch makes the reader fail to start. Run by CI and after upgrading the package.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const sha = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const served = sha("public/vendor/zxing_reader.wasm");
const installed = sha("node_modules/zxing-wasm/dist/reader/zxing_reader.wasm");
if (served !== installed) {
  console.error("public/vendor/zxing_reader.wasm is not the file of the installed zxing-wasm. Copy it again:\n  cp node_modules/zxing-wasm/dist/reader/zxing_reader.wasm public/vendor/zxing_reader.wasm");
  process.exit(1);
}
console.log("The QR reader's WebAssembly file matches the installed zxing-wasm.");
