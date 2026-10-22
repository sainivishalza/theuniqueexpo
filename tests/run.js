// Runs the end-to-end tests one after another against a running site and prints a summary.
//   node tests/run.js                 every test file
//   node tests/run.js password email  only files whose name contains one of the words
// The site, its database and the settings the tests read are described in tests/helpers/common.js.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const words = process.argv.slice(2);
const files = fs.readdirSync(__dirname).filter((f) => f.endsWith('.test.js') && (words.length === 0 || words.some((w) => f.includes(w)))).sort();
const results = [];
for (const file of files) {
  console.log(`\n===== ${file}`);
  const started = Date.now();
  const r = spawnSync(process.execPath, [path.join(__dirname, file)], { stdio: 'inherit', timeout: 15 * 60 * 1000 });
  results.push({ file, ok: r.status === 0, seconds: Math.round((Date.now() - started) / 1000) });
}
console.log('\n===== summary');
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.file}  (${r.seconds}s)`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
