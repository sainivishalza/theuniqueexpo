// Registration window (opening / closing days), the "closes soon" countdown, places and the waiting list.
const bcrypt = require('bcryptjs');
const { BASE, sql, ok, done, mkUsers, connect, login } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ip = () => '10.9.' + Math.floor(Math.random() * 250) + '.' + (Math.floor(Math.random() * 250) + 1);
const H = (t) => ({ 'Content-Type': 'application/json', cookie: 'token=' + t, 'x-forwarded-for': ip() });
const submit = async (t, slugs) => (await fetch(BASE + '/api/buyer-registrations', { method: 'POST', headers: H(t), body: JSON.stringify({ slugs, answers: {} }) })).json();

(async () => {
  const db = await connect();
  const st = Date.now(), h = bcrypt.hashSync('pass1234', 10);
  const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const schema = JSON.stringify([{ id: 'f_note', label: 'Anything we should know?', type: 'textarea', required: false }]);
  const mkExpo = async (tag, { opens = null, closes = null, quota = null, enabled = 1 } = {}) => {
    const slug = `rw-${tag}-${st}`;
    await db.query('INSERT INTO exhibitions (slug,title,start_date,end_date,city,registration_enabled,registration_form_schema,registration_opens,registration_closes,buyer_quota) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [slug, `Window ${tag} ${st}`, day(40), day(43), 'Guangzhou', enabled, schema, opens, closes, quota]);
    const [[row]] = await db.query('SELECT id FROM exhibitions WHERE slug=?', [slug]);
    return { slug, id: row.id, title: `Window ${tag} ${st}` };
  };
  const mkBuyer = async (tag) => {
    const email = `rw-${tag}-${st}@test.invalid`;
    sql(`INSERT INTO users (name,email,password_hash,role,country) VALUES ('Win ${tag}','${email}','${h}','buyer','')`);
    return { email, id: Number(sql(`SELECT id FROM users WHERE email='${email}'`)), t: await login(email) };
  };
  const u = await mkUsers('rw');
  const put = (expo, b) => fetch(BASE + `/api/admin/exhibitions/${expo.slug}/registration-form`, { method: 'PUT', headers: H(u.aT), body: JSON.stringify({ registrationEnabled: true, registrationFormSchema: JSON.parse(schema), ...b }) });
  const get = async (expo) => (await fetch(BASE + `/api/admin/exhibitions/${expo.slug}/registration-form`, { headers: H(u.aT) })).json();

  console.log('\n== the admin settings');
  const S = await mkExpo('settings');
  let r = await put(S, { registrationOpens: '2026-13-40' }); let j = await r.json();
  ok(r.status === 400 && j.code === 'invalid_date', 'an impossible date is refused', j);
  r = await put(S, { registrationOpens: day(10), registrationCloses: day(5) }); j = await r.json();
  ok(r.status === 400 && j.code === 'closes_before_opens', 'a closing day before the opening day is refused', j);
  for (const bad of [-1, 1.5, 100001, 'abc']) { r = await put(S, { buyerQuota: bad }); j = await r.json(); ok(r.status === 400 && j.code === 'invalid_quota', `places ${JSON.stringify(bad)} are refused`, j); }
  r = await put(S, { registrationCloses: day(5), buyerQuota: 40, series: 'window-series' });
  ok(r.status === 200, 'valid settings are saved');
  j = await get(S);
  ok(j.registrationCloses === day(5) && j.registrationOpens === null && j.buyerQuota === 40 && j.series === 'window-series' && j.registrationState === 'open', 'and read back with the state', j);
  ok(j.places && j.places.quota === 40 && j.places.taken === 0 && j.places.waitlisted === 0, 'with a places summary', j.places);
  r = await put(S, { registrationCloses: '', registrationOpens: '', buyerQuota: '' });
  j = await get(S);
  ok(r.status === 200 && j.registrationCloses === null && j.buyerQuota === 0, 'empty values mean no limit', j);
  r = await fetch(BASE + `/api/admin/exhibitions/${S.slug}/registration-form`, { method: 'PUT', headers: H(u.bT), body: JSON.stringify({ registrationEnabled: true }) });
  ok(r.status === 401, 'a buyer cannot change them');
  ok(Number(sql("SELECT COUNT(*) FROM admin_audit_log WHERE action='exhibition_registration_settings'")) >= 1, 'changes are in the activity log');

  console.log('\n== the window decides who can register');
  const E = {
    open: await mkExpo('open'), todayLast: await mkExpo('today', { closes: day(0) }), yesterday: await mkExpo('yday', { closes: day(-1) }),
    later: await mkExpo('later', { opens: day(1) }), openedToday: await mkExpo('otoday', { opens: day(0) }), off: await mkExpo('off', { enabled: 0 }),
  };
  const b = await mkBuyer('win');
  r = await submit(b.t, Object.values(E).map((e) => e.slug));
  const out = Object.fromEntries(r.results.map((x, i) => [Object.keys(E)[i], x.outcome]));
  ok(out.open === 'registered' && out.todayLast === 'registered' && out.openedToday === 'registered', 'open, last-day-today and opened-today can be registered', out);
  ok(out.yesterday === 'closed' && out.later === 'closed' && out.off === 'closed', 'a passed deadline, a later opening and a switched-off exhibition are closed', out);
  const pub = await (await fetch(BASE + '/api/exhibitions?locale=en')).json();
  const list = Array.isArray(pub) ? pub : pub.exhibitions || [];
  const byslug = Object.fromEntries(list.map((x) => [x.slug, x]));
  ok(byslug[E.yesterday.slug] && byslug[E.yesterday.slug].registrationEnabled === false && byslug[E.yesterday.slug].registrationState === 'deadline_passed', 'the public list says the deadline passed', byslug[E.yesterday.slug] && byslug[E.yesterday.slug].registrationState);
  ok(byslug[E.later.slug] && byslug[E.later.slug].registrationState === 'opens_later' && byslug[E.later.slug].registrationDaysToOpen === 1, 'and that another opens in a day');
  ok(byslug[E.todayLast.slug] && byslug[E.todayLast.slug].registrationDaysToClose === 0, 'and that the last day is today');

  console.log('\n== places and the waiting list');
  const Q = await mkExpo('quota', { quota: 2 });
  const [b1, b2, b3, b4] = [await mkBuyer('q1'), await mkBuyer('q2'), await mkBuyer('q3'), await mkBuyer('q4')];
  const regId = (bu) => Number(sql(`SELECT id FROM expo_registrations WHERE exhibition_id=${Q.id} AND user_id=${bu.id}`));
  const mine = async (bu) => (await (await fetch(BASE + `/api/expo-registrations/mine?exhibition=${Q.slug}`, { headers: H(bu.t) })).json()).registration;
  const decide = (bu, status) => fetch(BASE + `/api/admin/expo-registrations/${regId(bu)}`, { method: 'PATCH', headers: H(u.aT), body: JSON.stringify({ status }) });
  const notes = (bu, kind) => sql(`SELECT COUNT(*) FROM user_notifications WHERE user_id=${bu.id} AND kind='${kind}'`);
  await submit(b1.t, [Q.slug]); await submit(b2.t, [Q.slug]);
  ok(!(await mine(b1)).waitlisted && !(await mine(b2)).waitlisted, 'while no place is taken nobody waits');
  await decide(b1, 'approved'); await decide(b2, 'confirmed');
  j = await get(Q);
  ok(j.places.taken === 2 && j.places.quota === 2 && j.places.waitlisted === 0, 'approved and confirmed registrations hold the two places', j.places);
  r = await submit(b3.t, [Q.slug]);
  ok(r.results[0].outcome === 'registered' && r.results[0].waitlisted === true, 'a third registration is accepted but reported as waiting', r.results[0]);
  let m3 = await mine(b3);
  ok(m3.status === 'pending' && m3.waitlisted === true, 'it stays pending and is marked as waiting', m3);
  for (let i = 0; i < 20 && notes(b3, 'registrationWaitlisted') === '0'; i++) await sleep(200);
  ok(notes(b3, 'registrationWaitlisted') === '1', 'the buyer is told once');
  j = await get(Q);
  ok(j.places.waitlisted === 1, 'the admin sees one waiting', j.places);
  const adminList = await (await fetch(BASE + `/api/admin/expo-registrations?exhibition=${Q.slug}`, { headers: H(u.aT) })).json();
  ok(adminList.registrations.find((x) => Number(x.id) === regId(b3)).waitlisted === true && adminList.places.waitlisted === 1, 'and which one, in the registrations list');
  // A cancellation lets the longest-waiting registration in.
  r = await fetch(BASE + `/api/expo-registrations/${regId(b1)}`, { method: 'PATCH', headers: H(b1.t), body: JSON.stringify({ action: 'cancel' }) });
  ok(r.status === 200, 'a buyer cancels');
  for (let i = 0; i < 25 && notes(b3, 'waitlistPlaceOpened') === '0'; i++) await sleep(200);
  m3 = await mine(b3);
  ok(m3.waitlisted === false && notes(b3, 'waitlistPlaceOpened') === '1', 'the waiting buyer moves into the normal review and is told', m3);
  await decide(b3, 'approved');
  r = await submit(b4.t, [Q.slug]);
  ok(r.results[0].waitlisted === true, 'the next one waits again (the two places are held)');
  // A rejection frees a place.
  await decide(b2, 'rejected');
  for (let i = 0; i < 25 && notes(b4, 'waitlistPlaceOpened') === '0'; i++) await sleep(200);
  ok((await mine(b4)).waitlisted === false && notes(b4, 'waitlistPlaceOpened') === '1', 'a rejection frees a place for the next one');
  // More places do too, and nobody is told twice.
  await decide(b4, 'pending'); await decide(b4, 'approved');
  const b5 = await mkBuyer('q5'); r = await submit(b5.t, [Q.slug]);
  ok(r.results[0].waitlisted === true, 'another one waits');
  await put(Q, { buyerQuota: 5 });
  for (let i = 0; i < 25 && notes(b5, 'waitlistPlaceOpened') === '0'; i++) await sleep(200);
  ok((await mine(b5)).waitlisted === false && notes(b5, 'waitlistPlaceOpened') === '1', 'raising the number of places lets them in');
  await put(Q, { buyerQuota: 5 }); await sleep(600);
  ok(notes(b5, 'waitlistPlaceOpened') === '1' && notes(b3, 'waitlistPlaceOpened') === '1', 'saving again tells nobody twice');
  const unlimited = await mkExpo('nolimit');
  const flags = await Promise.all([b1, b2, b3, b4, b5].map((bu) => submit(bu.t, [unlimited.slug])));
  ok(flags.every((x) => x.results[0].outcome === 'registered' && !x.results[0].waitlisted), 'with no limit nobody waits');

  console.log('\n== the screens');
  const br = await launch();
  const open = async (t, vp = { width: 375, height: 900 }) => { const c = await br.newContext({ viewport: vp, extraHTTPHeaders: { 'x-forwarded-for': ip() } }); await c.addCookies([{ name: 'token', value: t, url: BASE }]); return [c, await c.newPage()]; };
  // Badges on the public list and the exhibition page, in each language.
  const soon = await mkExpo('soon', { closes: day(5) }), tomorrow = await mkExpo('tmrw', { closes: day(1) }), today = E.todayLast, farAway = await mkExpo('far', { closes: day(30) });
  const expect = {
    en: { soon: /Registration closes in 5 days/, tmrw: /Registration closes tomorrow/, today: /Last day to register: today/, far: /Register by/, yday: /Registration closed on/, later: /Registration opens on/ },
    ru: { soon: /Регистрация закрывается через 5 дней/, tmrw: /Регистрация закрывается завтра/, today: /Сегодня последний день регистрации/, far: /Зарегистрируйтесь до/, yday: /Регистрация закрыта/, later: /Регистрация откроется/ },
    zh: { soon: /报名将在 5 天后截止/, tmrw: /报名明天截止/, today: /今天是报名截止日/, far: /请在 .* 前报名/, yday: /报名已于/, later: /报名将于/ },
  };
  for (const loc of ['en', 'ru', 'zh']) {
    const c = await br.newContext({ viewport: { width: 375, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ip() } }); const p = await c.newPage();
    await p.goto(BASE + `/${loc}/exhibitions?view=all`, { waitUntil: 'networkidle' });
    await p.locator('input[type=search], input[type=text]').first().fill(String(st));
    await p.waitForFunction((x) => document.body.innerText.includes(x), `Window soon ${st}`).catch(() => {});
    const card = (e) => p.locator('article, [class*=card], div').filter({ hasText: e.title }).filter({ has: p.getByRole('link', { name: /./ }) }).last();
    const body = async () => p.locator('main').innerText();
    const text = await body();
    const near = (title) => { const i = text.indexOf(title); return i < 0 ? '' : text.slice(i, i + 700); };
    ok(expect[loc].soon.test(near(soon.title)), `${loc}: the list says the deadline is in 5 days`, near(soon.title).slice(0, 200));
    ok(expect[loc].tmrw.test(near(tomorrow.title)), `${loc}: tomorrow`);
    ok(expect[loc].today.test(near(today.title)), `${loc}: the last day is today`);
    ok(expect[loc].far.test(near(farAway.title)), `${loc}: a far deadline is a plain "register by" line`);
    ok(!/Register by|closes/.test(near(E.open.title).slice(0, 300)) || loc !== 'en', `${loc}: nothing about a deadline when there is none`);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${loc}: no sideways overflow at 375px`);
    ok((await axeViolations(p)).length === 0, `${loc}: list axe 0`);
    // The page of one exhibition and of one whose deadline passed.
    await p.goto(BASE + `/${loc}/exhibitions/${soon.slug}`, { waitUntil: 'networkidle' });
    ok(expect[loc].soon.test(await p.locator('main').innerText()), `${loc}: the exhibition page shows the countdown`);
    ok((await axeViolations(p)).length === 0, `${loc}: exhibition page axe 0`);
    await p.goto(BASE + `/${loc}/exhibitions/${E.yesterday.slug}`, { waitUntil: 'networkidle' });
    ok(expect[loc].yday.test(await p.locator('main').innerText()) && !(await p.locator(`a[href*="${E.yesterday.slug}/register"]`).count()), `${loc}: after the deadline it says so and offers no register button`);
    await p.goto(BASE + `/${loc}/exhibitions/${E.later.slug}`, { waitUntil: 'networkidle' });
    ok(expect[loc].later.test(await p.locator('main').innerText()), `${loc}: before the opening day it says when`);
    await c.close();
  }
  // The register page of a closed exhibition.
  let [c, p] = await open(b.t);
  await p.goto(BASE + `/en/exhibitions/${E.yesterday.slug}/register`, { waitUntil: 'networkidle' });
  ok(/Registration closed on/.test(await p.locator('main').innerText()), 'the register page of a closed exhibition says when it closed');
  await c.close();

  // The admin settings card.
  [c, p] = await open(u.aT, { width: 375, height: 1000 });
  await p.goto(BASE + `/en/admin/exhibitions/${S.slug}/registration-form`, { waitUntil: 'networkidle' });
  await p.getByRole('heading', { name: 'Registration window and places' }).waitFor();
  await p.getByLabel('Registration opens on').fill(day(3));
  await p.getByLabel('Last day to register').fill(day(1));
  await p.getByRole('button', { name: /Save/ }).click();
  await p.getByText('The last day to register cannot be before the day registration opens.').waitFor();
  ok(true, 'the card explains a closing day before the opening day');
  await p.getByLabel('Last day to register').fill(day(9));
  await p.getByLabel('Places for buyers').fill('12');
  await p.getByLabel(/Series/).fill('rw-series');
  await p.getByRole('button', { name: /Save/ }).click();
  await p.getByText(/saved/i).first().waitFor();
  j = await get(S);
  ok(j.registrationOpens === day(3) && j.registrationCloses === day(9) && j.buyerQuota === 12 && j.series === 'rw-series', 'saving from the screen stores everything', j);
  await p.reload({ waitUntil: 'networkidle' });
  ok(await p.getByText('Not open yet').isVisible(), 'and the state reads "Not open yet" before the opening day');
  ok(await p.getByLabel('Places for buyers').inputValue() === '12', 'the values are shown again after a reload');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no sideways overflow at 375px');
  ok((await axeViolations(p)).length === 0, 'admin card axe 0');
  await c.close();
  for (const loc of ['ru', 'zh']) {
    [c, p] = await open(u.aT, { width: 375, height: 1000 });
    await p.goto(BASE + `/${loc}/admin/exhibitions/${S.slug}/registration-form`, { waitUntil: 'networkidle' });
    await p.locator('#rw-opens').waitFor();
    const want = loc === 'ru' ? /Сроки регистрации и количество мест/ : /登记时间与名额/;
    ok(want.test(await p.locator('main').innerText()), `${loc}: the admin card is translated`);
    ok((await axeViolations(p)).length === 0, `${loc}: admin card axe 0`);
    await c.close();
  }
  // The registrations page of the exhibition with a waiting list: places line and badge.
  await put(Q, { buyerQuota: 2 });
  const b6 = await mkBuyer('q6'); await submit(b6.t, [Q.slug]);
  [c, p] = await open(u.aT, { width: 1200, height: 1000 });
  await p.goto(BASE + `/en/admin/exhibitions/${Q.slug}/registrations`, { waitUntil: 'networkidle' });
  await p.getByTestId('places-summary').waitFor();
  const placesText = await p.getByTestId('places-summary').innerText();
  ok(/places taken/.test(placesText) && /on the waiting list/.test(placesText), 'the admin sees the places and how many wait', placesText);
  ok(await p.getByText('Waiting list', { exact: true }).first().isVisible(), 'and a Waiting list badge on the row');
  await c.close();
  // The waiting buyer is told on the exhibition page and in the list.
  [c, p] = await open(b6.t);
  await p.goto(BASE + `/en/exhibitions/${Q.slug}`, { waitUntil: 'networkidle' });
  await p.getByTestId('waitlisted-note').waitFor();
  ok(/waiting list/.test(await p.getByTestId('waitlisted-note').innerText()), 'the buyer sees the waiting list note on the exhibition page');
  ok((await axeViolations(p)).length === 0, 'status card with the note: axe 0');
  await p.goto(BASE + '/en/dashboard/buyer/registrations', { waitUntil: 'networkidle' });
  await p.getByText('On the waiting list').first().waitFor();
  ok(true, 'and in My registrations');
  await c.close();
  await br.close();

  await db.end();
  sql(`DELETE FROM expo_registrations WHERE exhibition_id IN (SELECT id FROM exhibitions WHERE slug LIKE 'rw-%-${st}')`);
  sql(`DELETE FROM exhibitions WHERE slug LIKE 'rw-%-${st}'`);
  sql(`DELETE FROM users WHERE email LIKE 'rw-%-${st}@test.invalid'`);
  done();
})().catch((e) => { console.error(e); process.exit(1); });
