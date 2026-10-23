// The admin's "All registrations" page.
const bcrypt = require('bcryptjs');
const { BASE, sql, ok, done, mkUsers, connect, SHOTS } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const ip = () => '10.7.' + Math.floor(Math.random() * 250) + '.' + (Math.floor(Math.random() * 250) + 1);

(async () => {
  const db = await connect();
  const st = Date.now();
  const S = String(st).slice(-6);
  const u = await mkUsers('au');
  const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const mkExpo = async (tag, startIn) => {
    const slug = `au-${tag}-${st}`;
    await db.query('INSERT INTO exhibitions (slug,title,start_date,end_date,city,registration_enabled) VALUES (?,?,?,?,?,1)', [slug, `Allui ${tag} ${st}`, day(startIn), day(startIn + 3), 'Guangzhou']);
    const [[row]] = await db.query('SELECT id FROM exhibitions WHERE slug=?', [slug]);
    return { slug, id: row.id, title: `Allui ${tag} ${st}` };
  };
  const XA = await mkExpo('alpha', 30), XB = await mkExpo('beta', 60), XC = await mkExpo('many', 90);
  const h = bcrypt.hashSync('pass1234', 10);
  const people = [];
  const mk = async (name, country, company) => {
    const email = `au-${people.length}-${st}@test.invalid`;
    sql(`INSERT INTO users (name,email,password_hash,role,country,status) VALUES ('${name}','${email}','${h}','buyer','','active')`);
    const id = Number(sql(`SELECT id FROM users WHERE email='${email}'`));
    people.push(id);
    return { id, name, country, company, email };
  };
  const reg = (x, b, status) => db.query('INSERT INTO expo_registrations (exhibition_id,user_id,full_name,nationality,company_name,email,status,custom_answers,form_schema_snapshot) VALUES (?,?,?,?,?,?,?,?,?)', [x.id, b.id, b.name, b.country, b.company, b.email, status, '{}', '[]']);
  const ana = await mk(`Ana Zed ${S}`, 'Russia', 'Zed Trading'), bo = await mk(`Bo Yang ${S}`, 'China', 'Yang Co'), cy = await mk(`Cy Xu ${S}`, 'Jordan', `Xu Imports ${S}`);
  await reg(XA, ana, 'pending'); await reg(XA, bo, 'pending'); await reg(XB, ana, 'approved'); await reg(XB, cy, 'confirmed');
  for (let i = 1; i <= 55; i++) { const b = await mk(`Many Buyer ${S} ` + String(i).padStart(2, '0'), 'Egypt', 'Many Co'); await reg(XC, b, 'pending'); }

  const br = await launch();
  const open = async (path, vp = { width: 1280, height: 1000 }) => {
    const c = await br.newContext({ viewport: vp, extraHTTPHeaders: { 'x-forwarded-for': ip() } });
    await c.addCookies([{ name: 'token', value: u.aT, url: BASE }]);
    const p = await c.newPage();
    await p.goto(BASE + path, { waitUntil: 'networkidle' });
    return [c, p];
  };

  console.log('\n== on the admin home and in the menu');
  let [c, p] = await open('/en/admin');
  ok(await p.getByRole('link', { name: /All registrations/ }).first().isVisible(), 'the admin home offers "All registrations"');
  await c.close();

  console.log('\n== the page');
  [c, p] = await open('/en/admin/registrations');
  await p.getByRole('heading', { level: 1, name: 'All registrations' }).waitFor();
  await p.getByRole('row').nth(1).waitFor();
  ok(/registrations/.test(await p.locator('h1 + p').innerText()), 'a heading with the number of registrations', await p.locator('h1 + p').innerText());
  await p.getByLabel('Exhibition', { exact: true }).selectOption(XB.slug);
  await p.getByRole('link', { name: XB.title }).first().waitFor();
  await p.getByText('Bo Yang ' + S).waitFor({ state: 'detached' });
  ok(await p.getByText('Cy Xu ' + S).first().isVisible() && await p.getByText('Ana Zed ' + S).first().isVisible() && (await p.getByText('Bo Yang ' + S).count()) === 0, 'choosing an exhibition lists only its registrations');
  ok((await p.getByRole('link', { name: XB.title }).first().getAttribute('href')).endsWith(`/admin/exhibitions/${XB.slug}/registrations`), 'each exhibition name links to that exhibition\'s own page');
  await p.getByRole('button', { name: /^confirmed \(1\)/ }).click();
  await p.getByText('Ana Zed ' + S).waitFor({ state: 'detached' });
  ok((await p.getByText('Ana Zed ' + S).count()) === 0 && await p.getByText('Cy Xu ' + S).first().isVisible(), 'a status chip narrows it further');
  await p.getByRole('button', { name: /^All \(/ }).click();
  await p.getByLabel('Country').selectOption('Russia');
  await p.getByText('Cy Xu ' + S).waitFor({ state: 'detached' });
  ok((await p.getByText('Cy Xu ' + S).count()) === 0 && await p.getByText('Ana Zed ' + S).first().isVisible(), 'and so does a country');
  await p.getByLabel('Country').selectOption('');
  await p.getByLabel('Exhibition', { exact: true }).selectOption('');
  await p.getByLabel('Search registrations').fill('xu imports ' + S);
  await p.getByText('Cy Xu ' + S).first().waitFor();
  await p.getByText('Bo Yang ' + S).waitFor({ state: 'detached' });
  ok((await p.getByText('Bo Yang ' + S).count()) === 0, 'typing in the search box searches the whole list on the server (by company here)');
  const href = await p.getByRole('link', { name: /Export to Excel/ }).getAttribute('href');
  ok(new RegExp('q=xu(\\+|%20)imports').test(href), 'the export link carries the filters', href);
  const v1 = await axeViolations(p); ok(v1.length === 0, 'the page: axe 0 violations', v1);
  await p.screenshot({ path: SHOTS + '/all-registrations.png' });
  await p.getByLabel('Search registrations').fill('zzzz-nothing');
  await p.getByRole('heading', { name: 'No registrations found' }).waitFor();
  ok(await p.getByRole('button', { name: 'Clear filters' }).isVisible(), 'nothing found says so and offers "Clear filters"');
  await p.getByRole('button', { name: 'Clear filters' }).click();
  await p.getByRole('row').nth(1).waitFor();
  ok(true, 'which brings the list back');

  console.log('\n== pages');
  await p.getByLabel('Exhibition', { exact: true }).selectOption(XC.slug);
  await p.getByText('Page 1 of 2').waitFor();
  ok(await p.getByText('1–50 of 55').isVisible() && await p.getByRole('button', { name: 'Previous' }).isDisabled(), 'page 1 of 2, "1–50 of 55", Previous is off');
  await p.getByRole('button', { name: 'Next' }).click();
  await p.getByText('Page 2 of 2').waitFor();
  ok(await p.getByText('51–55 of 55').isVisible() && await p.getByRole('button', { name: 'Next' }).isDisabled(), 'page 2 shows the last five and Next is off');
  await p.getByRole('button', { name: 'Previous' }).click();
  await p.getByText('Page 1 of 2').waitFor();

  console.log('\n== approving from here');
  await p.getByLabel('Exhibition', { exact: true }).selectOption(XA.slug);
  await p.getByText('Bo Yang ' + S).first().waitFor();
  await p.getByLabel('Select all shown').check();
  await p.getByRole('button', { name: 'Approve', exact: true }).click();
  const dlg = p.getByRole('dialog', { name: 'Approve 2 registrations' });
  await dlg.waitFor();
  await dlg.getByLabel('Buyers confirm attendance by').fill(day(25));
  await dlg.getByRole('button', { name: 'Approve 2 registrations' }).click();
  await dlg.getByRole('status').waitFor();
  ok((await dlg.getByRole('status').innerText()) === '2 registrations updated.', 'two registrations are approved at once');
  await dlg.getByRole('button', { name: 'Close' }).click();
  await p.getByText(/Confirm by/).first().waitFor();
  ok((await p.getByText(/Confirm by/).count()) === 2 && Number(sql(`SELECT COUNT(*) FROM expo_registrations WHERE exhibition_id=${XA.id} AND status='approved'`)) === 2, 'the list shows them approved, with the confirm-by date');
  await c.close();

  console.log('\n== other languages and a phone');
  for (const [loc, title, nothing] of [['ru', 'Все регистрации', 'Регистрации не найдены'], ['zh', '全部报名', '没有找到报名']]) {
    [c, p] = await open(`/${loc}/admin/registrations`, { width: 375, height: 800 });
    await p.getByRole('heading', { level: 1, name: title }).waitFor();
    await p.getByRole('row').nth(1).waitFor();
    const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const raw = await p.evaluate(() => /adminAllRegistrations\.|adminRegistrationsCommon\./.test(document.body.innerText));
    ok(over <= 0 && !raw, `${loc} 375px: fits and is in words`, [over, raw]);
    const v = await axeViolations(p); ok(v.length === 0, `${loc}: axe 0 violations`, v);
    await p.getByPlaceholder(loc === 'ru' ? 'Имя, e-mail, компания, номер покупателя…' : '姓名、邮箱、公司、采购商编号…').fill('zzzz-nothing');
    await p.getByRole('heading', { name: nothing }).waitFor();
    ok(true, `${loc}: the empty state is translated`);
    await c.close();
  }

  await db.query('DELETE FROM expo_registrations WHERE exhibition_id IN (?)', [[XA.id, XB.id, XC.id]]);
  await db.query('DELETE FROM exhibitions WHERE id IN (?)', [[XA.id, XB.id, XC.id]]);
  sql(`DELETE FROM users WHERE email LIKE 'au-%-${st}@test.invalid'`);
  await db.end(); await br.close();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
