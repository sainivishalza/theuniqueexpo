// "Your profile is N% complete": on the profile page and on the register screen.
const { BASE, sql, ok, done, mkUsers, connect, PNG, SHOTS } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const ip = () => '10.10.' + Math.floor(Math.random() * 250) + '.' + (Math.floor(Math.random() * 250) + 1);
const H = (t) => ({ 'Content-Type': 'application/json', cookie: 'token=' + t, 'x-forwarded-for': ip() });
const getList = async (t) => (await fetch(BASE + '/api/buyer-registrations', { headers: H(t) })).json();
const patch = (t, body) => fetch(BASE + '/api/buyer-profile', { method: 'PATCH', headers: H(t), body: JSON.stringify(body) });
const putDoc = (t, key) => fetch(BASE + `/api/buyer-profile/documents/${key}`, { method: 'PUT', headers: H(t), body: JSON.stringify({ value: PNG }) });

(async () => {
  const db = await connect();
  const st = Date.now();
  const S = String(st).slice(-6);
  const slug = `pc-${st}`;
  await db.query('INSERT INTO exhibitions (slug,title,start_date,end_date,city,registration_enabled) VALUES (?,?,?,?,?,1)', [slug, `Complete ${S}`, new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 10), new Date(Date.now() + 43 * 86400000).toISOString().slice(0, 10), 'Guangzhou']);
  const u = await mkUsers('pc');

  console.log('\n== the numbers');
  let j = await getList(u.bT);
  ok(j.completeness && j.completeness.percent === 10 && j.completeness.missing.length === 9 && !j.completeness.missing.includes('email'), 'an empty profile with a real account e-mail: 10% (the e-mail counts), nine things missing', j.completeness);
  await patch(u.bT, { gender: 'male', nationality: 'Russia', passportNumber: 'P12', phoneNumber: '+7 1', companyName: 'PC Co' });
  j = await getList(u.bT);
  ok(j.completeness.percent === 60 && j.completeness.missing.join() === 'docPassportFront,docBusinessCard,docVisaPage,docBusinessLicense', 'the five text details bring it to 60%, the four documents are what is missing', j.completeness);
  await putDoc(u.bT, 'passportFront'); await putDoc(u.bT, 'businessCard');
  j = await getList(u.bT);
  ok(j.completeness.percent === 80 && j.completeness.missing.join() === 'docVisaPage,docBusinessLicense', 'two documents: 80%', j.completeness);
  ok((await fetch(BASE + '/api/buyer-registrations')).status === 401, 'signed-out still gets nothing');
  // A buyer with no real e-mail: the contact e-mail counts instead
  const w = await mkUsers('pw');
  sql(`UPDATE users SET email='phone-1394${String(st).slice(-7)}@noemail.invalid' WHERE id=${w.bId}`);
  j = await getList(w.bT); ok(j.completeness.missing.includes('email'), 'with no real account e-mail, the e-mail is missing');
  await patch(w.bT, { contactEmail: 'pw@example.com' });
  j = await getList(w.bT); ok(!j.completeness.missing.includes('email'), 'until a contact e-mail is on the profile');

  console.log('\n== on the register screen');
  const br = await launch();
  const open = async (t, path, vp = { width: 1100, height: 1000 }) => {
    const c = await br.newContext({ viewport: vp, extraHTTPHeaders: { 'x-forwarded-for': ip() } });
    await c.addCookies([{ name: 'token', value: t, url: BASE }]);
    const p = await c.newPage();
    await p.goto(BASE + path, { waitUntil: 'networkidle' });
    return [c, p];
  };
  let [c, p] = await open(u.bT, '/en/dashboard/buyer/registrations');
  const box = p.getByRole('region', { name: 'Your profile is 80% complete' });
  await box.waitFor();
  ok(await box.getByRole('progressbar').getAttribute('aria-valuenow') === '80', 'a progress bar at 80%');
  ok(/Visa page, Business license/.test(await box.innerText()), 'naming what is missing in words', await box.innerText());
  ok((await box.getByRole('link', { name: 'Complete my profile' }).getAttribute('href')).endsWith('/dashboard/buyer/profile'), 'and a link to the profile');
  const v1 = await axeViolations(p); ok(v1.length === 0, 'axe 0 violations', v1);
  await p.screenshot({ path: SHOTS + '/profile-completeness-register.png' });
  await c.close();

  console.log('\n== on the profile page');
  [c, p] = await open(u.bT, '/en/dashboard/buyer/profile');
  await p.getByRole('region', { name: 'Your profile is 80% complete' }).waitFor();
  ok(true, 'the same meter is at the top of the profile');
  await p.getByLabel('Visa page').first().setInputFiles({ name: 'v.png', mimeType: 'image/png', buffer: Buffer.from(PNG.split(',')[1], 'base64') });
  await p.getByRole('region', { name: 'Your profile is 90% complete' }).waitFor();
  ok(true, 'uploading a document moves it to 90% at once');
  await c.close();
  await putDoc(u.bT, 'businessLicense');
  [c, p] = await open(u.bT, '/en/dashboard/buyer/profile');
  await p.getByText('Your profile has everything exhibitions ask for.').waitFor();
  ok((await p.getByRole('progressbar').count()) === 0, 'at 100% it says so instead of showing a bar');
  await c.close();
  [c, p] = await open(u.bT, '/en/dashboard/buyer/registrations');
  await p.getByRole('heading', { name: 'Register for upcoming exhibitions' }).waitFor();
  ok((await p.getByText(/Your profile is \d+% complete/).count()) === 0, 'and the register screen shows nothing about it');
  await c.close();

  console.log('\n== other languages');
  for (const [loc, title, link, missing] of [['ru', 'Ваш профиль заполнен на 60%', 'Заполнить профиль', 'Ещё не хватает:'], ['zh', '您的资料已完成 60%', '完善我的资料', '还缺少：']]) {
    const x = await mkUsers('px' + loc);
    await patch(x.bT, { gender: 'male', nationality: 'Russia', passportNumber: 'P12', phoneNumber: '+7 1', companyName: 'PC Co' });
    [c, p] = await open(x.bT, `/${loc}/dashboard/buyer/registrations`, { width: 375, height: 800 });
    const r = p.getByRole('region', { name: title });
    await r.waitFor();
    const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const raw = await p.evaluate(() => /profileCompleteness\.|bulkRegister\.core/.test(document.body.innerText));
    ok(over <= 0 && !raw && (await r.getByRole('link', { name: link }).isVisible()) && (await r.innerText()).includes(missing), `${loc} 375px: fits, translated, with the missing items`, [over, raw, await r.innerText()]);
    const v = await axeViolations(p); ok(v.length === 0, `${loc}: axe 0 violations`, v);
    await c.close();
  }

  await db.query('DELETE FROM exhibitions WHERE slug=?', [slug]);
  await db.end(); await br.close();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
