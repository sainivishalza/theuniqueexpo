// Staff roles, merging duplicate buyers, and scheduled Excel reports.
const bcrypt = require('bcryptjs');
const { BASE, sql, ok, done, mkUsers, login } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const smtp = require('./helpers/fake-smtp.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.26.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const H = (t, extra = {}) => ({ 'Content-Type': 'application/json', cookie: 'token=' + t, 'x-forwarded-for': ipn(), ...extra });
const api = (method, path, body, t) => fetch(BASE + path, { method, headers: H(t), body: body ? JSON.stringify(body) : undefined }).then(async (r) => ({ status: r.status, ...(await r.json().catch(() => ({}))) }));
const denied = (r) => r.status === 401 || r.status === 403;

(async () => {
  const u = await mkUsers('sm');
  const st = Date.now(), h = bcrypt.hashSync('pass1234', 10);
  const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const num = (q) => Number(sql(q));

  // ---------- merging duplicate buyers ----------
  console.log('\n== finding duplicates');
  const mk = (tag, extra = '') => { const email = `sm-${tag}-${st}@test.invalid`; sql(`INSERT INTO users (name,email,password_hash,role,country) VALUES ('Merge ${tag}','${email}','${h}','buyer','')`); const id = num(`SELECT id FROM users WHERE email='${email}'`); sql(`INSERT INTO buyer_profiles (user_id,company_name${extra ? ',' + extra.split('|')[0] : ''}) VALUES (${id},'Co ${tag}'${extra ? ',' + extra.split('|')[1] : ''})`); return { id, email, name: `Merge ${tag}` }; };
  const pass = `ZX${String(st).slice(-7)}`, phone = `+7 (999) ${String(st).slice(-7)}`;
  const keep = mk('keep', `passport_number,phone_number|'${pass}','${phone}'`);
  const old = mk('old', `passport_number,phone_number,nationality|' ${pass.toLowerCase().slice(0, 4)}-${pass.slice(4)} ','7999${String(st).slice(-7)}','China'`);
  const other = mk('other', `passport_number|'OTHER${st}'`);
  const expoA = (n) => { const slug = `sm-expo-${n}-${st}`; sql(`INSERT INTO exhibitions (slug,title,start_date,end_date,registration_enabled) VALUES ('${slug}','Merge Expo ${n} ${st}','${day(30)}','${day(32)}',1)`); return num(`SELECT id FROM exhibitions WHERE slug='${slug}'`); };
  const e1 = expoA(1), e2 = expoA(2), e3 = expoA(3);
  const reg = (user, expo, status) => sql(`INSERT INTO expo_registrations (exhibition_id,user_id,status) VALUES (${expo},${user.id},'${status}')`);
  reg(keep, e1, 'pending'); reg(old, e1, 'approved'); // same expo: the further one wins
  reg(old, e2, 'approved'); reg(keep, e3, 'confirmed'); reg(old, e3, 'pending'); // old moves; keep's better one stays
  sql(`INSERT INTO exhibition_favorites (user_id,exhibition_id) VALUES (${old.id},${e2}),(${old.id},${e1}),(${keep.id},${e1})`);
  sql(`INSERT INTO user_notifications (user_id,kind,params,path) VALUES (${old.id},'announcement','{"title":"Hello old"}','/dashboard')`);
  sql(`INSERT INTO wallets (user_id,wallet_code,balance,frozen,created_at) VALUES (${old.id},LPAD(CONCAT('SMO',${old.id}),24,'0'),70,0,NOW()),(${keep.id},LPAD(CONCAT('SMK',${keep.id}),24,'0'),30,0,NOW())`);
  // a balance always has its ledger entry (the reconciliation tests add every balance up against the ledger)
  sql(`INSERT INTO wallet_transactions (user_id,amount,balance_after,type,note,idem_key,created_at) VALUES (${old.id},70,70,'adjustment','seed','adj:seed-${st}',NOW()),(${keep.id},30,30,'adjustment','seed','adj:seed-${st}',NOW())`);

  ok((await api('GET', '/api/admin/duplicates', null, u.bT)).status === 401, 'a buyer cannot see the list');
  let r = await api('GET', '/api/admin/duplicates', null, u.aT);
  const grp = (r.groups || []).filter((g) => g.members.some((m) => m.id === keep.id));
  ok(grp.length === 2 && grp.some((g) => g.reason === 'passport') && grp.some((g) => g.reason === 'phone'), 'the same passport (any spacing, dashes, case) and the same phone digits are both found', grp.map((g) => g.reason));
  ok(grp.every((g) => g.members.map((m) => m.id).sort().join() === [keep.id, old.id].sort().join()), 'with exactly these two accounts; a different passport is not grouped');
  ok(!(r.groups || []).some((g) => g.members.some((m) => m.id === other.id)), 'the third buyer is not a duplicate');
  const mem = grp[0].members.find((m) => m.id === old.id);
  ok(mem.registrations === 3 && mem.points === 70 && /^\w+/.test(mem.email), 'each account shows its registrations and points', mem);

  console.log('\n== preview and refusals');
  ok((await api('GET', `/api/admin/duplicates/preview?keep=${keep.id}&merge=${old.id}`, null, u.bT)).status === 401, 'a buyer cannot preview');
  ok((await api('GET', `/api/admin/duplicates/preview?keep=${keep.id}&merge=${keep.id}`, null, u.aT)).status === 400, 'the same account twice: refused');
  ok((await api('GET', `/api/admin/duplicates/preview?keep=abc&merge=1`, null, u.aT)).status === 400, 'nonsense: refused');
  const adminId = num(`SELECT id FROM users WHERE email='${u.m.a}'`);
  ok((await api('GET', `/api/admin/duplicates/preview?keep=${keep.id}&merge=${adminId}`, null, u.aT)).status === 400, 'an admin account cannot be merged');
  r = await api('GET', `/api/admin/duplicates/preview?keep=${keep.id}&merge=${old.id}`, null, u.aT);
  ok(r.preview && r.preview.registrationsMoving === 1 && r.preview.registrationsClashing === 2 && r.preview.favorites === 2 && r.preview.points === 70 && r.preview.pendingMoney === 0, 'the preview counts what would move, clash and carry over', r.preview);
  const post = (body, t = u.aT) => api('POST', '/api/admin/duplicates/merge', body, t);
  ok((await post({ keep: keep.id, merge: old.id }, u.bT)).status === 401, 'a buyer cannot merge');
  ok((await post({ keep: keep.id, merge: keep.id })).status === 400, 'merging an account into itself: refused');
  ok((await post({ keep: 'x', merge: 1 })).status === 400, 'merge with nonsense ids: refused');
  sql(`INSERT INTO wallet_topups (user_id,points,status,proof,created_at) VALUES (${old.id},10,'pending','',NOW())`);
  r = await post({ keep: keep.id, merge: old.id }); ok(r.status === 409 && r.code === 'pending_money', 'money waiting on the old account blocks the merge', r);
  ok((await api('GET', `/api/admin/duplicates/preview?keep=${keep.id}&merge=${old.id}`, null, u.aT)).preview.pendingMoney === 1, 'and the preview says so');
  sql(`DELETE FROM wallet_topups WHERE user_id=${old.id}`);
  sql(`UPDATE wallets SET frozen=1 WHERE user_id=${old.id}`);
  r = await post({ keep: keep.id, merge: old.id }); ok(r.status === 409 && r.code === 'wallet_frozen', 'a frozen wallet blocks it too', r);
  ok(num(`SELECT balance FROM wallets WHERE user_id=${old.id}`) === 70 && num(`SELECT COUNT(*) FROM expo_registrations WHERE user_id=${old.id}`) === 3, 'and nothing was changed by the refusals');
  sql(`UPDATE wallets SET frozen=0 WHERE user_id=${old.id}`);

  console.log('\n== the merge');
  sql(`UPDATE buyer_profiles SET nationality='' WHERE user_id=${keep.id}`);
  r = await post({ keep: keep.id, merge: old.id });
  ok(r.status === 200 && r.ok, 'the merge works', r);
  const regs = sql(`SELECT CONCAT(exhibition_id,':',status) FROM expo_registrations WHERE user_id=${keep.id} ORDER BY exhibition_id`).split('\n').join(' ');
  ok(regs === `${e1}:approved ${e2}:approved ${e3}:confirmed`, 'registrations: the further-along one wins where both registered, the rest move over', regs);
  ok(num(`SELECT COUNT(*) FROM expo_registrations WHERE user_id=${old.id}`) === 0, 'the old account has none left');
  ok(num(`SELECT COUNT(*) FROM exhibition_favorites WHERE user_id=${keep.id}`) === 2 && num(`SELECT COUNT(*) FROM exhibition_favorites WHERE user_id=${old.id}`) === 0, 'saved exhibitions moved without doubles');
  ok(num(`SELECT COUNT(*) FROM user_notifications WHERE user_id=${keep.id} AND params LIKE '%Hello old%'`) === 1, 'website notices moved');
  ok(num(`SELECT balance FROM wallets WHERE user_id=${keep.id}`) === 100 && num(`SELECT balance FROM wallets WHERE user_id=${old.id}`) === 0, 'the points balance moved (70 + 30)');
  ok(num(`SELECT COUNT(*) FROM wallet_transactions WHERE user_id IN (${keep.id},${old.id}) AND idem_key LIKE 'adj:merge-${old.id}-%'`) === 2, 'as two ledger entries with reasons');
  ok(sql(`SELECT nationality FROM buyer_profiles WHERE user_id=${keep.id}`) === 'China', 'a gap in the kept profile was filled from the old one');
  ok(sql(`SELECT CONCAT(passport_number,'|',phone_number) FROM buyer_profiles WHERE user_id=${old.id}`) === '|', 'the old account lost its passport and phone number');
  ok(sql(`SELECT passport_number FROM buyer_profiles WHERE user_id=${keep.id}`) === pass, 'the kept account keeps its own');
  ok(sql(`SELECT status FROM users WHERE id=${old.id}`) === 'suspended', 'the old account is suspended');
  ok(num(`SELECT COUNT(*) FROM buyer_merges WHERE kept_id=${keep.id} AND merged_id=${old.id}`) === 1, 'the merge is recorded');
  ok(num(`SELECT COUNT(*) FROM admin_notes WHERE subject_type='buyer' AND subject_id=${keep.id}`) === 1, 'with a note on the kept buyer');
  ok(num(`SELECT COUNT(*) FROM admin_audit_log WHERE action='buyers_merged' AND target_id=${keep.id}`) >= 1, 'and in the activity log');
  r = await api('GET', '/api/admin/duplicates', null, u.aT);
  ok(!(r.groups || []).some((g) => g.members.some((m) => m.id === keep.id)), 'they are no longer listed as duplicates');
  r = await post({ keep: keep.id, merge: old.id }); ok(r.status === 409 && r.code === 'already_merged', 'merging again is refused', r);
  r = await post({ keep: other.id, merge: old.id }); ok(r.status === 409 && r.code === 'already_merged', 'so is merging the old account into anyone else', r);

  console.log('\n== the duplicates screen (en / ru / zh, 375 px)');
  // a fresh pair for the screen
  const sp = `QW${String(st).slice(-7)}`;
  const k2 = mk('uikeep', `passport_number|'${sp}'`), o2 = mk('uiold', `passport_number|'${sp}'`);
  reg(o2, e1, 'pending'); reg(k2, e2, 'pending');
  const browser = await launch();
  const mkPage = async (locale) => { const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } }); await ctx.addCookies([{ name: 'token', value: u.aT, url: BASE }]); const page = await ctx.newPage(); await page.goto(`${BASE}/${locale}/admin/duplicates`, { waitUntil: 'domcontentloaded' }); return { ctx, page }; };
  for (const locale of ['en', 'ru', 'zh']) {
    const { ctx, page } = await mkPage(locale);
    await page.waitForSelector('[data-testid="duplicate-group"]');
    const g = page.locator(`[data-testid="duplicate-group"]`, { hasText: sp });
    ok((await g.count()) === 1, `${locale}: the pair is listed together`);
    ok((await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)), `${locale}: no sideways scrolling at 375 px`);
    await g.locator('li', { hasText: o2.email }).getByRole('button').click();
    await page.waitForSelector('[data-testid="merge-confirm"]');
    await sleep(700);
    const v = await axeViolations(page); ok(v.length === 0, `${locale}: no accessibility violations with the confirmation open`, v.map((x) => x.id));
    if (locale === 'en') {
      ok(/cannot be taken back/i.test(await page.locator('[data-testid="merge-confirm"]').innerText()), 'en: the screen says it cannot be undone');
      await page.getByRole('button', { name: 'Cancel' }).click();
      ok((await page.locator('[data-testid="merge-confirm"]').count()) === 0, 'en: cancelling closes it, nothing merged');
      ok(num(`SELECT COUNT(*) FROM buyer_merges WHERE merged_id=${o2.id}`) === 0, 'en: nothing changed in the database');
    }
    await ctx.close();
  }
  { // confirm for real, in English
    const { ctx, page } = await mkPage('en');
    await page.waitForSelector('[data-testid="duplicate-group"]');
    const g = page.locator(`[data-testid="duplicate-group"]`, { hasText: sp });
    await g.locator('li', { hasText: o2.email }).getByRole('button').click();
    await page.getByRole('button', { name: 'Yes, merge' }).click();
    await page.getByRole('status').filter({ hasText: /Merged/ }).waitFor();
    ok(num(`SELECT COUNT(*) FROM buyer_merges WHERE merged_id=${o2.id} AND kept_id=${k2.id}`) === 1, 'confirming merges the account that was chosen');
    ok((await page.locator(`[data-testid="duplicate-group"]`, { hasText: sp }).count()) === 0, 'and the pair disappears from the list');
    await ctx.close();
  }

  // ---------- scheduled reports ----------
  console.log('\n== scheduled reports (API)');
  const body = (extra = {}) => ({ name: `Weekly sheet ${st}`, kind: 'registrations', frequency: 'daily', weekday: 1, monthDay: 1, recipients: `finance-${st}@test.invalid`, enabled: true, filters: {}, ...extra });
  ok((await api('GET', '/api/admin/scheduled-exports', null, u.bT)).status === 401, 'a buyer cannot see them');
  ok((await api('POST', '/api/admin/scheduled-exports', body(), u.bT)).status === 401, 'a buyer cannot make one');
  for (const [bad, code] of [[{ name: '' }, 'bad_name'], [{ name: 'x'.repeat(101) }, 'bad_name'], [{ kind: 'users' }, 'bad_kind'], [{ frequency: 'hourly' }, 'bad_frequency'], [{ weekday: 9 }, 'bad_day'], [{ monthDay: 29 }, 'bad_day'], [{ recipients: '' }, 'bad_recipients'], [{ recipients: 'not-an-email' }, 'bad_recipients'], [{ recipients: Array.from({ length: 11 }, (_, i) => `a${i}@test.invalid`).join(',') }, 'bad_recipients']]) {
    const x = await api('POST', '/api/admin/scheduled-exports', body(bad), u.aT);
    ok(x.status === 400 && x.code === code, `refused: ${JSON.stringify(bad).slice(0, 40)} → ${code}`, x);
  }
  r = await api('POST', '/api/admin/scheduled-exports', body(), u.aT);
  ok(r.status === 200 && r.id && r.exports.some((e) => e.id === r.id && e.frequency === 'daily'), 'a report is saved', r.status);
  const rid = r.id;
  r = await api('PUT', `/api/admin/scheduled-exports/${rid}`, body({ name: `Renamed ${st}`, frequency: 'monthly', monthDay: 15, enabled: false }), u.aT);
  ok(r.status === 200 && r.exports.find((e) => e.id === rid).name === `Renamed ${st}` && r.exports.find((e) => e.id === rid).enabled === false, 'it can be changed and switched off');
  ok((await api('PUT', `/api/admin/scheduled-exports/${rid}`, body({ kind: 'bogus' }), u.aT)).status === 400, 'a bad change is refused');
  ok((await api('PUT', `/api/admin/scheduled-exports/99999999`, body(), u.aT)).status === 404, 'a report that does not exist: 404');
  ok((await api('DELETE', `/api/admin/scheduled-exports/${rid}`, null, u.bT)).status === 401, 'a buyer cannot delete');
  ok((await api('DELETE', `/api/admin/scheduled-exports/${rid}`, null, u.aT)).status === 200 && num(`SELECT COUNT(*) FROM scheduled_exports WHERE id=${rid}`) === 0, 'an admin can delete it');

  console.log('\n== scheduled reports (sending)');
  sql('DELETE FROM mail_settings');
  const srv = await smtp.start(2537);
  const put = (b) => fetch(BASE + '/api/admin/email', { method: 'PUT', headers: H(u.aT), body: JSON.stringify(b) });
  r = await api('POST', '/api/admin/scheduled-exports', body({ name: `Mailoff ${st}` }), u.aT);
  const offId = r.id;
  r = await api('POST', `/api/admin/scheduled-exports/${offId}/send`, null, u.aT);
  ok(r.status === 409 && r.code === 'mail_off', 'send now with e-mail off: 409');
  await put({ enabled: true, host: '127.0.0.1', port: 2537, secure: false, username: 'm', password: 'x', fromName: 'The Unique Expo', fromEmail: 'noreply@theuniqueexpo.test' });
  const to = `finance-${st}@test.invalid`;
  r = await api('POST', `/api/admin/scheduled-exports/${offId}/send`, null, u.bT); ok(r.status === 401, 'a buyer cannot send');
  r = await api('POST', `/api/admin/scheduled-exports/99999999/send`, null, u.aT); ok(r.status === 404, 'send now for a missing report: 404');
  const n0 = srv.messages.length;
  r = await api('POST', `/api/admin/scheduled-exports/${offId}/send`, null, u.aT);
  ok(r.ok === true && r.status === 'sent', 'send now works', r);
  for (let i = 0; i < 40 && srv.messages.length === n0; i++) await sleep(150);
  const m = srv.messages[srv.messages.length - 1];
  ok(m && m.to.join().includes(to), 'the e-mail goes to the recipient');
  const d = smtp.decode(m.raw);
  ok(d.subject.startsWith(`Mailoff ${st}`) && /registrations-\d{4}-\d{2}-\d{2}/.test(d.subject), 'the subject has the report name and file name', d.subject);
  const att = /filename="?(registrations-[^";\r\n]+\.xlsx)"?/.exec(m.raw);
  ok(!!att, 'an .xlsx file is attached', att && att[1]);
  const b64 = m.raw.split(att[0])[1].split(/\r\n\r\n/)[1].split(/\r\n--/)[0].replace(/\r\n/g, '');
  const bytes = Buffer.from(b64, 'base64');
  ok(bytes.slice(0, 2).toString() === 'PK' && bytes.length > 1000, 'and it is a real Excel file (zip signature)', bytes.length);
  ok(sql(`SELECT last_status FROM scheduled_exports WHERE id=${offId}`) === 'sent', 'the report remembers it was sent');

  // the daily job
  const key = (await (await fetch(BASE + '/api/admin/email', { method: 'POST', headers: H(u.aT), body: JSON.stringify({ action: 'reminderKey' }) })).json()).key;
  const cron = () => fetch(BASE + '/api/cron/registration-reminders', { method: 'POST', headers: { 'x-reminder-key': key, 'x-forwarded-for': ipn() } }).then((x) => x.json());
  const rerun = () => sql('UPDATE mail_settings SET reminders_last_run_at=NULL WHERE id=1');
  r = await api('POST', '/api/admin/scheduled-exports', body({ name: `Daily ${st}` }), u.aT);
  const dailyId = r.id;
  const mine = (name) => srv.messages.filter((x) => smtp.decode(x.raw).subject.startsWith(name)).length;
  rerun(); let j = await cron(); await sleep(1200);
  ok(mine(`Daily ${st}`) === 0, 'a new daily report waits until the next day (it was just created)', j);
  sql(`UPDATE scheduled_exports SET last_sent_at=DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY) WHERE id=${dailyId}`);
  sql(`UPDATE scheduled_exports SET enabled=0 WHERE id=${offId}`);
  rerun(); j = await cron();
  for (let i = 0; i < 40 && mine(`Daily ${st}`) === 0; i++) await sleep(150);
  ok(mine(`Daily ${st}`) === 1 && j.reportsSent >= 1, 'when it is due the daily job sends it once', j);
  ok(mine(`Mailoff ${st}`) === 1, 'a switched-off report is not sent by the job');
  rerun(); await cron(); await sleep(1000);
  ok(mine(`Daily ${st}`) === 1, 'a second run on the same day does not send it again');
  sql(`UPDATE scheduled_exports SET frequency='weekly', weekday=${(new Date().getUTCDay() + 1) % 7}, last_sent_at=DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY) WHERE id=${dailyId}`);
  rerun(); await cron(); await sleep(1000);
  ok(mine(`Daily ${st}`) === 1, 'a weekly report is not sent on the wrong day');
  sql(`UPDATE scheduled_exports SET weekday=${new Date().getUTCDay()}, last_sent_at=DATE_SUB(UTC_TIMESTAMP(), INTERVAL 8 DAY) WHERE id=${dailyId}`);
  rerun(); await cron();
  for (let i = 0; i < 40 && mine(`Daily ${st}`) < 2; i++) await sleep(150);
  ok(mine(`Daily ${st}`) === 2, 'but is sent on its day');

  console.log('\n== the scheduled reports screen (en / ru / zh, 375 px)');
  for (const locale of ['en', 'ru', 'zh']) {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } }); await ctx.addCookies([{ name: 'token', value: u.aT, url: BASE }]);
    const page = await ctx.newPage(); await page.goto(`${BASE}/${locale}/admin/scheduled-exports`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="report-form"]');
    await page.waitForSelector(`[data-testid="report"][data-id="${dailyId}"]`);
    ok((await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)), `${locale}: no sideways scrolling`);
    await sleep(700);
    const v = await axeViolations(page); ok(v.length === 0, `${locale}: no accessibility violations`, v.map((x) => x.id));
    await ctx.close();
  }
  { // make one from the screen in English
    const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } }); await ctx.addCookies([{ name: 'token', value: u.aT, url: BASE }]);
    const page = await ctx.newPage(); await page.goto(`${BASE}/en/admin/scheduled-exports`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="report-form"]');
    const form = page.locator('[data-testid="report-form"]');
    await form.getByRole('textbox').first().fill(`From screen ${st}`);
    await form.locator('textarea, input[type="email"], input[type="text"]').last().fill(`screen-${st}@test.invalid`);
    await form.getByRole('button', { name: /^(Save|Add|Create)/ }).click();
    await page.locator('[data-testid="report"]', { hasText: `From screen ${st}` }).waitFor();
    ok(num(`SELECT COUNT(*) FROM scheduled_exports WHERE name='From screen ${st}' AND recipients LIKE '%screen-${st}@test.invalid%'`) === 1, 'a report made on the screen is saved with its recipient');
    await ctx.close();
  }

  // ---------- staff roles ----------
  console.log('\n== staff roles (API)');
  const staff = {};
  for (const p of ['reviewer', 'content', 'finance', 'viewer']) staff[p] = await mkUsers('sr' + p.slice(0, 3));
  const idOf = (x) => num(`SELECT id FROM users WHERE email='${x.m.a}'`);
  ok((await api('GET', '/api/admin/staff-access', null, u.bT)).status === 401, 'a buyer cannot see the staff list');
  ok((await api('GET', '/api/auth/staff-role', null, staff.viewer.aT)).preset === 'full', 'before a role is set an admin has full access');
  for (const p of Object.keys(staff)) {
    r = await api('PUT', '/api/admin/staff-access', { userId: idOf(staff[p]), preset: p }, u.aT);
    ok(r.status === 200 && r.staff.find((s) => s.id === idOf(staff[p])).preset === p, `role ${p} is set`);
  }
  ok((await api('PUT', '/api/admin/staff-access', { userId: adminId, preset: 'viewer' }, u.aT)).code === 'own_role', 'nobody can change their own role');
  ok((await api('PUT', '/api/admin/staff-access', { userId: idOf(staff.viewer), preset: 'boss' }, u.aT)).status === 400, 'an unknown role is refused');
  ok((await api('PUT', '/api/admin/staff-access', { userId: u.bId, preset: 'viewer' }, u.aT)).code === 'not_admin', 'a buyer cannot be given a role');
  ok(denied(await api('PUT', '/api/admin/staff-access', { userId: idOf(staff.viewer), preset: 'full' }, staff.reviewer.aT)), 'someone with a limited role cannot change roles');
  ok((await api('GET', '/api/auth/staff-role', null, staff.finance.aT)).preset === 'finance', 'each person is told their own role');

  const exh = '/api/admin/exhibitions';
  const matrix = {
    reviewer: { allow: [['GET', '/api/admin/insights'], ['GET', '/api/admin/buyer-profiles'], ['POST', '/api/admin/record-meta', { type: 'buyer', id: 1, action: 'bogus' }]], deny: [['GET', '/api/admin/wallet/waiting'], ['POST', '/api/admin/wallet/bulk-adjust', {}], ['GET', '/api/admin/scheduled-exports'], ['GET', '/api/admin/duplicates'], ['POST', '/api/admin/duplicates/merge', { keep: 1, merge: 2 }], ['GET', '/api/admin/staff-access'], ['POST', exh, {}]] },
    content: { allow: [['GET', '/api/admin/insights'], ['POST', exh, {}]], deny: [['GET', '/api/admin/buyer-profiles'], ['GET', '/api/admin/wallet/waiting'], ['GET', '/api/admin/duplicates'], ['GET', '/api/admin/staff-access'], ['POST', '/api/admin/record-meta', { type: 'buyer', id: 1, action: 'bogus' }]] },
    finance: { allow: [['GET', '/api/admin/wallet/waiting'], ['POST', '/api/admin/wallet/bulk-adjust', {}], ['GET', '/api/admin/scheduled-exports'], ['GET', '/api/admin/insights']], deny: [['GET', '/api/admin/buyer-profiles'], ['POST', exh, {}], ['GET', '/api/admin/duplicates'], ['GET', '/api/admin/staff-access']] },
    viewer: { allow: [['GET', '/api/admin/insights'], ['GET', '/api/admin/expo-registrations']], deny: [['POST', '/api/admin/record-meta', { type: 'buyer', id: 1, action: 'bogus' }], ['POST', exh, {}], ['POST', '/api/admin/wallet/bulk-adjust', {}], ['GET', '/api/admin/buyer-profiles'], ['GET', '/api/admin/scheduled-exports'], ['GET', '/api/admin/duplicates'], ['POST', '/api/admin/duplicates/merge', { keep: 1, merge: 2 }]] },
  };
  for (const [p, rules] of Object.entries(matrix)) {
    for (const [m2, path, b] of rules.allow) { const x = await api(m2, path, b, staff[p].aT); ok(!denied(x), `${p} may ${m2} ${path}`, x.status); }
    for (const [m2, path, b] of rules.deny) { const x = await api(m2, path, b, staff[p].aT); ok(denied(x), `${p} may not ${m2} ${path}`, x.status); }
    ok(!denied(await api('GET', '/api/admin/two-step', null, staff[p].aT)), `${p} can always manage their own two-step sign-in`);
  }
  ok(!denied(await api('GET', '/api/admin/staff-access', null, u.aT)), 'the full admin is never limited');
  // the role is dropped by going back to full
  r = await api('PUT', '/api/admin/staff-access', { userId: idOf(staff.viewer), preset: 'full' }, u.aT);
  ok(r.status === 200 && !denied(await api('GET', '/api/admin/duplicates', null, staff.viewer.aT)), 'going back to full access gives everything back');
  ok(num(`SELECT COUNT(*) FROM admin_staff_access WHERE user_id=${idOf(staff.viewer)}`) === 0, 'and the role row is removed');

  console.log('\n== staff roles (screens)');
  const tok = await login(staff.finance.m.a);
  for (const locale of ['en', 'ru', 'zh']) {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } }); await ctx.addCookies([{ name: 'token', value: tok, url: BASE }]);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/${locale}/admin/duplicates`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="no-staff-access"]');
    await sleep(700);
    const v = await axeViolations(page); ok(v.length === 0, `${locale}: the no-access card has no accessibility violations`, v.map((x) => x.id));
    await page.goto(`${BASE}/${locale}/admin/scheduled-exports`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="report-form"]');
    ok((await page.locator('[data-testid="no-staff-access"]').count()) === 0, `${locale}: a page the role may open opens`);
    await page.goto(`${BASE}/${locale}/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('a[href$="/admin/scheduled-exports"]', { state: 'attached' });
    for (let i = 0; i < 40 && (await page.locator('a[href$="/admin/duplicates"]').count()) > 0; i++) await sleep(150); // the menu shrinks once the role is known
    ok((await page.locator('a[href$="/admin/duplicates"]').count()) === 0 && (await page.locator('a[href$="/admin/staff-access"]').count()) === 0, `${locale}: the admin home shows only what the role can open`);
    await ctx.close();
  }
  { // the staff page: full admin changes a role on the screen
    const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } }); await ctx.addCookies([{ name: 'token', value: u.aT, url: BASE }]);
    const page = await ctx.newPage(); await page.goto(`${BASE}/en/admin/staff-access`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="staff-table"]');
    const row = page.locator(`tr[data-staff="${idOf(staff.content)}"]`);
    ok(await page.locator(`tr[data-staff="${adminId}"] select`).isDisabled(), 'your own role cannot be changed on the screen');
    await row.locator('select').selectOption('viewer');
    await page.getByRole('status').filter({ hasText: /./ }).first().waitFor();
    ok(sql(`SELECT preset FROM admin_staff_access WHERE user_id=${idOf(staff.content)}`) === 'viewer', 'changing a role on the screen saves it');
    await sleep(700);
    const v = await axeViolations(page); ok(v.length === 0, 'the staff page has no accessibility violations', v.map((x) => x.id));
    await ctx.close();
    const ctx2 = await browser.newContext({ viewport: { width: 375, height: 800 } }); await ctx2.addCookies([{ name: 'token', value: staff.reviewer.aT, url: BASE }]);
    const p2 = await ctx2.newPage(); await p2.goto(`${BASE}/en/admin/staff-access`, { waitUntil: 'domcontentloaded' });
    await p2.waitForSelector('[data-testid="no-staff-access"]');
    ok(true, 'a limited role opening the staff page gets the no-access card');
    await ctx2.close();
  }

  await browser.close();
  await srv.close();
  sql('DELETE FROM mail_settings');
  done();
})().catch((e) => { console.error(e); process.exit(1); });
