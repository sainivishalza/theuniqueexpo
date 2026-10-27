// "Your exhibition starts soon": one reminder per confirmed registration in the week before the exhibition opens.
const bcrypt = require('bcryptjs');
const { BASE, sql, ok, done, mkUsers, healthQuiet } = require('./helpers/common.js');
const smtp = require('./helpers/fake-smtp.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.19.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const H = (t, extra = {}) => ({ 'Content-Type': 'application/json', cookie: 'token=' + t, 'x-forwarded-for': ipn(), ...extra });

(async () => {
  sql('DELETE FROM mail_settings');
  sql("UPDATE expo_registrations SET start_reminder_sent_at = NOW() WHERE start_reminder_sent_at IS NULL");  // other tests' registrations are not part of this
  sql("UPDATE expo_registrations SET reminder_sent_at = NOW() WHERE reminder_sent_at IS NULL");
  const u = await mkUsers('sr');
  healthQuiet();
  const srv = await smtp.start(2532);
  const settings = { enabled: true, host: '127.0.0.1', port: 2532, secure: false, username: 'm', password: 'x', fromName: 'The Unique Expo', fromEmail: 'noreply@theuniqueexpo.test' };
  const put = (b) => fetch(BASE + '/api/admin/email', { method: 'PUT', headers: H(u.aT), body: JSON.stringify(b) });
  const st = Date.now(), h = bcrypt.hashSync('pass1234', 10);
  const mkBuyer = (tag, locale) => { const e = `sr-${tag}-${st}@test.invalid`; sql(`INSERT INTO users (name,email,password_hash,role,country,preferred_locale) VALUES ('Soon ${tag}','${e}','${h}','buyer','',${locale ? `'${locale}'` : 'NULL'})`); return { id: Number(sql(`SELECT id FROM users WHERE email='${e}'`)), email: e }; };
  const mkExpo = (tag, from, to) => { sql(`INSERT INTO exhibitions (slug,title,start_date,end_date) VALUES ('sr-${tag}-${st}','Starts ${tag} ${st}',DATE_ADD(UTC_DATE(),INTERVAL ${from} DAY),DATE_ADD(UTC_DATE(),INTERVAL ${to} DAY))`); return { id: Number(sql(`SELECT id FROM exhibitions WHERE slug='sr-${tag}-${st}'`)), slug: `sr-${tag}-${st}`, title: `Starts ${tag} ${st}` }; };
  const reg = (b, x, status, extra = '') => { sql(`INSERT INTO expo_registrations (exhibition_id,user_id,status${extra ? ',' + extra.split('=')[0] : ''}) VALUES (${x.id},${b.id},'${status}'${extra ? ',' + extra.split('=').slice(1).join('=') : ''})`); return Number(sql(`SELECT id FROM expo_registrations WHERE exhibition_id=${x.id} AND user_id=${b.id}`)); };
  const e3 = mkExpo('in3', 3, 6), e7 = mkExpo('in7', 7, 9), e8 = mkExpo('in8', 8, 10), eToday = mkExpo('today', 0, 2), eGone = mkExpo('started', -1, 2);
  const due = mkBuyer('due', 'ru'), edge = mkBuyer('edge', 'zh'), today = mkBuyer('today'), far = mkBuyer('far'), began = mkBuyer('began'), unconf = mkBuyer('unconf'), already = mkBuyer('already'), checked = mkBuyer('checked'), pend = mkBuyer('pend'), canc = mkBuyer('canc');
  const rDue = reg(due, e3, 'confirmed'), rEdge = reg(edge, e7, 'confirmed'), rToday = reg(today, eToday, 'confirmed');
  reg(far, e8, 'confirmed'); reg(began, eGone, 'confirmed'); reg(unconf, e3, 'approved'); reg(already, e3, 'confirmed', 'start_reminder_sent_at=NOW()');
  reg(checked, e3, 'confirmed', 'checked_in_at=NOW()'); reg(pend, e3, 'pending'); reg(canc, e3, 'cancelled');
  const cronKey = async () => (await (await fetch(BASE + '/api/admin/email', { method: 'POST', headers: H(u.aT), body: JSON.stringify({ action: 'reminderKey' }) })).json()).key;
  const cron = (key) => fetch(BASE + '/api/cron/registration-reminders', { method: 'POST', headers: { 'x-reminder-key': key || '', 'x-forwarded-for': ipn() } });
  const lastRunNull = () => sql('UPDATE mail_settings SET reminders_last_run_at=NULL WHERE id=1');
  const notices = (b) => sql(`SELECT CONCAT(kind,'|',path,'|',params) FROM user_notifications WHERE user_id=${b.id} AND kind='registrationStartsSoon'`).split('\n').filter(Boolean);

  console.log('\n== e-mail off: nothing runs');
  await put({ ...settings, enabled: false });
  const key = await cronKey();
  lastRunNull(); let j = await (await cron(key)).json();
  ok(j.ran === false && notices(due).length === 0, 'with e-mail off the job does not run (like the other reminders), and nothing is saved');

  console.log('\n== who is reminded');
  await put(settings); await sleep(200);
  lastRunNull(); const n0 = srv.messages.length;
  j = await (await cron(key)).json();
  ok(j.ran === true && j.startSent === 3 && j.sent === 0, 'three confirmed registrations are due (3 days, 7 days and today); no confirm-by reminders', j);
  for (let i = 0; i < 60 && srv.messages.length < n0 + 3; i++) await sleep(150);
  await sleep(500);
  ok(srv.messages.length === n0 + 3, 'three e-mails, no more (not 8 days away, already started, not confirmed, already reminded, checked in, pending, cancelled)', srv.messages.length - n0);
  const mails = srv.messages.slice(n0).map((m) => ({ to: m.to.join(), d: smtp.decode(m.raw), p: smtp.parts(m.raw) }));
  const mailTo = (b) => mails.find((m) => m.to.includes(b.email));
  ok(mailTo(due) && mailTo(edge) && mailTo(today), 'to the right three buyers');
  ok(/Скоро начинается Starts in3/.test(mailTo(due).d.subject), 'in the buyer\'s language (Russian)', mailTo(due).d.subject);
  ok(/即将开幕/.test(mailTo(edge).d.subject), 'and Chinese', mailTo(edge).d.subject);
  ok(/starts soon/.test(mailTo(today).d.subject), 'and English by default', mailTo(today).d.subject);
  const dueDate = sql(`SELECT DATE_ADD(UTC_DATE(),INTERVAL 3 DAY)`);
  ok(mailTo(due).p.text.includes(dueDate) && mailTo(due).p.text.includes(e3.title) && mailTo(due).p.text.includes(`/ru/exhibitions/${e3.slug}`), 'each names the exhibition and the start date, and links to its page', mailTo(due).p.text.slice(0, 400));
  ok(sql(`SELECT COUNT(*) FROM expo_registrations WHERE start_reminder_sent_at IS NOT NULL AND id IN (${rDue},${rEdge},${rToday})`) === '3', 'the registrations are marked as reminded');
  const nd = notices(due);
  ok(nd.length === 1 && nd[0].startsWith(`registrationStartsSoon|/exhibitions/${e3.slug}|`), 'a notice for the website too', nd);
  ok(notices(far).length === 0 && notices(unconf).length === 0 && notices(checked).length === 0 && notices(canc).length === 0, 'and none for the others');

  console.log('\n== only once');
  lastRunNull(); const n1 = srv.messages.length;
  j = await (await cron(key)).json();
  ok(j.ran === true && j.startSent === 0, 'a later run finds nobody left', j);
  await sleep(700); ok(srv.messages.length === n1, 'no second e-mail');
  const late = mkBuyer('late'); reg(late, e3, 'confirmed');
  lastRunNull();
  const [a, b] = await Promise.all([cron(key), cron(key)]); const ja = await a.json(), jb = await b.json();
  ok([ja.ran, jb.ran].filter(Boolean).length === 1 && (ja.startSent || 0) + (jb.startSent || 0) === 1, 'two runs at once: one runs, the new registration is reminded exactly once', [ja, jb]);
  await sleep(900); ok(srv.messages.length === n1 + 1, 'one e-mail');
  ok(notices(late).length === 1, 'one notice');

  console.log('\n== the buyer without a real e-mail address');
  const ph = mkBuyer('ph'); sql(`UPDATE users SET email='phone-1395${String(st).slice(-7)}@noemail.invalid' WHERE id=${ph.id}`); reg(ph, e3, 'confirmed');
  lastRunNull(); const n2 = srv.messages.length;
  j = await (await cron(key)).json();
  await sleep(700);
  ok(j.startSent === 1 && notices(ph).length === 1 && srv.messages.length === n2, 'gets the website notice and no e-mail');

  await srv.close();
  sql(`DELETE FROM expo_registrations WHERE exhibition_id IN (${[e3, e7, e8, eToday, eGone].map((x) => x.id).join(',')})`);
  sql(`DELETE FROM exhibitions WHERE slug LIKE 'sr-%-${st}'`);
  sql(`DELETE FROM users WHERE email LIKE 'sr-%-${st}@test.invalid' OR email='phone-1395${String(st).slice(-7)}@noemail.invalid'`);
  sql('DELETE FROM mail_settings');
  done();
})().catch((e) => { console.error(e); process.exit(1); });
