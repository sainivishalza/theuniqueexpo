// Page speed measured from real visitors: the rules, the beacon API, the admin screen and the health-report line.
const { spawnSync } = require('node:child_process');
const { BASE, sql, ok, done, mkUsers } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.57.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const H = (t) => ({ 'Content-Type': 'application/json', cookie: 'token=' + t, 'x-forwarded-for': ipn() });
const api = (method, path, body, t) => fetch(BASE + path, { method, headers: H(t), body: body ? JSON.stringify(body) : undefined }).then(async (r) => ({ status: r.status, ...(await r.json().catch(() => ({}))) }));
const num = (q) => Number(sql(q));
const beacon = (body, ip = ipn()) => fetch(BASE + '/api/web-vitals', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip }, body: typeof body === 'string' ? body : JSON.stringify(body) });

(async () => {
  console.log('\n== the rules');
  const run = (code) => spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '-e', `import('./src/lib/web-vitals.ts').then((m) => { console.log(JSON.stringify(${code})); })`], { encoding: 'utf8' }).stdout.trim();
  ok(run("[m.rate('LCP',2500), m.rate('LCP',2501), m.rate('LCP',4000), m.rate('LCP',4001)]") === '["good","needs","needs","poor"]', 'loading: good up to 2.5 s, poor above 4 s');
  ok(run("[m.rate('INP',200), m.rate('INP',501), m.rate('CLS',0.1), m.rate('CLS',0.26)]") === '["good","poor","good","poor"]', 'responding and stability thresholds');
  ok(run("[m.plausible('LCP',-1), m.plausible('LCP',NaN), m.plausible('LCP',999999999), m.plausible('CLS',25), m.plausible('LCP',1800)]") === '[false,false,false,false,true]', 'impossible numbers are not believed');
  ok(run("[m.pageGroup('/en'), m.pageGroup('/ru/exhibitions'), m.pageGroup('/zh/exhibitions/some-expo-2026'), m.pageGroup('/login?x=1'), m.pageGroup('/en/dashboard/buyer/wallet')]") === '["home","exhibitions","exhibitions/:item","login","dashboard/:item"]', 'pages are grouped by kind, not one by one');

  console.log('\n== the beacon');
  sql('DELETE FROM web_vitals_daily');
  const ok204 = async (b) => (await beacon(b)).status === 204;
  ok(await ok204({ name: 'LCP', value: 1200, page: 'exhibitions', device: 'phone' }), 'a good measure is accepted (and answers nothing)');
  ok(num("SELECT good FROM web_vitals_daily WHERE page='exhibitions' AND device='phone' AND metric='LCP'") === 1, 'and counted as good');
  await beacon({ name: 'LCP', value: 3000, page: 'exhibitions', device: 'phone' });
  await beacon({ name: 'LCP', value: 9000, page: 'exhibitions', device: 'phone' });
  const row = sql("SELECT CONCAT(good,'/',needs,'/',poor,'/',total_value) FROM web_vitals_daily WHERE page='exhibitions' AND device='phone' AND metric='LCP'");
  ok(row === '1/1/1/13200', 'three more views add up in the same row: good / needs work / poor and the total', row);
  ok(num("SELECT COUNT(*) FROM web_vitals_daily WHERE page='exhibitions'") === 1, 'one row per day, page kind, device and measure');
  const n = () => num('SELECT COALESCE(SUM(good+needs+poor),0) FROM web_vitals_daily');
  const before = n();
  for (const bad of [
    'not json', '{}', { name: 'FID', value: 1, page: 'x', device: 'phone' }, { name: 'LCP', value: '1200', page: 'x', device: 'phone' },
    { name: 'LCP', value: -5, page: 'x', device: 'phone' }, { name: 'LCP', value: 1e9, page: 'x', device: 'phone' },
    { name: 'LCP', value: 1000, page: "x'; DROP TABLE users;--", device: 'phone' }, { name: 'LCP', value: 1000, page: 'a'.repeat(60), device: 'phone' },
    { name: 'LCP', value: 1000, page: 'x', device: 'tablet' }, 'x'.repeat(2000),
  ]) {
    const r = await beacon(bad);
    ok(r.status === 204, `rubbish is ignored quietly (${String(typeof bad === 'string' ? bad.slice(0, 12) : JSON.stringify(bad).slice(0, 40))})`);
  }
  ok(n() === before, 'and nothing of it is counted');
  const ip = ipn();
  for (let i = 0; i < 65; i++) await beacon({ name: 'CLS', value: 0.01, page: 'limit', device: 'desktop' }, ip);
  ok(num("SELECT COALESCE(SUM(good),0) FROM web_vitals_daily WHERE page='limit'") <= 60, 'one address cannot send more than 60 in ten minutes', num("SELECT COALESCE(SUM(good),0) FROM web_vitals_daily WHERE page='limit'"));

  console.log('\n== the admin screen data');
  const u = await mkUsers('ps');
  ok((await api('GET', '/api/admin/page-speed', null, u.bT)).status === 401, 'a buyer cannot see it');
  sql('DELETE FROM web_vitals_daily');
  const put = (page, device, metric, good, needs, poor, total, day = 'UTC_DATE()') => sql(`INSERT INTO web_vitals_daily (day,page,device,metric,good,needs,poor,total_value) VALUES (${day},'${page}','${device}','${metric}',${good},${needs},${poor},${total})`);
  put('home', 'phone', 'LCP', 90, 8, 2, 100 * 1800);           // healthy: 90% good
  put('exhibitions', 'phone', 'LCP', 40, 30, 30, 100 * 3200);  // slow: 40% good
  put('exhibitions', 'desktop', 'LCP', 5, 2, 1, 8 * 1500);     // too few views for a verdict
  put('exhibitions', 'phone', 'CLS', 95, 4, 1, 100 * 0.04);
  put('old', 'phone', 'LCP', 0, 0, 100, 100 * 9000, 'DATE_SUB(UTC_DATE(), INTERVAL 20 DAY)'); // outside 7 days, inside 28
  let r = await api('GET', '/api/admin/page-speed', null, u.aT);
  const find = (rows, p, d, m) => rows.find((x) => x.page === p && x.device === d && x.metric === m);
  ok(r.available && r.days === 7 && find(r.rows, 'home', 'phone', 'LCP').healthy === true && Math.round(find(r.rows, 'home', 'phone', 'LCP').goodShare * 100) === 90, 'home on phones: 90% good = healthy', find(r.rows, 'home', 'phone', 'LCP'));
  ok(find(r.rows, 'exhibitions', 'phone', 'LCP').healthy === false && Math.round(find(r.rows, 'exhibitions', 'phone', 'LCP').average) === 3200, 'exhibitions on phones: 40% good = not healthy; average 3.2 s');
  ok(find(r.rows, 'exhibitions', 'desktop', 'LCP').healthy === null, 'fewer than 30 views: no verdict');
  ok(!find(r.rows, 'old', 'phone', 'LCP'), 'last 7 days: the old row is left out');
  r = await api('GET', '/api/admin/page-speed?days=28', null, u.aT);
  ok(r.days === 28 && !!find(r.rows, 'old', 'phone', 'LCP'), 'last 28 days includes it');

  console.log('\n== the health report');
  r = await api('GET', '/api/admin/health', null, u.aT);
  ok(r.report.issues.some((i) => /^Page speed: 1 measure is below the healthy level/.test(i)), 'a slow page shows up as something to look at', r.report.issues);
  sql("DELETE FROM web_vitals_daily WHERE page='exhibitions'");
  r = await api('GET', '/api/admin/health', null, u.aT);
  ok(!r.report.issues.some((i) => /^Page speed/.test(i)), 'and goes away when the numbers are fine');

  console.log('\n== the screen (en / ru / zh, 375 px)');
  put('exhibitions', 'phone', 'LCP', 40, 30, 30, 100 * 3200);
  put('exhibitions', 'phone', 'INP', 90, 5, 5, 100 * 120);
  const br = await launch();
  for (const locale of ['en', 'ru', 'zh']) {
    const c = await br.newContext({ viewport: { width: 375, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    await c.addCookies([{ name: 'token', value: u.aT, url: BASE }]);
    const p = await c.newPage(); await p.goto(`${BASE}/${locale}/admin/page-speed`, { waitUntil: 'domcontentloaded' });
    await p.getByTestId('speed-page').first().waitFor();
    ok((await p.getByTestId('speed-page').count()) === 2, `${locale}: one card for each kind of page`);
    ok(await p.getByTestId('speed-exhibitions-phone-LCP').isVisible() && await p.getByTestId('speed-home-phone-LCP').isVisible(), `${locale}: the measures are listed`);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${locale}: no sideways scrolling`);
    await sleep(800);
    const vio = await axeViolations(p); ok(vio.length === 0, `${locale}: axe 0`, vio.map((v) => v.id));
    if (locale === 'en') {
      ok(/40% good/.test(await p.getByTestId('speed-exhibitions-phone-LCP').innerText()) && /Needs work/.test(await p.getByTestId('speed-exhibitions-phone-LCP').innerText()), 'en: 40% good, needs work');
      ok(/Healthy/.test(await p.getByTestId('speed-home-phone-LCP').innerText()), 'en: the home page is healthy');
      await p.getByRole('button', { name: 'Last 28 days' }).click();
      await p.getByTestId('speed-old-phone-LCP').waitFor();
      ok(true, 'en: 28 days shows the older page too');
    }
    await c.close();
  }
  await br.close();

  console.log('\n== a real browser reports');
  {
    sql('DELETE FROM web_vitals_daily');
    const b2 = await launch();
    const c = await b2.newContext({ viewport: { width: 375, height: 800 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    await c.addInitScript(() => { Math.random = () => 0.01; }); // this visit is one of the sampled ones
    const p = await c.newPage();
    await p.goto(`${BASE}/en/exhibitions`, { waitUntil: 'networkidle' });
    await p.mouse.click(10, 300);
    await sleep(1500);
    await p.goto('about:blank'); // leaving the page makes the browser finish its measures
    await sleep(1500);
    const metrics = sql("SELECT GROUP_CONCAT(DISTINCT metric ORDER BY metric) FROM web_vitals_daily WHERE page='exhibitions' AND device='phone'");
    ok(/FCP/.test(metrics) && /TTFB/.test(metrics), 'a sampled visit reports its loading measures, for the kind of page and the device', metrics);
    ok(num("SELECT COUNT(*) FROM web_vitals_daily WHERE page NOT REGEXP '^[a-z0-9-]+(/:item)?$'") === 0, 'only kinds of page are stored, never a specific address');
    await c.close();
    const c2 = await b2.newContext({ viewport: { width: 375, height: 800 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    await c2.addInitScript(() => { Math.random = () => 0.99; }); // and this one is not
    const p2 = await c2.newPage();
    sql('DELETE FROM web_vitals_daily');
    await p2.goto(`${BASE}/en/exhibitions`, { waitUntil: 'networkidle' });
    await sleep(1000); await p2.goto('about:blank'); await sleep(1000);
    ok(num('SELECT COUNT(*) FROM web_vitals_daily') === 0, 'a visit that is not sampled reports nothing');
    await c2.close(); await b2.close();
  }

  console.log('\n== the JavaScript budget');
  const budget = spawnSync(process.execPath, ['scripts/check-bundle-size.mjs'], { encoding: 'utf8' });
  ok(budget.status === 0 && /Shared by every page/.test(budget.stdout), 'the site is within its JavaScript budget', budget.stdout + budget.stderr);
  sql('DELETE FROM web_vitals_daily');
  done();
})().catch((e) => { console.error(e); process.exit(1); });
