// Documents encrypted at rest: the cipher, what is really stored, that nothing looks different to people, and encrypting older documents.
const { spawnSync } = require('node:child_process');
const sharp = require('sharp');
const { BASE, sql, ok, done, mkUsers, connect } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.64.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const H = (t) => ({ 'Content-Type': 'application/json', cookie: 'token=' + t, 'x-forwarded-for': ipn() });
const call = (method, path, body, t) => fetch(BASE + path, { method, headers: H(t), body: body ? JSON.stringify(body) : undefined }).then(async (r) => ({ status: r.status, ...(await r.json().catch(() => ({}))) }));
const KEY_A = 'a'.repeat(64), KEY_B = 'b'.repeat(64);

// Runs a snippet against src/lib/server/document-crypto.ts with the given keys in the environment.
const crypto = (code, env = {}) => {
  const r = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '-e', `import('./src/lib/server/document-crypto.ts').then((m) => { const out = (${code}); console.log(JSON.stringify(out)); })`], { encoding: 'utf8', env: { ...process.env, DOCUMENT_ENCRYPTION_KEY: '', DOCUMENT_ENCRYPTION_OLD_KEYS: '', ...env } });
  if (r.status !== 0) return 'ERR ' + r.stderr.slice(0, 300);
  return r.stdout.trim();
};

