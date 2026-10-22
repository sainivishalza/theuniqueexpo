// Admin two-step sign-in (a code from an authenticator app) and the activity log it writes to.
const crypto = require('node:crypto');
const { BASE, sql, ok, done, mkUsers } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');

// An independent RFC 6238 implementation, so the site's one is checked against a second one.
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const b32decode = (s) => { let bits = 0, v = 0; const out = []; for (const ch of s.replace(/[^A-Z2-7]/g, '')) { v = (v << 5) | B32.indexOf(ch); bits += 5; if (bits >= 8) { out.push((v >>> (bits - 8)) & 255); bits -= 8; } } return Buffer.from(out); };
const totp = (secret, step, digits = 6) => { const c = Buffer.alloc(8); c.writeBigUInt64BE(BigInt(step)); const h = crypto.createHmac('sha1', Buffer.isBuffer(secret) ? secret : b32decode(secret)).update(c).digest(); const o = h[h.length - 1] & 15; const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]; return String(n % 10 ** digits).padStart(digits, '0'); };
const now = () => Math.floor(Date.now() / 1000 / 30);
const ip = () => '10.8.' + Math.floor(Math.random() * 250) + '.' + (Math.floor(Math.random() * 250) + 1);
const post = (path, body, cookie, extra = {}) => fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip(), ...(cookie ? { cookie: 'token=' + cookie } : {}), ...extra }, body: JSON.stringify(body) });
const login = (email, password = 'pass1234') => post('/api/auth/login', { email, password });
const second = (challenge, code) => post('/api/auth/login/totp', { challenge, code });
const cookieOf = (r) => (/token=([^;]+)/.exec(r.headers.getSetCookie().join(';')) || [])[1];
const manage = (ck, body) => post('/api/admin/two-step', body, ck);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  // RFC 6238 test vector (SHA-1, secret "12345678901234567890", T = 59 s -> step 1, 8 digits 94287082).
  ok(totp(Buffer.from('12345678901234567890'), 1, 8) === '94287082', 'the test\'s own TOTP matches the RFC 6238 vector');

  console.log('\n== set-up');
  const u = await mkUsers('ts');
  ok((await fetch(BASE + '/api/admin/two-step')).status === 401, 'signed-out is refused');
  ok((await fetch(BASE + '/api/admin/two-step', { headers: { cookie: 'token=' + u.bT } })).status === 401, 'a buyer is refused');
  let r = await manage(u.bT, { action: 'start', password: 'pass1234' });
  ok(r.status === 401, 'a buyer cannot start set-up');
  r = await manage(u.aT, { action: 'start', password: 'wrong' });
  ok(r.status === 403, 'set-up asks for the password again', r.status);
  r = await manage(u.aT, { action: 'start', password: 'pass1234' });
  let j = await r.json();
  ok(r.status === 200 && /^[A-Z2-7]{32}$/.test(j.secret) && j.uri.startsWith('otpauth://totp/') && j.uri.includes('secret=' + j.secret) && j.qr.startsWith('data:image/png;base64,'), 'set-up gives a secret, an otpauth link and a QR picture', [r.status, j.secret && j.secret.length]);
  ok((r.headers.get('cache-control') || '').includes('no-store'), 'and is never cached');
  const secret = j.secret;
  const stored = sql(`SELECT secret_enc FROM admin_totp WHERE user_id=(SELECT id FROM users WHERE email='${u.m.a}')`);
  ok(stored && !stored.includes(secret), 'the secret is stored encrypted, not as text');
  ok((await (await login(u.m.a)).json()).user, 'until the first code is confirmed, sign-in is by password only');
  r = await manage(u.aT, { action: 'confirm', code: '000000' });
  ok(r.status === 400, 'a wrong first code does not turn it on', r.status);
  ok((await (await manage(u.aT, { action: 'confirm', code: 'abcdef' })).json()).code === 'wrong_code', 'a non-numeric code is refused');
  const s0 = now();
  r = await manage(u.aT, { action: 'confirm', code: totp(secret, s0) });
  j = await r.json();
  ok(r.status === 200 && j.enabled && j.recoveryCodes.length === 10 && j.recoveryCodes.every((c) => /^[a-z2-9]{5}-[a-z2-9]{5}$/.test(c)) && new Set(j.recoveryCodes).size === 10, 'the right code turns it on and gives 10 different recovery codes', [r.status, j.recoveryCodes]);
  let codes = j.recoveryCodes;
  const hashes = sql(`SELECT recovery_hashes FROM admin_totp WHERE user_id=(SELECT id FROM users WHERE email='${u.m.a}')`);
  ok(!codes.some((c) => hashes.includes(c)) && hashes.includes(crypto.createHash('sha256').update(codes[0].replace('-', '')).digest('hex')), 'recovery codes are stored only as SHA-256 hashes');
  ok((await manage(u.aT, { action: 'start', password: 'pass1234' })).status === 409, 'set-up cannot be started again while it is on');
  j = await (await fetch(BASE + '/api/admin/two-step', { headers: { cookie: 'token=' + u.aT } })).json();
  ok(j.enabled === true && j.recoveryCodesLeft === 10, 'status shows on, 10 recovery codes left', j);

  console.log('\n== signing in');
  r = await login(u.m.a);
  j = await r.json();
  ok(r.status === 200 && j.needsSecondStep === true && j.challenge && !j.user && !cookieOf(r), 'the right password alone no longer signs in: no cookie, a pass is returned', [r.status, Object.keys(j)]);
  const challenge = j.challenge;
  let me = await (await fetch(BASE + '/api/auth/me', { headers: { cookie: 'token=' + challenge } })).json();
  ok(!me.user, 'the pass cannot be used as a sign-in cookie');
  ok((await (await login(u.m.a, 'wrong-password')).json()).error, 'a wrong password is still refused');
  r = await second(challenge, '123456');
  ok(r.status === 401 && (await r.json()).code === 'wrong_code', 'a wrong code is refused');
  ok((await second('not-a-pass', totp(secret, s0 + 1))).status === 401, 'a made-up pass is refused');
  r = await second(challenge, totp(secret, s0));
  ok(r.status === 401, 'the code used to turn it on cannot be used again (each code works once)', r.status);
  const stepA = now() + 1;
  r = await second(challenge, totp(secret, stepA));
  j = await r.json();
  const ck = cookieOf(r);
  ok(r.status === 200 && j.user.role === 'admin' && ck, 'the next code (one step ahead of a slow clock) signs in', [r.status, j]);
  me = await (await fetch(BASE + '/api/auth/me', { headers: { cookie: 'token=' + ck } })).json();
  ok(me.user && me.user.email === u.m.a, 'and the session works');
  const again = await (await login(u.m.a)).json();
  r = await second(again.challenge, totp(secret, stepA));
  ok(r.status === 401, 'the same code cannot sign in twice (no replay)', r.status);
  r = await second(again.challenge, totp(secret, stepA).replace(/^(\d)/, (d) => String((Number(d) + 1) % 10)));
  ok(r.status === 401, 'a code with one digit changed is refused');
  r = await second(again.challenge, totp(secret, now() - 5));
  ok(r.status === 401, 'an old code (2 minutes ago) is refused');
  // recovery code
  r = await second(again.challenge, codes[0]);
  j = await r.json();
  ok(r.status === 200 && j.usedRecoveryCode === true && cookieOf(r), 'a recovery code signs in', [r.status, j]);
  r = await second((await (await login(u.m.a)).json()).challenge, codes[0]);
  ok(r.status === 401, 'a recovery code works only once', r.status);
  r = await second((await (await login(u.m.a)).json()).challenge, codes[1].toUpperCase().replace('-', ' '));
  ok(r.status === 200, 'recovery codes are accepted in capitals and with a space instead of the dash', r.status);
  j = await (await fetch(BASE + '/api/admin/two-step', { headers: { cookie: 'token=' + ck } })).json();
  ok(j.recoveryCodesLeft === 8, '8 recovery codes are left', j);
  ok((await second('eyJhbGciOiJIUzI1NiJ9.e30.x', '123456')).status === 401, 'a pass that is not signed by the site is refused');

  console.log('\n== other ways in');
  ok((await post('/api/tour-registrations', { tourSlug: 'x', email: u.m.a, password: 'pass1234' })).status === 401, 'the tour form does not sign an admin in by password alone');
  r = await post('/api/expo-registrations', { exhibitionSlug: 'x', email: u.m.a, password: 'pass1234' });
  j = await r.json();
  ok(r.status === 401 && j.accountExists === true, 'neither does the exhibition form', [r.status, j]);
  r = await post('/api/expo-registrations', { exhibitionSlug: 'x', email: u.m.b, password: 'pass1234' });
  ok(r.status === 404, 'a buyer with the right password still gets past the password check there (no such exhibition)', r.status);
  r = await post('/api/auth/forgot-password', { email: u.m.a });
  ok(r.status === 200, 'forgot-password still answers the same way');
  const plain = await mkUsers('tp');
  ok((await (await login(plain.m.a)).json()).user, 'an admin without two-step signs in with the password only');
  ok((await (await login(plain.m.b)).json()).user, 'a buyer signs in with the password only');

  console.log('\n== wrong-code limit');
  const lim = await mkUsers('tl');
  let sec = (await (await manage(lim.aT, { action: 'start', password: 'pass1234' })).json()).secret;
  await manage(lim.aT, { action: 'confirm', code: totp(sec, now()) });
  const ch = (await (await login(lim.m.a)).json()).challenge;
  let last;
  for (let i = 0; i < 8; i++) last = await second(ch, '11111' + i);
  ok(last.status === 401, 'eight wrong codes are each refused');
  r = await second(ch, totp(sec, now() + 1));
  ok(r.status === 429 && r.headers.get('retry-after'), 'then a pause, even for the right code', [r.status, r.headers.get('retry-after')]);
  r = await second((await (await login(lim.m.a)).json()).challenge, totp(sec, now() + 1));
  ok(r.status === 429, 'a new pass does not clear the pause', r.status);
  const typo = await mkUsers('tt');
  sec = (await (await manage(typo.aT, { action: 'start', password: 'pass1234' })).json()).secret;
  await manage(typo.aT, { action: 'confirm', code: totp(sec, now()) });
  const ch2 = (await (await login(typo.m.a)).json()).challenge;
  for (let i = 0; i < 3; i++) await second(ch2, '22222' + i);
  r = await second(ch2, totp(sec, now() + 1));
  ok(r.status === 200, 'a few typos followed by the right code still sign in', r.status);
  // set-up attempts are limited too
  const lim2 = await mkUsers('tm');
  await manage(lim2.aT, { action: 'start', password: 'pass1234' });
  for (let i = 0; i < 6; i++) await manage(lim2.aT, { action: 'confirm', code: '99999' + i });
  r = await manage(lim2.aT, { action: 'confirm', code: '123456' });
  ok(r.status === 429, 'wrong codes while setting up are limited too', r.status);

  console.log('\n== new recovery codes, turning off');
  r = await manage(ck, { action: 'recoveryCodes', password: 'wrong' });
  ok(r.status === 403, 'new recovery codes need the password');
  r = await manage(ck, { action: 'recoveryCodes', password: 'pass1234' });
  j = await r.json();
  ok(r.status === 200 && j.recoveryCodes.length === 10 && !j.recoveryCodes.includes(codes[2]), 'new recovery codes are made', r.status);
  const old = codes[2]; codes = j.recoveryCodes;
  r = await second((await (await login(u.m.a)).json()).challenge, old);
  ok(r.status === 401, 'the old recovery codes stop working');
  r = await manage(ck, { action: 'disable', password: 'pass1234', code: '000000' });
  ok(r.status === 403, 'turning off needs a current code as well as the password');
  r = await manage(ck, { action: 'disable', password: 'wrong', code: codes[3] });
  ok(r.status === 403, 'and the right password');
  r = await manage(ck, { action: 'disable', password: 'pass1234', code: codes[3] });
  ok(r.status === 200 && (await r.json()).enabled === false, 'a recovery code can be used to turn it off');
  ok((await (await login(u.m.a)).json()).user, 'afterwards sign-in is by password only');
  ok(sql(`SELECT COUNT(*) FROM admin_totp WHERE user_id=(SELECT id FROM users WHERE email='${u.m.a}')`) === '0', 'the secret is deleted');

  console.log('\n== one admin turns off another\'s');
  const x = await mkUsers('tx'); const y = await mkUsers('ty');
  const ySec = (await (await manage(y.aT, { action: 'start', password: 'pass1234' })).json()).secret;
  await manage(y.aT, { action: 'confirm', code: totp(ySec, now()) });
  const yId = sql(`SELECT id FROM users WHERE email='${y.m.a}'`);
  const xId = sql(`SELECT id FROM users WHERE email='${x.m.a}'`);
  const users = await (await fetch(BASE + '/api/admin/users', { headers: { cookie: 'token=' + x.aT } })).json();
  ok(users.users.find((p) => String(p.id) === yId).twoStep === true && users.users.find((p) => String(p.id) === xId).twoStep === false, 'the Users list shows who has two-step on');
  const del = (id, c) => fetch(BASE + `/api/admin/users/${id}/two-step`, { method: 'DELETE', headers: { cookie: 'token=' + c } });
  ok((await del(yId, x.bT)).status === 401, 'a buyer cannot');
  ok((await del(xId, x.aT)).status === 400, 'an admin cannot use this on themselves');
  ok((await del(Number(xId) + 99999, x.aT)).status === 404, 'an unknown user is not found');
  ok((await del(yId, x.aT)).status === 200, 'another admin can turn it off');
  ok((await del(yId, x.aT)).status === 409, 'and again says it is not on');
  ok((await (await login(y.m.a)).json()).user, 'the admin whose two-step was turned off signs in by password again');
  const att = await (await fetch(BASE + '/api/admin/attention', { headers: { cookie: 'token=' + x.aT } })).json();
  ok(att.twoStepOff === true, 'the admin home is told this admin has not turned it on');

  console.log('\n== the activity log');
  const act = async (qs = '') => (await fetch(BASE + '/api/admin/activity' + qs, { headers: { cookie: 'token=' + x.aT } })).json();
  ok((await fetch(BASE + '/api/admin/activity', { headers: { cookie: 'token=' + x.bT } })).status === 401, 'only an admin can read it');
  await wait(400);
  const mine = (await act('?admin=' + sql(`SELECT id FROM users WHERE email='${u.m.a}'`))).rows.map((q) => q.action);
  ok(['two_step_on', 'sign_in', 'sign_in_code_wrong', 'sign_in_recovery_code', 'two_step_new_recovery_codes', 'two_step_off'].every((k) => mine.includes(k)), 'every two-step event of that admin is in the log', mine);
  const turned = (await act('?action=two_step_reset_for_user')).rows.find((q) => q.targetId === yId);
  ok(turned && turned.adminName === 'tx Admin' && turned.details === y.m.a && turned.ip, 'turning off another admin\'s two-step is logged with who, whom and the address', turned);
  ok(!JSON.stringify(await act('?admin=' + xId)).includes(secret), 'no secret appears in the log');
  ok((await act('?action=nothing_like_this')).total === 0, 'filtering by an action nobody did finds nothing');
  const pg = await act('?page=2'); ok(Array.isArray(pg.rows), 'pages work');

  console.log('\n== the sign-in screens');
  const br = await launch();
  const open = async (vp = { width: 1200, height: 900 }) => { const c = await br.newContext({ viewport: vp, extraHTTPHeaders: { 'x-forwarded-for': ip() } }); return [c, await c.newPage()]; };
  const w = await mkUsers('tu');
  // set up in the browser, as an admin would
  let [c, p] = await open();
  await c.addCookies([{ name: 'token', value: w.aT, url: BASE }]);
  await p.goto(BASE + '/en/admin/account', { waitUntil: 'networkidle' });
  await p.waitForSelector('#two-step');
  ok(await p.locator('#two-step').getByText('Off', { exact: true }).isVisible(), 'the account page shows two-step as off');
  await p.getByRole('button', { name: 'Turn on two-step sign-in' }).click();
  await p.getByLabel('Your password').fill('wrongpass');
  await p.getByRole('button', { name: 'Continue' }).click();
  await p.waitForSelector('[role=alert]');
  ok((await p.locator('#two-step [role=alert]').innerText()).includes('password is not correct'), 'a wrong password is explained');
  await p.getByLabel('Your password').fill('pass1234');
  await p.getByRole('button', { name: 'Continue' }).click();
  await p.waitForSelector('[data-testid=two-step-secret]');
  ok(await p.locator('#two-step img[alt]').isVisible(), 'the QR picture is shown');
  const shown = (await p.locator('[data-testid=two-step-secret]').innerText()).replace(/\s/g, '');
  ok(/^[A-Z2-7]{32}$/.test(shown), 'and the key to type in by hand');
  const vio1 = await axeViolations(p); ok(vio1.length === 0, 'set-up screen: axe 0 violations', vio1);
  await p.screenshot({ path: require('./helpers/common.js').SHOTS + '/two-step-setup.png' });
  await p.getByLabel('6-digit code from the app').fill('000000');
  await p.getByRole('button', { name: 'Turn on', exact: true }).click();
  await p.waitForSelector('#two-step [role=alert]');
  ok((await p.locator('#two-step [role=alert]').innerText()).includes('not correct'), 'a wrong code is explained');
  await p.getByLabel('6-digit code from the app').fill(totp(shown, now()));
  await p.getByRole('button', { name: 'Turn on', exact: true }).click();
  await p.waitForSelector('ul[aria-label="Your recovery codes"]');
  const shownCodes = await p.locator('ul[aria-label="Your recovery codes"] li').allInnerTexts();
  ok(shownCodes.length === 10, 'the 10 recovery codes are shown once', shownCodes);
  const vio2 = await axeViolations(p); ok(vio2.length === 0, 'recovery codes screen: axe 0 violations', vio2);
  await p.getByRole('button', { name: 'I have saved them' }).click();
  ok(await p.getByText('Two-step sign-in is on for your account.').isVisible(), 'then it shows as on');
  ok(await p.getByText('10 recovery codes left.').isVisible(), 'with the number of recovery codes left');
  await c.close();

  // sign in in the browser: password, then the code
  [c, p] = await open();
  await p.goto(BASE + '/en/login', { waitUntil: 'networkidle' });
  await p.fill('#email', w.m.a); await p.fill('#password', 'pass1234');
  await p.getByRole('button', { name: 'Sign in' }).click();
  await p.waitForSelector('#second-step-code');
  ok(await p.getByRole('heading', { name: 'Enter your code' }).isVisible() && !p.url().includes('/dashboard'), 'after the password the code screen opens and nobody is signed in yet');
  const vio3 = await axeViolations(p); ok(vio3.length === 0, 'code screen: axe 0 violations', vio3);
  await p.fill('#second-step-code', '000000');
  await p.getByRole('button', { name: 'Sign in' }).click();
  await p.waitForSelector('div.bg-red-50[role=alert]');
  ok((await p.locator('div.bg-red-50[role=alert]').innerText()).includes('not correct'), 'a wrong code is explained');
  await p.getByRole('button', { name: 'Use a recovery code instead' }).click();
  ok(await p.locator('label[for=second-step-code]').innerText() === 'Recovery code', 'the recovery code box can be switched on');
  await p.getByRole('button', { name: 'Use the code from the app' }).click();
  await p.getByRole('button', { name: 'Start again' }).click();
  ok(await p.locator('#password').isVisible(), '"Start again" returns to the password');
  await p.fill('#email', w.m.a); await p.fill('#password', 'pass1234');
  await p.getByRole('button', { name: 'Sign in' }).click();
  await p.waitForSelector('#second-step-code');
  await p.fill('#second-step-code', totp(shown, now() + 1));
  await p.getByRole('button', { name: 'Sign in' }).click();
  await p.waitForURL('**/dashboard**');
  ok(p.url().includes('/dashboard'), 'the right code signs in and opens the dashboard', p.url());
  await p.goto(BASE + '/en/admin', { waitUntil: 'networkidle' });
  ok(!(await p.getByText('Turn on two-step sign-in').count()), 'with two-step on, the admin home no longer reminds about it');
  await c.close();

  // the reminder on the admin home, and the Users page
  [c, p] = await open();
  await c.addCookies([{ name: 'token', value: x.aT, url: BASE }]);
  await p.goto(BASE + '/en/admin', { waitUntil: 'networkidle' });
  await p.waitForSelector('#attention-title');
  await p.getByText('Turn on two-step sign-in').waitFor();
  ok(true, 'an admin without two-step sees the reminder on the admin home');
  await p.goto(BASE + '/en/admin/users', { waitUntil: 'networkidle' });
  await p.getByPlaceholder(/Search by name/).fill(w.m.a);
  await p.getByText('Two-step sign-in is on').waitFor();
  ok(await p.getByRole('button', { name: 'Turn off two-step' }).isVisible(), 'the Users page shows who has it on, with a button to turn it off');
  await p.goto(BASE + '/en/admin/activity', { waitUntil: 'networkidle' });
  await p.getByRole('heading', { name: 'Activity' }).waitFor();
  await p.getByText(/\d+ actions?/).waitFor();
  ok(await p.locator('tbody').getByText('Turned on two-step sign-in').first().isVisible(), 'the Activity page lists the actions in words');
  const vio4 = await axeViolations(p); ok(vio4.length === 0, 'Activity page: axe 0 violations', vio4);
  await p.getByPlaceholder('Name, e-mail, number or reason…').fill('tu Admin');
  await p.getByRole('button', { name: 'Search', exact: true }).click();
  await p.waitForTimeout(600);
  ok((await p.locator('tbody tr').count()) >= 1, 'search finds the lines about an account');
  await p.getByLabel('What').selectOption('two_step_on');
  await p.waitForTimeout(600);
  ok((await p.locator('tbody tr').count()) >= 1 && (await p.locator('tbody tr').allInnerTexts()).every((t) => t.includes('Turned on two-step')), 'the action filter works');
  await c.close();

  // phones, three languages
  for (const loc of ['en', 'ru', 'zh']) {
    for (const width of [320, 375]) {
      [c, p] = await open({ width, height: 800 });
      await p.goto(BASE + `/${loc}/login`, { waitUntil: 'networkidle' });
      await p.fill('#email', w.m.a); await p.fill('#password', 'pass1234');
      await p.locator('form:has(#password) button[type=submit]').click();
      await p.waitForSelector('#second-step-code');
      const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const title = await p.locator('h2').first().innerText();
      ok(over <= 0 && title.length > 0 && !/secondStep\./.test(await p.locator('body').innerText()), `${loc} ${width}px: code screen fits, in words (${title})`, over);
      await c.close();
    }
    [c, p] = await open({ width: 375, height: 800 });
    await c.addCookies([{ name: 'token', value: x.aT, url: BASE }]);
    for (const path of ['admin/account', 'admin/activity', 'admin/users']) {
      await p.goto(BASE + `/${loc}/${path}`, { waitUntil: 'networkidle' });
      await p.waitForTimeout(500);
      const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const raw = await p.evaluate(() => /\b(adminTwoStep|adminActivity|adminUsers|loginPage)\.[a-zA-Z.]+/.test(document.body.innerText));
      ok(over <= 0 && !raw, `${loc} 375px /${path}: no sideways scroll, no raw message keys`, [over, raw]);
    }
    await c.close();
  }
  await br.close();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
