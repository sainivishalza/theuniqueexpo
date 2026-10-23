// "Suggested for you": exhibitions that match what the buyer has registered for or what their profile says.
const { BASE, sql, ok, done, mkUsers, connect, SHOTS } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const ip = () => '10.11.' + Math.floor(Math.random() * 250) + '.' + (Math.floor(Math.random() * 250) + 1);
const H = (t) => ({ 'Content-Type': 'application/json', cookie: 'token=' + t, 'x-forwarded-for': ip() });
const getList = async (t) => (await (await fetch(BASE + '/api/buyer-registrations', { headers: H(t) })).json()).exhibitions;
const patch = (t, body) => fetch(BASE + '/api/buyer-profile', { method: 'PATCH', headers: H(t), body: JSON.stringify(body) });

(async () => {
  const db = await connect();
  const st = Date.now();
  const S = String(st).slice(-6);
  const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const mk = async (tag, industry, from) => {
    const slug = `sg-${tag}-${st}`;
    await db.query('INSERT INTO exhibitions (slug,title,start_date,end_date,city,industry,registration_enabled) VALUES (?,?,?,?,?,?,1)', [slug, `Suggest ${tag} ${S}`, day(from), day(from + 3), 'Guangzhou', industry]);
    const [[row]] = await db.query('SELECT id FROM exhibitions WHERE slug=?', [slug]);
    return { slug, id: row.id, title: `Suggest ${tag} ${S}`, industry };
  };
  // Dates run in the order of the letters so the "as they come" order is a, b, c, ...
  const a = await mk('a', 'Textile & Garments', 300), b = await mk('b', 'Machinery', 301), c = await mk('c', 'Electronics', 302), d = await mk('d', 'Electronics', 303);
  const e = await mk('e', 'Trade & Sourcing', 304), f = await mk('f', 'Pharma', 305), g = await mk('g', '', 306), h = await mk('h', 'Furniture', 307), i = await mk('i', 'Furniture', 308), k = await mk('k', 'Fashion & Lifestyle', 309);
  const u = await mkUsers('sg');
  await patch(u.bT, { companyField: 'Machinery/Equipments/Automation', purchaseIntention: 'Pharma raw materials and trade' });
  const reg = (x, status) => db.query("INSERT INTO expo_registrations (exhibition_id,user_id,custom_answers,form_schema_snapshot,status) VALUES (?,?,'{}','[]',?)", [x.id, u.bId, status]);
  await reg(d, 'approved');   // registered for Electronics -> c is suggested
  await reg(i, 'cancelled');  // cancelled Furniture -> h is not
  await reg(k, 'rejected');   // rejected Fashion -> not a signal either

  console.log('\n== the API');
  ok((await fetch(BASE + '/api/buyer-registrations')).status === 401, 'signed-out gets nothing');
  const list = await getList(u.bT);
  const by = (x) => list.find((y) => y.slug === x.slug);
  ok(by(b).suggestion && by(b).suggestion.reason === 'profile' && by(b).suggestion.field === 'Machinery/Equipments/Automation', 'an exhibition whose industry shares a word with the business field is suggested, with that text as the reason', by(b).suggestion);
  ok(by(f).suggestion && by(f).suggestion.reason === 'profile' && /Pharma raw materials/.test(by(f).suggestion.field), 'and one matching what the buyer wants to buy', by(f).suggestion);
  ok(by(c).suggestion && by(c).suggestion.reason === 'history', 'an exhibition in the same industry as one already registered for is suggested', by(c).suggestion);
  ok(by(d).suggestion === null && by(d).status === 'approved', 'the one already registered for is not suggested again');
  ok(by(a).suggestion === null, 'an unrelated industry is not suggested');
  ok(by(e).suggestion === null, 'general words ("trade", "sourcing") are not enough, even though the profile says "trade"');
  ok(by(g).suggestion === null, 'an exhibition with no industry is not suggested');
  ok(by(h).suggestion === null && by(i).suggestion === null, 'a cancelled registration is not a signal', [by(h).suggestion, by(i).suggestion]);
  ok(by(k).suggestion === null, 'neither is a rejected one');
  const v = await mkUsers('sv');
  const list2 = await (await fetch(BASE + '/api/buyer-registrations', { headers: H(v.bT) })).json();
  ok(list2.exhibitions.filter((x) => x.slug.startsWith('sg-')).every((x) => x.suggestion === null), 'a buyer with no history and an empty profile gets no suggestions');
  const loc = await (await fetch(BASE + '/api/buyer-registrations?locale=ru', { headers: H(u.bT) })).json();
  ok(loc.exhibitions.find((x) => x.slug === b.slug).suggestion.reason === 'profile', 'suggestions work in any language (matching uses the original industry text)');

  console.log('\n== the screen');
  const br = await launch();
  const open = async (locale = 'en', vp = { width: 1100, height: 1400 }) => {
    const ctx = await br.newContext({ viewport: vp, extraHTTPHeaders: { 'x-forwarded-for': ip() } });
    await ctx.addCookies([{ name: 'token', value: u.bT, url: BASE }]);
    const p = await ctx.newPage();
    await p.goto(BASE + `/${locale}/dashboard/buyer/registrations`, { waitUntil: 'networkidle' });
    return [ctx, p];
  };
  let [ctx, p] = await open();
  await p.getByLabel('Search exhibitions').fill('Suggest');
  await p.getByLabel(a.title).waitFor();
  const titles = await p.locator('ul li label[for^="be-"]').allInnerTexts();
  const order = titles.filter((t) => t.startsWith('Suggest')).map((t) => t.split(' ')[1]);
  ok(order.slice(0, 3).sort().join() === ['b', 'c', 'f'].join(), 'the suggested ones come first', order);
  ok(order.slice(3).join('') === 'adeghik', 'the rest keep their order', order);
  ok((await p.getByText('Suggested for you').count()) === 3, 'each carries a "Suggested for you" tag');
  ok(await p.getByText('Matches your business: Machinery/Equipments/Automation.').isVisible() && await p.getByText('You registered for another Electronics exhibition.').isVisible(), 'and says why');
  const vv = await axeViolations(p); ok(vv.length === 0, 'axe 0 violations', vv);
  await p.screenshot({ path: SHOTS + '/suggested.png' });
  await p.getByLabel(b.title).check();
  ok(await p.getByText('1 exhibition selected').isVisible(), 'a suggested exhibition is ticked like any other');
  await ctx.close();

  console.log('\n== other languages');
  for (const [lc, tag, why] of [['ru', 'Рекомендуем вам', 'Подходит вашему бизнесу:'], ['zh', '为您推荐', '与您的业务相符：']]) {
    [ctx, p] = await open(lc, { width: 375, height: 900 });
    await p.getByLabel(lc === 'ru' ? 'Поиск выставок' : '搜索展会').fill('Suggest');
    await p.getByText(tag).first().waitFor();
    const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const raw = await p.evaluate(() => /bulkRegister\./.test(document.body.innerText));
    ok(over <= 0 && !raw && (await p.getByText(new RegExp(why)).count()) >= 1, `${lc} 375px: tags and reasons fit and are translated`, [over, raw]);
    const xv = await axeViolations(p); ok(xv.length === 0, `${lc}: axe 0 violations`, xv);
    await ctx.close();
  }

  await db.query('DELETE FROM expo_registrations WHERE user_id=?', [u.bId]);
  await db.query('DELETE FROM exhibitions WHERE slug LIKE ?', [`sg-%-${st}`]);
  await db.end(); await br.close();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
