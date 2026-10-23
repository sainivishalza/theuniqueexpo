// E-mail bounces: reading delivery notices, flagging addresses, not e-mailing a dead address, the admin screens, and the
// mailbox reader (scripts/read-bounces.py) run against a small fake IMAP server.
const net = require('node:net');
const { execFile } = require('node:child_process');
const bcrypt = require('bcryptjs');
const { BASE, sql, ok, done, mkUsers } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const smtp = require('./helpers/fake-smtp.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.34.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const H = (t) => ({ 'Content-Type': 'application/json', cookie: 'token=' + t, 'x-forwarded-for': ipn() });
const api = (method, path, body, t) => fetch(BASE + path, { method, headers: H(t), body: body ? JSON.stringify(body) : undefined }).then(async (r) => ({ status: r.status, ...(await r.json().catch(() => ({}))) }));
const num = (q) => Number(sql(q));

const dsn = (rcpt, action, status, diag, subject = 'Undelivered Mail Returned to Sender') =>
  `From: MAILER-DAEMON@mx.example.com\r\nTo: info@theuniqueexpo.test\r\nSubject: ${subject}\r\nContent-Type: multipart/report; report-type=delivery-status; boundary="b1"\r\n\r\n--b1\r\nContent-Type: text/plain\r\n\r\nThis is the mail system. Your message could not be delivered.\r\n\r\n--b1\r\nContent-Type: message/delivery-status\r\n\r\nReporting-MTA: dns; mx.example.com\r\n\r\nFinal-Recipient: rfc822; ${rcpt}\r\nAction: ${action}\r\nStatus: ${status}\r\nDiagnostic-Code: smtp; ${diag}\r\n\r\n--b1--\r\n`;

(async () => {
  const u = await mkUsers('bn');
  const st = Date.now(), h = bcrypt.hashSync('pass1234', 10);
  sql('DELETE FROM mail_settings');
  sql('DELETE FROM email_bounces');
  const addr = (tag) => `bn-${tag}-${st}@test.invalid`;
  const mkBuyer = (tag) => { const email = addr(tag); sql(`INSERT INTO users (name,email,password_hash,role,country) VALUES ('Bounce ${tag}','${email}','${h}','buyer','')`); return { id: num(`SELECT id FROM users WHERE email='${email}'`), email }; };
  const logMailed = (email) => sql(`INSERT INTO email_log (to_email,kind,subject,status,error) VALUES ('${email}','announcement','s','sent','')`);
  const hardOne = mkBuyer('hard'), softOne = mkBuyer('soft'), multiA = mkBuyer('multia'), multiB = mkBuyer('multib'), plain = mkBuyer('plain'), ok1 = mkBuyer('ok');
  for (const b of [hardOne, softOne, multiA, multiB, plain, ok1]) logMailed(b.email);
  const srv = await smtp.start(2540);
  const put = (b) => fetch(BASE + '/api/admin/email', { method: 'PUT', headers: H(u.aT), body: JSON.stringify(b) });
  await put({ enabled: true, host: '127.0.0.1', port: 2540, secure: false, username: 'm', password: 'x', fromName: 'The Unique Expo', fromEmail: 'noreply@theuniqueexpo.test' });
  const key = (await (await fetch(BASE + '/api/admin/email', { method: 'POST', headers: H(u.aT), body: JSON.stringify({ action: 'reminderKey' }) })).json()).key;
  const ingest = (messages, k = key) => fetch(BASE + '/api/cron/mail-bounces', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-reminder-key': k, 'x-forwarded-for': ipn() }, body: JSON.stringify({ messages }) }).then(async (r) => ({ status: r.status, ...(await r.json().catch(() => ({}))) }));
  const row = (email) => sql(`SELECT CONCAT(kind,'|',bounce_count,'|',status_code,'|',IF(cleared_at IS NULL,'active','cleared')) FROM email_bounces WHERE email='${email}'`);

  console.log('\n== reading bounce notices');
  ok((await ingest([], '')).status === 401 && (await ingest([], 'wrong-key-wrong-key-wrong-key-12')).status === 401, 'no key or a wrong key: 401');
  ok((await ingest('nope')).status === 400 && (await ingest([1, 2])).status === 400, 'messages must be a list of text');
  ok((await ingest(Array.from({ length: 51 }, () => 'x'))).status === 400, 'at most 50 at a time');
  let r = await ingest([dsn(hardOne.email, 'failed', '5.1.1', '550 5.1.1 The email account that you tried to reach does not exist')]);
  ok(r.status === 200 && r.hard === 1 && r.soft === 0 && r.ignored === 0, 'a "failed 5.x.x" notice is a hard bounce', r);
  ok(row(hardOne.email) === 'hard|1|5.1.1|active', 'and is written down with its status', row(hardOne.email));
  r = await ingest([dsn(softOne.email, 'delayed', '4.2.2', '452 4.2.2 mailbox full', 'Delivery Status Notification (Delay)')]);
  ok(r.soft === 1 && row(softOne.email).startsWith('soft|1|4.2.2'), 'a "delayed 4.x.x" notice is a soft bounce', r);
  r = await ingest([dsn(`stranger-${st}@test.invalid`, 'failed', '5.1.1', '550 no such user')]);
  ok(r.ignored === 1 && r.hard === 0, 'an address the website never e-mailed is ignored (a forged notice cannot flag anyone)', r);
  const multi = dsn(multiA.email, 'failed', '5.1.1', '550 gone').replace('--b1--', `\r\nFinal-Recipient: rfc822; ${multiB.email}\r\nAction: delivered\r\nStatus: 2.0.0\r\n\r\n--b1--`);
  r = await ingest([multi]);
  ok(r.hard === 1 && row(multiA.email).startsWith('hard') && row(multiB.email) === '', 'in a notice naming two people only the one that failed is flagged');
  const gmail = `From: Mail Delivery Subsystem <mailer-daemon@googlemail.com>\r\nSubject: Delivery Status Notification (Failure)\r\n\r\nAddress not found\r\nYour message wasn't delivered to ${plain.email} because the address couldn't be found, or is unable to receive mail.\r\n`;
  r = await ingest([gmail]);
  ok(r.hard === 1 && row(plain.email).startsWith('hard|1'), 'a plain-text notice that names an address is read too', r);
  r = await ingest([`From: a@b.invalid\r\nSubject: Hello\r\n\r\nSee you at the fair, ${ok1.email}\r\n`]);
  ok(r.ignored === 1 && row(ok1.email) === '', 'an ordinary message is ignored', r);
  r = await ingest([dsn(hardOne.email, 'delayed', '4.4.7', 'timeout', 'Delivery Status Notification (Delay)')]);
  ok(row(hardOne.email) === 'hard|2|4.4.7|active', 'a later soft bounce does not turn a hard one back (and the count goes up)', row(hardOne.email));
  r = await ingest([dsn(softOne.email, 'failed', '5.1.1', '550 gone now')]);
  ok(row(softOne.email).startsWith('hard|2'), 'a soft one becomes hard when a hard bounce arrives', row(softOne.email));

  console.log('\n== an address that bounced is not e-mailed');
  const announce = (ids) => api('POST', '/api/admin/buyer-profiles/announce', { userIds: ids, subject: { en: 'News', ru: '', zh: '' }, message: { en: 'Hello there', ru: '', zh: '' } }, u.aT);
  const mails = (email) => srv.messages.filter((m) => m.to.join().includes(email)).length;
  await sleep(300);
  await announce([hardOne.id, ok1.id]); await sleep(1500);
  ok(mails(ok1.email) === 1 && mails(hardOne.email) === 0, 'an announcement reaches the buyer whose address works, and skips the one that bounced');
  const fp = (email) => fetch(BASE + '/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ipn() }, body: JSON.stringify({ email }) });
  await fp(hardOne.email); await sleep(1500);
  ok(mails(hardOne.email) === 1, 'but the sign-in mail (password reset) is still sent to it');
  const list = await api('GET', '/api/admin/email-bounces', null, u.aT);
  const mine = list.bounces.find((b) => b.email === hardOne.email);
  ok(list.status === 200 && mine && mine.kind === 'hard' && mine.count === 2, 'the admin list shows it', mine);
  ok((await api('GET', '/api/admin/email-bounces?summary=1', null, u.aT)).hard.includes(hardOne.email), 'and the short list for the buyer pages');
  ok((await api('GET', '/api/admin/email-bounces', null, u.bT)).status === 401 && (await api('DELETE', `/api/admin/email-bounces?id=${mine.id}`, null, u.bT)).status === 401, 'a buyer cannot see or clear them');
  ok((await api('DELETE', '/api/admin/email-bounces?id=abc', null, u.aT)).status === 404, 'a bad id: 404');
  r = await api('DELETE', `/api/admin/email-bounces?id=${mine.id}`, null, u.aT);
  ok(r.status === 200 && !r.bounces.some((b) => b.email === hardOne.email), 'an admin clears it');
  await announce([hardOne.id]); await sleep(1500);
  ok(mails(hardOne.email) === 2, 'and the address is e-mailed again');
  ok(num("SELECT COUNT(*) FROM admin_audit_log WHERE action='email_bounce_cleared'") >= 1, 'clearing is in the activity log');
  await ingest([dsn(hardOne.email, 'failed', '5.1.1', '550 gone again')]);
  ok(row(hardOne.email).startsWith('hard|3') && row(hardOne.email).endsWith('active'), 'a new hard bounce puts it back on the list', row(hardOne.email));

  console.log('\n== the mailbox reader (scripts/read-bounces.py)');
  sql('DELETE FROM email_bounces');
  const msgs = [dsn(hardOne.email, 'failed', '5.1.1', '550 no such user'), 'From: friend@example.com\r\nSubject: Lunch?\r\n\r\nShall we meet?\r\n', dsn(softOne.email, 'delayed', '4.2.2', '452 mailbox full', 'Delivery Status Notification (Delay)')];
  const seen = new Set();
  const imap = net.createServer((sock) => {
    let buf = '';
    const send = (s) => sock.write(s + '\r\n');
    send('* OK IMAP4rev1 fake ready');
    sock.on('error', () => {});
    sock.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      let i;
      while ((i = buf.indexOf('\r\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 2);
        const [tag, cmd, ...rest] = line.split(' ');
        const c = (cmd || '').toUpperCase();
        if (c === 'CAPABILITY') { send('* CAPABILITY IMAP4rev1'); send(`${tag} OK done`); }
        else if (c === 'LOGIN') send(`${tag} OK logged in`);
        else if (c === 'SELECT') { send(`* ${msgs.length} EXISTS`); send(`${tag} OK [READ-WRITE] selected`); }
        else if (c === 'SEARCH') { const ids = msgs.map((_, n) => n + 1).filter((n) => !seen.has(n)); send(`* SEARCH ${ids.join(' ')}`.trim()); send(`${tag} OK done`); }
        else if (c === 'FETCH') { const n = Number(rest[0]); const data = msgs[n - 1]; sock.write(`* ${n} FETCH (BODY[] {${Buffer.byteLength(data)}}\r\n${data})\r\n`); send(`${tag} OK done`); }
        else if (c === 'STORE') { seen.add(Number(rest[0])); send(`* ${rest[0]} FETCH (FLAGS (\\Seen))`); send(`${tag} OK done`); }
        else if (c === 'LOGOUT') { send('* BYE'); send(`${tag} OK bye`); sock.end(); }
        else send(`${tag} BAD unknown`);
      }
    });
  });
  await new Promise((res) => imap.listen(0, '127.0.0.1', res));
  const run = (env) => new Promise((resolve) => execFile('python3', ['scripts/read-bounces.py'], { encoding: 'utf8', env: { ...process.env, ...env }, timeout: 60000 }, (err, stdout, stderr) => resolve({ code: err ? err.code ?? 1 : 0, stdout, stderr })));
  const envBase = { BOUNCE_IMAP_HOST: '127.0.0.1', BOUNCE_IMAP_PORT: String(imap.address().port), BOUNCE_IMAP_SSL: '0', BOUNCE_IMAP_USER: 'bounces', BOUNCE_IMAP_PASSWORD: 'x', SITE_URL: BASE };
  let out = await run({ ...envBase, REMINDER_KEY: '' });
  ok(out.code === 0 && /nothing to do/.test(out.stdout), 'without the settings it does nothing and does not fail');
  out = await run({ ...envBase, REMINDER_KEY: 'wrong-key-wrong-key-wrong-key-12' });
  ok(out.code !== 0 && seen.size === 0, 'when the website refuses, it fails and marks nothing as read (so nothing is lost)', [out.code, [...seen]]);
  out = await run({ ...envBase, REMINDER_KEY: key });
  ok(out.code === 0 && /3 unread/.test(out.stdout) && /2 look like bounces/.test(out.stdout), 'it reads the mailbox and picks the bounces', out.stdout);
  ok(row(hardOne.email).startsWith('hard|1') && row(softOne.email).startsWith('soft|1'), 'the website now has both addresses', [row(hardOne.email), row(softOne.email)]);
  ok(seen.has(1) && seen.has(3) && !seen.has(2), 'the bounces are marked read, the other message is left alone', [...seen]);
  out = await run({ ...envBase, REMINDER_KEY: key });
  ok(out.code === 0 && /1 unread/.test(out.stdout) && /0 look like bounces/.test(out.stdout) && row(hardOne.email).startsWith('hard|1'), 'a second run finds nothing new and counts nothing twice', out.stdout);
  imap.close();

  console.log('\n== roles');
  const reviewer = await mkUsers('bnr'), finance = await mkUsers('bnf');
  const idOf = (x) => num(`SELECT id FROM users WHERE email='${x.m.a}'`);
  await api('PUT', '/api/admin/staff-access', { userId: idOf(reviewer), preset: 'reviewer' }, u.aT);
  await api('PUT', '/api/admin/staff-access', { userId: idOf(finance), preset: 'finance' }, u.aT);
  const denied = (x) => x.status === 401 || x.status === 403;
  ok((await api('GET', '/api/admin/email-bounces?summary=1', null, reviewer.aT)).status === 200, 'a reviewer can see which buyers bounced');
  ok(denied(await api('DELETE', `/api/admin/email-bounces?id=1`, null, reviewer.aT)) && denied(await api('GET', '/api/admin/email-bounces', null, finance.aT)), 'but not clear them, and finance cannot see them');

  console.log('\n== the screens (en / ru / zh, 375 px)');
  const br = await launch();
  for (const locale of ['en', 'ru', 'zh']) {
    const c = await br.newContext({ viewport: { width: 375, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    await c.addCookies([{ name: 'token', value: u.aT, url: BASE }]);
    const p = await c.newPage(); await p.goto(`${BASE}/${locale}/admin/email`, { waitUntil: 'domcontentloaded' });
    const section = p.getByTestId('bounced-addresses'); await section.waitFor();
    await section.getByTestId('bounce-row').first().waitFor();
    ok((await section.getByTestId('bounce-row').count()) >= 2, `${locale}: the bounced addresses are listed`);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${locale}: no sideways scrolling`);
    await sleep(700);
    const v = await axeViolations(p); ok(v.length === 0, `${locale}: no accessibility violations`, v.map((x) => x.id));
    await c.close();
  }
  { // clear one on the screen; the buyer list marks a bounced buyer
    const c = await br.newContext({ viewport: { width: 1300, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    await c.addCookies([{ name: 'token', value: u.aT, url: BASE }]);
    const p = await c.newPage(); await p.goto(`${BASE}/en/admin/buyer-profiles`, { waitUntil: 'networkidle' });
    await p.getByPlaceholder(/Search by registration no/).first().fill(hardOne.email); await sleep(1200);
    await p.locator('tbody tr').filter({ hasText: hardOne.email }).getByTestId('email-bounced').waitFor();
    ok(true, 'the buyer list marks a buyer whose e-mail bounced');
    await p.goto(`${BASE}/en/admin/email`, { waitUntil: 'domcontentloaded' });
    const rows = p.getByTestId('bounce-row'); await rows.first().waitFor();
    const before = await rows.count();
    await p.getByTestId('bounce-row').filter({ hasText: hardOne.email }).getByRole('button', { name: /Clear/ }).click();
    await p.getByRole('status').filter({ hasText: 'will be e-mailed again' }).waitFor();
    ok((await rows.count()) === before - 1 && /cleared/.test(row(hardOne.email)), 'clearing on the screen removes it from the list');
    await c.close();
  }
  await br.close();
  await srv.close();
  sql('DELETE FROM mail_settings');
  sql('DELETE FROM email_bounces');
  done();
})().catch((e) => { console.error(e); process.exit(1); });
