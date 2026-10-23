// The weekly new-exhibitions e-mail, the buyer's e-mail choices, and the one-step unsubscribe.
const bcrypt = require('bcryptjs');
const { BASE, sql, ok, done, mkUsers, onlyAdmins } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const smtp = require('./helpers/fake-smtp.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.55.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const H = (t) => ({ 'Content-Type': 'application/json', cookie: 'token=' + t, 'x-forwarded-for': ipn() });
const api = (method, path, body, t) => fetch(BASE + path, { method, headers: H(t), body: body ? JSON.stringify(body) : undefined }).then(async (r) => ({ status: r.status, ...(await r.json().catch(() => ({}))) }));
const num = (q) => Number(sql(q));
const raw = (m) => m.raw.replace(/\r\n[ \t]/g, ' ');

(async () => {
  const u = await mkUsers('dg');
  const st = Date.now(), h = bcrypt.hashSync('pass1234', 10);
  const srv = await smtp.start(2541);
  await fetch(BASE + '/api/admin/email', { method: 'PUT', headers: H(u.aT), body: JSON.stringify({ enabled: true, host: '127.0.0.1', port: 2541, secure: false, username: 'm', password: 'x', fromName: 'The Unique Expo', fromEmail: 'noreply@theuniqueexpo.test' }) });
  const restoreAdmins = onlyAdmins([u.m.a]);
  process.on('exit', restoreAdmins);
  // Only the buyers of this test are in the first hundred.
  sql("UPDATE users SET mail_digest=0, mail_saved_alerts=0 WHERE role='buyer'");
  sql('UPDATE digest_settings SET enabled=0, batch_at=NULL, since_at=NULL, last_count=0 WHERE id=1');
  const key = (await (await fetch(BASE + '/api/admin/email', { method: 'POST', headers: H(u.aT), body: JSON.stringify({ action: 'reminderKey' }) })).json()).key;
  const rerun = () => sql('UPDATE mail_settings SET reminders_last_run_at=NULL WHERE id=1');
  const cron = () => { rerun(); return fetch(BASE + '/api/cron/registration-reminders', { method: 'POST', headers: { 'x-reminder-key': key, 'x-forwarded-for': ipn() } }).then((x) => x.json()); };

  // buyers: English, Russian, Chinese, one who turned it off, one suspended, one with no real address
  const mk = (tag, locale, extra = '') => {
    const email = `dg-${tag}-${st}@test.invalid`;
    sql(`INSERT INTO users (name,email,password_hash,role,country,preferred_locale${extra ? ',' + extra.split('=')[0] : ''}) VALUES ('Digest ${tag}','${email}','${h}','buyer','','${locale}'${extra ? ',' + extra.split('=')[1] : ''})`);
    return { email, id: num(`SELECT id FROM users WHERE email='${email}'`) };
  };
  const en = mk('en', 'en'), ru = mk('ru', 'ru'), zh = mk('zh', 'zh'), off = mk('off', 'en'), sus = mk('sus', 'en');
  sql(`UPDATE users SET status='suspended' WHERE id=${sus.id}`);
  const ph = `dg-ph-${st}@noemail.invalid`;
  sql(`INSERT INTO users (name,email,password_hash,role,country,preferred_locale) VALUES ('Digest ph','${ph}','${h}','buyer','','en')`);
  const phId = num(`SELECT id FROM users WHERE email='${ph}'`);
  sql(`UPDATE users SET mail_digest=1, mail_saved_alerts=1 WHERE id IN (${en.id},${ru.id},${zh.id},${sus.id},${phId})`);
  sql(`UPDATE users SET mail_digest=0 WHERE id=${off.id}`);

  const day = (n) => `DATE_ADD(UTC_DATE(), INTERVAL ${n} DAY)`;
  const tag = `dg${st}`;
  sql(`INSERT INTO exhibitions (slug,title,start_date,end_date,venue,city,country,industry,description,highlights,exhibitors,visitors,organizer,registration_enabled,created_at) VALUES
    ('${tag}-new1','Digest New Expo One',${day(40)},${day(42)},'Hall','Zzdigestcity','China','X','d','[]',1,'','O',1,NOW()),
    ('${tag}-new2','Digest New Expo Two',${day(50)},${day(52)},'Hall','Zzdigestcity','China','X','d','[]',1,'','O',1,NOW()),
    ('${tag}-old','Digest Old Expo',${day(60)},${day(62)},'Hall','Zzdigestcity','China','X','d','[]',1,'','O',1,DATE_SUB(NOW(), INTERVAL 30 DAY)),
    ('${tag}-past','Digest Past Expo',DATE_SUB(UTC_DATE(), INTERVAL 20 DAY),DATE_SUB(UTC_DATE(), INTERVAL 18 DAY),'Hall','Zzdigestcity','China','X','d','[]',1,'','O',1,NOW())`);

  console.log('\n== the admin switch');
  ok((await api('GET', '/api/admin/email/digest', null, u.bT)).status === 401, 'a buyer cannot see it');
  ok((await api('PUT', '/api/admin/email/digest', { enabled: true }, u.bT)).status === 401, 'a buyer cannot change it');
  let r = await api('GET', '/api/admin/email/digest', null, u.aT);
  ok(r.available && r.enabled === false, 'it is off until an admin switches it on', r);
  ok((await api('PUT', '/api/admin/email/digest', { enabled: 'yes' }, u.aT)).code === 'bad_request', 'on or off only');
  const n0 = srv.messages.length;
  let j = await cron(); await sleep(800);
  ok((j.digestSent ?? 0) === 0 && !srv.messages.slice(n0).some((m) => /new exhibitions? on The Unique Expo/.test(smtp.decode(m.raw).subject)), 'switched off: the job sends no digest', j);

  console.log('\n== a preview to the admin');
  r = await api('POST', '/api/admin/email/digest', { action: 'bogus' }, u.aT); ok(r.code === 'bad_request', 'an unknown action is refused');
  r = await api('POST', '/api/admin/email/digest', { action: 'preview', locale: 'ru' }, u.aT);
  ok(r.ok === true, 'a preview can be sent', r);
  for (let i = 0; i < 40 && srv.messages.length === n0; i++) await sleep(150);
  const pm = srv.messages[srv.messages.length - 1];
  ok(pm && pm.to.join().includes(u.m.a) && /выстав/.test(smtp.decode(pm.raw).subject), 'it goes to the admin only, in the language asked', pm && smtp.decode(pm.raw).subject);

  console.log('\n== the weekly job');
  r = await api('PUT', '/api/admin/email/digest', { enabled: true }, u.aT); ok(r.ok && r.enabled === true, 'an admin switches it on');
  ok(num("SELECT COUNT(*) FROM admin_audit_log WHERE action='weekly_digest_setting_changed'") >= 1, 'the change is in the activity log');
  const n1 = srv.messages.length;
  j = await cron();
  for (let i = 0; i < 60 && srv.messages.slice(n1).filter((m) => /dg-(en|ru|zh)-/.test(m.to.join())).length < 3; i++) await sleep(200);
  const mine = (e) => srv.messages.slice(n1).filter((m) => m.to.join().includes(e));
  ok(j.digestSent === 3, 'three buyers get it (not the one who turned it off, the suspended one, the one with no real address, or the admin)', j);
  ok(mine(en.email).length === 1 && mine(ru.email).length === 1 && mine(zh.email).length === 1, 'one each');
  ok(mine(off.email).length === 0 && mine(sus.email).length === 0 && mine(ph).length === 0 && mine(u.m.a).length === 0, 'nobody else');
  const de = smtp.decode(mine(en.email)[0].raw), dr = smtp.decode(mine(ru.email)[0].raw), dz = smtp.decode(mine(zh.email)[0].raw);
  ok(/new exhibitions on The Unique Expo/.test(de.subject) && /выстав/.test(dr.subject) && /新增/.test(dz.subject), 'each in their own language', [de.subject, dr.subject, dz.subject]);
  ok(de.text.includes('Digest New Expo One') && de.text.includes('Digest New Expo Two') && de.text.includes(`/en/exhibitions/${tag}-new1`), 'the new exhibitions are listed with links');
  ok(!de.text.includes('Digest Old Expo') && !de.text.includes('Digest Past Expo'), 'one added long ago, and one already over, are left out');
  ok(dr.text.includes(`/ru/exhibitions/${tag}-new1`) && dz.text.includes(`/zh/exhibitions/${tag}-new1`), 'links keep the buyer\'s language');
  const link = /(https?:\/\/[^\s]+\/en\/unsubscribe\?[^\s]+)/.exec(de.text);
  ok(!!link, 'the e-mail ends with a link to turn it off', de.text.slice(-500));
  const hdr = raw(mine(en.email)[0]);
  const oneClick = /^List-Unsubscribe: <([^>]+)>/mi.exec(hdr);
  ok(!!oneClick && /List-Unsubscribe-Post: List-Unsubscribe=One-Click/i.test(hdr), 'and mail programs get their own Unsubscribe button (one-click header)');
  ok(num(`SELECT COUNT(*) FROM users WHERE id IN (${en.id},${ru.id},${zh.id}) AND digest_sent_at IS NOT NULL`) === 3, 'each buyer is marked as sent');
  const n2 = srv.messages.length;
  j = await cron(); await sleep(800);
  ok((j.digestSent ?? 0) === 0 && srv.messages.length === n2, 'a second run in the same week sends nothing');

  console.log('\n== unsubscribing');
  const page = new URL(link[1].replace(/[).,]+$/, ''));
  const q = Object.fromEntries(page.searchParams);
  const post = (body, query = '') => fetch(BASE + '/api/unsubscribe' + query, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ipn() }, body: body ? JSON.stringify(body) : undefined }).then(async (x) => ({ status: x.status, ...(await x.json().catch(() => ({}))) }));
  ok((await post({ u: q.u, k: q.k, t: 'x'.repeat(32) })).code === 'invalid_link', 'a wrong signature is refused');
  ok((await post({ u: String(ru.id), k: q.k, t: q.t })).code === 'invalid_link', 'one person\'s link does not work for someone else');
  ok((await post({ u: q.u, k: 'savedAlerts', t: q.t })).code === 'invalid_link', 'nor for another kind of e-mail');
  ok((await post({ u: 'abc', k: q.k, t: q.t })).status === 400 && (await post(null)).status === 400, 'rubbish is refused');
  ok(num(`SELECT mail_digest FROM users WHERE id=${en.id}`) === 1, 'nothing changed so far');
  const br = await launch();
  for (const locale of ['en', 'ru', 'zh']) {
    const c = await br.newContext({ viewport: { width: 375, height: 800 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    const p = await c.newPage();
    await p.goto(`${BASE}/${locale}/unsubscribe${page.search}`, { waitUntil: 'networkidle' });
    ok((await p.locator('main button').count()) >= 1 && num(`SELECT mail_digest FROM users WHERE id=${en.id}`) === 1, `${locale}: opening the link only asks (so a mail scanner cannot unsubscribe anyone)`);
    await sleep(800);
    const vio = await axeViolations(p); ok(vio.length === 0, `${locale}: ask page axe 0`, vio);
    await c.close();
  }
  { // confirm in the browser (English)
    const c = await br.newContext({ viewport: { width: 375, height: 800 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    const p = await c.newPage();
    await p.goto(`${BASE}/en/unsubscribe${page.search}`, { waitUntil: 'networkidle' });
    await p.getByRole('button', { name: 'Stop the weekly e-mail' }).click();
    await p.getByRole('status').filter({ hasText: 'Done.' }).waitFor();
    ok(num(`SELECT mail_digest FROM users WHERE id=${en.id}`) === 0, 'confirming turns the weekly e-mail off for that buyer');
    ok(num(`SELECT mail_saved_alerts FROM users WHERE id=${en.id}`) === 1, 'and only that kind');
    await sleep(800);
    const vio = await axeViolations(p); ok(vio.length === 0, 'done page axe 0', vio);
    await c.close();
  }
  { // the mail program's one-click button for the Russian buyer
    const ruText = smtp.decode(mine(ru.email)[0].raw).text;
    const ruHeader = /^List-Unsubscribe: <([^>]+)>/mi.exec(raw(mine(ru.email)[0]))[1];
    ok(ruText.includes('/ru/unsubscribe?') && ruHeader.includes('/api/unsubscribe?'), 'the one-click address is the API, the link in the text is the page');
    const res = await post(null, ruHeader.slice(ruHeader.indexOf('?')));
    ok(res.status === 200 && num(`SELECT mail_digest FROM users WHERE id=${ru.id}`) === 0, 'a one-click request from a mail program turns it off');
  }

  console.log('\n== next week');
  sql(`INSERT INTO exhibitions (slug,title,start_date,end_date,venue,city,country,industry,description,highlights,exhibitors,visitors,organizer,registration_enabled) VALUES ('${tag}-wk','Digest Week Two Expo',${day(70)},${day(72)},'Hall','Zzdigestcity','China','X','d','[]',1,'','O',1)`);
  // as if the first round began 8 days ago and the exhibitions of that round were added before it
  sql(`UPDATE exhibitions SET created_at=DATE_SUB(created_at, INTERVAL 9 DAY) WHERE slug LIKE '${tag}-new%'`);
  sql(`UPDATE digest_settings SET batch_at=DATE_SUB(NOW(), INTERVAL 8 DAY) WHERE id=1`);
  const n3 = srv.messages.length;
  j = await cron();
  for (let i = 0; i < 40 && srv.messages.slice(n3).filter((m) => m.to.join().includes(zh.email)).length < 1; i++) await sleep(200);
  await sleep(500);
  const wk = (e) => srv.messages.slice(n3).filter((m) => m.to.join().includes(e));
  ok(j.digestSent === 1 && wk(zh.email).length === 1, 'a week later a new round starts: the buyer who still has it on gets it', j);
  const wkText = wk(zh.email).length ? smtp.decode(wk(zh.email)[0].raw).text : '';
  ok(wkText.includes('Digest Week Two Expo') && !wkText.includes('Digest New Expo One'), 'it lists only what was added since the last round');
  ok(wk(en.email).length === 0 && wk(ru.email).length === 0, 'buyers who unsubscribed get nothing');

  console.log('\n== choices on My account');
  ok((await api('GET', '/api/mail-preferences', null, '')).status === 401, 'signing in is needed');
  const zT = await require('./helpers/common.js').login(zh.email);
  r = await api('GET', '/api/mail-preferences', null, zT);
  ok(r.preferences && r.preferences.digest === true && r.preferences.savedAlerts === true, 'a buyer sees their choices', r);
  ok((await api('PUT', '/api/mail-preferences', { digest: 'no' }, zT)).code === 'invalid_input' && (await api('PUT', '/api/mail-preferences', { other: true }, zT)).code === 'invalid_input' && (await api('PUT', '/api/mail-preferences', {}, zT)).code === 'invalid_input', 'only known choices, on or off');
  r = await api('PUT', '/api/mail-preferences', { savedAlerts: false }, zT);
  ok(r.ok && r.preferences.savedAlerts === false && r.preferences.digest === true, 'one choice changes without touching the other');
  r = await api('PUT', '/api/mail-preferences', { savedAlerts: true, digest: false }, zT);
  ok(r.ok && r.preferences.digest === false && r.preferences.savedAlerts === true, 'both can change together');

  console.log('\n== alerts about saved exhibitions follow the choice');
  const closing = `${tag}-closing`;
  sql(`INSERT INTO exhibitions (slug,title,start_date,end_date,venue,city,country,industry,description,highlights,exhibitors,visitors,organizer,registration_enabled,registration_closes) VALUES ('${closing}','Digest Closing Expo',${day(30)},${day(32)},'Hall','Zzdigestcity','China','X','d','[]',1,'','O',1,${day(2)})`);
  const cid = num(`SELECT id FROM exhibitions WHERE slug='${closing}'`);
  sql(`UPDATE users SET mail_saved_alerts=0 WHERE id=${ru.id}`);
  sql(`UPDATE users SET mail_saved_alerts=1 WHERE id=${en.id}`);
  sql(`INSERT INTO exhibition_favorites (user_id, exhibition_id) VALUES (${en.id},${cid}),(${ru.id},${cid})`);
  const n4 = srv.messages.length;
  j = await cron();
  for (let i = 0; i < 40 && srv.messages.slice(n4).filter((m) => m.to.join().includes(en.email)).length < 1; i++) await sleep(200);
  await sleep(600);
  const al = (e) => srv.messages.slice(n4).filter((m) => m.to.join().includes(e));
  ok(al(en.email).length === 1 && /closes|close/i.test(smtp.decode(al(en.email)[0].raw).subject + smtp.decode(al(en.email)[0].raw).text), 'with alerts on, the buyer gets the "closing soon" e-mail');
  ok(/unsubscribe\?/.test(smtp.decode(al(en.email)[0].raw).text) && /List-Unsubscribe:/i.test(raw(al(en.email)[0])), 'which also has the turn-off link and header');
  ok(al(ru.email).length === 0, 'with alerts off, no e-mail');
  ok(num(`SELECT COUNT(*) FROM user_notifications WHERE user_id=${ru.id} AND kind='savedRegistrationClosing'`) === 1, 'but the alert is still shown on the website');
  ok(num(`SELECT COUNT(*) FROM user_notifications WHERE user_id=${en.id} AND kind='registrationApproved'`) === 0, 'sanity: unrelated notifications are untouched');

  console.log('\n== the choices screen (en / ru / zh, 375 px)');
  for (const locale of ['en', 'ru', 'zh']) {
    const c = await br.newContext({ viewport: { width: 375, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    await c.addCookies([{ name: 'token', value: zT, url: BASE }]);
    const p = await c.newPage();
    await p.goto(`${BASE}/${locale}/dashboard/account`, { waitUntil: 'domcontentloaded' });
    await p.getByTestId('mail-prefs').waitFor();
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${locale}: no sideways scrolling`);
    await sleep(800);
    const vio = await axeViolations(p); ok(vio.length === 0, `${locale}: axe 0`, vio);
    await c.close();
  }
  { // switch the weekly e-mail on in the browser
    const c = await br.newContext({ viewport: { width: 375, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    await c.addCookies([{ name: 'token', value: zT, url: BASE }]);
    const p = await c.newPage();
    await p.goto(`${BASE}/en/dashboard/account`, { waitUntil: 'domcontentloaded' });
    await p.getByTestId('mail-prefs').waitFor();
    await p.getByLabel(/New exhibitions, once a week/).click();
    await p.getByRole('status').filter({ hasText: 'Saved.' }).waitFor();
    ok(num(`SELECT mail_digest FROM users WHERE id=${zh.id}`) === 1, 'ticking the box on the page is saved');
    await c.close();
  }
  { // the admin card
    const c = await br.newContext({ viewport: { width: 375, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    await c.addCookies([{ name: 'token', value: u.aT, url: BASE }]);
    const p = await c.newPage();
    await p.goto(`${BASE}/en/admin/email`, { waitUntil: 'domcontentloaded' });
    await p.getByTestId('weekly-digest').waitFor();
    await p.getByLabel('Send the weekly e-mail to buyers').click();
    await p.getByRole('status').filter({ hasText: 'Saved.' }).waitFor();
    ok(num('SELECT enabled FROM digest_settings WHERE id=1') === 0, 'the switch on the admin screen is saved');
    const n5 = srv.messages.length;
    await p.getByRole('button', { name: 'Send me a preview' }).click();
    await p.getByRole('status').filter({ hasText: 'A preview was sent' }).waitFor();
    ok(srv.messages.length >= n5 + 1, 'and the preview goes to the admin');
    await sleep(800);
    const vio = await axeViolations(p); ok(vio.length === 0, 'admin card axe 0', vio);
    await c.close();
  }
  await br.close();
  sql("UPDATE users SET mail_digest=1, mail_saved_alerts=1");
  sql(`DELETE FROM exhibitions WHERE slug LIKE '${tag}%'`);
  restoreAdmins();
  await srv.close();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
