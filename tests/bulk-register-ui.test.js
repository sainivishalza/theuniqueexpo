// Registering for several exhibitions from the buyer dashboard: the screens.
const { BASE, sql, ok, done, mkUsers, connect, PNG, SHOTS } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ip = () => '10.1.' + Math.floor(Math.random() * 250) + '.' + (Math.floor(Math.random() * 250) + 1);
const J = (v) => (typeof v === 'string' ? JSON.parse(v) : v);

(async () => {
  const db = await connect();
  const st = Date.now();
  const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const mk = async (tag, over = {}) => {
    const slug = `bu-${tag}-${st}`;
    await db.query('INSERT INTO exhibitions (slug,title,start_date,end_date,venue,city,country,industry,description,registration_enabled,registration_form_schema) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [slug, `Bulkui ${tag} ${st}`, day(over.in || 30), day((over.in || 30) + 3), `Hall ${tag}`, 'Guangzhou', 'China', 'Machinery', `About exhibition ${tag}. Lots of machinery.`, over.enabled === false ? 0 : 1, over.schema ? JSON.stringify(over.schema) : null]);
    const [[row]] = await db.query('SELECT id FROM exhibitions WHERE slug=?', [slug]);
    return { slug, id: row.id, title: `Bulkui ${tag} ${st}` };
  };
  const A = await mk('a', { in: 20 }), B = await mk('b', { in: 25 });
  const C = await mk('c', { in: 30, schema: [
    { id: 'f_staff', label: 'Number of staff', type: 'text', required: true, helpText: 'How many people come' },
    { id: 'f_visa', label: 'Do you need a visa letter?', type: 'radio', required: true, options: ['Yes', 'No'] },
    { id: 'f_note', label: 'Comments', type: 'textarea', required: false },
  ] });
  const closed = await mk('closed', { enabled: false });

  const u = await mkUsers('bu');
  await fetch(BASE + '/api/buyer-profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json', cookie: 'token=' + u.bT }, body: JSON.stringify({ companyName: 'UI Co', nationality: 'Russia', passportNumber: 'U123', phoneNumber: '+7 1', gender: 'male' }) });

  const br = await launch();
  const open = async (t, vp = { width: 1200, height: 1000 }) => { const c = await br.newContext({ viewport: vp, extraHTTPHeaders: { 'x-forwarded-for': ip() } }); await c.addCookies([{ name: 'token', value: t, url: BASE }]); return [c, await c.newPage()]; };
  const file = { name: 'doc.png', mimeType: 'image/png', buffer: Buffer.from(PNG.split(',')[1], 'base64') };

  console.log('\n== choosing');
  let [c, p] = await open(u.bT);
  await p.goto(BASE + '/en/dashboard/buyer/registrations', { waitUntil: 'networkidle' });
  await p.getByRole('heading', { name: 'Register for upcoming exhibitions' }).waitFor();
  await p.getByLabel('Search exhibitions').fill(String(st));
  await p.getByText(A.title).waitFor();
  ok(await p.getByText(B.title).isVisible() && await p.getByText(C.title).isVisible() && !(await p.getByText(closed.title).count()), 'the open exhibitions are listed, the closed one is not');
  ok(await p.getByRole('heading', { name: 'Your registrations' }).isVisible(), 'the list of registrations stays below');
  ok(await p.getByText('Select all (3)').isVisible(), 'a "Select all" counts what can be registered for');
  ok(await p.getByText('No exhibition selected').isVisible(), 'nothing is selected at first');
  ok(await p.getByRole('button', { name: 'Register', exact: true }).isDisabled(), 'and the Register button waits for a choice');
  await p.getByRole('button', { name: 'Details' }).first().click();
  await p.getByText('Hall a').waitFor();
  ok(await p.getByText('Machinery').first().isVisible() && await p.getByText(/About exhibition a/).isVisible() && await p.getByText('Guangzhou, China').first().isVisible(), 'Details shows the venue, city, industry and a description');
  const link = p.getByRole('link', { name: /Open the exhibition page/ }).first();
  ok((await link.getAttribute('target')) === '_blank' && /exhibitions\/bu-a-/.test(await link.getAttribute('href')) && (await link.getAttribute('rel')).includes('noopener'), 'with a link to the full page in a new tab');
  await p.getByRole('button', { name: 'Hide details' }).click();
  await p.getByLabel(A.title).check();
  ok(await p.getByText('1 exhibition selected').isVisible(), 'ticking one selects it');
  await p.getByLabel(/Select all/).check();
  ok(await p.getByText('3 exhibitions selected').isVisible(), '"Select all" ticks every one');
  await p.getByLabel(/Select all/).uncheck();
  ok(await p.getByText('No exhibition selected').isVisible(), 'and unticks them');
  await p.getByLabel(A.title).check(); await p.getByLabel(C.title).check();
  const vio = await axeViolations(p); ok(vio.length === 0, 'the list: axe 0 violations', vio);
  await p.screenshot({ path: SHOTS + '/bulk-choose.png' });

  console.log('\n== what is still needed');
  await p.getByRole('button', { name: 'Register for 2 exhibitions' }).click();
  await p.getByRole('heading', { name: 'Check and register' }).waitFor();
  ok(await p.getByText(A.title, { exact: true }).isVisible() && await p.getByText(C.title, { exact: true }).isVisible() && !(await p.getByText(B.title, { exact: true }).count()), 'the two chosen exhibitions are listed');
  ok(!(await p.getByLabel('Company name').count()) && !(await p.getByLabel(/Passport number/).count()) && !(await p.getByLabel('Phone number').count()), 'what the profile has (company, passport, phone) is not asked');
  ok(await p.getByLabel('Company type', { exact: false }).first().isVisible() && await p.getByLabel(/Company size/).isVisible() && await p.getByLabel('Purpose of visit').isVisible() && await p.getByLabel(/Where did you hear/).isVisible(), 'the standard form\'s other questions are asked');
  ok(await p.getByLabel(/Number of staff/).isVisible() && await p.getByText('How many people come').isVisible() && await p.getByRole('group', { name: /visa letter/ }).isVisible(), 'and the organiser\'s own questions, with their help text');
  ok(await p.getByText(/Needed for: .*Bulkui c/).first().isVisible(), 'each says which exhibitions need it');
  ok(!(await p.getByLabel(/Please specify your company type/).count()), '"please specify" is hidden until "Other" is chosen');
  await p.getByLabel('Company type', { exact: false }).first().selectOption('Other');
  await p.getByLabel(/Please specify your company type/).waitFor(); ok(true, 'choosing "Other" shows it');
  await p.getByLabel('Company type', { exact: false }).first().selectOption('Importer');
  ok(await p.getByRole('group', { name: /Markets you export to/ }).isVisible(), 'the markets are a group of ticks');
  const vio2 = await axeViolations(p); ok(vio2.length === 0, 'the questions: axe 0 violations', vio2);
  await p.screenshot({ path: SHOTS + '/bulk-details.png', fullPage: true });
  await p.getByRole('button', { name: 'Register for 2 exhibitions' }).click();
  await p.getByRole('alert').filter({ hasText: 'Please answer' }).waitFor();
  ok(Number(sql(`SELECT COUNT(*) FROM expo_registrations WHERE user_id=${u.bId}`)) === 0, 'pressing Register with answers missing says so and registers nothing');
  await p.getByLabel(/Company size/).selectOption('11-20');
  await p.getByLabel('Purpose of visit').selectOption('Finding New Products');
  await p.getByLabel(/Where did you hear/).selectOption('Ana');
  await p.getByRole('group', { name: /Markets you export to/ }).getByLabel('Europe').check();
  await p.getByLabel(/Number of staff/).fill('8');
  await p.getByRole('group', { name: /visa letter/ }).getByLabel('No').check();
  for (const label of ['Passport front page', 'Business card', 'Visa page', 'Business license']) await p.getByLabel(label).setInputFiles(file);
  await p.getByText(/File chosen: doc.png/).first().waitFor();
  ok(true, 'a chosen file is acknowledged');
  await p.getByRole('button', { name: 'Register for 2 exhibitions' }).click();
  await p.getByRole('heading', { name: 'Your registrations' }).nth(0).waitFor();
  await p.getByText(/registered: it is now waiting for review/).first().waitFor();
  ok((await p.getByText(/registered: it is now waiting for review/).count()) === 2, 'both are registered and the result says so');
  ok(Number(sql(`SELECT COUNT(*) FROM expo_registrations WHERE user_id=${u.bId} AND status='pending'`)) === 2, 'two pending registrations exist');
  await p.screenshot({ path: SHOTS + '/bulk-done.png' });
  await p.getByRole('button', { name: 'Register for more' }).click();
  await p.getByLabel('Search exhibitions').fill(String(st));
  await p.getByText(B.title).waitFor();
  ok(await p.getByLabel(A.title).isDisabled() && await p.getByLabel(C.title).isDisabled() && await p.getByLabel(B.title).isEnabled(), 'the registered ones can no longer be ticked');
  ok((await p.getByText('Waiting for review').count()) >= 2 && await p.getByText('Select all (1)').isVisible(), 'they show their status, and only the open one counts');
  ok(await p.getByRole('link', { name: /Open exhibition page/ }).count() >= 2, 'and the registrations list below shows them');

  console.log('\n== nothing more to ask');
  await p.getByLabel(B.title).check();
  await p.getByRole('button', { name: 'Register for 1 exhibition' }).click();
  await p.getByRole('heading', { name: 'Check and register' }).waitFor();
  ok(await p.getByLabel(/Company size/).inputValue() === '11-20' && await p.getByLabel(/Where did you hear/).inputValue() === 'Ana', 'earlier answers come prefilled');
  ok(!(await p.locator('input[type=file]').count()), 'documents are not asked again (they are on the profile now)');
  await p.getByRole('button', { name: 'Register for 1 exhibition' }).click();
  await p.getByText(/registered: it is now waiting for review/).waitFor();
  ok(Number(sql(`SELECT COUNT(*) FROM expo_registrations WHERE user_id=${u.bId}`)) === 3, 'registered for the third without typing anything');
  await c.close();

  console.log('\n== the profile');
  [c, p] = await open(u.bT);
  await p.goto(BASE + '/en/dashboard/buyer/profile', { waitUntil: 'networkidle' });
  await p.getByRole('heading', { name: 'More information asked by exhibitions' }).waitFor();
  ok(await p.getByText('Company size (number of employees)').isVisible() && await p.getByText('11-20').first().isVisible() && await p.getByText('Number of staff').isVisible() && await p.getByText('8', { exact: true }).isVisible(), 'the answers are shown on the profile page');
  const vio3 = await axeViolations(p); ok(vio3.length === 0, 'profile with the card: axe 0 violations', vio3);
  await c.close();
  ok(sql(`SELECT has_doc_passport_front FROM buyer_profiles WHERE user_id=${u.bId}`) === '1', 'the documents were saved on the profile');

  console.log('\n== phones and languages');
  const w = await mkUsers('bw');
  await fetch(BASE + '/api/buyer-profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json', cookie: 'token=' + w.bT }, body: JSON.stringify({ companyName: 'W Co' }) });
  for (const loc of ['ru', 'zh']) {
    [c, p] = await open(w.bT, { width: 375, height: 800 });
    await p.goto(BASE + `/${loc}/dashboard/buyer/registrations`, { waitUntil: 'networkidle' });
    await p.getByLabel(loc === 'ru' ? 'Поиск выставок' : '搜索展会').fill(String(st));
    await p.getByRole('checkbox').first().waitFor();
    await p.getByRole('checkbox').nth(1).check();
    await p.getByRole('button').filter({ hasText: loc === 'ru' ? 'Зарегистрироваться' : '报名' }).last().click();
    await p.locator('form').waitFor();
    await p.waitForTimeout(500);
    const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const raw = await p.evaluate(() => /(bulkRegister|buyerDashboard)\.[a-zA-Z.]+/.test(document.body.innerText));
    const head = await p.getByRole('heading', { level: 2 }).first().innerText();
    ok(over <= 0 && !raw && /[Ѐ-ӿ一-鿿]/.test(head), `${loc} 375px: the questions fit and are in words (${head})`, [over, raw]);
    const v = await axeViolations(p); ok(v.length === 0, `${loc}: axe 0 violations`, v);
    await c.close();
  }
  await db.query('DELETE FROM expo_registrations WHERE exhibition_id IN (?)', [[A.id, B.id, C.id, closed.id]]);
  await db.query('DELETE FROM exhibitions WHERE id IN (?)', [[A.id, B.id, C.id, closed.id]]);
  await db.end(); await br.close();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
