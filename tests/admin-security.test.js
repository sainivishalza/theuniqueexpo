// Admin sign-in security: "every admin must use two-step sign-in" and the alert for a sign-in from somewhere new.
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { BASE, sql, ok, done, mkUsers } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const smtp = require('./helpers/fake-smtp.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.36.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const H = (t) => ({ 'Content-Type': 'application/json', cookie: 'token=' + t, 'x-forwarded-for': ipn() });
const api = (method, path, body, t) => fetch(BASE + path, { method, headers: H(t), body: body ? JSON.stringify(body) : undefined }).then(async (r) => ({ status: r.status, ...(await r.json().catch(() => ({}))) }));
const num = (q) => Number(sql(q));
// the rule is global: whatever happens in this file, switch it off again so no other test is affected
process.on('exit', () => { try { sql('UPDATE admin_security_settings SET require_two_step=0 WHERE id=1'); } catch { /* the database is gone */ } });

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const b32decode = (s) => { let bits = 0, v = 0; const out = []; for (const ch of s.replace(/[^A-Z2-7]/g, '')) { v = (v << 5) | B32.indexOf(ch); bits += 5; if (bits >= 8) { out.push((v >>> (bits - 8)) & 255); bits -= 8; } } return Buffer.from(out); };
const totp = (secret, step) => { const c = Buffer.alloc(8); c.writeBigUInt64BE(BigInt(step)); const h = crypto.createHmac('sha1', b32decode(secret)).update(c).digest(); const o = h[h.length - 1] & 15; return String((((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6).padStart(6, '0'); };

(async () => {
  sql('UPDATE admin_security_settings SET require_two_step=0 WHERE id=1');
  const A = await mkUsers('sa'), B = await mkUsers('sb'), C = await mkUsers('sc'), Rv = await mkUsers('sr');
  const idOf = (x) => num(`SELECT id FROM users WHERE email='${x.m.a}'`);
  // A already has two-step on (as far as the site can tell); B and C do not
  sql(`INSERT INTO admin_totp (user_id, secret_enc, enabled) VALUES (${idOf(A)}, 'x', 1)`);
  ok((await api('PUT', '/api/admin/staff-access', { userId: idOf(Rv), preset: 'reviewer' }, A.aT)).status === 200, 'a reviewer exists for the role checks');

  console.log('\n== the rule: every admin needs two-step');
  ok((await api('GET', '/api/admin/security-settings', null, A.bT)).status === 401, 'a buyer cannot see it');
  ok((await api('GET', '/api/admin/security-settings', null, Rv.aT)).status === 401, 'nor a reviewer (full admins only)');
  let r = await api('GET', '/api/admin/security-settings', null, A.aT);
  ok(r.available && r.requireTwoStep === false && r.withoutTwoStep >= 3 && r.ownTwoStep === true, 'it starts off, and says how many admins have not set it up', r);
  ok((await api('PUT', '/api/admin/security-settings', { requireTwoStep: 'yes' }, A.aT)).code === 'bad_request', 'on or off only');
  r = await api('PUT', '/api/admin/security-settings', { requireTwoStep: true }, B.aT);
  ok(r.status === 409 && r.code === 'own_first', 'an admin without two-step cannot turn it on (they would lock themselves out)', r);
  ok((await api('GET', '/api/admin/insights', null, C.aT)).status === 200, 'before it is on, C (no two-step) uses the admin as usual');
  r = await api('PUT', '/api/admin/security-settings', { requireTwoStep: true }, A.aT);
  ok(r.ok && r.requireTwoStep === true, 'an admin who has it turns it on');
  ok(num("SELECT COUNT(*) FROM admin_audit_log WHERE action='two_step_required_changed'") >= 1, 'and it is in the activity log');
  ok((await api('GET', '/api/admin/insights', null, A.aT)).status === 200, 'A (has two-step) carries on');
  ok((await api('GET', '/api/admin/insights', null, C.aT)).status === 401 && (await api('GET', '/api/admin/buyer-profiles', null, C.aT)).status === 401, 'C (none) is refused everywhere in the admin');
  ok((await api('POST', '/api/admin/record-meta', { type: 'buyer', id: 1, action: 'bogus' }, C.aT)).status === 401, 'also for changes');
  ok((await api('GET', '/api/admin/two-step', null, C.aT)).status === 200, 'except the two-step screen\'s own API');
  r = await api('GET', '/api/auth/staff-role', null, C.aT); ok(r.twoStepRequired === true, 'the admin screens are told to show the "set up two-step" card', r);
  r = await api('GET', '/api/auth/staff-role', null, A.aT); ok(r.twoStepRequired === false, 'and not for A');
  ok((await api('GET', '/api/admin/security-settings', null, C.aT)).status === 401, 'C cannot change the rule either');

  console.log('\n== C sets two-step up and is let back in at once');
  const post = (body) => api('POST', '/api/admin/two-step', body, C.aT);
  r = await post({ action: 'start', password: 'pass1234' });
  ok(r.status === 200 && r.secret, 'C starts the set-up');
  r = await post({ action: 'confirm', code: totp(r.secret, Math.floor(Date.now() / 30000)) });
  ok(r.status === 200 && r.enabled, 'and confirms it');
  ok((await api('GET', '/api/admin/insights', null, C.aT)).status === 200, 'straight away the admin works again (no waiting)');
  ok((await api('GET', '/api/auth/staff-role', null, C.aT)).twoStepRequired === false, 'and the card is gone');
  ok((await api('GET', '/api/admin/insights', null, B.aT)).status === 401, 'B is still held');
  r = await api('DELETE', `/api/admin/users/${idOf(C)}/two-step`, null, A.aT);
  ok(r.status === 200, 'another admin resets C\'s two-step (lost phone)');
  ok((await api('GET', '/api/admin/insights', null, C.aT)).status === 401, 'so C has to set it up again before using the admin');

  console.log('\n== the screens (en / ru / zh, 375 px)');
  const br = await launch();
  const ctxFor = async (token, locale, path, vp = { width: 375, height: 900 }) => {
    const c = await br.newContext({ viewport: vp, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    await c.addCookies([{ name: 'token', value: token, url: BASE }]);
    const p = await c.newPage(); await p.goto(`${BASE}/${locale}${path}`, { waitUntil: 'domcontentloaded' });
    return [c, p];
  };
  for (const locale of ['en', 'ru', 'zh']) {
    let [c, p] = await ctxFor(B.aT, locale, '/admin/insights');
    await p.getByTestId('two-step-required').waitFor();
    ok((await p.locator('a[href$="/admin/account"]').count()) >= 1, `${locale}: an admin without two-step sees the "set it up" card with a link to their account`);
    await sleep(700);
    let v = await axeViolations(p); ok(v.length === 0, `${locale}: that card has no accessibility violations`, v.map((x) => x.id));
    await c.close();
    [c, p] = await ctxFor(B.aT, locale, '/admin/account');
    await p.getByTestId('sign-in-devices').waitFor();
    ok((await p.getByTestId('two-step-required').count()) === 0, `${locale}: the account page itself is open`);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${locale}: no sideways scrolling`);
    await sleep(700);
    v = await axeViolations(p); ok(v.length === 0, `${locale}: the account page has no accessibility violations`, v.map((x) => x.id));
    await c.close();
  }
  { // the rule's switch on the staff page, as A (full, two-step on)
    const [c, p] = await ctxFor(A.aT, 'en', '/admin/staff-access');
    const rule = p.getByTestId('two-step-rule'); await rule.waitFor();
    ok(await rule.getByLabel('Require two-step sign-in for every admin').isChecked(), 'the staff page shows the rule as on');
    await rule.getByLabel('Require two-step sign-in for every admin').uncheck();
    await rule.getByRole('status').filter({ hasText: 'No longer required' }).waitFor();
    ok(num('SELECT require_two_step FROM admin_security_settings WHERE id=1') === 0, 'switching it off on the screen saves it');
    ok((await api('GET', '/api/admin/insights', null, B.aT)).status === 200, 'and B can use the admin again');
    await sleep(700);
    const v = await axeViolations(p); ok(v.length === 0, 'the staff page has no accessibility violations', v.map((x) => x.id));
    await c.close();
  }
  await br.close();

  console.log('\n== an alert for a sign-in from somewhere new');
  sql('DELETE FROM mail_settings');
  await fetch(BASE + '/api/admin/email', { method: 'PUT', headers: H(A.aT), body: JSON.stringify({ enabled: false, host: '127.0.0.1', port: 2541, secure: false, username: 'm', password: 'x', fromName: 'The Unique Expo', fromEmail: 'noreply@theuniqueexpo.test' }) });
  const D = await mkUsers('sd');
  const login = (user, ip, ua) => fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip, 'user-agent': ua }, body: JSON.stringify({ email: user, password: 'pass1234' }) });
  const CHROME_WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
  const FIREFOX_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0';
  const SAFARI_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  const srv = await smtp.start(2541);
  await fetch(BASE + '/api/admin/email', { method: 'PUT', headers: H(A.aT), body: JSON.stringify({ enabled: true, host: '127.0.0.1', port: 2541, secure: false, username: 'm', password: 'x', fromName: 'The Unique Expo', fromEmail: 'noreply@theuniqueexpo.test' }) });
  const alerts = (email) => srv.messages.filter((m) => m.to.join().includes(email) && /New sign-in to your admin account/.test(smtp.decode(m.raw).subject));
  const devices = () => num(`SELECT COUNT(*) FROM admin_login_devices WHERE user_id=${idOf(D)}`);
  const base = devices();
  ok(base === 1, 'the sign-in made when the account was prepared is the first one written down (no alert for it)', base);
  let res = await login(D.m.a, '198.40.1.5', CHROME_WIN); ok(res.status === 200, 'D signs in from a new browser and place');
  await sleep(1500);
  ok(devices() === 2 && alerts(D.m.a).length === 1, 'it is written down and D gets one e-mail', [devices(), alerts(D.m.a).length]);
  const mail = smtp.decode(alerts(D.m.a)[0].raw);
  ok(/Chrome on Windows/.test(mail.text) && /198\.40\.1\.x/.test(mail.text) && /If it was not you/.test(mail.text) && !/198\.40\.1\.5/.test(mail.text), 'it names the browser and the network (not the exact address) and what to do if it was not them', mail.text.slice(0, 300));
  res = await login(D.m.a, '198.40.1.77', CHROME_WIN); await sleep(1200);
  ok(devices() === 2 && alerts(D.m.a).length === 1, 'the same browser from the same network (last number different) is not new');
  ok(num(`SELECT sign_ins FROM admin_login_devices WHERE user_id=${idOf(D)} AND browser='Chrome on Windows'`) === 2, 'but is counted');
  res = await login(D.m.a, '198.40.1.9', FIREFOX_MAC); await sleep(1200);
  ok(devices() === 3 && alerts(D.m.a).length === 1, 'another new browser within the hour is written down but not e-mailed again (no flood)');
  sql(`UPDATE admin_login_devices SET alerted_at=DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR) WHERE user_id=${idOf(D)}`);
  res = await login(D.m.a, '198.41.2.3', SAFARI_IOS); await sleep(1500);
  ok(devices() === 4 && alerts(D.m.a).length === 2, 'an hour later a new one is e-mailed again');
  ok(/Safari on iOS/.test(smtp.decode(alerts(D.m.a)[1].raw).text), 'with its own browser name');
  // a brand-new admin: the first sign-in is silent
  const email = `sec-e-${Date.now()}@test.invalid`;
  sql(`INSERT INTO users (name,email,password_hash,role,country) VALUES ('Sec E','${email}','${bcrypt.hashSync('pass1234', 10)}','admin','')`);
  await login(email, '198.42.3.4', CHROME_WIN); await sleep(1200);
  ok(num(`SELECT COUNT(*) FROM admin_login_devices WHERE user_id=(SELECT id FROM users WHERE email='${email}')`) === 1 && alerts(email).length === 0, 'the very first sign-in an admin ever makes is only written down');
  // a buyer's sign-in is not recorded
  await login(D.m.b, '198.43.3.4', CHROME_WIN); await sleep(500);
  ok(num(`SELECT COUNT(*) FROM admin_login_devices WHERE user_id=${D.bId}`) === 0, 'buyers\' sign-ins are not recorded');
  // e-mail off: nothing breaks
  await fetch(BASE + '/api/admin/email', { method: 'PUT', headers: H(A.aT), body: JSON.stringify({ enabled: false, host: '127.0.0.1', port: 2541, secure: false, username: 'm', password: 'x', fromName: 'The Unique Expo', fromEmail: 'noreply@theuniqueexpo.test' }) });
  sql(`UPDATE admin_login_devices SET alerted_at=NULL WHERE user_id=${idOf(D)}`);
  res = await login(D.m.a, '198.44.4.4', CHROME_WIN); await sleep(1200);
  ok(res.status === 200 && devices() === 5 && alerts(D.m.a).length === 2, 'with e-mail off the sign-in works, is written down, and nothing is sent');
  r = await api('GET', '/api/admin/sign-ins', null, D.aT);
  ok(r.status === 200 && r.devices.length === 5 && r.devices[0].browser === 'Chrome on Windows' && r.devices.every((d) => /\.x$/.test(d.ipPrefix)), 'the admin can list where they signed in from (newest first, never the full address)', r.devices.map((d) => d.browser + '@' + d.ipPrefix));
  ok((await api('GET', '/api/admin/sign-ins', null, D.bT)).status === 401, 'a buyer cannot');
  ok((await api('GET', '/api/admin/sign-ins', null, Rv.aT)).status === 200, 'a reviewer can see their own');
  await srv.close();
  sql('DELETE FROM mail_settings');
  done();
})().catch((e) => { console.error(e); process.exit(1); });
