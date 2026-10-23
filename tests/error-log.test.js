// Error monitoring: errors from visitors' browsers and from the server are grouped, listed for admins, e-mailed as a digest.
const { BASE, sql, ok, done, mkUsers } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const smtp = require('./helpers/fake-smtp.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.38.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const H = (t) => ({ 'Content-Type': 'application/json', cookie: 'token=' + t, 'x-forwarded-for': ipn() });
const api = (method, path, body, t) => fetch(BASE + path, { method, headers: H(t), body: body ? JSON.stringify(body) : undefined }).then(async (r) => ({ status: r.status, ...(await r.json().catch(() => ({}))) }));
const num = (q) => Number(sql(q));

(async () => {
  const u = await mkUsers('er');
  const st = Date.now();
  sql('DELETE FROM error_log');
  sql('DELETE FROM mail_settings');
  await fetch(BASE + '/api/admin/email', { method: 'PUT', headers: H(u.aT), body: JSON.stringify({ enabled: false, host: '127.0.0.1', port: 2542, secure: false, username: 'm', password: 'x', fromName: 'The Unique Expo', fromEmail: 'noreply@theuniqueexpo.test' }) });
  const report = (body, ip = ipn(), raw) => fetch(BASE + '/api/client-error', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip, 'user-agent': 'Mozilla/5.0 test' }, body: raw ?? JSON.stringify(body) });

  console.log('\n== errors from visitors\' browsers');
  let r = await report({ message: `TypeError: Cannot read properties of undefined (reading 'x${st}')`, stack: 'TypeError: boom\n    at render (https://theuniqueexpo.com/_next/static/chunks/app.js:10:20)', page: '/en/exhibitions?secret=1' });
  ok(r.status === 204, 'a report is accepted without sign-in and answers nothing (204)');
  await sleep(300);
  ok(num("SELECT COUNT(*) FROM error_log WHERE source='client'") === 1, 'and stored once');
  ok(sql("SELECT path FROM error_log WHERE source='client'") === '/en/exhibitions', 'with the page address but not its query');
  await report({ message: `TypeError: Cannot read properties of undefined (reading 'x${st + 1}')`, stack: 'TypeError: boom\n    at render (https://theuniqueexpo.com/_next/static/chunks/app.js:99:7)', page: '/en/blog' });
  await sleep(300);
  ok(num("SELECT COUNT(*) FROM error_log WHERE source='client'") === 1 && num("SELECT occurrences FROM error_log WHERE source='client'") === 2, 'the same error with other numbers or line numbers is the same row, counted twice');
  await report({ message: 'A different error entirely', page: '/en' });
  await sleep(300);
  ok(num("SELECT COUNT(*) FROM error_log WHERE source='client'") === 2, 'a different error is a new row');
  for (const m of ['ResizeObserver loop completed with undelivered notifications.', 'Script error.', 'Failed to fetch', 'ChunkLoadError: Loading chunk 12 failed.', 'Error in chrome-extension://abc/content.js']) await report({ message: m, page: '/en' });
  await sleep(400);
  ok(num("SELECT COUNT(*) FROM error_log WHERE source='client'") === 2, 'noise that is not the site\'s fault is ignored (resize loops, extensions, lost connections, missing chunks)');
  await report(null, ipn(), '{not json'); await report({ message: 123 }); await report({ message: 'x'.repeat(7000) });
  await sleep(300);
  ok(num("SELECT COUNT(*) FROM error_log WHERE source='client'") === 2, 'bad bodies, a non-text message and an oversized report store nothing');
  const flood = '198.38.250.250';
  for (let i = 0; i < 26; i++) await report({ message: `Flood error ${i} ${'q'.repeat(i + 1)}`, page: '/en' }, flood);
  await sleep(600);
  ok(num("SELECT COUNT(*) FROM error_log WHERE message LIKE 'Flood error%'") <= 20, 'one address can only send 20 an hour', num("SELECT COUNT(*) FROM error_log WHERE message LIKE 'Flood error%'"));

  console.log('\n== errors from the server');
  const bad = () => fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ipn() }, body: '{not json' });
  ok((await bad()).status === 500, 'a request the server cannot handle answers 500');
  await sleep(600); await bad(); await sleep(600);
  const row = sql("SELECT CONCAT(source,'|',occurrences,'|',message) FROM error_log WHERE source='server' AND message LIKE 'Login error:%'");
  ok(/^server\|2\|Login error:/.test(row), 'it is recorded from what the code logged, once, counted twice', row);

  console.log('\n== the list for admins');
  ok((await api('GET', '/api/admin/errors', null, u.bT)).status === 401, 'a buyer cannot see it');
  let list = await api('GET', '/api/admin/errors', null, u.aT);
  const server = list.errors.find((e) => e.source === 'server' && /Login error/.test(e.message));
  ok(list.status === 200 && server && server.occurrences === 2 && /Error|JSON/.test(server.detail), 'an admin sees the errors with counts and details', server && server.occurrences);
  ok(list.errors[0].lastAt >= list.errors[list.errors.length - 1].lastAt, 'newest first');
  ok((await api('PUT', '/api/admin/errors', { id: 'x', resolved: true }, u.aT)).status === 400 && (await api('PUT', '/api/admin/errors', { id: 99999999, resolved: true }, u.aT)).status === 404, 'a bad id: 400, an unknown one: 404');
  r = await api('PUT', '/api/admin/errors', { id: server.id, resolved: true }, u.aT);
  ok(r.ok && !r.errors.some((e) => e.id === server.id), 'marking one resolved takes it off the list');
  list = await api('GET', '/api/admin/errors?all=1', null, u.aT);
  ok(list.errors.find((e) => e.id === server.id).resolved === true, 'it is still there when resolved ones are asked for');
  await bad(); await sleep(700);
  list = await api('GET', '/api/admin/errors', null, u.aT);
  ok(list.errors.some((e) => e.id === server.id && e.occurrences === 3), 'and comes back when it happens again');
  r = await api('PUT', '/api/admin/errors', { id: server.id, resolved: true }, u.aT); r = await api('PUT', '/api/admin/errors', { id: server.id, resolved: false }, u.aT);
  ok(r.errors.some((e) => e.id === server.id), 'an admin can also open it again');
  ok(num("SELECT COUNT(*) FROM admin_audit_log WHERE action IN ('error_resolved','error_reopened')") >= 3, 'resolving is in the activity log');

  console.log('\n== the health report counts them');
  r = await api('GET', '/api/admin/health', null, u.aT);
  ok(r.report.errors >= 3 && r.report.issues.some((i) => /errors? w(as|ere) reported/.test(i)), 'Admin → Health shows how many and lists it as something to look at', r.report.errors);

  console.log('\n== the e-mail digest');
  sql('UPDATE error_log SET alerted_at=NULL');
  const srv = await smtp.start(2542);
  const put = (b) => fetch(BASE + '/api/admin/email', { method: 'PUT', headers: H(u.aT), body: JSON.stringify(b) });
  const key = (await (await fetch(BASE + '/api/admin/email', { method: 'POST', headers: H(u.aT), body: JSON.stringify({ action: 'reminderKey' }) })).json()).key;
  const rerun = () => sql('UPDATE mail_settings SET reminders_last_run_at=NULL WHERE id=1');
  const cron = () => fetch(BASE + '/api/cron/registration-reminders', { method: 'POST', headers: { 'x-reminder-key': key, 'x-forwarded-for': ipn() } }).then((x) => x.json());
  const mine = () => srv.messages.filter((m) => m.to.join().includes(u.m.a) && /website reported/.test(smtp.decode(m.raw).subject));
  // e-mail on again, via the API (the site remembers its mail settings for a moment)
  await put({ enabled: true, host: '127.0.0.1', port: 2542, secure: false, username: 'm', password: 'x', fromName: 'The Unique Expo', fromEmail: 'noreply@theuniqueexpo.test' });
  rerun(); await cron();
  for (let i = 0; i < 40 && mine().length === 0; i++) await sleep(150);
  ok(mine().length === 1, 'the admins get ONE e-mail for all the new errors', mine().length);
  const d = smtp.decode(mine()[0].raw);
  ok(/^The website reported \d+ new errors$/.test(d.subject) && /\[client\]/.test(d.text) && /\[server\] Login error/.test(d.text) && /admin\/errors/.test(d.text), 'it lists them (browser or server, what, where) with a link', d.subject + ' | ' + d.text.slice(0, 200));
  ok(num('SELECT COUNT(*) FROM error_log WHERE alerted_at IS NULL AND resolved_at IS NULL') === 0, 'they are marked as told');
  const n = srv.messages.length;
  rerun(); await cron(); await sleep(800);
  ok(srv.messages.filter((m) => /website reported/.test(smtp.decode(m.raw).subject)).length === srv.messages.slice(0, n).filter((m) => /website reported/.test(smtp.decode(m.raw).subject)).length, 'a second run tells nobody again');
  await report({ message: `Brand new error ${st}`, page: '/en' }); await sleep(400);
  rerun(); await cron();
  for (let i = 0; i < 40 && mine().length < 2; i++) await sleep(150);
  const d2 = smtp.decode(mine()[mine().length - 1].raw);
  ok(mine().length === 2 && /^The website reported a new error$/.test(d2.subject) && /Brand new error/.test(d2.text), 'a later new error gets its own e-mail', d2.subject);
  // e-mail off: nothing is sent and the error stays "not told yet"
  await put({ enabled: false, host: '127.0.0.1', port: 2542, secure: false, username: 'm', password: 'x', fromName: 'The Unique Expo', fromEmail: 'noreply@theuniqueexpo.test' });
  await report({ message: `Another new error ${st}`, page: '/en' }); await sleep(400);
  const before = srv.messages.length;
  await sleep(300);
  ok(num("SELECT COUNT(*) FROM error_log WHERE message LIKE 'Another new error%' AND alerted_at IS NULL") === 1 && srv.messages.length === before, 'with e-mail off nothing is sent and it is kept for later');

  console.log('\n== the screen (en / ru / zh, 375 px)');
  const br = await launch();
  for (const locale of ['en', 'ru', 'zh']) {
    const c = await br.newContext({ viewport: { width: 375, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    await c.addCookies([{ name: 'token', value: u.aT, url: BASE }]);
    const p = await c.newPage(); await p.goto(`${BASE}/${locale}/admin/errors`, { waitUntil: 'domcontentloaded' });
    await p.getByTestId('error-row').first().waitFor();
    ok((await p.getByTestId('error-row').count()) >= 3, `${locale}: the errors are listed`);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${locale}: no sideways scrolling`);
    await sleep(700);
    const v = await axeViolations(p); ok(v.length === 0, `${locale}: no accessibility violations`, v.map((x) => x.id));
    await c.close();
  }
  { // details and resolving on the screen
    const c = await br.newContext({ viewport: { width: 375, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    await c.addCookies([{ name: 'token', value: u.aT, url: BASE }]);
    const p = await c.newPage(); await p.goto(`${BASE}/en/admin/errors`, { waitUntil: 'domcontentloaded' });
    const rows = p.getByTestId('error-row'); await rows.first().waitFor();
    const before2 = await rows.count();
    const target = rows.filter({ hasText: 'Brand new error' });
    await target.getByRole('button', { name: /Mark resolved/ }).click();
    await p.getByRole('status').filter({ hasText: 'Marked resolved.' }).waitFor();
    ok((await rows.count()) === before2 - 1, 'marking one resolved on the screen takes it off the list');
    const withDetail = rows.filter({ hasText: 'Login error' });
    await withDetail.getByRole('button', { name: 'Details' }).click();
    ok((await withDetail.locator('pre').innerText()).length > 20, 'Details shows the technical text');
    await c.close();
  }
  await br.close();
  await srv.close();
  sql('DELETE FROM mail_settings');
  sql('DELETE FROM error_log');
  done();
})().catch((e) => { console.error(e); process.exit(1); });
