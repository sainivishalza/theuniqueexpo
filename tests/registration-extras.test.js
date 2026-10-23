// Timeline, next edition, passport/visa alerts, saved-exhibition alerts, visa letter + e-ticket PDFs, ticket check, travel pack, group invites.
const bcrypt = require('bcryptjs');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { createHmac } = require('node:crypto');
const { BASE, sql, ok, done, mkUsers, connect, login } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const smtp = require('./helpers/fake-smtp.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ip = () => '10.8.' + Math.floor(Math.random() * 250) + '.' + (Math.floor(Math.random() * 250) + 1);
const H = (t, x = {}) => ({ 'Content-Type': 'application/json', cookie: 'token=' + t, 'x-forwarded-for': ip(), ...x });
const secret = () => process.env.JWT_SECRET || /^JWT_SECRET=(.*)$/m.exec(fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8'))[1].trim().replace(/^["']|["']$/g, '');
const ticketCode = (id) => `${id}.${createHmac('sha256', secret()).update(`e-ticket:${id}`).digest('base64url').slice(0, 16)}`;
// All the text a pdf-lib page draws, even though the streams are compressed.
const pdfText = (buf) => {
  let all = '';
  const s = buf.toString('latin1');
  const re = /stream\r?\n/g; let m;
  while ((m = re.exec(s))) {
    const start = m.index + m[0].length; const end = s.indexOf('endstream', start); if (end < 0) break;
    const chunk = buf.subarray(start, end);
    try { all += zlib.inflateSync(chunk).toString('latin1'); } catch { all += chunk.toString('latin1'); }
  }
  return (all.match(/<([0-9A-Fa-f]+)>\s*Tj/g) || []).map((x) => Buffer.from(/<([0-9A-Fa-f]+)>/.exec(x)[1], 'hex').toString('latin1')).join('\n');
};

(async () => {
  sql('DELETE FROM mail_settings');
  const db = await connect();
  const st = Date.now(), h = bcrypt.hashSync('pass1234', 10);
  const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const schema = JSON.stringify([{ id: 'f_note', label: 'Anything we should know?', type: 'textarea', required: false }]);
  const mkExpo = async (tag, { from = 40, to, closes = null, opens = null, series = null, enabled = 1, title } = {}) => {
    const slug = `rx-${tag}-${st}`;
    await db.query('INSERT INTO exhibitions (slug,title,start_date,end_date,venue,city,registration_enabled,registration_form_schema,registration_opens,registration_closes,series) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [slug, title || `Extras ${tag} ${st}`, day(from), day(to ?? from + 3), 'Hall 1', 'Guangzhou', enabled, schema, opens, closes, series]);
    const [[row]] = await db.query('SELECT id FROM exhibitions WHERE slug=?', [slug]);
    return { slug, id: row.id, title: title || `Extras ${tag} ${st}` };
  };
  const mkBuyer = async (tag, locale) => {
    const email = `rx-${tag}-${st}@test.invalid`;
    sql(`INSERT INTO users (name,email,password_hash,role,country,preferred_locale) VALUES ('Extra ${tag}','${email}','${h}','buyer','',${locale ? `'${locale}'` : 'NULL'})`);
    return { email, id: Number(sql(`SELECT id FROM users WHERE email='${email}'`)), t: await login(email), name: `Extra ${tag}` };
  };
  const reg = (b, x, status, extra = {}) => {
    const cols = ['exhibition_id', 'user_id', 'status', ...Object.keys(extra)];
    const vals = [x.id, b.id, `'${status}'`, ...Object.values(extra)];
    sql(`INSERT INTO expo_registrations (${cols.join(',')}) VALUES (${vals.join(',')})`);
    return Number(sql(`SELECT id FROM expo_registrations WHERE exhibition_id=${x.id} AND user_id=${b.id}`));
  };
  const u = await mkUsers('rx');
  const br = await launch();
  const open = async (t, vp = { width: 375, height: 1000 }, loc) => { const c = await br.newContext({ viewport: vp, extraHTTPHeaders: { 'x-forwarded-for': ip() } }); await c.addCookies([{ name: 'token', value: t, url: BASE }]); return [c, await c.newPage()]; };

  console.log('\n== the progress timeline');
  const tl = await mkBuyer('tl');
  const cases = {
    pending: ['pending', {}, ['registered:done', 'review:current', 'approved:todo', 'confirmed:todo', 'attended:todo']],
    approved: ['approved', { approved_at: 'UTC_TIMESTAMP()', confirm_by: `'${day(10)}'` }, ['registered:done', 'approved:done', 'confirmed:current', 'attended:todo']],
    confirmed: ['confirmed', { approved_at: 'UTC_TIMESTAMP()', confirmed_at: 'UTC_TIMESTAMP()' }, ['registered:done', 'approved:done', 'confirmed:done', 'attended:current']],
    attended: ['attended', { approved_at: 'UTC_TIMESTAMP()', confirmed_at: 'UTC_TIMESTAMP()', checked_in_at: 'UTC_TIMESTAMP()' }, ['registered:done', 'approved:done', 'confirmed:done', 'attended:done']],
    rejected: ['rejected', {}, ['registered:done', 'rejected:problem']],
    cancelled: ['cancelled', { approved_at: 'UTC_TIMESTAMP()', cancelled_at: 'UTC_TIMESTAMP()' }, ['registered:done', 'approved:done', 'cancelled:problem']],
    expired: ['approved', { approved_at: 'UTC_TIMESTAMP()', confirm_by: `'${day(-2)}'` }, ['registered:done', 'approved:done', 'expired:problem']],
    absent: ['absent', { approved_at: 'UTC_TIMESTAMP()', confirmed_at: 'UTC_TIMESTAMP()' }, ['registered:done', 'approved:done', 'confirmed:done', 'absent:problem']],
  };
  const tlExpos = {};
  for (const [name, [status, extra]] of Object.entries(cases)) { tlExpos[name] = await mkExpo('tl-' + name, { from: 50 }); reg(tl, tlExpos[name], status, extra); }
  let [c, p] = await open(tl.t);
  for (const [name, , steps] of Object.entries(cases).map(([k, v]) => [k, v[0], v[2]])) {
    await p.goto(BASE + `/en/exhibitions/${tlExpos[name].slug}`, { waitUntil: 'networkidle' });
    await p.getByTestId('registration-timeline').waitFor();
    const got = await p.locator('[data-testid=registration-timeline] li').evaluateAll((els) => els.map((e) => e.dataset.step + ':' + e.dataset.state));
    ok(JSON.stringify(got) === JSON.stringify(steps), `${name}: the steps are ${steps.join(' > ')}`, got);
  }
  await p.goto(BASE + `/en/exhibitions/${tlExpos.approved.slug}`, { waitUntil: 'networkidle' });
  ok(await p.getByText(/Please confirm by/).isVisible(), 'an approved registration shows the day to confirm by in the timeline');
  await p.goto(BASE + `/en/exhibitions/${tlExpos.confirmed.slug}`, { waitUntil: 'networkidle' });
  const stamp = await p.locator('[data-testid=registration-timeline] li[data-step=approved] p.text-xs').innerText();
  ok(/\d{4}|20\d\d/.test(stamp), 'and each reached step shows its date', stamp);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no sideways overflow at 375px');
  ok((await axeViolations(p)).length === 0, 'the card with the timeline: axe 0');
  for (const loc of ['ru', 'zh']) {
    await p.goto(BASE + `/${loc}/exhibitions/${tlExpos.attended.slug}`, { waitUntil: 'networkidle' });
    await p.getByTestId('registration-timeline').waitFor();
    ok(new RegExp(loc === 'ru' ? 'Зарегистрированы' : '已登记').test(await p.getByTestId('registration-timeline').innerText()), `${loc}: the timeline is translated`);
    ok((await axeViolations(p)).length === 0, `${loc}: axe 0`);
  }
  await p.goto(BASE + '/en/dashboard/buyer/registrations', { waitUntil: 'networkidle' });
  await p.getByText('Show progress').first().click();
  ok(await p.getByTestId('registration-timeline').first().isVisible(), 'My registrations shows the same timeline under "Show progress"');
  ok(!/expoRegistrationStatus\./.test(await p.locator('main').innerText()) && /Registered/.test(await p.getByTestId('registration-timeline').first().innerText()), 'with real words, not message keys');
  ok((await axeViolations(p)).length === 0, 'My registrations with a timeline open: axe 0');
  await c.close();

  console.log('\n== register again for the next edition');
  const ne = await mkBuyer('ne');
  const cfa = await mkExpo('ed1', { from: -30, to: -27, series: `Series-${st}` }); // over
  const cfb = await mkExpo('ed2', { from: 20, series: `series-${st}`.toUpperCase().replace('SERIES', 'Series') });  // same series, other letter case
  const cfc = await mkExpo('ed3', { from: 60, series: `series-${st}` });
  const other = await mkExpo('other', { from: 25, series: `other-${st}` });
  const unrelated = await mkExpo('unrelated', { from: 22 });
  reg(ne, cfa, 'attended', { approved_at: 'UTC_TIMESTAMP()', confirmed_at: 'UTC_TIMESTAMP()', checked_in_at: 'UTC_TIMESTAMP()' });
  const mineAll = async (bu) => (await (await fetch(BASE + '/api/expo-registrations/mine', { headers: H(bu.t) })).json()).registrations;
  let rows = await mineAll(ne);
  ok(rows[0].nextEdition && rows[0].nextEdition.slug === cfb.slug, 'the earliest later edition of the same series (any letter case) is offered', rows[0].nextEdition);
  ok(!rows[0].nextEdition || rows[0].nextEdition.slug !== other.slug, 'not another series, nor an exhibition with no series');
  await db.query('UPDATE exhibitions SET registration_closes=? WHERE id=?', [day(-1), cfb.id]);
  rows = await mineAll(ne);
  ok(rows[0].nextEdition && rows[0].nextEdition.slug === cfc.slug, 'an edition whose registration is closed is skipped for the next one that is open', rows[0].nextEdition);
  await db.query('UPDATE exhibitions SET registration_closes=NULL WHERE id=?', [cfb.id]);
  reg(ne, cfb, 'pending');
  rows = await mineAll(ne);
  ok(rows.find((r) => r.exhibitionSlug === cfa.slug).nextEdition.slug === cfc.slug, 'one already registered for is skipped');
  sql(`UPDATE expo_registrations SET status='cancelled' WHERE exhibition_id=${cfb.id} AND user_id=${ne.id}`);
  rows = await mineAll(ne);
  ok(rows.find((r) => r.exhibitionSlug === cfa.slug).nextEdition.slug === cfb.slug, 'a cancelled one is offered again');
  sql(`UPDATE expo_registrations SET status='confirmed' WHERE exhibition_id=${cfa.id} AND user_id=${ne.id}`);
  rows = await mineAll(ne);
  ok(!!rows.find((r) => r.exhibitionSlug === cfa.slug).nextEdition, 'confirmed and over counts as having attended');
  sql(`UPDATE expo_registrations SET status='pending' WHERE exhibition_id=${cfa.id} AND user_id=${ne.id}`);
  rows = await mineAll(ne);
  ok(!rows.find((r) => r.exhibitionSlug === cfa.slug).nextEdition, 'but someone who never attended is not offered it');
  sql(`UPDATE expo_registrations SET status='attended' WHERE exhibition_id=${cfa.id} AND user_id=${ne.id}`);
  [c, p] = await open(ne.t);
  await p.goto(BASE + `/en/exhibitions/${cfa.slug}`, { waitUntil: 'networkidle' });
  await p.getByTestId('next-edition').waitFor();
  ok(/The next edition is open/.test(await p.getByTestId('next-edition').innerText()) && (await p.getByTestId('next-edition').innerText()).includes(cfb.title), 'the exhibition page offers it by name');
  const href = await p.getByRole('link', { name: 'Register for the next edition' }).getAttribute('href');
  ok(href.endsWith(`/exhibitions/${cfb.slug}/register`), 'with a button to its register page', href);
  ok((await axeViolations(p)).length === 0, 'axe 0');
  await p.goto(BASE + '/ru/dashboard/buyer/registrations', { waitUntil: 'networkidle' });
  await p.getByText('Открыта регистрация на следующий выпуск').first().waitFor();
  ok(true, 'My registrations offers it too (in Russian)');
  await c.close();

  console.log('\n== passport and visa alerts');
  const mail = await smtp.start(2534);
  const settings = { enabled: true, host: '127.0.0.1', port: 2534, secure: false, username: 'm', password: 'x', fromName: 'The Unique Expo', fromEmail: 'noreply@theuniqueexpo.test' };
  await fetch(BASE + '/api/admin/email', { method: 'PUT', headers: H(u.aT), body: JSON.stringify(settings) });
  const key = (await (await fetch(BASE + '/api/admin/email', { method: 'POST', headers: H(u.aT), body: JSON.stringify({ action: 'reminderKey' }) })).json()).key;
  const cron = () => { sql('UPDATE mail_settings SET reminders_last_run_at=NULL WHERE id=1'); return fetch(BASE + '/api/cron/registration-reminders', { method: 'POST', headers: { 'x-reminder-key': key, 'x-forwarded-for': ip() } }).then((r) => r.json()); };
  const notes = (bu, kind) => sql(`SELECT params FROM user_notifications WHERE user_id=${bu.id} AND kind='${kind}'`).split('\n').filter(Boolean).map((x) => JSON.parse(x));
  const dx = await mkBuyer('dx', 'ru');
  const trip = await mkExpo('trip', { from: 30, to: 33 });
  const tripLater = await mkExpo('triplater', { from: 400, to: 403 });
  reg(dx, trip, 'approved', { approved_at: 'UTC_TIMESTAMP()', confirm_by: `'${day(20)}'` }); reg(dx, tripLater, 'pending');
  sql(`INSERT INTO buyer_profiles (user_id, passport_name, passport_number, passport_expire_date, visa_expire_date) VALUES (${dx.id},'DX PERSON','P1234567','${day(100)}','${day(31)}') ON DUPLICATE KEY UPDATE passport_name='DX PERSON', passport_number='P1234567', passport_expire_date='${day(100)}', visa_expire_date='${day(31)}'`);
  let rowsDx = await mineAll(dx);
  ok(JSON.stringify(rowsDx.find((r) => r.exhibitionSlug === trip.slug).documentWarnings) === JSON.stringify(['passport', 'visa']), 'passport expiring within six months after the show and a visa ending before it are both flagged', rowsDx.map((r) => r.documentWarnings));
  const n0 = mail.messages.length;
  let j = await cron();
  ok(j.ran === true && j.documentSent >= 2, 'the daily job sends the alerts', j);
  for (let i = 0; i < 40 && mail.messages.length < n0 + 2; i++) await sleep(150);
  const pn = notes(dx, 'passportExpiring'), vn = notes(dx, 'visaExpiring');
  ok(pn.length === 1 && pn[0].expo === trip.title && pn[0].passportDate === day(100), 'a passport notice naming the exhibition and the expiry day', pn);
  ok(vn.length === 1 && vn[0].visaDate === day(31), 'a visa notice', vn);
  const mails = mail.messages.slice(n0).map((m) => ({ d: smtp.decode(m.raw), p: smtp.parts(m.raw), to: m.to.join() })).filter((m) => m.to.includes(dx.email));
  ok(mails.some((m) => /Срок действия паспорта/.test(m.d.subject)) && mails.some((m) => /Виза может закончиться/.test(m.d.subject)), 'e-mailed in the buyer\'s language (Russian)', mails.map((m) => m.d.subject));
  j = await cron(); await sleep(500);
  ok(notes(dx, 'passportExpiring').length === 1 && notes(dx, 'visaExpiring').length === 1, 'told once, not again on the next run');
  [c, p] = await open(dx.t);
  await p.goto(BASE + `/en/exhibitions/${trip.slug}`, { waitUntil: 'networkidle' });
  await p.getByTestId('document-warnings').waitFor();
  const warnText = await p.getByTestId('document-warnings').innerText();
  ok(/passport/i.test(warnText) && /visa/i.test(warnText), 'the exhibition page warns about both', warnText);
  ok((await axeViolations(p)).length === 0, 'the warning: axe 0');
  await p.goto(BASE + '/en/dashboard/buyer/profile', { waitUntil: 'networkidle' });
  ok(await p.getByLabel('Passport Expiry Date').isVisible(), 'the profile has a Passport Expiry Date field');
  await p.getByLabel('Passport Expiry Date').fill(day(900));
  await p.getByLabel('Visa Expiry Date').fill(day(900));
  await p.getByRole('button', { name: /Save/ }).first().click();
  await sleep(1200);
  ok(sql(`SELECT passport_expire_date FROM buyer_profiles WHERE user_id=${dx.id}`) === day(900), 'saving it from the profile stores it');
  await p.goto(BASE + `/en/exhibitions/${trip.slug}`, { waitUntil: 'networkidle' });
  await p.getByTestId('registration-timeline').waitFor();
  ok((await p.getByTestId('document-warnings').count()) === 0, 'new dates clear the warning');
  await c.close();

  console.log('\n== saved exhibitions: registration opens / closes soon');
  const sv = await mkBuyer('sv', 'zh'), sv2 = await mkBuyer('sv2');
  const opening = await mkExpo('opening', { from: 50, opens: day(0) }), closing = await mkExpo('closing', { from: 50, closes: day(2) }), notYet = await mkExpo('notyet', { from: 50, closes: day(9) }), lateSave = await mkExpo('latesave', { from: 50, opens: day(-5) });
  const fav = (bu, x, ago = 3) => sql(`INSERT INTO exhibition_favorites (user_id, exhibition_id, created_at) VALUES (${bu.id},${x.id},DATE_SUB(NOW(), INTERVAL ${ago} DAY))`);
  fav(sv, opening); fav(sv, closing); fav(sv, notYet); fav(sv, lateSave, 0); fav(sv2, closing); reg(sv2, closing, 'pending');
  const m0 = mail.messages.length;
  j = await cron();
  ok(j.savedSent === 2, 'two alerts: one opened, one closing', j);
  const sOpen = notes(sv, 'savedRegistrationOpened'), sClose = notes(sv, 'savedRegistrationClosing');
  ok(sOpen.length === 1 && sOpen[0].expo === opening.title, 'told that registration opened (saved before it opened)', sOpen);
  ok(sClose.length === 1 && sClose[0].expo === closing.title && sClose[0].date === day(2), 'and that it closes in two days, with the day', sClose);
  ok(notes(sv, 'savedRegistrationClosing').length === 1 && notes(sv2, 'savedRegistrationClosing').length === 0, 'not for a deadline 9 days away, one saved after it opened, nor for someone already registered');
  for (let i = 0; i < 30 && mail.messages.length < m0 + 2; i++) await sleep(150);
  ok(mail.messages.slice(m0).some((m) => smtp.decode(m.raw).subject.includes('的登记将于')), 'e-mailed in Chinese', mail.messages.slice(m0).map((m) => smtp.decode(m.raw).subject));
  await cron(); await sleep(400);
  ok(notes(sv, 'savedRegistrationOpened').length === 1 && notes(sv, 'savedRegistrationClosing').length === 1, 'not told twice');

  console.log('\n== visa invitation letter and e-ticket (PDF)');
  const pd = await mkBuyer('pd');
  const show = await mkExpo('pdf', { from: 30, to: 32, title: `PDF Show ${st}` });
  const rid = reg(pd, show, 'approved', { approved_at: 'UTC_TIMESTAMP()', confirm_by: `'${day(10)}'` });
  const get = (path, t) => fetch(BASE + path, { headers: t ? H(t) : { 'x-forwarded-for': ip() } });
  ok((await get(`/api/expo-registrations/${rid}/invitation`)).status === 401, 'signed out: refused');
  ok((await get(`/api/expo-registrations/${rid}/invitation`, ne.t)).status === 404, 'someone else\'s registration looks like it does not exist');
  let r = await get(`/api/expo-registrations/${rid}/invitation`, pd.t); let jj = await r.json();
  ok(r.status === 409 && jj.code === 'profile_incomplete' && jj.missing.includes('passportName'), 'without a passport name and number the letter asks for them', jj);
  sql(`INSERT INTO buyer_profiles (user_id, passport_name, passport_number, nationality, date_of_birth, job_title, company_name) VALUES (${pd.id},'PETROV IVAN','AB123456','Russia','1985-03-09','Buyer','Zaryad Trading') ON DUPLICATE KEY UPDATE passport_name='PETROV IVAN', passport_number='AB123456', nationality='Russia', date_of_birth='1985-03-09', job_title='Buyer', company_name='Zaryad Trading'`);
  r = await get(`/api/expo-registrations/${rid}/invitation`, pd.t);
  const letter = Buffer.from(await r.arrayBuffer());
  ok(r.status === 200 && r.headers.get('content-type') === 'application/pdf' && letter.subarray(0, 5).toString() === '%PDF-', 'an approved registration gets a PDF', r.status);
  ok(/attachment; filename="UE-INV-\d{6}\.pdf"/.test(r.headers.get('content-disposition') || '') && /no-store/.test(r.headers.get('cache-control') || ''), 'as a download, not cached');
  const lt = pdfText(letter).replace(/\n/g, ' ');
  ok(lt.includes('INVITATION LETTER') && lt.includes('PETROV IVAN') && lt.includes('AB123456') && lt.includes('PDF Show') && lt.includes('Zaryad Trading') && lt.includes('Russia') && lt.includes('9 March 1985'), 'the letter names the visitor, passport, company, birth date and the exhibition', lt.slice(0, 500));
  ok(lt.includes(`UE-INV-${String(rid).padStart(6, '0')}`), 'and carries a reference number');
  sql(`UPDATE buyer_profiles SET company_name='公司 Zaryad 日本' WHERE user_id=${pd.id}`);
  r = await get(`/api/expo-registrations/${rid}/invitation`, pd.t);
  ok(r.status === 200 && !pdfText(Buffer.from(await r.arrayBuffer())).includes('日本'), 'Chinese letters the PDF font cannot print are left out instead of breaking the document');
  r = await get(`/api/expo-registrations/${rid}/ticket`, pd.t); jj = await r.json();
  ok(r.status === 409 && jj.code === 'not_available', 'no e-ticket until attendance is confirmed', jj);
  sql(`UPDATE expo_registrations SET status='confirmed', confirmed_at=UTC_TIMESTAMP() WHERE id=${rid}`);
  r = await get(`/api/expo-registrations/${rid}/ticket`, pd.t);
  const ticket = Buffer.from(await r.arrayBuffer());
  ok(r.status === 200 && ticket.subarray(0, 5).toString() === '%PDF-' && /ticket-\d{6}\.pdf/.test(r.headers.get('content-disposition') || ''), 'a confirmed registration gets the e-ticket PDF');
  const tt = pdfText(ticket).replace(/\n/g, ' ');
  ok(tt.includes('PETROV IVAN') && tt.includes('PDF Show') && tt.includes('Show this code at the entrance'), 'with the name and the exhibition', tt.slice(0, 400));
  ok(/\/Subtype\s*\/Image/.test(ticket.toString('latin1')), 'and an image (the QR code)');
  sql(`UPDATE expo_registrations SET status='approved', confirm_by='${day(-3)}' WHERE id=${rid}`);
  ok((await get(`/api/expo-registrations/${rid}/invitation`, pd.t)).status === 409, 'an approval whose confirm-by day passed gets no letter');
  for (const s of ['pending', 'rejected', 'cancelled']) { sql(`UPDATE expo_registrations SET status='${s}' WHERE id=${rid}`); ok((await get(`/api/expo-registrations/${rid}/invitation`, pd.t)).status === 409, `${s}: no letter`); }
  sql(`UPDATE expo_registrations SET status='confirmed', confirm_by=NULL WHERE id=${rid}`);
  [c, p] = await open(pd.t);
  await p.goto(BASE + `/en/exhibitions/${show.slug}`, { waitUntil: 'networkidle' });
  await p.getByTestId('registration-downloads').waitFor();
  const dl1 = p.waitForEvent('download');
  await p.getByRole('button', { name: 'Download invitation letter' }).click();
  const d1 = await dl1;
  ok(/invitation-letter-/.test(d1.suggestedFilename()), 'the button downloads the letter', d1.suggestedFilename());
  const dl2 = p.waitForEvent('download');
  await p.getByRole('button', { name: 'Download e-ticket' }).click();
  ok(/e-ticket-/.test((await dl2).suggestedFilename()), 'and the ticket');
  // The buttons fade back to normal after a download; let the fade finish before measuring contrast.
  await p.getByRole('button', { name: 'Download e-ticket' }).and(p.locator(':enabled')).waitFor();
  await sleep(700);
  const docAxe = await axeViolations(p);
  ok(docAxe.length === 0, 'the documents block: axe 0', docAxe);
  sql(`UPDATE buyer_profiles SET passport_number='' WHERE user_id=${pd.id}`);
  await p.getByRole('button', { name: 'Download invitation letter' }).click();
  await p.getByText(/add your passport name and passport number/i).waitFor();
  ok(true, 'with the passport missing the button explains what to add');
  await c.close();
  sql(`UPDATE buyer_profiles SET passport_number='AB123456' WHERE user_id=${pd.id}`);

  console.log('\n== ticket check at the entrance');
  const check = (code, t = u.aT) => fetch(BASE + `/api/admin/tickets/check?code=${encodeURIComponent(code)}`, { headers: H(t) });
  ok((await check(ticketCode(rid), pd.t)).status === 401, 'a buyer cannot use it');
  ok((await check('1.AAAAAAAAAAAAAAAA')).status === 404 && (await check('abc')).status === 404 && (await check(`${rid}.` + 'A'.repeat(16))).status === 404, 'invented codes are not found');
  r = await check(ticketCode(rid)); jj = await r.json();
  ok(r.status === 200 && jj.ticket.name === 'PETROV IVAN' && jj.ticket.canCheckIn === true && jj.ticket.exhibitionTitle === show.title, 'a real code shows who it is and that they can be let in', jj);
  [c, p] = await open(u.aT, { width: 375, height: 900 });
  await p.goto(BASE + `/en/admin/ticket-check?code=${encodeURIComponent(ticketCode(rid))}`, { waitUntil: 'networkidle' });
  await p.getByTestId('ticket-card').waitFor();
  ok((await p.getByTestId('ticket-card').innerText()).includes('PETROV IVAN'), 'the page opened from the QR code shows the visitor');
  ok((await axeViolations(p)).length === 0, 'ticket page axe 0');
  await p.getByRole('button', { name: /Let them in/ }).click();
  await p.getByText('Checked in. Welcome!').waitFor();
  ok(sql(`SELECT status FROM expo_registrations WHERE id=${rid}`) === 'attended', 'letting them in marks the registration attended');
  r = await fetch(BASE + '/api/admin/tickets/check', { method: 'POST', headers: H(u.aT), body: JSON.stringify({ code: ticketCode(rid) }) }); jj = await r.json();
  ok(r.status === 409 && jj.code === 'already_checked_in', 'scanning again says it was already used', jj);
  r = await fetch(BASE + '/api/admin/tickets/check', { method: 'POST', headers: H(u.aT), body: JSON.stringify({ code: ticketCode(reg(ne, show, 'approved')) }) }); jj = await r.json();
  ok(r.status === 409 && jj.code === 'not_confirmed', 'a registration that has not confirmed is not let in', jj);
  for (const loc of ['ru', 'zh']) { await p.goto(BASE + `/${loc}/admin/ticket-check`, { waitUntil: 'networkidle' }); ok((await axeViolations(p)).length === 0, `${loc}: axe 0`); }
  await c.close();

  console.log('\n== travel pack');
  const tp = await mkBuyer('tp');
  const trav = await mkExpo('travel', { from: 30 });
  reg(tp, trav, 'approved', { approved_at: 'UTC_TIMESTAMP()', confirm_by: `'${day(10)}'` });
  [c, p] = await open(tp.t);
  await p.goto(BASE + `/en/exhibitions/${trav.slug}`, { waitUntil: 'networkidle' });
  await p.getByTestId('travel-pack').waitFor();
  ok(await p.getByRole('link', { name: 'See hotels' }).getAttribute('href').then((x) => x.endsWith(`/exhibitions/${trav.slug}/hotels`)), 'hotels link to the exhibition\'s hotel page');
  ok(await p.getByRole('link', { name: 'Plan my trip' }).getAttribute('href').then((x) => x.includes('plan-business-trip') && x.includes(trav.slug)), 'tours link to trip planning for this exhibition');
  await p.getByRole('button', { name: 'Request a pickup' }).click();
  const tpk = p.getByTestId('travel-pack');
  await tpk.getByLabel('Arrival date').fill(day(29));
  await tpk.getByLabel('Number of travelers').fill('2');
  await tpk.getByLabel('Flight number, arrival time or other details').fill('CA123 14:30');
  await tpk.getByLabel(/WhatsApp or phone/).fill('+7 900 111 22 33');
  ok((await axeViolations(p)).length === 0, 'the pickup form: axe 0');
  await p.getByRole('button', { name: 'Send request' }).click();
  await p.getByText('Request sent. We will contact you about your pickup.').waitFor();
  const inq = sql(`SELECT CONCAT(user_id,'|',needs,'|',exhibition_slug,'|',arrival_date,'|',travelers,'|',whatsapp) FROM business_trip_inquiries WHERE user_id=${tp.id} ORDER BY id DESC LIMIT 1`);
  ok(inq.startsWith(`${tp.id}|`) && inq.includes('airportTransfer') && inq.includes(trav.slug) && inq.includes(day(29)) && inq.includes('|2|') && inq.includes('+7 900 111 22 33'), 'the request reaches the team as an airport-transfer inquiry', inq);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no sideways overflow at 375px');
  for (const loc of ['ru', 'zh']) { await p.goto(BASE + `/${loc}/exhibitions/${trav.slug}`, { waitUntil: 'networkidle' }); await p.getByTestId('travel-pack').waitFor(); ok((await axeViolations(p)).length === 0, `${loc}: axe 0`); }
  sql(`UPDATE expo_registrations SET status='pending' WHERE exhibition_id=${trav.id} AND user_id=${tp.id}`);
  await p.goto(BASE + `/en/exhibitions/${trav.slug}`, { waitUntil: 'networkidle' });
  await p.getByTestId('registration-timeline').waitFor();
  ok((await p.getByTestId('travel-pack').count()) === 0, 'a registration still waiting for review has no travel pack');
  await c.close();

  console.log('\n== group registration');
  const gi = await mkBuyer('gi'), colleague = await mkBuyer('col'), regd = await mkBuyer('regd');
  const grp = await mkExpo('group', { from: 30 });
  const rg = reg(gi, grp, 'pending'); reg(regd, grp, 'pending');
  const inv = (t, id, emails) => fetch(BASE + `/api/expo-registrations/${id}/invites`, { method: 'POST', headers: H(t), body: JSON.stringify({ emails }) });
  ok((await fetch(BASE + `/api/expo-registrations/${rg}/invites`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip() }, body: '{}' })).status === 401, 'signed out: refused');
  ok((await inv(colleague.t, rg, 'x@example.com')).status === 404, 'someone else\'s registration: not found');
  r = await inv(gi.t, rg, 'not an address'); jj = await r.json();
  ok(r.status === 400 && jj.code === 'no_valid_emails' && jj.invalid.length === 1, 'nothing valid is refused, and the bad entry is named', jj);
  r = await inv(gi.t, rg, Array.from({ length: 11 }, (_, i) => `many${i}-${st}@example.com`).join('\n')); jj = await r.json();
  ok(r.status === 400 && jj.code === 'too_many', 'more than ten at a time is refused', jj);
  const brandNew = `new-${st}@example.com`;
  const m1 = mail.messages.length;
  r = await inv(gi.t, rg, `${colleague.email}\nIvan Lee <${brandNew}>, ${regd.email}; broken@, ${gi.email}, ${brandNew}`); jj = await r.json();
  const outc = Object.fromEntries(jj.results.map((x) => [x.email, x.outcome]));
  ok(r.status === 200 && outc[colleague.email] === 'invited' && outc[brandNew] === 'invited' && outc[regd.email] === 'already_registered', 'an existing account, a new address and an already-registered colleague are told apart', outc);
  ok(jj.results.length === 3 && !outc[gi.email] && jj.invalid.length === 1, 'your own address and duplicates are ignored, broken ones reported', jj);
  ok(Number(sql(`SELECT COUNT(*) FROM group_invites WHERE inviter_id=${gi.id} AND exhibition_id=${grp.id}`)) === 2, 'two invitations are stored');
  for (let i = 0; i < 40 && mail.messages.length < m1 + 2; i++) await sleep(150);
  await sleep(300);
  const sent = mail.messages.slice(m1).map((m) => ({ to: m.to.join(), d: smtp.decode(m.raw), p: smtp.parts(m.raw) }));
  const toNew = sent.find((m) => m.to.includes(brandNew)), toCol = sent.find((m) => m.to.includes(colleague.email));
  ok(toNew && /invited you to register/.test(toNew.d.subject) && toNew.p.text.includes(grp.title) && toNew.p.text.includes(`/exhibitions/${grp.slug}/register`) && toNew.p.text.includes('Extra gi'), 'an address with no account gets an e-mail with the link and who invited them', toNew && toNew.d.subject);
  ok(toCol, 'the colleague with an account is e-mailed too');
  ok(notes(colleague, 'groupInvite').length === 1 && notes(colleague, 'groupInvite')[0].expo === grp.title, 'and sees a notice on the website', notes(colleague, 'groupInvite'));
  ok(!sent.some((m) => m.to.includes(regd.email)), 'the one already registered is not bothered');
  r = await inv(gi.t, rg, brandNew); jj = await r.json();
  ok(jj.results[0].outcome === 'already_invited', 'inviting the same person again says so', jj);
  await sleep(500); ok(mail.messages.slice(m1).filter((m) => m.to.join().includes(brandNew)).length === 1, 'and sends nothing');
  r = await fetch(BASE + `/api/expo-registrations/${rg}/invites`, { headers: H(gi.t) }); jj = await r.json();
  ok(jj.invites.length === 2 && jj.invites.every((x) => x.status === 'invited'), 'the list shows both as invited', jj.invites);
  reg(colleague, grp, 'approved', { approved_at: 'UTC_TIMESTAMP()' });
  r = await fetch(BASE + `/api/expo-registrations/${rg}/invites`, { headers: H(gi.t) }); jj = await r.json();
  ok(jj.invites.find((x) => x.email === colleague.email).status === 'approved' && jj.invites.find((x) => x.email === brandNew).status === 'invited', 'once the colleague registers the list shows how far they are');
  await db.query('UPDATE exhibitions SET registration_enabled=0 WHERE id=?', [grp.id]);
  r = await inv(gi.t, rg, 'late@example.com'); jj = await r.json();
  ok(r.status === 409 && jj.code === 'registration_closed', 'when registration is closed no more invitations go out', jj);
  await db.query('UPDATE exhibitions SET registration_enabled=1 WHERE id=?', [grp.id]);
  [c, p] = await open(gi.t);
  await p.goto(BASE + `/en/exhibitions/${grp.slug}`, { waitUntil: 'networkidle' });
  await p.getByRole('button', { name: 'Invite colleagues' }).click();
  await p.getByLabel("Colleagues' e-mail addresses").fill(`ui-${st}@example.com, nonsense`);
  await p.getByRole('button', { name: 'Send invitations' }).click();
  await p.getByText('invitation sent').waitFor();
  ok(await p.getByText('not a valid e-mail address').isVisible(), 'the screen reports who was invited and what was not an address');
  ok(await p.getByText('Invited colleagues (3)').isVisible(), 'and lists the invited colleagues');
  ok((await p.getByLabel('Registration link to share').inputValue()).endsWith(`/exhibitions/${grp.slug}/register`), 'with a link to share by hand');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no sideways overflow at 375px');
  ok((await axeViolations(p)).length === 0, 'axe 0');
  for (const loc of ['ru', 'zh']) { await p.goto(BASE + `/${loc}/exhibitions/${grp.slug}`, { waitUntil: 'networkidle' }); await p.getByTestId('group-invite').waitFor(); ok((await axeViolations(p)).length === 0, `${loc}: axe 0`); }
  await c.close();

  await mail.close(); await br.close(); await db.end();
  sql(`DELETE FROM exhibition_favorites WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'rx-%-${st}@test.invalid')`);
  sql(`DELETE FROM business_trip_inquiries WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'rx-%-${st}@test.invalid')`);
  sql(`DELETE FROM expo_registrations WHERE exhibition_id IN (SELECT id FROM exhibitions WHERE slug LIKE 'rx-%-${st}')`);
  sql(`DELETE FROM exhibitions WHERE slug LIKE 'rx-%-${st}'`);
  sql(`DELETE FROM users WHERE email LIKE 'rx-%-${st}@test.invalid'`);
  done();
})().catch((e) => { console.error(e); process.exit(1); });
