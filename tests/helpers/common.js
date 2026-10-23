// Shared by every test file: the address of the running site, a way to run SQL against the test
// database, a tiny pass/fail reporter and helpers that make test accounts.
//
// Settings come from the environment, so the same tests run on a laptop and in CI:
//   TEST_BASE_URL   the site under test               (default http://localhost:3100)
//   TEST_DB_NAME / TEST_DB_USER / TEST_DB_PASSWORD / TEST_DB_HOST    the database the site uses
//   SHOTS_DIR       where screenshots are written      (default: the system temp folder)
const { execFileSync } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const bcrypt = require('bcryptjs');

exports.BASE = process.env.TEST_BASE_URL || 'http://localhost:3100';
exports.SHOTS = process.env.SHOTS_DIR || path.join(os.tmpdir(), 'unique-expo-shots');
fs.mkdirSync(exports.SHOTS, { recursive: true });

const DB = { name: process.env.TEST_DB_NAME || 'theuniqueexpo_test', user: process.env.TEST_DB_USER || 'root', password: process.env.TEST_DB_PASSWORD || '', host: process.env.TEST_DB_HOST || '' };
exports.DB = DB;
exports.sql = (q) => {
  const args = ['--default-character-set=utf8mb4', '-u' + DB.user, '-N'];
  if (DB.host) args.push('-h' + DB.host, '--protocol=TCP');
  if (DB.password) args.push('-p' + DB.password);
  args.push(DB.name);
  return execFileSync('mysql', args, { input: q, encoding: 'utf8' }).trim();
};

let n = 0, f = 0;
exports.ok = (c, l, x) => { n++; if (c) console.log('  ok  ', l); else { f++; console.log('  FAIL', l, x === undefined ? '' : JSON.stringify(x)); } };
exports.done = () => { console.log(`\n${n - f}/${n} ok`); process.exit(f ? 1 : 0); };
exports.login = async (e) => /token=([^;]+)/.exec((await fetch(exports.BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.7.' + Math.floor(Math.random() * 250) + '.' + (Math.floor(Math.random() * 250) + 1) }, body: JSON.stringify({ email: e, password: 'pass1234' }) })).headers.getSetCookie().join(';'))[1];
// A 1x1 PNG, the smallest valid picture.
exports.PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
// An admin and a buyer account (password "pass1234"), signed in; `tag` names them.
exports.mkUsers = async (tag) => {
  const st = Date.now(), h = bcrypt.hashSync('pass1234', 10);
  const m = { a: `${tag}-a-${st}@test.invalid`, b: `${tag}-b-${st}@test.invalid` };
  exports.sql(`INSERT INTO users (name,email,password_hash,role,country) VALUES ('${tag} Admin','${m.a}','${h}','admin',''),('${tag} Buyer','${m.b}','${h}','buyer','')`);
  const id = Number(exports.sql(`SELECT id FROM users WHERE email='${m.b}'`));
  return { st, m, bId: id, aT: await exports.login(m.a), bT: await exports.login(m.b) };
};
// A direct database connection (for values too big to put in SQL text, such as a multi-megabyte photo).
exports.connect = () => require('mysql2/promise').createConnection({
  user: DB.user, password: DB.password, database: DB.name,
  ...(process.env.TEST_DB_SOCKET ? { socketPath: process.env.TEST_DB_SOCKET } : { host: DB.host || '127.0.0.1' }),
});

// Only these admin accounts are "active" until the returned function is called. The daily jobs that e-mail "every admin" are
// limited to the first 20 admins, and a long test run has made far more than that, so a test that checks such an e-mail first
// sets the others aside.
exports.onlyAdmins = (emails) => {
  const list = emails.map((e) => `'${e}'`).join(',');
  const ids = exports.sql(`SELECT id FROM users WHERE role='admin' AND status<>'suspended' AND email NOT IN (${list})`).split('\n').filter(Boolean);
  if (ids.length > 0) exports.sql(`UPDATE users SET status='suspended' WHERE id IN (${ids.join(',')})`);
  return () => { if (ids.length > 0) exports.sql(`UPDATE users SET status='active' WHERE id IN (${ids.join(',')})`); };
};
