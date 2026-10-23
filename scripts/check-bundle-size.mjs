// Keeps the JavaScript every visitor downloads from growing unnoticed. Run after `next build`; CI runs it too.
// Budgets (gzipped bytes) live in scripts/bundle-budget.json. When a change is meant to grow the site's JavaScript, raise
// the number there in the same change, so the growth is a decision rather than an accident.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const root = process.cwd();
const budget = JSON.parse(readFileSync(join(root, "scripts", "bundle-budget.json"), "utf8"));
const gz = (file) => gzipSync(readFileSync(join(root, ".next", file))).length;
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

// What every page loads before it can start: the framework files listed in the build manifest.
const manifest = JSON.parse(readFileSync(join(root, ".next", "build-manifest.json"), "utf8"));
const shared = [...new Set([...(manifest.polyfillFiles ?? []), ...(manifest.rootMainFiles ?? [])])].filter((f) => f.endsWith(".js"));
const sharedSize = shared.reduce((n, f) => n + gz(f), 0);

// Every script the site can send: the total and the single biggest one (a heavy library pulled into a page shows up here).
const walk = (dir) => readdirSync(join(root, ".next", dir)).flatMap((name) => {
  const rel = join(dir, name);
  return statSync(join(root, ".next", rel)).isDirectory() ? walk(rel) : rel.endsWith(".js") ? [rel] : [];
});
const all = walk(join("static", "chunks")).map((f) => ({ file: f, size: gz(f) }));
const total = all.reduce((n, c) => n + c.size, 0);
const biggest = all.reduce((a, b) => (b.size > a.size ? b : a), { file: "", size: 0 });

const checks = [
  ["Shared by every page (framework)", sharedSize, budget.sharedGzip],
  ["All site JavaScript together", total, budget.totalGzip],
  [`Biggest single file (${biggest.file})`, biggest.size, budget.biggestFileGzip],
];
let failed = false;
for (const [label, size, limit] of checks) {
  const over = size > limit;
  failed ||= over;
  console.log(`${over ? "FAIL" : "ok  "} ${label}: ${kb(size)} (limit ${kb(limit)})`);
}
if (failed) {
  console.error("\nThe site's JavaScript grew past its budget. Find what was added (a big library imported in a client component is the usual cause)." +
    "\nIf the growth is intended, raise the limit in scripts/bundle-budget.json in the same change.");
  process.exit(1);
}
