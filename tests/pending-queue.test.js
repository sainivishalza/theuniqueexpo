// "Needs your attention": exhibition registrations that have waited more than three days, and the way into them.
const bcrypt = require('bcryptjs');
const { BASE, sql, ok, done, mkUsers, connect, SHOTS } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const ip = () => '10.12.' + Math.floor(Math.random() * 250) + '.' + (Math.floor(Math.random() * 250) + 1);
const H = (t) => ({ 'Content-Type': 'application/json', cookie: 'token=' + t, 'x-forwarded-for': ip() });
const attention = async (t) => (await fetch(BASE + '/api/admin/attention', { headers: H(t) })).json();
const all = async (t, qs) => (await fetch(BASE + '/api/admin/expo-registrations/all?' + qs, { headers: H(t) })).json();

(async () => {
  const db = await connect();
  const st = Date.now();
  const S = String(st).slice(-6);
  const u = await mkUsers('pq');
  const h = bcrypt.hashSync('pass1234', 10);
  const slug = `pq-${st}`;
  await db.query('INSERT INTO exhibitions (slug,title,start_date,end_date,city,registration_enabled) VALUES (?,?,DATE_ADD(UTC_DATE(),INTERVAL 40 DAY),DATE_ADD(UTC_DATE(),INTERVAL 43 DAY),?,1)', [slug, `Queue ${S}`, 'Guangzhou']);
  const [[ex]] = await db.query('SELECT id FROM exhibitions WHERE slug=?', [slug]);
  const buyers = [];
  for (let i = 0; i < 6; i++) {
    const email = `pq-${i}-${st}@test.invalid`;
    sql(`INSERT INTO users (name,email,password_hash,role,country,status) VALUES ('Queue ${i} ${S}','${email}','${h}','buyer','','active')`);
    buyers.push(Number(sql(`SELECT id FROM users WHERE email='${email}'`)));
  }
  const reg = (uid, status, daysAgo) => db.query(`INSERT INTO expo_registrations (exhibition_id,user_id,status,custom_answers,form_schema_snapshot,created_at) VALUES (?,?,?,'{}','[]',DATE_SUB(NOW(), INTERVAL ? HOUR))`, [ex.id, uid, status, Math.round(daysAgo * 24)]);

  console.log('\n== the counts');
  const before = await attention(u.aT);
  await reg(buyers[0], 'pending', 10); await reg(buyers[1], 'pending', 5); await reg(buyers[2], 'pending', 1);
  await reg(buyers[3], 'approved', 20); await reg(buyers[4], 'rejected', 20); await reg(buyers[5], 'pending', 2.9);
  const after = await attention(u.aT);
  ok(after.registrations === before.registrations + 4 && after.staleRegistrations === before.staleRegistrations + 2, 'four are pending, two of them for more than 3 days (10 and 5 days; not 1 day, not 2.9 days, not the approved or rejected ones)', [before, after]);
  ok((await fetch(BASE + '/api/admin/attention', { headers: H(u.bT) })).status === 401, 'buyers cannot read the counts');

  console.log('\n== the list, oldest first');
  let j = await all(u.aT, `exhibition=${slug}&status=pending&sort=oldest`);
  ok(j.rows.length === 4 && j.rows.map((r) => r.createdAt).join() === [...j.rows.map((r) => r.createdAt)].sort().join() && j.rows[0].name === `Queue 0 ${S}`, 'sort=oldest lists the one that waited 10 days first, and goes up from there', j.rows.map((r) => r.name));
  j = await all(u.aT, `exhibition=${slug}&status=pending`);
  ok(j.rows[0].name === `Queue 2 ${S}` || j.rows[0].name === `Queue 5 ${S}`, 'the default is still newest first', j.rows.map((r) => r.name));
  j = await all(u.aT, `exhibition=${slug}&status=pending&sort=sideways`);
  ok(j.rows[0].name !== `Queue 0 ${S}`, 'an unknown sort is ignored');
  const x = await fetch(BASE + `/api/admin/expo-registrations/all/export?exhibition=${slug}&sort=oldest`, { headers: H(u.aT) });
  ok(x.status === 200, 'the export accepts the same sort');

  console.log('\n== on the admin home');
  const br = await launch();
  const open = async (path, vp = { width: 1200, height: 1000 }) => {
    const c = await br.newContext({ viewport: vp, extraHTTPHeaders: { 'x-forwarded-for': ip() } });
    await c.addCookies([{ name: 'token', value: u.aT, url: BASE }]);
    const p = await c.newPage();
    await p.goto(BASE + path, { waitUntil: 'networkidle' });
    return [c, p];
  };
  let [c, p] = await open('/en/admin');
  const row = p.getByRole('link', { name: /exhibition registrations? have waited more than 3 days/ });
  await row.waitFor();
  ok(new RegExp(`^${after.staleRegistrations} exhibition registrations? ha(s|ve) waited more than 3 days`).test((await row.innerText()).replace(/^[^\w]+/, '').trim()), 'a red row names how many have waited more than 3 days', await row.innerText());
  ok(await p.getByRole('link', { name: /exhibition registrations? waits? for approval/ }).isVisible(), 'next to the one for everything pending');
  ok((await row.getAttribute('href')).includes('/admin/registrations?status=pending&sort=oldest'), 'both lead to the pending registrations, oldest first', await row.getAttribute('href'));
  const v = await axeViolations(p); ok(v.length === 0, 'the admin home: axe 0 violations', v);
  await p.screenshot({ path: SHOTS + '/pending-queue.png' });
  await row.click();
  await p.getByRole('heading', { level: 1, name: 'All registrations' }).waitFor();
  await p.getByRole('button', { name: /^pending \(/ }).waitFor();
  ok((await p.getByRole('button', { name: /^pending \(/ }).getAttribute('aria-pressed')) === 'true', 'the list opens on "pending"');
  ok((await p.getByLabel('Sort').inputValue()) === 'oldest', 'sorted oldest first');
  await p.getByLabel('Exhibition', { exact: true }).selectOption(slug);
  await p.getByText(`Queue 0 ${S}`).waitFor();
  const names = await p.locator('tbody tr').evaluateAll((trs) => trs.map((t) => t.innerText.replace(/\s+/g, ' ')));
  ok(names.length === 4 && names[0].includes(`Queue 0 ${S}`) && names[1].includes(`Queue 1 ${S}`), 'with the longest-waiting registration at the top', names.map((n) => n.slice(0, 40)));
  await p.getByLabel('Sort').selectOption('newest');
  await p.locator('tbody tr').first().filter({ hasText: `Queue 2 ${S}` }).waitFor();
  const names2 = await p.locator('tbody tr').evaluateAll((trs) => trs.map((t) => t.innerText.replace(/\s+/g, ' ')));
  ok(!names2[0].includes(`Queue 0 ${S}`), 'and "Newest first" turns it around');
  await c.close();

  console.log('\n== other languages');
  for (const [loc, text] of [['ru', /ждут? больше 3 дней/], ['zh', /已等待超过 3 天/]]) {
    [c, p] = await open(`/${loc}/admin`, { width: 375, height: 800 });
    const r = p.getByRole('link', { name: text }).first();
    await r.waitFor();
    const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const raw = await p.evaluate(() => /adminHome\.attention/.test(document.body.innerText));
    ok(over <= 0 && !raw, `${loc} 375px: the row fits and is in words`, [over, raw]);
    const vv = await axeViolations(p); ok(vv.length === 0, `${loc}: axe 0 violations`, vv);
    await c.close();
  }

  await db.query('DELETE FROM expo_registrations WHERE exhibition_id=?', [ex.id]);
  await db.query('DELETE FROM exhibitions WHERE id=?', [ex.id]);
  sql(`DELETE FROM users WHERE email LIKE 'pq-%-${st}@test.invalid'`);
  await db.end(); await br.close();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
