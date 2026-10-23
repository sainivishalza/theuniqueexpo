// Data retention: passport / visa / entry-stamp pictures are deleted some days after the last exhibition a buyer registered for ended.
const bcrypt = require('bcryptjs');
const { BASE, sql, ok, done, mkUsers, PNG } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const smtp = require('./helpers/fake-smtp.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.30.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const H = (t) => ({ 'Content-Type': 'application/json', cookie: 'token=' + t, 'x-forwarded-for': ipn() });
const api = (method, path, body, t) => fetch(BASE + path, { method, headers: H(t), body: body ? JSON.stringify(body) : undefined }).then(async (r) => ({ status: r.status, ...(await r.json().catch(() => ({}))) }));
const num = (q) => Number(sql(q));

(async () => {
  const u = await mkUsers('dr');
  // a clean start, also when this file is run more than once on the same database
  sql(`DELETE r FROM expo_registrations r JOIN users x ON x.id=r.user_id WHERE x.email LIKE 'dr-%@test.invalid';
    DELETE p FROM buyer_profiles p JOIN users x ON x.id=p.user_id WHERE x.email LIKE 'dr-%@test.invalid';
    UPDATE data_retention_settings SET enabled=0, days=90 WHERE id=1;`);
  const st = Date.now(), h = bcrypt.hashSync('pass1234', 10);
  const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const mkExpo = (tag, endOffset) => { const slug = `dr-${tag}-${st}`; sql(`INSERT INTO exhibitions (slug,title,start_date,end_date,registration_enabled) VALUES ('${slug}','Retention ${tag} ${st}','${day(endOffset - 3)}','${day(endOffset)}',1)`); return num(`SELECT id FROM exhibitions WHERE slug='${slug}'`); };
  const old = mkExpo('old', -200), recent = mkExpo('recent', -10), upcoming = mkExpo('upcoming', 30);
  const D = "'" + PNG + "'";
  // updated_at: the profile "was last changed" this many days ago
  const buyer = (tag, { regs = [], touched = 150, docs = true } = {}) => {
    const email = `dr-${tag}-${st}@test.invalid`;
    sql(`INSERT INTO users (name,email,password_hash,role,country) VALUES ('Ret ${tag}','${email}','${h}','buyer','')`);
    const id = num(`SELECT id FROM users WHERE email='${email}'`);
    sql(`INSERT INTO buyer_profiles (user_id,company_name${docs ? ',doc_passport_front,doc_visa_page,doc_latest_entry_stamp,doc_business_card,doc_buyer_photo,doc_passport_front_status' : ''}) VALUES (${id},'Co ${tag}'${docs ? `,${D},${D},${D},${D},${D},'verified'` : ''})`);
    sql(`UPDATE buyer_profiles SET updated_at=DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${touched} DAY) WHERE user_id=${id}`);
    for (const [expo, status] of regs) sql(`INSERT INTO expo_registrations (exhibition_id,user_id,status,doc_passport_front,doc_visa_page,doc_business_card) VALUES (${expo},${id},'${status}',${D},${D},${D})`);
    return id;
  };
  const A = buyer('due', { regs: [[old, 'attended']] });                       // long over, nothing coming: cleared
  const B = buyer('upcoming', { regs: [[old, 'attended'], [upcoming, 'approved']] }); // registered for the next one: kept
  const C = buyer('recent', { regs: [[recent, 'attended']] });                 // ended only 10 days ago: kept at 90
  const Dd = buyer('touched', { regs: [[old, 'attended']], touched: 5 });      // profile changed 5 days ago: kept
  const E = buyer('noregs', { regs: [] });                                     // never registered: kept
  const F = buyer('cancelledNext', { regs: [[old, 'attended'], [upcoming, 'cancelled']] }); // the next one was cancelled: cleared
  const G = buyer('nodocs', { regs: [[old, 'attended']], docs: false });       // nothing to delete
  const has = (id, col) => num(`SELECT (${col} IS NOT NULL AND ${col}<>'') FROM buyer_profiles WHERE user_id=${id}`) === 1;
  const regHas = (id, col) => num(`SELECT COUNT(*) FROM expo_registrations WHERE user_id=${id} AND ${col}<>''`);

  console.log('\n== the setting');
  ok((await api('GET', '/api/admin/data-retention', null, u.bT)).status === 401, 'a buyer cannot see it');
  let r = await api('GET', '/api/admin/data-retention', null, u.aT);
  ok(r.available && r.settings.enabled === false && r.settings.days === 90, 'it starts switched OFF, at 90 days', r.settings);
  ok(JSON.stringify(r.options) === '[30,60,90,180,365]', 'with a fixed list of choices');
  ok(r.preview.profiles >= 2 && r.preview.files >= 6, 'the preview says what is due now (nothing is deleted by looking)', r.preview);
  ok((await api('PUT', '/api/admin/data-retention', { enabled: true, days: 7 }, u.aT)).code === 'bad_request', '7 days is not a choice');
  ok((await api('PUT', '/api/admin/data-retention', { enabled: 'yes', days: 90 }, u.aT)).code === 'bad_request', 'on/off must be on or off');
  ok((await api('PUT', '/api/admin/data-retention', { enabled: true, days: 90 }, u.bT)).status === 401, 'a buyer cannot change it');
  ok(has(A, 'doc_passport_front'), 'nothing was deleted so far');

  console.log('\n== the daily job does nothing while it is off');
  sql('DELETE FROM mail_settings');
  const srv = await smtp.start(2538);
  const put = (b) => fetch(BASE + '/api/admin/email', { method: 'PUT', headers: H(u.aT), body: JSON.stringify(b) });
  await put({ enabled: true, host: '127.0.0.1', port: 2538, secure: false, username: 'm', password: 'x', fromName: 'The Unique Expo', fromEmail: 'noreply@theuniqueexpo.test' });
  const key = (await (await fetch(BASE + '/api/admin/email', { method: 'POST', headers: H(u.aT), body: JSON.stringify({ action: 'reminderKey' }) })).json()).key;
  const rerun = () => sql('UPDATE mail_settings SET reminders_last_run_at=NULL WHERE id=1');
  const cron = () => fetch(BASE + '/api/cron/registration-reminders', { method: 'POST', headers: { 'x-reminder-key': key, 'x-forwarded-for': ipn() } }).then((x) => x.json());
  rerun(); let j = await cron();
  ok(j.ran === true && (j.retentionCleared ?? 0) === 0 && has(A, 'doc_passport_front'), 'the job ran and deleted nothing', j);

  console.log('\n== switching it on and the daily job');
  r = await api('PUT', '/api/admin/data-retention', { enabled: true, days: 90 }, u.aT);
  ok(r.ok && r.settings.enabled === true, 'an admin switches it on');
  rerun(); j = await cron();
  ok(j.retentionCleared >= 2, 'the daily job deletes what is due', j);
  for (const col of ['doc_passport_front', 'doc_visa_page', 'doc_latest_entry_stamp']) ok(!has(A, col) && !has(F, col), `${col}: gone from the profiles that were due`);
  ok(num(`SELECT COUNT(*) FROM buyer_profiles WHERE user_id=${A} AND doc_passport_front_status='pending'`) === 1, 'and the review state is back to waiting');
  ok(has(A, 'doc_business_card') && has(A, 'doc_buyer_photo'), 'the business card and the buyer photo stay');
  ok(num(`SELECT COUNT(*) FROM buyer_profiles WHERE user_id=${A} AND company_name='Co due'`) === 1, 'and the other details');
  ok(has(B, 'doc_passport_front'), 'a buyer registered for an upcoming exhibition keeps their pictures');
  ok(has(C, 'doc_passport_front'), 'so does one whose exhibition ended only 10 days ago');
  ok(has(Dd, 'doc_passport_front'), 'and one who changed their profile 5 days ago');
  ok(has(E, 'doc_passport_front'), 'and one who never registered');
  ok(regHas(A, 'doc_passport_front') === 0 && regHas(A, 'doc_visa_page') === 0 && regHas(A, 'doc_business_card') === 1, 'registrations of an exhibition that is over lose the passport and visa pictures but keep the business card');
  ok(regHas(B, 'doc_passport_front') === 1 && regHas(C, 'doc_passport_front') === 1, 'registrations of the upcoming and recent exhibitions are untouched');
  ok(num(`SELECT COUNT(*) FROM data_retention_runs WHERE trigger_kind='auto' AND profiles_cleared>=2`) >= 1, 'the run is recorded');
  rerun(); j = await cron(); ok((j.retentionCleared ?? 0) === 0, 'a second run finds nothing more to delete', j);

  console.log('\n== delete now');
  const base90 = (await api('GET', '/api/admin/data-retention?days=90', null, u.aT)).preview.profiles;
  const base30 = (await api('GET', '/api/admin/data-retention?days=30', null, u.aT)).preview.profiles;
  const mid = mkExpo('mid', -45);
  const M = buyer('mid', { regs: [[mid, 'attended']], touched: 60 });  // over 45 days ago: due at 30 days, not at 90
  r = await api('PUT', '/api/admin/data-retention', { enabled: false, days: 90 }, u.aT);
  ok(!r.settings.enabled, 'switched off again');
  r = await api('GET', '/api/admin/data-retention?days=30', null, u.aT);
  ok(r.previewDays === 30 && r.preview.profiles === base30 + 1, 'the preview can be looked at for another number of days', [r.preview, base30]);
  r = await api('GET', '/api/admin/data-retention?days=90', null, u.aT);
  ok(r.preview.profiles === base90, 'at 90 days that buyer is not due yet', [r.preview, base90]);
  ok((await api('POST', '/api/admin/data-retention', { action: 'run', days: 5 }, u.aT)).code === 'bad_request', 'delete-now needs a valid number of days');
  ok((await api('POST', '/api/admin/data-retention', { action: 'run', days: 30 }, u.bT)).status === 401, 'a buyer cannot');
  r = await api('POST', '/api/admin/data-retention', { action: 'run', days: 90 }, u.aT);
  ok(r.ok && r.result.profiles === base90 && has(M, 'doc_passport_front'), 'delete now with 90 days leaves them (too soon)', r.result);
  r = await api('POST', '/api/admin/data-retention', { action: 'run', days: 30 }, u.aT);
  ok(r.ok && r.result.profiles >= 1 && !has(M, 'doc_passport_front') && r.runs[0].trigger === 'manual', 'delete now with 30 days clears them, even though the policy is off', r.result);
  ok(has(B, 'doc_passport_front') && has(C, 'doc_passport_front') && has(Dd, 'doc_passport_front') && has(E, 'doc_passport_front'), 'and still leaves the buyers who are protected by the rules');
  ok(num(`SELECT COUNT(*) FROM admin_audit_log WHERE action IN ('retention_settings_changed','retention_run')`) >= 4, 'changes and runs are in the activity log');

  console.log('\n== roles');
  const reviewer = await mkUsers('drr');
  await api('PUT', '/api/admin/staff-access', { userId: num(`SELECT id FROM users WHERE email='${reviewer.m.a}'`), preset: 'reviewer' }, u.aT);
  const denied = (x) => x.status === 401 || x.status === 403;
  ok(denied(await api('GET', '/api/admin/data-retention', null, reviewer.aT)) && denied(await api('PUT', '/api/admin/data-retention', { enabled: true, days: 30 }, reviewer.aT)), 'only full-access admins can see or change it');

  console.log('\n== the screen (en / ru / zh, 375 px)');
  await api('PUT', '/api/admin/data-retention', { enabled: false, days: 90 }, u.aT);
  const br = await launch();
  for (const locale of ['en', 'ru', 'zh']) {
    const c = await br.newContext({ viewport: { width: 375, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    await c.addCookies([{ name: 'token', value: u.aT, url: BASE }]);
    const p = await c.newPage(); await p.goto(`${BASE}/${locale}/admin/data-retention`, { waitUntil: 'domcontentloaded' });
    await p.getByTestId('retention-settings').waitFor(); await p.getByTestId('retention-preview').waitFor(); await p.getByTestId('retention-runs').waitFor();
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${locale}: no sideways scrolling`);
    await sleep(700);
    const v = await axeViolations(p); ok(v.length === 0, `${locale}: no accessibility violations`, v.map((x) => x.id));
    await c.close();
  }
  { // the screen: change the setting, ask before deleting
    const c = await br.newContext({ viewport: { width: 375, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    await c.addCookies([{ name: 'token', value: u.aT, url: BASE }]);
    const p = await c.newPage(); await p.goto(`${BASE}/en/admin/data-retention`, { waitUntil: 'domcontentloaded' });
    await p.getByTestId('retention-settings').waitFor();
    await p.getByLabel('Delete these pictures automatically (the daily job)').check();
    await p.getByLabel('Delete after the exhibition ended').selectOption('180');
    await p.getByRole('button', { name: 'Save', exact: true }).click();
    await p.getByRole('status').filter({ hasText: 'Saved.' }).waitFor();
    ok(sql('SELECT CONCAT(enabled,days) FROM data_retention_settings WHERE id=1') === '1180', 'saving on the screen saves the setting');
    const before = num('SELECT COUNT(*) FROM data_retention_runs');
    await p.getByLabel('Delete after the exhibition ended').selectOption('30');
    const deleteNow = p.getByRole('button', { name: 'Delete now' });
    if (await deleteNow.isEnabled()) {
      await deleteNow.click();
      await p.getByTestId('retention-confirm').waitFor();
      ok(/cannot be taken back/.test(await p.getByTestId('retention-confirm').innerText()), 'it asks first and says it cannot be taken back');
      await p.getByRole('button', { name: 'Cancel' }).click();
      ok(num('SELECT COUNT(*) FROM data_retention_runs') === before, 'cancelling deletes nothing');
    } else ok(true, 'nothing due at 30 days on this screen (button disabled)');
    await c.close();
  }
  await br.close();
  await srv.close();
  sql('DELETE FROM mail_settings');
  done();
})().catch((e) => { console.error(e); process.exit(1); });
