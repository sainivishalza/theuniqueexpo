// Slow database queries are written down by what they look like; the new indexes exist; the admin list works.
const { spawn } = require('node:child_process');
const { BASE, DB, sql, ok, done, mkUsers } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.50.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const num = (q) => Number(sql(q));

(async () => {
  console.log('\n== the indexes');
  const idx = (table) => sql(`SHOW INDEX FROM ${table}`).split('\n').map((l) => l.split('\t')[2]);
  ok(idx('expo_registrations').includes('idx_reg_created') && idx('expo_registrations').includes('idx_reg_status'), 'registrations are indexed by date and by status');
  ok(idx('email_log').includes('idx_email_log_status'), 'and the e-mail log by status');
  ok(sql("SHOW TABLES LIKE 'slow_queries'") === 'slow_queries', 'the table for slow queries exists');

  console.log('\n== a server that counts every query as slow (so any query shows up)');
  const u = await mkUsers('sq');
  const port = 3400 + Math.floor(Math.random() * 90);
  const child = spawn('npx', ['next', 'start', '-p', String(port)], {
    env: { ...process.env, SLOW_QUERY_MS: '1', SLOW_QUERY_FLUSH_MS: '700', DB_NAME: DB.name, DB_USER: DB.user, DB_PASSWORD: DB.password, ...(DB.host ? { DB_HOST: DB.host } : {}), JWT_SECRET: process.env.JWT_SECRET || 'slow-query-test-secret' },
    stdio: 'ignore',
  });
  const stop = () => { try { child.kill('SIGTERM'); } catch { /* already gone */ } };
  process.on('exit', stop);
  const child_ = `http://localhost:${port}`;
  let up = false;
  for (let i = 0; i < 90 && !up; i++) { up = await fetch(child_ + '/api/auth/me').then((r) => r.ok).catch(() => false); if (!up) await sleep(1000); }
  ok(up, 'a second copy of the site started for this check');
  sql('DELETE FROM slow_queries');
  const login = await fetch(child_ + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ipn() }, body: JSON.stringify({ email: u.m.a, password: 'pass1234' }) });
  const token = /token=([^;]+)/.exec(login.headers.getSetCookie().join(';'))[1];
  const asAdmin = (path, init = {}) => fetch(child_ + path, { ...init, headers: { cookie: 'token=' + token, 'x-forwarded-for': ipn() } }).then(async (r) => ({ status: r.status, ...(await r.json().catch(() => ({}))) }));
  for (let i = 0; i < 2; i++) { await asAdmin('/api/admin/stats'); await asAdmin('/api/admin/wallet/overview'); await asAdmin('/api/admin/buyer-profiles'); }
  await sleep(2500);
  let list = await asAdmin('/api/admin/slow-queries');
  ok(list.status === 200 && list.queries.length >= 3, 'queries that pass the limit are written down', list.queries && list.queries.length);
  ok(list.queries.every((q) => !/\b\d{4,}\b/.test(q.sql) && !/'[^']{3,}'/.test(q.sql)), 'by what they look like: the numbers and texts in them are taken out', list.queries.slice(0, 3).map((q) => q.sql.slice(0, 100)));
  ok(list.queries.some((q) => q.calls >= 2), 'the same kind of query is one row with a count', list.queries.map((q) => q.calls).slice(0, 5));
  ok(list.queries.every((q) => q.totalMs >= q.maxMs && q.maxMs >= 0 && q.avgMs >= 0) && list.queries[0].totalMs >= list.queries[list.queries.length - 1].totalMs, 'with times, worst first');
  ok(!list.queries.some((q) => /slow_queries/.test(q.sql)), 'the recording of slow queries is not itself listed');
  const admin = { cookie: 'token=' + u.aT, 'x-forwarded-for': ipn() };
  ok((await fetch(BASE + '/api/admin/slow-queries', { headers: { cookie: 'token=' + u.bT } })).status === 401, 'a buyer cannot see the list');
  ok((await fetch(BASE + '/api/admin/slow-queries', { method: 'DELETE', headers: { cookie: 'token=' + u.bT } })).status === 401, 'nor clear it');

  console.log('\n== the screen (en / ru / zh, 375 px)');
  const br = await launch();
  for (const locale of ['en', 'ru', 'zh']) {
    const c = await br.newContext({ viewport: { width: 375, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    await c.addCookies([{ name: 'token', value: u.aT, url: BASE }]);
    const p = await c.newPage(); await p.goto(`${BASE}/${locale}/admin/slow-queries`, { waitUntil: 'domcontentloaded' });
    await p.getByTestId('slow-query').first().waitFor();
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${locale}: no sideways scrolling`);
    await sleep(700);
    const v = await axeViolations(p); ok(v.length === 0, `${locale}: no accessibility violations`, v.map((x) => x.id));
    await c.close();
  }
  { // clear on the screen
    const c = await br.newContext({ viewport: { width: 375, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    await c.addCookies([{ name: 'token', value: u.aT, url: BASE }]);
    const p = await c.newPage(); await p.goto(`${BASE}/en/admin/slow-queries`, { waitUntil: 'domcontentloaded' });
    await p.getByTestId('slow-query').first().waitFor();
    await p.getByRole('button', { name: 'Start the list again' }).click();
    await p.getByTestId('no-slow-queries').waitFor();
    ok(num('SELECT COUNT(*) FROM slow_queries') === 0, 'clearing on the screen empties the list');
    ok(num("SELECT COUNT(*) FROM admin_audit_log WHERE action='slow_queries_cleared'") >= 1, 'and is in the activity log');
    await c.close();
  }
  await br.close();
  stop();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
