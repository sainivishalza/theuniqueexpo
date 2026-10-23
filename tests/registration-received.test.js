// "We received your registration": one e-mail (and one website notice) for everything registered in one go.
const { BASE, sql, ok, done, mkUsers, connect } = require('./helpers/common.js');
const smtp = require('./helpers/fake-smtp.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ip = () => '10.3.' + Math.floor(Math.random() * 250) + '.' + (Math.floor(Math.random() * 250) + 1);
const H = (t) => ({ 'Content-Type': 'application/json', cookie: 'token=' + t, 'x-forwarded-for': ip() });
const submit = async (t, slugs) => (await fetch(BASE + '/api/buyer-registrations', { method: 'POST', headers: H(t), body: JSON.stringify({ slugs, answers: {} }) })).json();
const waitMail = async (srv, n, ms = 8000) => { const t0 = Date.now(); while (srv.messages.length < n && Date.now() - t0 < ms) await sleep(100); return srv.messages.length >= n; };

(async () => {
  sql('DELETE FROM mail_settings');
  const db = await connect();
  const u = await mkUsers('rr');
  const srv = await smtp.start(2531);
  const settings = { enabled: true, host: '127.0.0.1', port: 2531, secure: false, username: 'm', password: 'x', fromName: 'The Unique Expo', fromEmail: 'noreply@theuniqueexpo.test' };
  const put = (b) => fetch(BASE + '/api/admin/email', { method: 'PUT', headers: H(u.aT), body: JSON.stringify(b) });
  const st = Date.now();
  const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  // Exhibitions whose own form has one optional question only, so a buyer can register with no answers.
  const schema = JSON.stringify([{ id: 'f_note', label: 'Anything we should know?', type: 'textarea', required: false }]);
  const expos = [];
  for (let i = 1; i <= 10; i++) {
    const slug = `rr-${i}-${st}`;
    await db.query('INSERT INTO exhibitions (slug,title,start_date,end_date,city,registration_enabled,registration_form_schema) VALUES (?,?,?,?,?,1,?)', [slug, `Received ${i} ${st}`, day(20 + i), day(23 + i), 'Guangzhou', schema]);
    const [[row]] = await db.query('SELECT id FROM exhibitions WHERE slug=?', [slug]);
    expos.push({ slug, id: row.id, title: `Received ${i} ${st}` });
  }
  const notes = (uid) => sql(`SELECT params FROM user_notifications WHERE user_id=${uid} AND kind='registrationReceived' ORDER BY id`).split('\n').filter(Boolean).map((x) => JSON.parse(x));
  const waitNotes = async (uid, n) => { for (let i = 0; i < 24; i++) { if (notes(uid).length >= n) break; await sleep(250); } return notes(uid); };

  console.log('\n== e-mail switched off: the website notice still appears');
  await put({ ...settings, enabled: false });
  let r = await submit(u.bT, [expos[0].slug]);
  ok(r.results && r.results[0].outcome === 'registered', 'registered', r);
  let n = await waitNotes(u.bId, 1);
  ok(n.length === 1 && n[0].expo === expos[0].title, 'the buyer finds it under Notifications', n);
  await sleep(500);
  ok(srv.messages.length === 0, 'and no e-mail is sent while e-mail is off');

  console.log('\n== e-mail on: one message for several exhibitions');
  await put(settings); await sleep(200);
  sql(`UPDATE users SET preferred_locale='ru' WHERE id=${u.bId}`);
  r = await submit(u.bT, [expos[1].slug, expos[2].slug, expos[3].slug]);
  ok(r.results.every((x) => x.outcome === 'registered'), 'three registered at once', r);
  ok(await waitMail(srv, 1), 'an e-mail arrives');
  await sleep(1000);
  ok(srv.messages.length === 1, 'exactly one e-mail, not one per exhibition', srv.messages.length);
  let m = srv.messages[0], d = smtp.decode(m.raw), p = smtp.parts(m.raw);
  ok(m.to[0].includes(u.m.b), 'to the buyer', m.to);
  ok(/Мы получили вашу регистрацию/.test(d.subject), 'in the buyer\'s language (Russian)', d.subject);
  ok(expos.slice(1, 4).every((e) => p.text.includes(e.title) && p.html.includes(e.title)), 'naming all three exhibitions, in the text and the HTML versions');
  ok(/dashboard\/buyer\/registrations/.test(p.html) && /\/ru\/dashboard/.test(p.text), 'with a button to the registrations page, in Russian');
  n = await waitNotes(u.bId, 2);
  ok(n.length === 2 && n[1].expo === expos.slice(1, 4).map((e) => e.title).join(', '), 'and one website notice naming all three', n[1]);

  console.log('\n== nothing is sent when nothing was registered');
  const before = srv.messages.length;
  r = await submit(u.bT, [expos[1].slug]);
  ok(r.results[0].outcome === 'already_registered', 'registering again is reported', r);
  r = await submit(u.bT, ['no-such-expo']);
  ok(r.results[0].outcome === 'unknown', 'an unknown exhibition is reported');
  await sleep(1500);
  ok(srv.messages.length === before && notes(u.bId).length === 2, 'no e-mail and no notice for those');

  console.log('\n== many exhibitions: the list is kept short');
  const w = await mkUsers('rw');
  sql(`UPDATE users SET preferred_locale='zh' WHERE id=${w.bId}`);
  const b2 = srv.messages.length;
  r = await submit(w.bT, expos.map((e) => e.slug));
  ok(r.results.filter((x) => x.outcome === 'registered').length === 10, 'ten registered', r);
  ok(await waitMail(srv, b2 + 1), 'one e-mail');
  await sleep(800);
  ok(srv.messages.length === b2 + 1, 'only one');
  m = srv.messages[srv.messages.length - 1]; d = smtp.decode(m.raw); p = smtp.parts(m.raw);
  ok(/我们已收到您的报名/.test(d.subject), 'in Chinese for a Chinese-speaking buyer', d.subject);
  ok(p.text.includes(expos[0].title) && p.text.includes(expos[7].title) && !p.text.includes(expos[8].title) && /\(\+2\)/.test(p.text), 'it names the first eight and says "(+2)" for the rest', p.text.slice(0, 600));
  n = await waitNotes(w.bId, 1);
  ok(n.length === 1 && /\(\+2\)$/.test(n[0].expo), 'the website notice too', n);

  console.log('\n== buyers without a real e-mail address');
  const x = await mkUsers('rx');
  sql(`UPDATE users SET email='phone-1392${String(st).slice(-7)}@noemail.invalid' WHERE id=${x.bId}`);
  const b3 = srv.messages.length;
  r = await submit(x.bT, [expos[0].slug]);
  ok(r.results[0].outcome === 'registered', 'registered', r);
  n = await waitNotes(x.bId, 1);
  ok(n.length === 1, 'they still get the website notice');
  await sleep(800);
  ok(srv.messages.length === b3, 'and no e-mail is attempted');

  console.log('\n== the website notice, in three languages');
  const br = await launch();
  for (const [loc, title, body] of [['en', 'Registration received', 'We received your registration for: ' + expos.slice(1, 4).map((e) => e.title).join(', ') + '. It is now waiting for review.'], ['ru', 'Регистрация получена', 'Мы получили вашу регистрацию: ' + expos.slice(1, 4).map((e) => e.title).join(', ') + '. Сейчас она ожидает проверки.'], ['zh', '已收到报名', '我们已收到您的报名：' + expos.slice(1, 4).map((e) => e.title).join(', ') + '。目前正在等待审核。']]) {
    const c = await br.newContext({ viewport: { width: 375, height: 800 }, extraHTTPHeaders: { 'x-forwarded-for': ip() } });
    await c.addCookies([{ name: 'token', value: u.bT, url: BASE }]);
    const pg = await c.newPage();
    await pg.goto(BASE + `/${loc}/dashboard/notifications`, { waitUntil: 'networkidle' });
    await pg.getByText(title).first().waitFor();
    const text = await pg.locator('main').innerText();
    const over = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(text.includes(body) && over <= 0, `${loc} 375px: title and sentence are shown and fit`, [text.slice(0, 300), over]);
    const v = await axeViolations(pg); ok(v.length === 0, `${loc}: axe 0 violations`, v);
    await c.close();
  }
  await br.close();

  await db.query('DELETE FROM expo_registrations WHERE exhibition_id IN (?)', [expos.map((e) => e.id)]);
  await db.query('DELETE FROM exhibitions WHERE id IN (?)', [expos.map((e) => e.id)]);
  await db.end(); await srv.close(); sql('DELETE FROM mail_settings');
  done();
})().catch((e) => { console.error(e); process.exit(1); });
