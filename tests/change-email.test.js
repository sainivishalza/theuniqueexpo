// "Change my e-mail address": password check, a link to the NEW address, a notice to the old one.
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { BASE, sql, ok, done, mkUsers, SHOTS } = require('./helpers/common.js');
const smtp = require('./helpers/fake-smtp.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.20.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const H = (t, extra = {}) => ({ 'Content-Type': 'application/json', cookie: 'token=' + t, 'x-forwarded-for': ipn(), ...extra });
const loginRes = (email, password = 'pass1234') => fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ipn() }, body: JSON.stringify({ email, password }) });
const resetLimits = () => sql('UPDATE rate_limits SET hits=0');
const mkU = async (tag) => { const o = await mkUsers(tag); o.aId = Number(sql(`SELECT id FROM users WHERE email='${o.m.a}'`)); return o; };

(async () => {
  sql('DELETE FROM mail_settings');
  const u = await mkU('ce');
  const srv = await smtp.start(2533);
  const settings = { enabled: true, host: '127.0.0.1', port: 2533, secure: false, username: 'm', password: 'x', fromName: 'The Unique Expo', fromEmail: 'noreply@theuniqueexpo.test' };
  const put = (body) => fetch(BASE + '/api/admin/email', { method: 'PUT', headers: H(u.aT), body: JSON.stringify(body) });
  const st = Date.now(), h = bcrypt.hashSync('pass1234', 10);
  const change = (email, currentPassword = 'pass1234', t = u.aT) => fetch(BASE + '/api/auth/change-email', { method: 'POST', headers: H(t), body: JSON.stringify({ email, currentPassword }) });
  const waitFor = async (re, n0, to) => { for (let i = 0; i < 70; i++) { const m = srv.messages.slice(n0).find((x) => re.test(smtp.decode(x.raw).subject) && (!to || x.to.join().toLowerCase().includes(to.toLowerCase()))); if (m) return m; await sleep(150); } return null; };
  const tokenOf = (m) => /confirm-email\?token=([A-Za-z0-9_-]{43})/.exec(smtp.decode(m.raw).text)[1];
  const adminId = u.aId;
  const oldAdmin = u.m.a;
  const fresh = `fresh-${st}@test.invalid`;

  console.log('\n== who can use it, and what is refused');
  await put({ ...settings, enabled: false });
  ok((await fetch(BASE + '/api/auth/change-email', { method: 'POST', body: '{}' })).status === 401, 'signed out: 401');
  let r = await fetch(BASE + '/api/auth/change-email', { method: 'POST', headers: H(u.aT), body: JSON.stringify({ email: fresh }) }); ok(r.status === 400, 'without the password: refused');
  r = await change(fresh, 'not-my-password'); let j = await r.json(); ok(r.status === 403 && j.code === 'wrong_password', 'a wrong password is refused (403)', j);
  r = await change(fresh); j = await r.json(); ok(r.status === 503 && j.code === 'mail_off', 'with e-mail off it says so (503), after the password was right', j);
  await put(settings); await sleep(200);
  r = await change('nonsense'); ok(r.status === 400 && (await r.json()).code === 'invalid_email', 'a malformed address is refused');
  r = await change('x@noemail.invalid'); ok(r.status === 400, 'a placeholder address is refused');
  r = await change(oldAdmin.toUpperCase()); j = await r.json(); ok(r.status === 400 && j.code === 'same_email', 'the address the account already has is refused (even in capitals)', j);
  const phone = `phone-139${String(st).slice(-8)}@noemail.invalid`;
  sql(`INSERT INTO users (name,email,password_hash,role,country) VALUES ('No Email','${phone}','${h}','buyer','')`);
  const loginPhone = await loginRes(phone); const pT = /token=([^;]+)/.exec(loginPhone.headers.get('set-cookie'))[1];
  r = await change(fresh, 'pass1234', pT); j = await r.json(); ok(r.status === 409 && j.code === 'no_email', 'an account with no real address is sent to "add your e-mail" instead (409)', j);
  ok(sql(`SELECT email FROM users WHERE id=${adminId}`) === oldAdmin, 'nothing changed so far');
  resetLimits();
  const w = await mkU('cw');
  for (let i = 0; i < 6; i++) await change(fresh, 'wrong' + i, w.aT);
  r = await change(fresh, 'pass1234', w.aT); ok(r.status === 429, 'after 6 wrong passwords even the right one waits (429)', r.status);
  resetLimits();

  console.log('\n== asking for the link');
  const before = srv.messages.length;
  r = await change(u.m.b); ok(r.status === 200 && (await r.json()).ok, 'an address that belongs to another account gets the normal answer (no account lookup)');
  await sleep(900); ok(srv.messages.length === before, 'and nothing is sent');
  r = await change(fresh.toUpperCase()); ok(r.status === 200, 'a free address (typed in capitals) is accepted');
  const mail = await waitFor(/Confirm your new e-mail/i, before);
  ok(!!mail, 'the confirmation mail arrives');
  ok(mail.to.join().toLowerCase().includes(fresh), 'it goes to the NEW address, not to the old one', mail.to);
  const tok = tokenOf(mail);
  const row = sql(`SELECT CONCAT(new_email,'|',old_email) FROM email_changes WHERE user_id=${adminId}`);
  ok(row === `${fresh}|${oldAdmin.toLowerCase()}`, 'both addresses are kept (new in lower case, and the one the account had)', row);
  ok(sql(`SELECT COUNT(*) FROM email_changes WHERE token_hash='${crypto.createHash('sha256').update(tok).digest('hex')}'`) === '1' && sql(`SELECT COUNT(*) FROM email_changes WHERE token_hash='${tok}'`) === '0', 'only the hash of the link is stored');
  ok(sql(`SELECT email FROM users WHERE id=${adminId}`) === oldAdmin && (await loginRes(oldAdmin)).status === 200, 'the account keeps its old address, and signing in with it still works, until the link is used');
  const n1 = srv.messages.length; r = await change(fresh); const mail2 = await waitFor(/Confirm your new e-mail/i, n1); const tok2 = tokenOf(mail2);
  ok(tok2 !== tok, 'asking again makes a new link');
  r = await fetch(BASE + '/api/auth/confirm-email?token=' + tok); ok((await r.json()).valid === false, 'and the older link no longer works');
  for (let i = 0; i < 3; i++) await change(`more${i}-${st}@test.invalid`);
  r = await change(`more9-${st}@test.invalid`); ok(r.status === 429, 'after 5 requests in an hour: 429', r.status);
  resetLimits();
  const n2 = srv.messages.length; r = await change(fresh); const mail3 = await waitFor(/Confirm your new e-mail/i, n2); const tok3 = tokenOf(mail3);

  console.log('\n== using the link');
  r = await fetch(BASE + '/api/auth/confirm-email?token=' + tok3); ok((await r.json()).valid === true, 'the newest link is valid');
  const conf = (t) => fetch(BASE + '/api/auth/confirm-email', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ipn() }, body: JSON.stringify({ token: t }) });
  const nOld = srv.messages.length;
  const [c1, c2] = await Promise.all([conf(tok3), conf(tok3)]); const sts = [c1.status, c2.status].sort();
  ok(sts[0] === 200 && sts[1] === 400, 'two uses of the link at once: exactly one wins', sts);
  ok(sql(`SELECT email FROM users WHERE id=${adminId}`) === fresh, 'the account now has the new address');
  ok((await loginRes(fresh)).status === 200, 'signing in with the new address works (same password)');
  ok((await loginRes(oldAdmin)).status === 401, 'and the old address no longer does');
  ok((await conf(tok3)).status === 400, 'the link cannot be used twice');
  const notice = await waitFor(/e-mail address of your account was changed/i, nOld, oldAdmin);
  ok(!!notice, 'the OLD address is told about the change');
  const nd = smtp.parts(notice.raw);
  ok(nd.text.includes(fresh) && nd.html.includes(fresh), 'naming the new address (text and HTML)', nd.text.slice(0, 300));
  await sleep(600);
  ok(srv.messages.slice(nOld).filter((m) => /was changed/i.test(smtp.decode(m.raw).subject)).length === 1, 'once, not twice');
  const audit = sql(`SELECT CONCAT(action,'|',details) FROM admin_audit_log WHERE action='admin_email_changed' AND target_id='${adminId}' ORDER BY id DESC LIMIT 1`);
  ok(audit === `admin_email_changed|${oldAdmin} → ${fresh}`, 'an admin\'s change is in the activity log', audit);
  const actTxt = await (await fetch(BASE + '/api/admin/activity?limit=20', { headers: H(u.aT) })).text();
  ok(/admin_email_changed/.test(actTxt), 'and the activity page can list it');

  console.log('\n== links that must not work');
  // stale: the account's address changed some other way after the link was asked for
  resetLimits();
  const v = await mkU('cv');
  const vNew = `v-new-${st}@test.invalid`;
  r = await change(vNew, 'pass1234', v.aT); const mv = await waitFor(/Confirm your new e-mail/i, srv.messages.length - 1, vNew); const tv = tokenOf(mv);
  sql(`UPDATE users SET email='v-other-${st}@test.invalid' WHERE id=${v.aId}`);
  r = await conf(tv); j = await r.json(); ok(r.status === 400 && j.code === 'invalid_token', 'a link asked for under another address no longer works', j);
  ok(sql(`SELECT email FROM users WHERE id=${v.aId}`) === `v-other-${st}@test.invalid`, 'and the account is unchanged');
  // taken in the meantime
  resetLimits();
  const x = await mkU('cx');
  const target = `target-${st}@test.invalid`;
  r = await change(target, 'pass1234', x.aT); const mx = await waitFor(/Confirm your new e-mail/i, srv.messages.length - 1, target); const tx = tokenOf(mx);
  sql(`INSERT INTO users (name,email,password_hash,role,country) VALUES ('Took It','${target}','${h}','buyer','')`);
  r = await conf(tx); j = await r.json(); ok(r.status === 400 && j.code === 'email_taken', 'an address taken by someone else in the meantime is refused (email_taken)', j);
  ok(sql(`SELECT email FROM users WHERE id=${x.aId}`) === x.m.a, 'and the account is unchanged');
  // expiry
  resetLimits();
  r = await change(`exp-${st}@test.invalid`, 'pass1234', x.aT); const me = await waitFor(/Confirm your new e-mail/i, srv.messages.length - 1, `exp-${st}`); const te = tokenOf(me);
  sql(`UPDATE email_changes SET expires_at=${Date.now() - 1000} WHERE user_id=${x.aId}`);
  r = await conf(te); ok(r.status === 400 && (await r.json()).code === 'invalid_token', 'an expired link is refused');
  // a buyer can change too
  resetLimits();
  const b = await mkU('cb'); const bNew = `buyer-new-${st}@test.invalid`;
  r = await change(bNew, 'pass1234', b.bT); const mb = await waitFor(/Confirm your new e-mail/i, srv.messages.length - 1, bNew);
  ok(r.status === 200 && !!mb, 'buyers (any account with a real address) can change theirs too');
  r = await conf(tokenOf(mb)); ok(r.status === 200 && sql(`SELECT email FROM users WHERE id=${b.bId}`) === bNew, 'and it takes effect');
  ok(!/admin_email_changed/.test(sql(`SELECT GROUP_CONCAT(action) FROM admin_audit_log WHERE target_id='${b.bId}'`) || ''), 'without an activity-log entry (that is for admins)');

  console.log('\n== screens');
  const br = await launch();
  const mk = async (t, vp = { width: 1100, height: 1200 }) => { const c = await br.newContext({ viewport: vp, extraHTTPHeaders: { 'x-forwarded-for': ipn() } }); await c.addCookies([{ name: 'token', value: t, url: BASE }]); return c; };
  resetLimits();
  const s = await mkU('cs');
  let c = await mk(s.aT); let p = await c.newPage();
  await p.goto(BASE + '/en/admin/account', { waitUntil: 'networkidle' });
  const card = p.locator('#change-email');
  await card.getByRole('heading', { name: 'Change my e-mail address' }).waitFor();
  ok((await card.innerText()).includes(`Your current address: ${s.m.a}`), 'the admin account page has the card, with the current address');
  const va = await axeViolations(p); ok(va.length === 0, 'axe 0 violations', va);
  await card.getByLabel('New e-mail address').fill(`ui-new-${st}@test.invalid`);
  await card.getByLabel('Account password').fill('wrong-password');
  await card.getByRole('button', { name: 'Send the confirmation link' }).click();
  await card.getByRole('alert').waitFor();
  ok((await card.getByRole('alert').innerText()) === 'That password is not right.', 'a wrong password is explained');
  await card.getByLabel('Account password').fill('pass1234');
  const n3 = srv.messages.length;
  await card.getByRole('button', { name: 'Send the confirmation link' }).click();
  await card.getByRole('status').waitFor();
  ok((await card.getByRole('status').innerText()).includes(`ui-new-${st}@test.invalid`), 'the right password sends the link and the page says where', await card.getByRole('status').innerText());
  ok(!!(await waitFor(/Confirm your new e-mail/i, n3, `ui-new-${st}`)), 'the mail reaches the new address');
  ok((await card.getByLabel('Account password').inputValue()) === '' && (await card.getByLabel('New e-mail address').inputValue()) === '', 'and the fields are cleared');
  await p.screenshot({ path: SHOTS + '/change-email-admin.png' });
  // the confirm page in the browser
  const tUi = tokenOf(await waitFor(/Confirm your new e-mail/i, n3, `ui-new-${st}`));
  const cc = await br.newContext({ viewport: { width: 1100, height: 900 } }); const p2 = await cc.newPage();
  await p2.goto(BASE + '/en/confirm-email?token=' + tUi, { waitUntil: 'networkidle' });
  ok(await p2.getByText('Press the button to use this e-mail address for your account.').isVisible(), 'the confirm page asks to use the address');
  await p2.getByRole('button', { name: 'Confirm e-mail address' }).click();
  await p2.getByText('Your e-mail address is confirmed.').waitFor();
  ok(sql(`SELECT email FROM users WHERE id=${s.aId}`) === `ui-new-${st}@test.invalid`, 'confirming it in the browser changes the address');
  await cc.close(); await c.close();
  // the buyer's account page; an account with no real address does not get the card
  c = await mk(b.bT); p = await c.newPage(); await p.goto(BASE + '/en/dashboard/account', { waitUntil: 'networkidle' });
  await p.locator('#change-email').getByRole('heading', { name: 'Change my e-mail address' }).waitFor();
  ok(true, 'the same card is on the customers\' "My account" page'); await c.close();
  c = await mk(pT); p = await c.newPage(); await p.goto(BASE + '/en/dashboard/account', { waitUntil: 'networkidle' }); await sleep(800);
  ok((await p.locator('#change-email').count()) === 0, 'an account with no real address does not get it (it adds one from the profile page)'); await c.close();
  // e-mail off: the card says so
  await put({ ...settings, enabled: false }); await sleep(300);
  c = await mk(s.aT); p = await c.newPage(); await p.goto(BASE + '/en/admin/account', { waitUntil: 'networkidle' });
  const off = p.locator('#change-email'); await off.getByText(/E-mail sending is not set up/).waitFor();
  ok(await off.getByRole('link', { name: 'Set up e-mail' }).isVisible() && (await off.getByRole('button').count()) === 0, 'with e-mail off it says so and links to Admin → Email (no form)');
  await c.close(); await put(settings); await sleep(300);
  // languages at phone width
  for (const [loc, title, submit] of [['ru', 'Изменить адрес электронной почты', 'Отправить ссылку для подтверждения'], ['zh', '更改我的电子邮箱', '发送确认链接']]) {
    c = await mk(s.aT, { width: 375, height: 900 }); p = await c.newPage(); await p.goto(BASE + `/${loc}/admin/account`, { waitUntil: 'networkidle' });
    await p.locator('#change-email').getByRole('heading', { name: title }).waitFor();
    const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const raw = await p.evaluate(() => /accountChangeEmail\./.test(document.body.innerText));
    ok(over <= 0 && !raw && (await p.locator('#change-email').getByRole('button', { name: submit }).isVisible()), `${loc} 375px: the card fits and is in words`, [over, raw]);
    const vv = await axeViolations(p); ok(vv.length === 0, `${loc}: axe 0 violations`, vv);
    await c.close();
  }

  await br.close(); await srv.close();
  sql(`DELETE FROM users WHERE email='${target}' OR email='${phone}'`);
  sql('DELETE FROM mail_settings');
  done();
})().catch((e) => { console.error(e); process.exit(1); });
