// Registering for several exhibitions: a warning when some are held on the same days.
const { BASE, sql, ok, done, mkUsers, connect, SHOTS } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const ip = () => '10.8.' + Math.floor(Math.random() * 250) + '.' + (Math.floor(Math.random() * 250) + 1);

(async () => {
  const db = await connect();
  const st = Date.now();
  const S = String(st).slice(-6);
  const u = await mkUsers('ov');
  const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const mk = async (tag, from, to) => {
    const slug = `ov-${tag}-${st}`;
    await db.query('INSERT INTO exhibitions (slug,title,start_date,end_date,city,registration_enabled) VALUES (?,?,?,?,?,1)', [slug, `Overlap ${tag} ${S}`, day(from), day(to), 'Guangzhou']);
    const [[row]] = await db.query('SELECT id FROM exhibitions WHERE slug=?', [slug]);
    return { slug, id: row.id, title: `Overlap ${tag} ${S}` };
  };
  // O1 200-203; O2 202-205 (overlaps O1); O3 210-213 (alone); O4 203-204 (overlaps O1 and O2; registered);
  // O5 201-202 (overlaps O1; cancelled registration); O6 204-206 (O2 only: starts the day after O1 ends); O7 203-205 (starts on O1's last day)
  const O1 = await mk('one', 200, 203), O2 = await mk('two', 202, 205), O3 = await mk('three', 210, 213), O4 = await mk('four', 203, 204);
  const O5 = await mk('five', 201, 202), O6 = await mk('six', 204, 206);
  const holds = (x, status) => db.query("INSERT INTO expo_registrations (exhibition_id,user_id,custom_answers,form_schema_snapshot,status) VALUES (?,?,'{}','[]',?)", [x.id, u.bId, status]);
  await holds(O4, 'pending'); await holds(O5, 'cancelled');

  const br = await launch();
  const open = async (loc = 'en', vp = { width: 1100, height: 1000 }) => {
    const c = await br.newContext({ viewport: vp, extraHTTPHeaders: { 'x-forwarded-for': ip() } });
    await c.addCookies([{ name: 'token', value: u.bT, url: BASE }]);
    const p = await c.newPage();
    await p.goto(BASE + `/${loc}/dashboard/buyer/registrations`, { waitUntil: 'networkidle' });
    return [c, p];
  };
  const search = loc => (loc === 'ru' ? 'Поиск выставок' : loc === 'zh' ? '搜索展会' : 'Search exhibitions');

  console.log('\n== ticking exhibitions held on the same days');
  let [c, p] = await open();
  await p.getByLabel('Search exhibitions').fill('Overlap');
  await p.getByLabel(O1.title).waitFor();
  const warn = p.getByRole('status').filter({ hasText: 'same days as another one' });
  const notes = async () => (await p.locator('p', { hasText: /^\s*(⚠\s*)?Same days as/ }).allInnerTexts()).map((x) => x.replace(/^⚠\s*/, '').trim());
  ok((await notes()).length === 0 && (await warn.count()) === 0, 'nothing ticked: no warning, no notes');
  await p.getByLabel(O3.title).check();
  ok((await notes()).length === 0 && (await warn.count()) === 0, 'an exhibition on days of its own gives no warning');
  await p.getByLabel(O3.title).uncheck();
  await p.getByLabel(O1.title).check();
  await warn.waitFor();
  ok((await warn.innerText()).startsWith('1 exhibition you ticked takes place on the same days as another one.'), 'an exhibition held on the same days as one the buyer is already registered for is warned about', await warn.innerText());
  let n = await notes();
  ok(n.length === 1 && n[0] === `Same days as: ${O4.title} (already registered)`, 'the row names that registration, and only that one (the cancelled registration, the one starting the day after, and the unticked ones are not counted)', n);
  await p.getByLabel(O2.title).check();
  await p.getByText(/^2 exhibitions you ticked/).waitFor();
  n = await notes();
  ok((await warn.innerText()).startsWith('2 exhibitions you ticked take place on the same days as another one.'), 'ticking a second one on overlapping days warns about both', await warn.innerText());
  ok(n.length === 2 && n.every((x) => x.includes(O4.title)) && n.find((x) => x.includes(O2.title)) !== n.find((x) => x.includes(O1.title)), 'each row names the other ticked one as well', n);
  await p.getByLabel(O3.title).check();
  n = await notes();
  ok(n.length === 2 && !n.some((x) => x.includes(O3.title)) && await p.getByRole('button', { name: /^Register for 3 exhibitions/ }).isEnabled(), 'an exhibition on other days is not mentioned, and the warning does not stop the registration', n);
  const v = await axeViolations(p); ok(v.length === 0, 'axe 0 violations with the warning', v);
  await p.screenshot({ path: SHOTS + '/bulk-overlap.png' });
  await p.getByLabel(O2.title).uncheck();
  await p.getByText(/^1 exhibition you ticked/).waitFor();
  ok((await notes()).length === 1, 'unticking one takes its note away');
  await p.getByLabel(O1.title).uncheck(); await p.getByLabel(O3.title).uncheck();
  ok((await notes()).length === 0 && (await warn.count()) === 0, 'and with nothing ticked there is nothing');

  console.log('\n== the edges: the same last day, and the day after');
  await p.getByLabel(O6.title).check();
  n = await notes();
  ok(n.length === 1 && n[0] === `Same days as: ${O4.title} (already registered)`, 'one starting on the last day of another (204-206 vs 203-204) counts', n);
  await p.getByLabel(O1.title).check();
  n = await notes();
  ok(n.length === 2 && !n.some((x) => x.includes(O6.title)) && !n.some((x) => x.includes(O1.title)), 'one starting the day after another ends (204-206 vs 200-203) does not', n);
  await c.close();

  console.log('\n== other languages');
  for (const [loc, wtext, row] of [['ru', 'выбранные выставки проходят в те же дни', 'В те же дни:'], ['zh', '个与其他展会日期重叠', '与以下展会日期重叠：']]) {
    [c, p] = await open(loc, { width: 375, height: 800 });
    await p.getByLabel(search(loc)).fill('Overlap');
    await p.getByLabel(O1.title).waitFor();
    await p.getByLabel(O1.title).check(); await p.getByLabel(O2.title).check();
    await p.getByText(new RegExp(wtext)).waitFor();
    const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const raw = await p.evaluate(() => /bulkRegister\./.test(document.body.innerText));
    ok(over <= 0 && !raw && (await p.getByText(new RegExp(row)).count()) >= 2, `${loc} 375px: the warning and the row notes are shown, fit and are translated`, [over, raw]);
    const vv = await axeViolations(p); ok(vv.length === 0, `${loc}: axe 0 violations`, vv);
    await c.close();
  }

  await db.query('DELETE FROM expo_registrations WHERE exhibition_id IN (?)', [[O1.id, O2.id, O3.id, O4.id, O5.id, O6.id]]);
  await db.query('DELETE FROM exhibitions WHERE id IN (?)', [[O1.id, O2.id, O3.id, O4.id, O5.id, O6.id]]);
  await db.end(); await br.close();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
