// The text reader used when sorting pictures (tesseract.js) runs from files served by this site (public/vendor/ocr): its worker and
// core must be exactly those of the installed packages, and the language data must be the one the server-side reader uses.
// Run by CI and after upgrading tesseract.js.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const sha = (data) => createHash("sha256").update(data).digest("hex");
const pairs = [
  ["public/vendor/ocr/worker.min.js", "node_modules/tesseract.js/dist/worker.min.js"],
  ["public/vendor/ocr/tesseract-core-simd-lstm.wasm.js", "node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js"],
];
let bad = false;
for (const [served, installed] of pairs) {
  if (sha(readFileSync(served)) !== sha(readFileSync(installed))) {
    console.error(`${served} is not the file of the installed package. Copy it again:\n  cp ${installed} ${served}`);
    bad = true;
  }
}
const language = sha(gunzipSync(readFileSync("public/vendor/ocr/eng.traineddata.gz")));
if (language !== sha(readFileSync("src/lib/server/photo-organizer/tessdata/eng.traineddata"))) {
  console.error("public/vendor/ocr/eng.traineddata.gz does not hold the same data as src/lib/server/photo-organizer/tessdata/eng.traineddata.\n  gzip -9 -c src/lib/server/photo-organizer/tessdata/eng.traineddata > public/vendor/ocr/eng.traineddata.gz");
  bad = true;
}
if (bad) process.exit(1);
console.log("The text reader's files match the installed tesseract.js.");
