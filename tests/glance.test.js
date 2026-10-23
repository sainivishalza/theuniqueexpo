// "At a glance" on the admin home: the numbers match the database, only admins see them.
const { BASE, sql, ok, done, mkUsers } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const ip = () => '10.4.' + Math.floor(Math.random() * 250) + '.' + (Math.floor(Math.random() * 250) + 1);
const H = (t) => ({ cookie: 'token=' + t, 'x-forwarded-for': ip() });

(async () => {
  const u = await mkUsers('gl');
  const st = Date.now();
  // a recent buyer, an old one, and registrations in different states for a test exhibition
  sql(`INSERT INTO exhibitions (slug,title,start_date,end_date) VALUES ('gl-expo-${st}','Glance Expo ${st}',DATE_ADD(UTC_DATE(),INTERVAL 30 DAY),DATE_ADD(UTC_DATE(),INTERVAL 33 DAY))`);
  const ex = Number(sql(`SELECT id FROM exhibitions WHERE slug='gl-expo-${st}'`));
  // one registration per status needs distinct users (a user can register once per exhibition)
  const ids = [];
  for (const status of ['pending', 'approved', 'approved', 'rejected']) {
    sql(`INSERT INTO users (name,email,password_hash,role,country) VALUES ('glb','glb-${ids.length}-${st}@test.invalid','x','buyer','')`);
    const id = Number(sql(`SELECT id FROM users WHERE email='glb-${ids.length}-${st}@test.invalid'`));
    ids.push(id);
    sql(`INSERT INTO expo_registrations (exhibition_id,user_id,status) VALUES (${ex},${id},'${status}')`);
  }
  sql(`UPDATE users SET created_at = DATE_SUB(NOW(), INTERVAL 400 DAY) WHERE id = ${ids[0]}`);

  console.log('\n== the numbers');
  ok((await fetch(BASE + '/api/admin/stats')).status === 401, 'signed-out is refused');
  ok((await fetch(BASE + '/api/admin/stats', { headers: H(u.bT) })).status === 401, 'a buyer is refused');
  const r = await fetch(BASE + '/api/admin/stats', { headers: H(u.aT) });
  const j = await r.json();
  ok(r.status === 200 && (r.headers.get('cache-control') || '').includes('no-store'), 'an admin gets them, never cached');
  ok(j.buyers.total === Number(sql("SELECT COUNT(*) FROM users WHERE role='buyer'")), 'buyers: total matches', j.buyers);
  ok(j.buyers.last7Days === Number(sql("SELECT COUNT(*) FROM users WHERE role='buyer' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)")) && j.buyers.last30Days >= j.buyers.last7Days, 'buyers: new this week / in 30 days match');
  ok(j.buyers.total - j.buyers.last30Days >= 1, 'a buyer from 400 days ago is not counted as new');
  ok(j.registrations.total === Number(sql('SELECT COUNT(*) FROM expo_registrations')), 'registrations: total matches', j.registrations);
  ok(j.registrations.byStatus.pending >= 1 && j.registrations.byStatus.approved >= 2 && j.registrations.byStatus.rejected >= 1, 'registrations: by status', j.registrations.byStatus);
  ok(Object.values(j.registrations.byStatus).reduce((a, b) => a + b, 0) === j.registrations.total, 'and the statuses add up to the total');
  ok(j.buyersPerWeek.length === 8 && j.buyersPerWeek.every((n) => Number.isInteger(n) && n >= 0), 'eight weekly numbers', j.buyersPerWeek);
  ok(j.buyersPerWeek[7] >= 1 && j.buyersPerWeek.reduce((a, b) => a + b, 0) <= j.buyers.last30Days + Number(sql("SELECT COUNT(*) FROM users WHERE role='buyer' AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY) AND created_at >= DATE_SUB(NOW(), INTERVAL 56 DAY)")) , 'the last bar (this week) has the new buyers; the sum is consistent', j.buyersPerWeek);
  ok(j.topExhibitions.length >= 1 && j.topExhibitions.length <= 5 && j.topExhibitions.every((e, i, a) => i === 0 || a[i - 1].registrations >= e.registrations), 'top exhibitions: at most 5, most registered first', j.topExhibitions.map((e) => e.registrations));
  ok(j.topExhibitions.some((e) => e.slug === 'gl-expo-' + st && e.registrations === 4) || j.topExhibitions.length === 5, 'and the test exhibition has its 4 registrations (or is just outside the top 5)');
  ok(j.pointsHeld === Number(sql('SELECT COALESCE(SUM(balance),0) FROM wallets')), 'points held matches the wallets', j.pointsHeld);

  console.log('\n== the admin home');
  const br = await launch();
  const open = async (token, vp = { width: 1200, height: 900 }) => { const c = await br.newContext({ viewport: vp, extraHTTPHeaders: { 'x-forwarded-for': ip() } }); await c.addCookies([{ name: 'token', value: token, url: BASE }]); return [c, await c.newPage()]; };
  let [c, p] = await open(u.aT);
  await p.goto(BASE + '/en/admin', { waitUntil: 'networkidle' });
  await p.getByRole('heading', { name: 'At a glance' }).waitFor();
  ok(await p.getByText('Registrations by status').isVisible() && await p.getByText('New buyers per week').isVisible() && await p.getByText('Most registrations').isVisible(), 'the panel shows the numbers, the weekly bars and the top list');
  const dd = await p.locator('#glance-title').locator('xpath=ancestor::section').innerText();
  ok(dd.includes(Number(j.buyers.total).toLocaleString('en')), 'with the buyer total written out', dd.slice(0, 200));
  const vio = await axeViolations(p); ok(vio.length === 0, 'axe 0 violations', vio);
  await p.screenshot({ path: require('./helpers/common.js').SHOTS + '/admin-glance.png', fullPage: false });
  await c.close();
  for (const loc of ['en', 'ru', 'zh']) {
    for (const width of [375, 1200]) {
      [c, p] = await open(u.aT, { width, height: 900 });
      await p.goto(BASE + `/${loc}/admin`, { waitUntil: 'networkidle' });
      await p.locator('#glance-title').waitFor();
      const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const raw = await p.evaluate(() => /adminHome\.glance\./.test(document.body.innerText));
      ok(over <= 0 && !raw, `${loc} ${width}px: fits, in words`, [over, raw]);
      await c.close();
    }
  }
  sql(`DELETE FROM expo_registrations WHERE exhibition_id=${ex}; DELETE FROM exhibitions WHERE id=${ex}; DELETE FROM users WHERE email LIKE 'glb-%-${st}@test.invalid'`);
  await br.close();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
