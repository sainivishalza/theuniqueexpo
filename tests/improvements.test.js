// Health check, installable-app manifest, "sign out of other devices", "download my data" and the daily clean-up of old records.
const crypto = require('node:crypto');
const { BASE, sql, ok, done, mkUsers, login } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const hash = (k) => crypto.createHash('sha256').update(k).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ip = () => '10.6.' + Math.floor(Math.random() * 250) + '.' + (Math.floor(Math.random() * 250) + 1);
const H = (t) => ({ 'Content-Type': 'application/json', cookie: 'token=' + t, 'x-forwarded-for': ip() });
const me = async (t) => (await (await fetch(BASE + '/api/auth/me', { headers: { cookie: 'token=' + t } })).json()).user;

(async () => {
  console.log('\n== health and manifest');
  let r = await fetch(BASE + '/api/health');
  let j = await r.json();
  ok(r.status === 200 && JSON.stringify(j) === '{"ok":true}' && (r.headers.get('cache-control') || '').includes('no-store'), 'the health check answers {"ok":true} and nothing else', [r.status, j]);
  r = await fetch(BASE + '/manifest.webmanifest');
  j = await r.json();
  ok(r.status === 200 && j.name === 'The Unique Expo' && j.display === 'standalone' && j.start_url === '/' && /^#[0-9a-f]{6}$/i.test(j.theme_color), 'the app manifest is served', j.name);
  ok(j.icons.length === 3 && j.icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable'), 'with a 192, a 512 and a maskable icon');
  for (const i of j.icons) { const a = await fetch(BASE + i.src); ok(a.status === 200 && a.headers.get('content-type') === 'image/png', 'icon ' + i.src + ' loads', a.status); }
  const home = await (await fetch(BASE + '/en')).text();
  ok(/rel="manifest"/.test(home), 'pages point to the manifest');

  console.log('\n== sign out of other devices');
  const u = await mkUsers('so');
  const phone = await login(u.m.b); await sleep(1100);
  const laptop = await login(u.m.b);
  ok((await me(phone)) && (await me(laptop)), 'two devices are signed in');
  r = await fetch(BASE + '/api/auth/sign-out-everywhere', { method: 'POST' });
  ok(r.status === 401, 'signed-out is refused');
  await sleep(1100);
  r = await fetch(BASE + '/api/auth/sign-out-everywhere', { method: 'POST', headers: H(laptop) });
  const fresh = (/token=([^;]+)/.exec(r.headers.getSetCookie().join(';')) || [])[1];
  ok(r.status === 200 && fresh, 'one device asks to sign out the others and gets a fresh session', r.status);
  ok(!(await me(phone)), 'the other device is signed out');
  ok(!(await me(laptop)), 'and so is the old session of this one');
  ok((await me(fresh))?.email === u.m.b, 'this device stays signed in with the fresh one');
  ok((await me(u.aT))?.email === u.m.a, 'another person\'s session is not touched');
  ok((await (await fetch(BASE + '/api/auth/login', { method: 'POST', headers: H(), body: JSON.stringify({ email: u.m.b, password: 'pass1234' }) })).json()).user, 'signing in again works');
  r = await fetch(BASE + '/api/auth/sign-out-everywhere', { method: 'POST', headers: H(u.aT) });
  const adminNow = (/token=([^;]+)/.exec(r.headers.getSetCookie().join(';')) || [])[1];
  await sleep(300);
  const logRow = (await (await fetch(BASE + '/api/admin/activity?action=signed_out_everywhere', { headers: H(adminNow) })).json()).rows[0];
  ok(r.status === 200 && logRow && logRow.adminName === 'so Admin', 'an admin doing it is written to the activity log', logRow);

  console.log('\n== download my data');
  const b = await mkUsers('md'); const other = await mkUsers('mo');
  await fetch(BASE + '/api/admin/users', { headers: H(b.aT) }); // gives every buyer a registration number
  await fetch(BASE + '/api/buyer-profile', { method: 'PATCH', headers: H(b.bT), body: JSON.stringify({ companyName: 'Data Test Co', jobTitle: 'Buyer' }) });
  await fetch(BASE + `/api/admin/wallet/wallets/${b.bId}`, { method: 'POST', headers: H(b.aT), body: JSON.stringify({ action: 'adjust', amount: 77, note: 'Data gift', key: 'k' + crypto.randomBytes(8).toString('hex') }) });
  ok((await fetch(BASE + '/api/auth/my-data')).status === 401, 'signed-out is refused');
  r = await fetch(BASE + '/api/auth/my-data', { headers: H(b.bT) });
  const text = await r.text(); j = JSON.parse(text);
  ok(r.status === 200 && /attachment; filename="my-data-\d{4}-\d{2}-\d{2}\.json"/.test(r.headers.get('content-disposition')) && (r.headers.get('cache-control') || '').includes('no-store'), 'the file is a download that is never cached', r.headers.get('content-disposition'));
  ok(j.account.email === b.m.b && j.account.role === 'buyer' && /^TUE\d+/.test(j.account.registrationNumber || ''), 'it holds the account and registration number', j.account);
  ok(j.buyerProfile && j.buyerProfile.companyName === 'Data Test Co', 'the profile they filled in', j.buyerProfile && j.buyerProfile.companyName);
  ok(j.wallet.transactions.some((t) => t.amount === 77 && t.note === 'Data gift'), 'the points history', j.wallet.transactions.length);
  ok(Array.isArray(j.exhibitionRegistrations) && Array.isArray(j.tourRegistrations), 'and the registration lists');
  ok(!/password|\$2[aby]\$/i.test(text.replace(/"note": "[^"]*"/g, '')), 'no password or hash appears');
  ok(!text.includes(other.m.b) && !text.includes(other.m.a), 'nothing about another person appears');
  ok(!/data:image|base64,/.test(text), 'no document pictures are inside');
  let last; for (let i = 0; i < 5; i++) last = await fetch(BASE + '/api/auth/my-data', { headers: H(b.bT) });
  ok(last.status === 429 && last.headers.get('retry-after'), 'asking more than 5 times an hour is paused', last.status);

  console.log('\n== daily clean-up');
  const keyHash = hash('housekeeping-daily');
  sql(`DELETE FROM rate_limits WHERE key_hash='${keyHash}'`);
  const uid = sql(`SELECT id FROM users WHERE email='${u.m.a}'`);
  sql(`INSERT INTO email_log (to_email,kind,subject,status,created_at) VALUES ('old-hk@test.invalid','test','old','sent',DATE_SUB(NOW(), INTERVAL 200 DAY)),('new-hk@test.invalid','test','new','sent',DATE_SUB(NOW(), INTERVAL 20 DAY))`);
  sql(`INSERT INTO admin_audit_log (admin_name,action,details,created_at) VALUES ('hk','old_hk','old',DATE_SUB(NOW(), INTERVAL 800 DAY)),('hk','new_hk','new',DATE_SUB(NOW(), INTERVAL 400 DAY))`);
  sql(`INSERT INTO password_resets (user_id,token_hash,expires_at) VALUES (${uid},'${hash('hk-old')}',${Date.now() - 3 * 86400000}),(${uid},'${hash('hk-new')}',${Date.now() + 3600000})`);
  r = await fetch(BASE + '/api/admin/attention', { headers: H(adminNow) });
  ok(r.status === 200, 'the admin home loads as before');
  let gone = false; for (let i = 0; i < 30 && !gone; i++) { await sleep(200); gone = sql("SELECT COUNT(*) FROM email_log WHERE to_email='old-hk@test.invalid'") === '0'; }
  ok(gone, 'an e-mail log line older than 180 days is removed');
  ok(sql("SELECT COUNT(*) FROM email_log WHERE to_email='new-hk@test.invalid'") === '1', 'a newer one stays');
  ok(sql("SELECT COUNT(*) FROM admin_audit_log WHERE action='old_hk'") === '0' && sql("SELECT COUNT(*) FROM admin_audit_log WHERE action='new_hk'") === '1', 'activity older than 2 years is removed, newer stays');
  ok(sql(`SELECT COUNT(*) FROM password_resets WHERE token_hash='${hash('hk-old')}'`) === '0' && sql(`SELECT COUNT(*) FROM password_resets WHERE token_hash='${hash('hk-new')}'`) === '1', 'an expired reset link is removed, a live one stays');
  sql(`INSERT INTO email_log (to_email,kind,subject,status,created_at) VALUES ('old2-hk@test.invalid','test','old','sent',DATE_SUB(NOW(), INTERVAL 200 DAY))`);
  await fetch(BASE + '/api/admin/attention', { headers: H(adminNow) }); await sleep(800);
  ok(sql("SELECT COUNT(*) FROM email_log WHERE to_email='old2-hk@test.invalid'") === '1', 'it runs once a day, not on every visit');
  sql("DELETE FROM email_log WHERE to_email LIKE '%-hk@test.invalid'; DELETE FROM admin_audit_log WHERE admin_name='hk'; DELETE FROM password_resets WHERE user_id=" + uid);

  console.log('\n== the account pages');
  const br = await launch();
  const open = async (token, vp = { width: 1200, height: 900 }) => { const c = await br.newContext({ viewport: vp, acceptDownloads: true, extraHTTPHeaders: { 'x-forwarded-for': ip() } }); await c.addCookies([{ name: 'token', value: token, url: BASE }]); return [c, await c.newPage()]; };
  const w = await mkUsers('sp');
  let [c, p] = await open(w.bT);
  await p.goto(BASE + '/en/dashboard/account', { waitUntil: 'networkidle' });
  await p.getByRole('heading', { name: 'Signed in somewhere else?' }).waitFor();
  ok(await p.getByRole('heading', { name: 'Your data' }).isVisible(), 'the buyer account page has both cards');
  const vio = await axeViolations(p); ok(vio.length === 0, 'account page: axe 0 violations', vio);
  p.once('dialog', (d) => d.dismiss());
  await p.getByRole('button', { name: 'Sign out of other devices' }).click();
  await sleep(300);
  ok(!(await p.getByText('Every other device has been signed out').count()), 'cancelling the question does nothing');
  p.once('dialog', (d) => d.accept());
  await p.getByRole('button', { name: 'Sign out of other devices' }).click();
  await p.getByText('Every other device has been signed out.').waitFor();
  ok(true, 'confirming signs the others out and says so');
  await p.goto(BASE + '/en/dashboard/account', { waitUntil: 'networkidle' });
  ok(await p.getByRole('heading', { name: 'Signed in somewhere else?' }).isVisible(), 'and this device is still signed in');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Download my data' }).click()]);
  ok(/^my-data-\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename()), 'the download button saves the file', dl.suggestedFilename());
  await c.close();
  [c, p] = await open(w.aT);
  await p.goto(BASE + '/en/admin/account', { waitUntil: 'networkidle' });
  await p.getByRole('heading', { name: 'Signed in somewhere else?' }).waitFor();
  ok(!(await p.getByRole('heading', { name: 'Your data' }).count()), 'the admin account page has the sign-out card but not the data download');
  const vio2 = await axeViolations(p); ok(vio2.length === 0, 'admin account page: axe 0 violations', vio2);
  await c.close();
  for (const loc of ['en', 'ru', 'zh']) {
    const z = await mkUsers('sq' + loc);
    [c, p] = await open(z.bT, { width: 375, height: 800 });
    await p.goto(BASE + `/${loc}/dashboard/account`, { waitUntil: 'networkidle' });
    await p.waitForSelector('#sessions');
    const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const raw = await p.evaluate(() => /accountPassword\.[a-zA-Z.]+/.test(document.body.innerText));
    ok(over <= 0 && !raw && (await p.locator('#my-data').count()) === 1, `${loc} 375px: account page fits, in words`, [over, raw]);
    await c.close();
  }

  console.log('\n== add to calendar');
  const cal = await mkUsers('cal'); const slug = 'cal-expo-' + cal.st;
  sql(`INSERT INTO exhibitions (slug,title,start_date,end_date) VALUES ('${slug}','Calendar Expo, Phase 1; Big',DATE('2030-05-10'),DATE('2030-05-12'))`);
  const exId = Number(sql(`SELECT id FROM exhibitions WHERE slug='${slug}'`));
  sql(`INSERT INTO expo_registrations (exhibition_id,user_id,status,confirm_by) VALUES (${exId},${cal.bId},'approved',DATE_ADD(UTC_DATE(),INTERVAL 10 DAY))`);
  [c, p] = await open(cal.bT);
  await p.goto(BASE + `/en/exhibitions/${slug}`, { waitUntil: 'networkidle' });
  await p.getByRole('button', { name: /Add to my calendar/ }).waitFor();
  const [ics] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: /Add to my calendar/ }).click()]);
  const icsText = require('node:fs').readFileSync(await ics.path(), 'utf8');
  ok(ics.suggestedFilename() === slug + '.ics', 'an approved registration offers a calendar file', ics.suggestedFilename());
  ok(/^BEGIN:VCALENDAR\r\n/.test(icsText) && /END:VCALENDAR\r\n$/.test(icsText) && icsText.includes('DTSTART;VALUE=DATE:20300510') && icsText.includes('DTEND;VALUE=DATE:20300513'), 'for all the exhibition days (the end day is the day after)', icsText);
  ok(icsText.includes('SUMMARY:Calendar Expo\\, Phase 1\\; Big') && icsText.includes(`UID:registration-`) && icsText.includes('/en/exhibitions/' + slug), 'with the title escaped, a stable id and the page address');
  ok(icsText.split('\r\n').every((l) => Buffer.byteLength(l) <= 75), 'and no line longer than 75 bytes');
  const vio3 = await axeViolations(p); ok(vio3.length === 0, 'exhibition page with the button: axe 0 violations', vio3);
  sql(`UPDATE expo_registrations SET status='pending' WHERE exhibition_id=${exId}`);
  await p.reload({ waitUntil: 'networkidle' });
  ok(!(await p.getByRole('button', { name: /Add to my calendar/ }).count()), 'a registration still waiting for approval does not offer it');
  sql(`UPDATE expo_registrations SET status='rejected' WHERE exhibition_id=${exId}`);
  await p.reload({ waitUntil: 'networkidle' });
  ok(!(await p.getByRole('button', { name: /Add to my calendar/ }).count()), 'nor does a rejected one');
  await c.close();
  for (const loc of ['ru', 'zh']) {
    sql(`UPDATE expo_registrations SET status='confirmed' WHERE exhibition_id=${exId}`);
    [c, p] = await open(cal.bT, { width: 375, height: 800 });
    await p.goto(BASE + `/${loc}/exhibitions/${slug}`, { waitUntil: 'networkidle' });
    const label = loc === 'ru' ? 'Добавить в мой календарь' : '添加到我的日历';
    await p.getByRole('button', { name: new RegExp(label) }).waitFor();
    const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(over <= 0, `${loc} 375px: the button shows (also for a confirmed registration) and nothing runs off the side`, over);
    await c.close();
  }
  sql(`DELETE FROM expo_registrations WHERE exhibition_id=${exId}; DELETE FROM exhibitions WHERE id=${exId}`);
  await br.close();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
