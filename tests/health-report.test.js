// The daily health e-mail and Admin -> Health: numbers, backup status, the on/off switch, the daily job, the screen.
const bcrypt = require('bcryptjs');
const { BASE, sql, ok, done, mkUsers, onlyAdmins } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const smtp = require('./helpers/fake-smtp.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.32.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const H = (t) => ({ 'Content-Type': 'application/json', cookie: 'token=' + t, 'x-forwarded-for': ipn() });
const api = (method, path, body, t) => fetch(BASE + path, { method, headers: H(t), body: body ? JSON.stringify(body) : undefined }).then(async (r) => ({ status: r.status, ...(await r.json().catch(() => ({}))) }));
const num = (q) => Number(sql(q));

(async () => {
  const u = await mkUsers('hl');
  const st = Date.now(), h = bcrypt.hashSync('pass1234', 10);
  sql('DELETE FROM mail_settings');
  // the site remembers its mail settings for a few seconds: switch them off through the API so e-mail is really off now
  await fetch(BASE + '/api/admin/email', { method: 'PUT', headers: H(u.aT), body: JSON.stringify({ enabled: false, host: '127.0.0.1', port: 2539, secure: false, username: 'm', password: 'x', fromName: 'The Unique Expo', fromEmail: 'noreply@theuniqueexpo.test' }) });
  sql('DELETE FROM backup_log');
  sql("UPDATE health_settings SET enabled=1, last_sent_on=NULL WHERE id=1");

  console.log('\n== the numbers');
  ok((await api('GET', '/api/admin/health', null, u.bT)).status === 401, 'a buyer cannot see it');
  let r = await api('GET', '/api/admin/health', null, u.aT);
  const before = r.report;
  ok(r.available && r.enabled === true, 'it is on by default');
  const slug = `hl-${st}`;
  sql(`INSERT INTO exhibitions (slug,title,start_date,end_date,registration_enabled) VALUES ('${slug}','Health Expo ${st}',DATE_ADD(UTC_DATE(),INTERVAL 30 DAY),DATE_ADD(UTC_DATE(),INTERVAL 32 DAY),1)`);
  const expo = num(`SELECT id FROM exhibitions WHERE slug='${slug}'`);
  for (let i = 0; i < 3; i++) {
    const email = `hl-b${i}-${st}@test.invalid`;
    sql(`INSERT INTO users (name,email,password_hash,role,country) VALUES ('Health ${i}','${email}','${h}','buyer','')`);
    sql(`INSERT INTO expo_registrations (exhibition_id,user_id,status) VALUES (${expo},${num(`SELECT id FROM users WHERE email='${email}'`)},'${i === 0 ? 'approved' : 'pending'}')`);
  }
  sql(`INSERT INTO email_log (to_email,kind,subject,status,error) VALUES ('a@test.invalid','test','s','failed','x'),('b@test.invalid','test','s','failed','x'),('c@test.invalid','test','s','sent','')`);
  sql(`INSERT INTO email_log (to_email,kind,subject,status,error,created_at) VALUES ('old@test.invalid','test','s','failed','x',DATE_SUB(NOW(), INTERVAL 3 DAY))`);
  r = await api('GET', '/api/admin/health', null, u.aT);
  ok(r.report.newRegistrations === before.newRegistrations + 3, 'new registrations of the last 24 hours are counted', [before.newRegistrations, r.report.newRegistrations]);
  ok(r.report.pendingRegistrations === before.pendingRegistrations + 2, 'and those waiting for review');
  ok(r.report.emailsFailed === before.emailsFailed + 2 && r.report.emailsSent === before.emailsSent + 1, 'failed and sent e-mails of the last 24 hours (an old failure is not counted)', r.report);

  console.log('\n== backups and what needs attention');
  const has = (text) => r.report.issues.some((i) => i.includes(text));
  ok(r.report.deployBackup === null && r.report.offsiteBackup === null && has('No off-site backup') && has('No backup made by a deploy'), 'with no backups recorded, it says so');
  sql(`INSERT INTO backup_log (kind,file_name,size_bytes,created_at) VALUES ('deploy','theuniqueexpo-backup-1.sql',5242880,DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY))`);
  sql(`INSERT INTO backup_log (kind,file_name,size_bytes,created_at) VALUES ('offsite','theuniqueexpo-x.sql.gz.age',2048,DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 DAY))`);
  r = await api('GET', '/api/admin/health', null, u.aT);
  ok(r.report.deployBackup && r.report.deployBackup.sizeBytes === 5242880 && !has('No backup made by a deploy'), 'a deploy backup is shown with its size');
  ok(has('off-site backup is 5 days old'), 'an off-site backup 5 days old is flagged');
  sql(`INSERT INTO backup_log (kind,file_name,size_bytes,created_at) VALUES ('offsite','theuniqueexpo-y.sql.gz.age',4096,UTC_TIMESTAMP())`);
  r = await api('GET', '/api/admin/health', null, u.aT);
  ok(r.report.offsiteBackup.sizeBytes === 4096 && !has('off-site backup'), 'a fresh off-site backup clears it (the newest one counts)');
  ok(r.report.issues.some((i) => /e-mails? failed/.test(i)), 'failed e-mails are listed as something to look at', r.report.issues);

  console.log('\n== the switch');
  ok((await api('PUT', '/api/admin/health', { enabled: false }, u.bT)).status === 401, 'a buyer cannot change it');
  ok((await api('PUT', '/api/admin/health', { enabled: 'no' }, u.aT)).code === 'bad_request', 'on or off only');
  r = await api('PUT', '/api/admin/health', { enabled: false }, u.aT); ok(r.ok && r.enabled === false, 'an admin switches it off');
  r = await api('PUT', '/api/admin/health', { enabled: true }, u.aT); ok(r.ok && r.enabled === true, 'and on');
  ok(num("SELECT COUNT(*) FROM admin_audit_log WHERE action='health_email_setting_changed'") >= 2, 'changes are in the activity log');

  console.log('\n== sending');
  r = await api('POST', '/api/admin/health', { action: 'send' }, u.aT); ok(r.status === 409 && r.code === 'mail_off', 'with e-mail off: 409');
  ok((await api('POST', '/api/admin/health', { action: 'send' }, u.bT)).status === 401, 'a buyer cannot send');
  const srv = await smtp.start(2539);
  const put = (b) => fetch(BASE + '/api/admin/email', { method: 'PUT', headers: H(u.aT), body: JSON.stringify(b) });
  await put({ enabled: true, host: '127.0.0.1', port: 2539, secure: false, username: 'm', password: 'x', fromName: 'The Unique Expo', fromEmail: 'noreply@theuniqueexpo.test' });
  ok((await api('POST', '/api/admin/health', { action: 'bogus' }, u.aT)).code === 'bad_request', 'an unknown action is refused');
  const n0 = srv.messages.length;
  r = await api('POST', '/api/admin/health', { action: 'send' }, u.aT);
  ok(r.ok === true, 'send-now works', r);
  for (let i = 0; i < 40 && srv.messages.length === n0; i++) await sleep(150);
  const m = srv.messages[srv.messages.length - 1];
  const d = m ? smtp.decode(m.raw) : { subject: '', text: '' };
  ok(m && m.to.join().includes(u.m.a) && srv.messages.length === n0 + 1, 'it goes only to the admin who asked');
  ok(/^Health: \d+ things? to look at$/.test(d.subject), 'the subject says how many things need a look', d.subject);
  ok(/New registrations in the last 24 hours: \d+/.test(d.text) && /Last off-site backup: .* UTC/.test(d.text) && /Details: https?:\/\/.*\/en\/admin\/health/.test(d.text), 'the text has the numbers, the backups and a link', d.text.slice(0, 300));
  ok(/failed to send/.test(d.text), 'and what needs attention comes first');

  console.log('\n== the daily job');
  const restoreAdmins = onlyAdmins([u.m.a]); // the job e-mails the first 20 admins; make this one of them
  process.on('exit', restoreAdmins);
  const key = (await (await fetch(BASE + '/api/admin/email', { method: 'POST', headers: H(u.aT), body: JSON.stringify({ action: 'reminderKey' }) })).json()).key;
  const rerun = () => sql('UPDATE mail_settings SET reminders_last_run_at=NULL WHERE id=1');
  const cron = () => fetch(BASE + '/api/cron/registration-reminders', { method: 'POST', headers: { 'x-reminder-key': key, 'x-forwarded-for': ipn() } }).then((x) => x.json());
  const lateEnough = new Date().getUTCHours() >= 5;
  await api('PUT', '/api/admin/health', { enabled: false }, u.aT);
  sql('UPDATE health_settings SET last_sent_on=NULL WHERE id=1');
  const n1 = srv.messages.length;
  rerun(); let j = await cron(); await sleep(800);
  ok((j.healthSent ?? 0) === 0 && srv.messages.length === n1, 'switched off: the job sends nothing', j);
  await api('PUT', '/api/admin/health', { enabled: true }, u.aT);
  rerun(); j = await cron();
  await sleep(1500);
  const toMine = srv.messages.slice(n1).filter((x) => x.to.join().includes(u.m.a) && /Health:/.test(smtp.decode(x.raw).subject));
  if (lateEnough) {
    ok(j.healthSent >= 1 && toMine.length === 1, 'switched on: every admin gets the e-mail once a day', j);
    ok(sql('SELECT DATE_FORMAT(last_sent_on,"%Y-%m-%d") FROM health_settings WHERE id=1') === new Date().toISOString().slice(0, 10), 'and the day is written down');
    const n2 = srv.messages.length;
    rerun(); j = await cron(); await sleep(800);
    ok((j.healthSent ?? 0) === 0 && srv.messages.length === n2, 'a second run on the same day sends nothing');
  } else ok((j.healthSent ?? 0) === 0, 'before 05:00 UTC the job waits', j);

  restoreAdmins();
  console.log('\n== roles');
  const reviewer = await mkUsers('hlr');
  await api('PUT', '/api/admin/staff-access', { userId: num(`SELECT id FROM users WHERE email='${reviewer.m.a}'`), preset: 'reviewer' }, u.aT);
  ok((await api('GET', '/api/admin/health', null, reviewer.aT)).status === 401, 'only full-access admins can open it');

  console.log('\n== the screen (en / ru / zh, 375 px)');
  const br = await launch();
  for (const locale of ['en', 'ru', 'zh']) {
    const c = await br.newContext({ viewport: { width: 375, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    await c.addCookies([{ name: 'token', value: u.aT, url: BASE }]);
    const p = await c.newPage(); await p.goto(`${BASE}/${locale}/admin/health`, { waitUntil: 'domcontentloaded' });
    for (const id of ['health-issues', 'health-numbers', 'health-backups', 'health-email']) await p.getByTestId(id).waitFor();
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${locale}: no sideways scrolling`);
    await sleep(700);
    const v = await axeViolations(p); ok(v.length === 0, `${locale}: no accessibility violations`, v.map((x) => x.id));
    await c.close();
  }
  { // switch the daily e-mail off on the screen, and send one to myself
    const c = await br.newContext({ viewport: { width: 375, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    await c.addCookies([{ name: 'token', value: u.aT, url: BASE }]);
    const p = await c.newPage(); await p.goto(`${BASE}/en/admin/health`, { waitUntil: 'domcontentloaded' });
    await p.getByTestId('health-email').waitFor();
    await p.getByLabel('E-mail this report to every admin once a day').click();
    await p.getByRole('status').filter({ hasText: 'Saved.' }).waitFor();
    ok(num('SELECT enabled FROM health_settings WHERE id=1') === 0, 'the switch on the screen is saved');
    const n3 = srv.messages.length;
    await p.getByRole('button', { name: 'Send it to me now' }).click();
    await p.getByRole('status').filter({ hasText: `Sent to ${u.m.a}` }).waitFor();
    for (let i = 0; i < 40 && srv.messages.length === n3; i++) await sleep(150);
    ok(srv.messages.length === n3 + 1, 'send-it-to-me-now sends one e-mail');
    await c.close();
  }
  await br.close();
  await srv.close();
  sql('DELETE FROM mail_settings');
  // Leave it as "already sent today", so a test that runs after this one in the same database is not sent the daily health e-mail.
  sql("UPDATE health_settings SET enabled=1, last_sent_on=UTC_DATE() WHERE id=1");
  sql('DELETE FROM backup_log');
  done();
})().catch((e) => { console.error(e); process.exit(1); });
