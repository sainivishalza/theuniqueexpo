// Runs the end-to-end tests one after another against a running site and prints a summary.
//   node tests/run.js                 every test file
//   node tests/run.js password email  only files whose name contains one of the words
//   node tests/run.js --shard 2/4     the second of four parts: CI runs the four parts side by side, each on its own machine
// The site, its database and the settings the tests read are described in tests/helpers/common.js.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
const shardArg = args.find((a) => /^--shard=?/.test(a));
const shardText = shardArg ? (shardArg.includes('=') ? shardArg.split('=')[1] : args[args.indexOf(shardArg) + 1]) : '';
const words = args.filter((a) => !a.startsWith('--') && a !== shardText);
let files = fs.readdirSync(__dirname).filter((f) => f.endsWith('.test.js') && (words.length === 0 || words.some((w) => f.includes(w)))).sort();

// Roughly how long the slow files take (seconds); every other file counts as 10. The files are handed out biggest first to
// whichever part has the least so far, so the parts finish at about the same time. The same list always gives the same parts.
const SLOW = { 'phone-sweep': 180, 'wallet-visible': 100, 'viewer-and-roles': 60, 'help-widget': 45, 'image-optimizer': 40, email: 36, 'buyer-form-ui': 33, 'registration-extras': 40, 'two-step': 31, referral: 30, 'site-stats': 30, 'admin-staff-merge-reports': 24, 'registration-window': 21, documents: 21, 'admin-security': 20, 'ticket-refund': 22, support: 19, 'weekly-digest': 18, 'ticket-scan': 35, 'wechat-qr': 15 };
const weight = (f) => SLOW[f.replace('.test.js', '')] ?? 10;
if (shardText) {
  const m = /^(\d+)\/(\d+)$/.exec(shardText);
  if (!m || Number(m[1]) < 1 || Number(m[1]) > Number(m[2])) {
    console.error('Use --shard N/M, for example --shard 1/4');
    process.exit(2);
  }
  const [index, count] = [Number(m[1]), Number(m[2])];
  const load = Array(count).fill(0);
  const mine = [];
  for (const f of [...files].sort((a, b) => weight(b) - weight(a) || a.localeCompare(b))) {
    const target = load.indexOf(Math.min(...load));
    load[target] += weight(f);
    if (target === index - 1) mine.push(f);
  }
  files = mine.sort();
  console.log(`Part ${index} of ${count}: ${files.length} files`);
}
if (args.includes('--list')) {
  console.log(files.join('\n'));
  process.exit(0);
}
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
