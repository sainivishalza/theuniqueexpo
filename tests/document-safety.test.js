// Buyer documents: the upload safety check (PDF with active content, pictures with something hidden after them, the optional
// ClamAV scanner) and the links an admin can make to show one document to someone without an account.
const { execFile } = require('node:child_process');
const net = require('node:net');
const zlib = require('node:zlib');
const { BASE, sql, ok, done, mkUsers, PNG } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.28.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const H = (t) => ({ 'Content-Type': 'application/json', cookie: 'token=' + t, 'x-forwarded-for': ipn() });
const asUrl = (type, buf) => `data:${type};base64,${buf.toString('base64')}`;
const pdf = (extra = '') => Buffer.from(`%PDF-1.4\n1 0 obj<</Type/Catalog${extra}>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF`);

(async () => {
  const u = await mkUsers('ds');
  const put = (t, type, value) => fetch(BASE + `/api/buyer-profile/documents/${type}`, { method: 'PUT', headers: H(t), body: JSON.stringify({ value }) }).then(async (r) => ({ status: r.status, ...(await r.json().catch(() => ({}))) }));
  const get = (t, type) => fetch(BASE + `/api/buyer-profile/documents/${type}`, { headers: { cookie: 'token=' + t, 'x-forwarded-for': ipn() } });

  console.log('\n== the upload safety check');
  let r = await put(u.bT, 'businessLicense', asUrl('application/pdf', pdf()));
  ok(r.status === 200, 'a plain PDF uploads');
  for (const [label, extra] of [['a script', '/OpenAction<</S/JavaScript/JS(app.alert(1))>>'], ['a script with a hidden letter (/J#61vaScript)', '/OpenAction<</S/J#61vaScript>>'], ['a launch action', '/OpenAction<</S/Launch/F(cmd.exe)>>'], ['an embedded file', '/Names<</EmbeddedFiles 2 0 R>>'], ['a hidden form', '/AcroForm<</XFA 3 0 R>>']]) {
    r = await put(u.bT, 'businessCard', asUrl('application/pdf', pdf(extra)));
    ok(r.status === 400 && r.code === 'invalid_file', `a PDF with ${label} is refused`, r);
  }
  ok((await get(u.bT, 'businessCard')).status === 404, 'and nothing was stored');
  r = await put(u.bT, 'passportFront', asUrl('application/pdf', pdf('/Pages 2 0 R /Type/Catalog /Metadata 5 0 R')));
  ok(r.status === 200, 'ordinary PDF names are fine (Pages, Metadata)');

  const png = Buffer.from(PNG.split(',')[1], 'base64');
  const hidden = Buffer.from('<script>alert("hidden")</script> MZ-not-a-picture');
  r = await put(u.bT, 'visaPage', asUrl('image/png', Buffer.concat([png, hidden])));
  ok(r.status === 200, 'a picture with extra bytes after its end uploads');
  let res = await get(u.bT, 'visaPage'); let body = Buffer.from(await res.arrayBuffer());
  ok(!body.includes('hidden') && !body.includes('<script>') && /image\/(jpeg|png)/.test(res.headers.get('content-type')), 'but only the clean picture is stored (the extra bytes are gone)', res.headers.get('content-type'));
  r = await put(u.bT, 'buyerPhoto', asUrl('image/png', png));
  res = await get(u.bT, 'buyerPhoto');
  ok(r.status === 200 && /image\/png/.test(res.headers.get('content-type')), 'a clean small PNG is still left as it is');
  const jpg = await (async () => { const sharp = require('sharp'); return sharp({ create: { width: 8, height: 8, channels: 3, background: '#336699' } }).jpeg().toBuffer(); })();
  r = await put(u.bT, 'cantonFairCard', asUrl('image/jpeg', Buffer.concat([jpg, Buffer.from('PK-hidden-archive-bytes')])));
  res = await get(u.bT, 'cantonFairCard'); body = Buffer.from(await res.arrayBuffer());
  ok(r.status === 200 && !body.includes('hidden-archive'), 'a JPEG with bytes after its end is cleaned too');

  console.log('\n== the optional virus scanner (ClamAV)');
  const servers = [];
  const fakeClamd = (answer) => new Promise((resolve) => {
    const s = net.createServer((sock) => { let got = 0; sock.on('data', (d) => { got += d.length; if (d.subarray(-4).equals(Buffer.alloc(4))) sock.end(answer + '\0'); }); sock.on('error', () => {}); });
    s.listen(0, '127.0.0.1', () => { servers.push(s); resolve(s.address().port); });
  });
  // The scanner answers from this process, so the check runs in a child process without blocking this one.
  const scan = (port, bytes, env = {}) => new Promise((resolve) => {
    const code = `import('./src/lib/server/document-scan.ts').then(async (m) => { const r = await m.scanDocument(require('node:fs').readFileSync(0), 'image/png'); console.log(JSON.stringify(r)); })`;
    const child = execFile(process.execPath, ['--experimental-strip-types', '--no-warnings', '-e', code], { encoding: 'utf8', env: { ...process.env, CLAMD_HOST: '127.0.0.1', CLAMD_PORT: String(port), ...env }, timeout: 30000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => resolve(String(stdout || '').trim().split('\n').pop()));
    child.stdin.end(bytes);
  });
  const clean = await fakeClamd('stream: OK'), infected = await fakeClamd('stream: Eicar-Test-Signature FOUND');
  ok((await scan(clean, png)) === '{"ok":true}', 'a clean answer lets the file through');
  ok((await scan(infected, png)) === '{"ok":false,"reason":"infected"}', 'an "infected" answer refuses it');
  ok((await scan(1, png)) === '{"ok":true}', 'a scanner that is not there does not stop uploads by default');
  ok((await scan(1, png, { CLAMD_REQUIRED: '1' })) === '{"ok":false,"reason":"scanner_unavailable"}', 'unless the scanner is required');
  const big = Buffer.alloc(300 * 1024, 7);
  ok((await scan(clean, big)) === '{"ok":true}', 'a file bigger than one chunk is sent in pieces and still answered');
  for (const s of servers) s.close();

  console.log('\n== links to show a document without signing in (API)');
  const base = (t = 'buyerPhoto') => `/api/admin/buyer-profiles/${u.bId}/documents/${t}/share`;
  const api = (method, path, body, t = u.aT) => fetch(BASE + path, { method, headers: H(t), body: body ? JSON.stringify(body) : undefined }).then(async (x) => ({ status: x.status, ...(await x.json().catch(() => ({}))) }));
  ok((await api('POST', base(), { hours: 24 }, u.bT)).status === 401, 'a buyer cannot make a link');
  ok((await api('GET', base(), null, u.bT)).status === 401, 'nor list them');
  ok((await api('POST', base('nonsense'), { hours: 24 })).status === 404, 'an unknown document: not found');
  ok((await api('POST', base(), { hours: 5 })).code === 'bad_hours', 'only 1 hour, 1, 3 or 7 days');
  ok((await api('POST', base('invoiceOrderList'), { hours: 24 })).code === 'no_document', 'a document that was never uploaded: nothing to share');
  r = await api('POST', base(), { hours: 24 });
  ok(r.status === 200 && /^\/api\/shared-document\/[A-Za-z0-9_-]{43}$/.test(r.path) && r.links.length === 1, 'an admin makes a link', r.path);
  const link = r.path;
  res = await fetch(BASE + link, { headers: { 'x-forwarded-for': ipn() } });
  body = Buffer.from(await res.arrayBuffer());
  ok(res.status === 200 && /image\/png/.test(res.headers.get('content-type')) && body.equals(png), 'anyone with the link (no sign-in) sees the document');
  ok(/no-store/.test(res.headers.get('cache-control')) && /noindex/.test(res.headers.get('x-robots-tag')), 'never cached, never indexed');
  ok(res.headers.get('x-content-type-options') === 'nosniff', 'and not sniffed as anything else');
  r = await api('GET', base());
  ok(r.links.length === 1 && r.links[0].views === 1 && r.links[0].createdByName === 'ds Admin', 'the list shows who made it and how often it was opened', r.links);
  const token = link.split('/').pop();
  ok(sql(`SELECT COUNT(*) FROM document_share_links WHERE token_hash='${token}'`) === '0' && sql(`SELECT COUNT(*) FROM document_share_links WHERE token_hash=SHA2('${token}',256)`) === '1', 'only the fingerprint of the link is stored, never the link');
  ok((await fetch(BASE + '/api/shared-document/' + 'A'.repeat(43))).status === 404 && (await fetch(BASE + '/api/shared-document/short')).status === 404, 'a made-up link: 404');
  ok((await fetch(BASE + link)).status === 200, 'it can be opened more than once');
  for (let i = 0; i < 4; i++) await api('POST', base(), { hours: 1 });
  r = await api('POST', base(), { hours: 1 }); ok(r.status === 409 && r.code === 'limit', 'at most 5 active links per document', r);
  const list = (await api('GET', base())).links;
  r = await api('DELETE', base() + `?id=${list[0].id}`); ok(r.status === 200 && r.links.length === 4, 'a link can be stopped');
  const mine = list.find((l) => l.views >= 1);
  await api('DELETE', base() + `?id=${mine.id}`);
  res = await fetch(BASE + link); ok(res.status === 404, 'a stopped link says "does not work any more" (404)');
  ok((await api('DELETE', base() + `?id=${mine.id}`)).status === 404, 'stopping it twice: 404');
  ok((await api('DELETE', base() + `?id=abc`)).status === 404, 'a bad id: 404');
  r = await api('POST', base(), { hours: 1 });
  sql(`UPDATE document_share_links SET expires_at=DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE) WHERE user_id=${u.bId}`);
  ok((await fetch(BASE + r.path)).status === 404, 'an expired link stops working');
  ok((await api('GET', base())).links.length === 0, 'and is no longer listed');
  ok(Number(sql("SELECT COUNT(*) FROM admin_audit_log WHERE action IN ('document_link_created','document_link_revoked')")) >= 6, 'making and stopping links is in the activity log');
  // a link follows the document: replace it and the link shows the new one; remove the buyer's file and it stops
  r = await api('POST', base('visaPage'), { hours: 1 });
  sql(`UPDATE buyer_profiles SET doc_visa_page='' WHERE user_id=${u.bId}`);
  ok((await fetch(BASE + r.path)).status === 404, 'a link to a document that was removed: 404');

  console.log('\n== roles');
  const reviewer = await mkUsers('dsr'), finance = await mkUsers('dsf');
  const idOf = (x) => Number(sql(`SELECT id FROM users WHERE email='${x.m.a}'`));
  await api('PUT', '/api/admin/staff-access', { userId: idOf(reviewer), preset: 'reviewer' });
  await api('PUT', '/api/admin/staff-access', { userId: idOf(finance), preset: 'finance' });
  ok((await api('POST', base(), { hours: 1 }, reviewer.aT)).status === 200, 'a reviewer can make a link');
  ok((await api('POST', base(), { hours: 1 }, finance.aT)).status === 401, 'finance cannot');

  console.log('\n== the screen (en / ru / zh, 375 px)');
  const br = await launch();
  const openDrawer = async (locale) => {
    const c = await br.newContext({ viewport: { width: 375, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    await c.addCookies([{ name: 'token', value: u.aT, url: BASE }]);
    const p = await c.newPage();
    await p.goto(`${BASE}/${locale}/admin/buyer-profiles`, { waitUntil: 'networkidle' });
    await p.getByPlaceholder(/Search by registration no|Поиск по рег|按注册编号/).first().fill(u.m.b); await sleep(1200);
    await p.locator('tbody tr').filter({ hasText: u.m.b }).first().getByRole('button', { name: /Edit|Изменить|Редактировать|编辑/ }).first().evaluate((e) => e.click());
    return [c, p];
  };
  for (const locale of ['en', 'ru', 'zh']) {
    const [c, p] = await openDrawer(locale);
    const toggle = p.getByRole('button', { name: /Share link|Ссылка|分享链接/ }).first();
    await toggle.waitFor(); await toggle.click();
    const panel = p.getByTestId('doc-share').first(); await panel.waitFor();
    await panel.getByRole('button', { name: /Make a link|Создать ссылку|生成链接/ }).click();
    await panel.getByTestId('doc-share-url').waitFor();
    const url = await panel.getByTestId('doc-share-url').inputValue();
    ok(/\/api\/shared-document\/[A-Za-z0-9_-]{43}$/.test(url), `${locale}: the new link is shown`);
    await panel.getByTestId('doc-share-link').first().waitFor();
    ok((await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)), `${locale}: no sideways scrolling at 375 px`);
    await sleep(700);
    const v = await axeViolations(p); ok(v.length === 0, `${locale}: no accessibility violations`, v.map((x) => x.id));
    if (locale === 'en') {
      const count = await panel.getByTestId('doc-share-link').count();
      await panel.getByRole('button', { name: 'Stop' }).first().click();
      await p.getByText('The link was stopped.').first().waitFor();
      ok((await panel.getByTestId('doc-share-link').count()) === count - 1, 'en: stopping a link on the screen removes it');
    }
    await c.close();
  }
  await br.close();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