(async () => {
  const jpg = await sharp({ create: { width: 900, height: 600, channels: 3, background: '#7aa', noise: { type: 'gaussian', mean: 128, sigma: 50 } } }).jpeg({ quality: 80 }).toBuffer();
  const dataUrl = `data:image/jpeg;base64,${jpg.toString('base64')}`;
  const pdfUrl = 'data:application/pdf;base64,' + Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF').toString('base64');
  const cryptoSample = (extra = '') => `const t = m.protectDataUrl(${JSON.stringify(dataUrl.slice(0, 400) + '=')}); ${extra}`;

  console.log('\n== the cipher');
  ok(crypto("m.protectDataUrl('data:image/png;base64,AAAA')") === '"data:image/png;base64,AAAA"', 'without a key nothing is changed');
  ok(crypto("m.activeKeyId()") === 'null', 'and no key id is reported');
  const sample = 'data:image/png;base64,' + Buffer.from('a passport page, pretend').toString('base64');
  ok(crypto(`(() => { const t = m.protectDataUrl('${sample}'); return [t.startsWith('enc:v1:'), t.includes('passport'), m.openDocument(t) === '${sample}', m.isEncryptedDocument(t)]; })()`, { DOCUMENT_ENCRYPTION_KEY: KEY_A }) === '[true,false,true,true]', 'with a key: stored as enc:v1:, the content is not readable in it, and opening gives back exactly the original');
  ok(crypto(`(() => { const a = m.protectDataUrl('${sample}'), b = m.protectDataUrl('${sample}'); return a !== b; })()`, { DOCUMENT_ENCRYPTION_KEY: KEY_A }) === 'true', 'each encryption is different (random IV)');
  ok(crypto(`(() => { const t = m.protectDataUrl('${sample}'); return m.protectDataUrl(t) === t; })()`, { DOCUMENT_ENCRYPTION_KEY: KEY_A }) === 'true', 'an already protected value is not encrypted twice');
  ok(crypto(`(() => { const t = m.protectDataUrl('${pdfUrl}'); return m.openDocument(t) === '${pdfUrl}' && t.includes('application%2Fpdf'); })()`, { DOCUMENT_ENCRYPTION_KEY: KEY_A }) === 'true', 'PDFs keep their type');
  ok(crypto(`(() => { const t = m.protectDataUrl('${sample}'); const bad = t.slice(0, -6) + (t.slice(-6) === 'AAAAAA' ? 'BBBBBB' : 'AAAAAA'); return m.openDocument(bad) === bad; })()`, { DOCUMENT_ENCRYPTION_KEY: KEY_A }) === 'true', 'a tampered document is not opened (it comes back unchanged, never as something else)');
  const encrypted = JSON.parse(crypto(`m.protectDataUrl('${sample}')`, { DOCUMENT_ENCRYPTION_KEY: KEY_A }));
  ok(crypto(`m.openDocument(${JSON.stringify(encrypted)}) === ${JSON.stringify(encrypted)}`, { DOCUMENT_ENCRYPTION_KEY: KEY_B }) === 'true', 'the wrong key cannot open it');
  ok(crypto(`m.openDocument(${JSON.stringify(encrypted)}) === '${sample}'`, { DOCUMENT_ENCRYPTION_KEY: KEY_B, DOCUMENT_ENCRYPTION_OLD_KEYS: KEY_A }) === 'true', 'after a key change, the old key in DOCUMENT_ENCRYPTION_OLD_KEYS still opens it');
  ok(crypto(`m.activeKeyId() !== (() => { return null; })()`, { DOCUMENT_ENCRYPTION_KEY: 'a-long-passphrase-that-is-not-hex-at-all' }) === 'true', 'a long passphrase works as a key too');
  ok(crypto(`m.activeKeyId()`, { DOCUMENT_ENCRYPTION_KEY: 'too short' }) === 'null', 'a short secret is ignored (too weak to be a key)');
  const json = `{"photo":"${sample}","n":1,"list":["${sample}"]}`;
  ok(crypto(`(() => { const t = m.protectInlineDataUrls(${JSON.stringify(json)}); return [!t.includes('data:image'), t.includes('enc:v1:'), JSON.parse(t).n === 1, m.openAll(t) === ${JSON.stringify(json)}]; })()`, { DOCUMENT_ENCRYPTION_KEY: KEY_A }) === '[true,true,true,true]', 'data URLs inside JSON answers are protected too, and the JSON stays valid and opens back exactly');
  ok(crypto(`(() => { const o = { a: [m.protectDataUrl('${sample}')], b: { c: m.protectDataUrl('${sample}') }, d: 5 }; m.openAll(o); return [o.a[0] === '${sample}', o.b.c === '${sample}', o.d]; })()`, { DOCUMENT_ENCRYPTION_KEY: KEY_A }) === `[true,true,5]`, 'opening works through nested objects and lists');
  ok(crypto("m.writesDocumentTable(\"UPDATE buyer_profiles SET doc_visa_page = ? WHERE user_id = ?\")") === 'true' && crypto("m.writesDocumentTable('UPDATE exhibitions SET image = ?')") === 'false' && crypto("m.writesDocumentTable('SELECT * FROM buyer_profiles')") === 'false', 'only writes to document tables are protected (not posters, not reads)');

  console.log('\n== on the running site');
  const u = await mkUsers('dp');
  const status0 = await call('GET', '/api/admin/document-protection', null, u.aT);
  ok(status0.configured === true && /^[0-9a-f]{8}$/.test(status0.keyId), 'the site has a key (CI and the local runner set one)', status0);
  ok((await call('GET', '/api/admin/document-protection', null, u.bT)).status === 401 && (await call('POST', '/api/admin/document-protection', {}, u.bT)).status === 401, 'a buyer cannot see or run it');
  const raw = await connect();
  const stored = async (sqlText, params = []) => (await raw.query(sqlText, params))[0];

  let r = await call('PUT', '/api/buyer-profile/documents/passportFront', { value: dataUrl }, u.bT);
  ok(r.status === 200, 'a buyer uploads a passport photo', r);
  const [[p1]] = await [await stored('SELECT doc_passport_front AS v FROM buyer_profiles WHERE user_id=?', [u.bId])];
  ok(typeof p1.v === 'string' && p1.v.startsWith('enc:v1:'), 'what the database holds is encrypted, not an image', typeof p1.v === 'string' ? p1.v.slice(0, 20) : p1.v);
  ok(!p1.v.includes('/9j/'), 'no trace of the picture (a JPEG starts /9j/ in base64) is visible in it');
  const got = await fetch(BASE + '/api/buyer-profile/documents/passportFront', { headers: { cookie: 'token=' + u.bT } });
  const gotBuf = Buffer.from(await got.arrayBuffer());
  const meta = await sharp(gotBuf).metadata();
  ok(got.status === 200 && /image\/jpeg/.test(got.headers.get('content-type')) && meta.width > 0, 'the buyer still opens it as a normal picture', { status: got.status, type: got.headers.get('content-type') });
  const adminGot = await fetch(BASE + `/api/admin/buyer-profiles/${u.bId}/documents/passportFront`, { headers: { cookie: 'token=' + u.aT } });
  ok(adminGot.status === 200 && Buffer.compare(Buffer.from(await adminGot.arrayBuffer()), gotBuf) === 0, 'and so does an admin, byte for byte the same');
  const thumb = await fetch(BASE + `/api/admin/buyer-profiles/${u.bId}/documents/passportFront?thumb=1`, { headers: { cookie: 'token=' + u.aT } });
  ok(thumb.status === 200 && Math.max((await sharp(Buffer.from(await thumb.arrayBuffer())).metadata()).width, 0) <= 240, 'the small preview in the admin list works');
  r = await call('PUT', '/api/buyer-profile/documents/businessLicense', { value: pdfUrl }, u.bT);
  const pdf = await fetch(BASE + '/api/buyer-profile/documents/businessLicense', { headers: { cookie: 'token=' + u.bT } });
  ok(r.status === 200 && pdf.status === 200 && /application\/pdf/.test(pdf.headers.get('content-type')) && (await pdf.text()).startsWith('%PDF-'), 'a PDF is stored encrypted and opens as a PDF');
  const prof = await call('GET', '/api/buyer-profile', null, u.bT);
  ok(JSON.stringify(prof).includes('enc:v1:') === false, 'the profile screen never receives the encrypted form');

  // an older document, stored before there was a key (put in directly)
  await raw.query('UPDATE buyer_profiles SET doc_visa_page=? WHERE user_id=?', [dataUrl, u.bId]);
  const plainRead = await fetch(BASE + '/api/buyer-profile/documents/visaPage', { headers: { cookie: 'token=' + u.bT } });
  ok(plainRead.status === 200 && Buffer.compare(Buffer.from(await plainRead.arrayBuffer()), jpg) === 0, 'an older, unencrypted document still opens');
  const status1 = await call('GET', '/api/admin/document-protection', null, u.aT);
  ok(status1.unprotectedTotal >= 1 && status1.protectedTotal >= 2, 'the screen counts both kinds', [status1.protectedTotal, status1.unprotectedTotal]);
  // a registration with a file answer inside its JSON, and a top-up proof (a different table)
  sql(`INSERT INTO exhibitions (slug,title,start_date,end_date,registration_enabled) VALUES ('dp-${u.st}','Protect Expo',DATE_ADD(UTC_DATE(), INTERVAL 30 DAY),DATE_ADD(UTC_DATE(), INTERVAL 32 DAY),1)`);
  const expoId = Number(sql(`SELECT id FROM exhibitions WHERE slug='dp-${u.st}'`));
  await raw.query(`INSERT INTO expo_registrations (exhibition_id,user_id,full_name,doc_ticket,custom_answers,status) VALUES (?,?,?,?,?,'approved')`, [expoId, u.bId, 'Protect Person', dataUrl, JSON.stringify({ file: dataUrl, note: 'hello' })]);
  await raw.query(`INSERT INTO wallets (user_id,wallet_code,balance,created_at) VALUES (?,CONCAT('DP',LPAD(?,22,'0')),0,NOW()) ON DUPLICATE KEY UPDATE balance=balance`, [u.bId, u.bId]);
  await raw.query(`INSERT INTO wallet_topups (user_id,points,proof,status,created_at) VALUES (?,10,?, 'pending', NOW())`, [u.bId, dataUrl]);
  const status2 = await call('GET', '/api/admin/document-protection', null, u.aT);
  ok(status2.unprotectedTotal >= status1.unprotectedTotal + 3, 'registration documents, answers with files and payment proofs are counted too', [status1.unprotectedTotal, status2.unprotectedTotal]);

  console.log('\n== encrypting what was stored before');
  let skip = [], total = 0, failures = 0;
  for (let i = 0; i < 400; i++) {
    const b = await call('POST', '/api/admin/document-protection', { skip, start: i === 0 }, u.aT);
    if (b.status !== 200) { ok(false, 'a batch failed', b); break; }
    total += b.protectedNow; failures += b.failed; skip = [...skip, ...b.failedKeys];
    if (b.remaining === 0 || (b.protectedNow === 0 && b.failed === 0)) break;
  }
  ok(total >= 4 && failures === 0, `older documents were encrypted (${total}), none failed`, { total, failures });
  const status3 = await call('GET', '/api/admin/document-protection', null, u.aT);
  ok(status3.unprotectedTotal === 0, 'nothing is left unprotected', status3.sources.filter((s) => s.unprotected > 0));
  const [[v1]] = [await stored('SELECT doc_visa_page AS v FROM buyer_profiles WHERE user_id=?', [u.bId])];
  ok(v1.v.startsWith('enc:v1:'), 'the older profile document is now encrypted');
  const [[tp]] = [await stored('SELECT proof AS v FROM wallet_topups WHERE user_id=?', [u.bId])];
  ok(tp.v.startsWith('enc:v1:'), 'and so is the payment proof');
  const [[reg]] = [await stored('SELECT custom_answers AS a, doc_ticket AS t FROM expo_registrations WHERE user_id=? AND exhibition_id=?', [u.bId, expoId])];
  const regText = typeof reg.a === 'string' ? reg.a : JSON.stringify(reg.a);
  ok(regText.includes('enc:v1:') && !regText.includes('data:image') && regText.includes('hello') && reg.t.startsWith('enc:v1:'), 'files inside registration answers are encrypted and the rest of the answers stay readable');
  const reread = await fetch(BASE + '/api/buyer-profile/documents/visaPage', { headers: { cookie: 'token=' + u.bT } });
  ok(reread.status === 200 && Buffer.compare(Buffer.from(await reread.arrayBuffer()), jpg) === 0, 'after encrypting, it opens exactly as before');
  const pdfAfter = await fetch(BASE + '/api/buyer-profile/documents/businessLicense', { headers: { cookie: 'token=' + u.bT } });
  ok((await pdfAfter.text()).startsWith('%PDF-'), 'and the PDF too');
  const again = await call('POST', '/api/admin/document-protection', { skip: [], start: true }, u.aT);
  ok(again.protectedNow === 0 && again.remaining === 0, 'running it again changes nothing');
  ok((await call('POST', '/api/admin/document-protection', { skip: ['bad key!'] }, u.aT)).code === 'bad_request', 'bad input is refused');

  console.log('\n== the screen (en / ru / zh, 375 px)');
  const br = await launch();
  for (const locale of ['en', 'ru', 'zh']) {
    const c = await br.newContext({ viewport: { width: 375, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    await c.addCookies([{ name: 'token', value: u.aT, url: BASE }]);
    const p = await c.newPage(); await p.goto(`${BASE}/${locale}/admin/document-protection`, { waitUntil: 'domcontentloaded' });
    await p.getByTestId('protection-key').waitFor();
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${locale}: no sideways scrolling`);
    const t = await p.getByTestId('protection-key').innerText();
    ok(/[0-9a-f]{8}/.test(t) && !/adminDocProtection\./.test(t), `${locale}: shows which key is in use, no raw keys`);
    await sleep(800);
    const vio = await axeViolations(p); ok(vio.length === 0, `${locale}: axe 0`, vio);
    await c.close();
  }
  await br.close();
  await raw.end();
  sql(`DELETE FROM exhibitions WHERE slug='dp-${u.st}'`);
  done();
})().catch((e) => { console.error(e); process.exit(1); });
