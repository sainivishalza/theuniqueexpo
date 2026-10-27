const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { BASE, sql, ok, done, mkUsers, healthQuiet } = require('./helpers/common.js');
const smtp = require('./helpers/fake-smtp.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.18.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const H = (t, extra = {}) => ({ 'Content-Type': 'application/json', cookie: 'token=' + t, 'x-forwarded-for': ipn(), ...extra });

(async () => {
  sql('DELETE FROM mail_settings');
  const u = await mkUsers('rm');
  healthQuiet();
  const srv = await smtp.start(2527);
  const settings = { enabled: true, host: '127.0.0.1', port: 2527, secure: false, username: 'm', password: 'x', fromName: 'The Unique Expo', fromEmail: 'noreply@theuniqueexpo.test' };
  const put = (b) => fetch(BASE + '/api/admin/email', { method: 'PUT', headers: H(u.aT), body: JSON.stringify(b) });
  await put(settings);
  const st = Date.now(), h = bcrypt.hashSync('pass1234', 10);
  const mkBuyer = (tag, locale) => { const e = `rm-${tag}-${st}@test.invalid`; sql(`INSERT INTO users (name,email,password_hash,role,country,preferred_locale) VALUES ('Rem ${tag}','${e}','${h}','buyer','',${locale ? `'${locale}'` : 'NULL'})`); return { email: e, id: Number(sql(`SELECT id FROM users WHERE email='${e}'`)) }; };
  // an exhibition that has not ended
  sql(`INSERT INTO exhibitions (slug,title,start_date,end_date) VALUES ('rm-expo-${st}','Reminder Expo ${st}',DATE_ADD(UTC_DATE(),INTERVAL 3 DAY),DATE_ADD(UTC_DATE(),INTERVAL 6 DAY))`);
  const exId = Number(sql(`SELECT id FROM exhibitions WHERE slug='rm-expo-${st}'`));
  sql(`INSERT INTO exhibitions (slug,title,start_date,end_date) VALUES ('rm-old-${st}','Finished Expo ${st}',DATE_SUB(UTC_DATE(),INTERVAL 9 DAY),DATE_SUB(UTC_DATE(),INTERVAL 6 DAY))`);
  const oldEx = Number(sql(`SELECT id FROM exhibitions WHERE slug='rm-old-${st}'`));
  const reg = (user, expo, status, confirmBy, extra = '') => { sql(`INSERT INTO expo_registrations (exhibition_id,user_id,status,confirm_by${extra ? ',' + extra.split('=')[0] : ''}) VALUES (${expo},${user.id},'${status}',${confirmBy === null ? 'NULL' : `DATE_ADD(UTC_DATE(),INTERVAL ${confirmBy} DAY)`}${extra ? ',' + extra.split('=')[1] : ''})`); return Number(sql(`SELECT id FROM expo_registrations WHERE user_id=${user.id} ORDER BY id DESC LIMIT 1`)); };
  const due = mkBuyer('due', 'ru'), later = mkBuyer('later'), done1 = mkBuyer('conf'), already = mkBuyer('already'), pending = mkBuyer('pend'), ended = mkBuyer('ended'), pastDue = mkBuyer('past');
  const rDue = reg(due, exId, 'approved', 1);
  reg(later, exId, 'approved', 6);
  reg(done1, exId, 'approved', 1, "confirmed_at=NOW()");
  reg(already, exId, 'approved', 1, "reminder_sent_at=NOW()");
  reg(pending, exId, 'pending', null);
  reg(ended, oldEx, 'approved', 1);
  reg(pastDue, exId, 'approved', -2);

  const cronKey = async () => (await (await fetch(BASE + '/api/admin/email', { method: 'POST', headers: H(u.aT), body: JSON.stringify({ action: 'reminderKey' }) })).json()).key;
  const cron = (key) => fetch(BASE + '/api/cron/registration-reminders', { method: 'POST', headers: { 'x-reminder-key': key || '', 'x-forwarded-for': ipn() } });
  const lastRunNull = () => sql('UPDATE mail_settings SET reminders_last_run_at=NULL WHERE id=1');

  console.log('\n== the reminder key');
  let r = await fetch(BASE + '/api/admin/email', { method: 'POST', headers: H(u.bT), body: JSON.stringify({ action: 'reminderKey' }) }); ok(r.status === 401, 'a buyer cannot make a key');
  const key = await cronKey(); ok(typeof key === 'string' && key.length >= 30, 'an admin makes a key', key && key.length);
  ok(!sql('SELECT reminder_token_enc FROM mail_settings WHERE id=1').includes(key), 'the key is stored encrypted');
  r = await cron(''); ok(r.status === 401, 'no key: 401'); r = await cron('wrong-key-wrong-key-wrong-key-12'); ok(r.status === 401, 'a wrong key: 401');
  let info = await (await fetch(BASE + '/api/admin/email', { headers: H(u.aT) })).json(); ok(info.reminders && info.reminders.hasKey === true && !JSON.stringify(info).includes(key), 'the admin page knows a key exists but is never sent it again');

  console.log('\n== who is reminded');
  lastRunNull(); const n0 = srv.messages.length;
  r = await cron(key); let j = await r.json(); ok(r.status === 200 && j.ran === true && j.sent === 1, 'exactly one registration is due', j);
  for (let i = 0; i < 40 && srv.messages.length === n0; i++) await sleep(150);
  const m = srv.messages[srv.messages.length - 1]; const d = smtp.decode(m.raw); ok(m.to.join().includes(due.email), 'the reminder goes to the buyer whose confirm-by date is tomorrow'); ok(/Подтвердите участие: Reminder Expo/.test(d.subject), 'in Russian (their language)', d.subject); ok(/\d{4}-\d{2}-\d{2}/.test(d.text) && /registrations/.test(d.text), 'with the date and a link to their registrations');
  ok(sql(`SELECT reminder_sent_at IS NOT NULL FROM expo_registrations WHERE id=${rDue}`) === '1', 'the registration is marked as reminded');
  await sleep(800); ok(srv.messages.length === n0 + 1, 'nobody else was e-mailed (not due, confirmed, already reminded, pending, finished expo, past date)', srv.messages.length - n0);
  console.log('\n== once only, one run at a time');
  r = await cron(key); j = await r.json(); ok(j.ran === false, 'asking again right away does not run (at most every 6 hours)', j);
  lastRunNull(); r = await cron(key); j = await r.json(); ok(j.ran === true && j.sent === 0, 'a later run finds nobody left: no second reminder', j);
  const due2 = mkBuyer('due2'); reg(due2, exId, 'approved', 2); lastRunNull(); const n1 = srv.messages.length;
  const [a, b] = await Promise.all([cron(key), cron(key)]); const ja = await a.json(), jb = await b.json(); ok([ja.ran, jb.ran].filter(Boolean).length === 1 && ja.sent + jb.sent === 1, 'two runs at the same moment: exactly one runs, one e-mail', [ja, jb]);
  for (let i = 0; i < 40 && srv.messages.length === n1; i++) await sleep(150); await sleep(600); ok(srv.messages.length === n1 + 1, 'and only one e-mail went out');
  console.log('\n== started by opening the admin home');
  const due3 = mkBuyer('due3'); reg(due3, exId, 'approved', 1); lastRunNull(); const n2 = srv.messages.length;
  r = await fetch(BASE + '/api/admin/attention', { headers: H(u.aT) }); ok(r.status === 200, 'the admin home loads as before');
  for (let i = 0; i < 60 && srv.messages.length === n2; i++) await sleep(150); ok(srv.messages.length === n2 + 1 && srv.messages[srv.messages.length - 1].to.join().includes(due3.email), 'and it sent the due reminder in the background');
  info = await (await fetch(BASE + '/api/admin/email', { headers: H(u.aT) })).json(); ok(info.reminders.lastRunAt && info.reminders.lastCount === 1, 'the last run is shown on the Email page', info.reminders);
  console.log('\n== e-mail off');
  const due4 = mkBuyer('due4'); reg(due4, exId, 'approved', 1); lastRunNull(); await put({ ...settings, enabled: false }); await sleep(100);
  r = await cron(key); j = await r.json(); ok(j.ran === false, 'with e-mail switched off nothing runs'); ok(sql(`SELECT reminder_sent_at IS NULL FROM expo_registrations WHERE user_id=${due4.id}`) === '1', 'and nothing is marked as reminded');
  await srv.close(); sql('DELETE FROM mail_settings'); sql(`DELETE FROM expo_registrations WHERE exhibition_id IN (${exId},${oldEx})`); sql(`DELETE FROM exhibitions WHERE id IN (${exId},${oldEx})`);
  done();
})();
