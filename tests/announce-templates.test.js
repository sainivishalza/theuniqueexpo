// Announcement fields ({name}, {number}, {exhibition}) filled per reader, and saved texts ("templates").
const bcrypt = require('bcryptjs');
const { BASE, sql, ok, done, mkUsers, connect } = require('./helpers/common.js');
const smtp = require('./helpers/fake-smtp.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.21.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const H = (t, extra = {}) => ({ 'Content-Type': 'application/json', cookie: 'token=' + t, 'x-forwarded-for': ipn(), ...extra });

(async () => {
  sql('DELETE FROM mail_settings');
  const db = await connect();
  const u = await mkUsers('at');
  const srv = await smtp.start(2535);
  const settings = { enabled: true, host: '127.0.0.1', port: 2535, secure: false, username: 'm', password: 'x', fromName: 'The Unique Expo', fromEmail: 'noreply@theuniqueexpo.test' };
  const put = (b) => fetch(BASE + '/api/admin/email', { method: 'PUT', headers: H(u.aT), body: JSON.stringify(b) });
  await put(settings); await sleep(200);
  const st = Date.now(), h = bcrypt.hashSync('pass1234', 10);
  const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const mk = (tag, locale, name, buyerNo) => {
    const e = `at-${tag}-${st}@test.invalid`;
    sql(`INSERT INTO users (name,email,password_hash,role,country,preferred_locale) VALUES ('${name}','${e}','${h}','buyer','',${locale ? `'${locale}'` : 'NULL'})`);
    const id = Number(sql(`SELECT id FROM users WHERE email='${e}'`));
    if (buyerNo) sql(`UPDATE users SET buyer_no=${buyerNo} WHERE id=${id}`);
    return { id, email: e, name };
  };
  const mkExpo = async (tag, from) => { const slug = `at-${tag}-${st}`; await db.query('INSERT INTO exhibitions (slug,title,start_date,end_date,registration_enabled) VALUES (?,?,?,?,1)', [slug, `Fields Expo ${tag} ${st}`, day(from), day(from + 2)]); const [[r]] = await db.query('SELECT id FROM exhibitions WHERE slug=?', [slug]); return { id: r.id, title: `Fields Expo ${tag} ${st}` }; };
  const reg = (b, x, status) => sql(`INSERT INTO expo_registrations (exhibition_id,user_id,status) VALUES (${x.id},${b.id},'${status}')`);
  const soon = await mkExpo('soon', 20), later = await mkExpo('later', 60), over = await mkExpo('over', -10);
  const anna = mk('a', null, 'Anna', 900000 + (st % 90000)), boris = mk('b', 'ru', 'Борис'), chen = mk('c', 'zh', 'Chen'), eve = mk('e', null, 'Eve <b>X</b> & Co');
  sql(`UPDATE users SET name=CONCAT(name, CHAR(10), 'Bcc: x@y.z') WHERE id=${eve.id}`);
  reg(anna, later, 'approved'); reg(anna, soon, 'pending'); reg(anna, over, 'confirmed');   // the soonest still to come is "soon"
  reg(chen, soon, 'cancelled'); reg(chen, later, 'confirmed'); reg(boris, over, 'attended');  // chen: cancelled one is skipped; boris: only a past one
  const buyerNo = (b) => sql(`SELECT CONCAT('TUE', buyer_no) FROM users WHERE id=${b.id}`);
  const send = (body, t = u.aT) => fetch(BASE + '/api/admin/buyer-profiles/announce', { method: 'POST', headers: H(t), body: JSON.stringify(body) });

  console.log('\n== saved texts: the API');
  const tpl = (body, t = u.aT) => fetch(BASE + '/api/admin/announcement-templates', { method: 'POST', headers: H(t), body: JSON.stringify(body) });
  const langs = (en, ru = '', zh = '') => ({ en, ru, zh });
  let r = await fetch(BASE + '/api/admin/announcement-templates', { headers: H(u.bT) }); ok(r.status === 401, 'a buyer cannot read them');
  r = await tpl({ name: 'x', subject: langs('Hello there'), message: langs('A message') }, u.bT); ok(r.status === 401, 'nor save one');
  r = await tpl({ name: '   ', subject: langs('Hello there'), message: langs('A message') }); ok(r.status === 400 && (await r.json()).code === 'bad_name', 'a blank name is refused');
  r = await tpl({ name: 'n'.repeat(101), subject: langs('Hello there'), message: langs('A message') }); ok(r.status === 400, 'a 101-character name is refused');
  r = await tpl({ name: `T ${st}`, subject: langs('Hi'), message: langs('A message') }); ok(r.status === 400 && (await r.json()).code === 'english_required', 'English is required, like for an announcement');
  r = await tpl({ name: `T ${st}`, subject: langs('x'.repeat(151)), message: langs('A message') }); ok(r.status === 400 && (await r.json()).code === 'too_long', 'a subject over 150 characters is refused');
  r = await tpl({ name: `T ${st}`, subject: langs('Line\nbreak'), message: langs('A message') }); ok(r.status === 400, 'a subject with a line break is refused');
  r = await tpl({ name: `T ${st}`, subject: { en: 5 }, message: langs('A message') }); ok(r.status === 400, 'a wrong type is refused');
  r = await tpl({ name: `  T   ${st}  `, subject: langs('Hello {name}', 'Привет {name}', '你好 {name}'), message: langs('Your number is {number}', 'Ваш номер {number}', '您的编号 {number}') }); let j = await r.json();
  ok(r.status === 200 && j.replaced === false && j.templates.some((x) => x.name === `T ${st}`), 'a text is saved (spaces tidied) in all three languages', j.templates && j.templates.map((x) => x.name));
  const saved = j.templates.find((x) => x.name === `T ${st}`);
  ok(saved.subject.ru === 'Привет {name}' && saved.message.zh === '您的编号 {number}', 'the fields are kept as typed, not filled in');
  r = await tpl({ name: `T ${st}`, subject: langs('Hello again {name}'), message: langs('Changed message') }); j = await r.json();
  ok(j.replaced === true && j.id === saved.id && j.templates.filter((x) => x.name === `T ${st}`).length === 1, 'the same name replaces it (one stays)');
  ok(j.templates.find((x) => x.id === saved.id).subject.ru === '', 'the replacement is the whole new text');
  r = await fetch(BASE + `/api/admin/announcement-templates?id=${saved.id}`, { method: 'DELETE', headers: H(u.bT) }); ok(r.status === 401, 'a buyer cannot delete one');
  r = await fetch(BASE + `/api/admin/announcement-templates?id=${saved.id}`, { method: 'DELETE', headers: H(u.aT) }); j = await r.json(); ok(r.status === 200 && !j.templates.some((x) => x.id === saved.id), 'deleting removes it');
  r = await fetch(BASE + `/api/admin/announcement-templates?id=${saved.id}`, { method: 'DELETE', headers: H(u.aT) }); ok(r.status === 404, 'deleting it again: not found');
  r = await fetch(BASE + '/api/admin/announcement-templates?id=abc', { method: 'DELETE', headers: H(u.aT) }); ok(r.status === 404, 'a bad id: not found');
  ok(Number(sql("SELECT COUNT(*) FROM admin_audit_log WHERE action IN ('announcement_template_saved','announcement_template_deleted')")) >= 3, 'saving and deleting are in the activity log');

  console.log('\n== the preview sample');
  r = await fetch(BASE + '/api/admin/buyer-profiles/announce/sample', { method: 'POST', headers: H(u.bT), body: JSON.stringify({ userIds: [anna.id] }) }); ok(r.status === 401, 'a buyer cannot ask');
  r = await fetch(BASE + '/api/admin/buyer-profiles/announce/sample', { method: 'POST', headers: H(u.aT), body: JSON.stringify({ userIds: [] }) }); ok(r.status === 400, 'no buyer: refused');
  r = await fetch(BASE + '/api/admin/buyer-profiles/announce/sample', { method: 'POST', headers: H(u.aT), body: JSON.stringify({ userIds: [anna.id, boris.id] }) }); j = await r.json();
  ok(j.values.en.name === 'Anna' && j.values.en.number === buyerNo(anna) && j.values.en.exhibition === soon.title, 'the first buyer\'s values: name, number and the soonest exhibition still to come', j.values);
  ok(j.values.ru.exhibition === soon.title, 'in each language');

  console.log('\n== fields are filled for each reader');
  const texts = {
    subject: { en: 'Hello {name}, news on {exhibition}', ru: 'Здравствуйте, {name}!', zh: '{name}，您好' },
    message: { en: 'Hi {name}.\nYour number is {number}.\nSee {exhibition}. Keep {foo} as is. {Name} too.', ru: 'Ваш номер {number}. Выставка: {exhibition}.', zh: '编号 {number}，展会：{exhibition}。' },
  };
  const ids = [anna, boris, chen, eve].map((x) => x.id);
  const n0 = srv.messages.length;
  r = await send({ userIds: ids, ...texts }); j = await r.json();
  ok(r.status === 200 && j.queued === 4 && j.notified === 4, 'sent to four buyers', j);
  for (let i = 0; i < 80 && srv.messages.length < n0 + 4; i++) await sleep(150);
  const got = srv.messages.slice(n0).map((m) => ({ to: m.to.join().toLowerCase(), ...smtp.decode(m.raw), p: smtp.parts(m.raw) }));
  const mail = (b) => got.find((g) => g.to.includes(b.email.toLowerCase()));
  ok(got.length === 4, 'four e-mails', got.length);
  ok(mail(anna).subject === `Hello Anna, news on ${soon.title}`, 'English: name and the soonest upcoming exhibition in the subject', mail(anna).subject);
  ok(mail(anna).p.text.includes(`Your number is ${buyerNo(anna)}.`) && mail(anna).p.text.includes(`See ${soon.title}.`), 'and in the text (number and exhibition)', mail(anna).p.text.slice(0, 400));
  ok(mail(anna).p.text.includes('{foo}') && mail(anna).p.text.includes('{Name}'), 'an unknown word in braces (or another letter case) stays as typed');
  ok(/Здравствуйте, Борис!/.test(mail(boris).subject) && mail(boris).p.text.includes('Выставка: ваша выставка.') && mail(boris).p.text.includes('Ваш номер .'), 'Russian: the name; with no upcoming exhibition "ваша выставка"; no number leaves nothing', mail(boris).p.text.slice(0, 300));
  ok(mail(chen).subject.includes('您好') && mail(chen).p.text.includes(`展会：${later.title}。`), 'Chinese: a cancelled registration is skipped, the next one still to come is used', mail(chen).p.text.slice(0, 300));
  ok(!/[\r\n]/.test(mail(eve).subject) && mail(eve).subject.includes('Eve <b>X</b> & Co Bcc: x@y.z'), 'a name with a line break is made one line (no header injection)', mail(eve).subject);
  ok(mail(eve).p.html.includes('Hi Eve &lt;b&gt;X&lt;/b&gt; &amp; Co Bcc: x@y.z.') && !/<b>X<\/b>/.test(mail(eve).p.html), 'and a name with HTML is escaped in the HTML part');
  const note = (b) => { const row = sql(`SELECT params FROM user_notifications WHERE user_id=${b.id} AND kind='announcement' ORDER BY id DESC LIMIT 1`); return row ? JSON.parse(row) : null; };
  const na = note(anna), nb = note(boris), nc = note(chen);
  ok(na && na.subject.en === `Hello Anna, news on ${soon.title}` && na.message.en.includes(buyerNo(anna)) && na.message.ru.includes(buyerNo(anna)), 'the website notice holds each buyer\'s own filled copy, in all languages', na);
  ok(nb.message.ru.includes('ваша выставка') && nb.subject.ru === 'Здравствуйте, Борис!', 'Russian reader\'s notice');
  ok(nc.message.zh.includes(later.title) && nc.subject.zh === 'Chen，您好', 'Chinese reader\'s notice');
  ok(na.message.en !== nb.message.en, 'two buyers do not share a copy');
  console.log('\n== an announcement without fields is unchanged');
  sql('UPDATE rate_limits SET hits=0');
  const n1 = srv.messages.length;
  r = await send({ userIds: [anna.id, boris.id], subject: { en: 'Plain news', ru: '', zh: '' }, message: { en: 'Nothing personal, {just braces}.', ru: '', zh: '' } }); j = await r.json();
  for (let i = 0; i < 40 && srv.messages.length < n1 + 2; i++) await sleep(150);
  ok(j.queued === 2 && srv.messages.slice(n1).every((m) => smtp.parts(m.raw).text.includes('{just braces}')), 'sent as written (braces that are not fields are left alone)');
  ok(note(anna).message.en === 'Nothing personal, {just braces}.', 'and the notice too');
  await srv.close();

  console.log('\n== the dialog');
  sql('UPDATE rate_limits SET hits=0');
  const br = await launch();
  const open = async (loc, vp, filter) => {
    const c = await br.newContext({ viewport: vp, extraHTTPHeaders: { 'x-forwarded-for': ipn() } }); await c.addCookies([{ name: 'token', value: u.aT, url: BASE }]); const p = await c.newPage();
    await p.goto(`${BASE}/${loc}/admin/buyer-profiles`, { waitUntil: 'networkidle' });
    await p.getByPlaceholder(/Search by registration no|Поиск по рег\. номеру|按注册编号/).fill(filter); await sleep(1200);
    const row = p.locator('tbody tr').filter({ hasText: filter }).first(); await row.locator('input[type=checkbox]').check();
    return [c, p];
  };
  let [c, p] = await open('en', { width: 375, height: 900 }, `at-a-${st}@test.invalid`);
  await p.getByRole('button', { name: 'Send announcement' }).click();
  const dlg = p.getByRole('dialog'); await dlg.waitFor();
  ok(await dlg.getByRole('button', { name: 'Insert {name}' }).isVisible() && await dlg.getByRole('button', { name: 'Insert {number}' }).isVisible() && await dlg.getByRole('button', { name: 'Insert {exhibition}' }).isVisible(), 'three buttons insert the fields');
  ok((await dlg.getByTestId('announce-preview').count()) === 0, 'no preview while the text has no fields');
  await dlg.getByLabel('Subject', { exact: true }).fill('News for you');
  await dlg.getByLabel('Message', { exact: true }).fill('Dear , welcome to .');
  await dlg.getByLabel('Message', { exact: true }).evaluate((el) => el.setSelectionRange(5, 5));
  await dlg.getByRole('button', { name: 'Insert {name}' }).click();
  ok((await dlg.getByLabel('Message', { exact: true }).inputValue()) === 'Dear {name}, welcome to .', 'a field goes in where the cursor is', await dlg.getByLabel('Message', { exact: true }).inputValue());
  await sleep(400); // the dialog puts the cursor after the inserted field on the next frame; do not move it before that
  await dlg.getByLabel('Message', { exact: true }).evaluate((el) => el.setSelectionRange(el.value.length - 1, el.value.length - 1));
  await dlg.getByRole('button', { name: 'Insert {exhibition}' }).click();
  ok((await dlg.getByLabel('Message', { exact: true }).inputValue()) === 'Dear {name}, welcome to {exhibition}.', 'and another after it');
  const prev = dlg.getByTestId('announce-preview'); await prev.waitFor();
  ok((await prev.innerText()).includes('Dear Anna, welcome to ' + soon.title + '.') && (await prev.innerText()).includes('(Anna)'), 'the preview shows the first selected buyer\'s own copy', await prev.innerText());
  await dlg.getByLabel('Message', { exact: true }).fill('Dear {name}, see {exibition} {nmae}.');
  ok(/\{exibition\} \{nmae\}/.test(await dlg.getByRole('alert').innerText()), 'a mistyped field is flagged before sending', await dlg.getByRole('alert').innerText());
  await dlg.getByLabel('Message', { exact: true }).fill('Dear {name}, welcome to {exhibition}. Your number: {number}.');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no sideways overflow at 375px');
  let vio = await axeViolations(p); ok(vio.length === 0, 'axe 0 with fields and preview', vio);
  // save, reopen, load, delete
  const tplName = `Welcome ${st}`;
  await dlg.getByLabel('Save this text as').fill(tplName);
  await dlg.getByRole('tab', { name: /Русский/ }).click(); await dlg.getByLabel('Subject', { exact: true }).fill('Новости'); await dlg.getByLabel('Message', { exact: true }).fill('Уважаемый {name}, ваш номер {number}.');
  await dlg.getByRole('button', { name: 'Save', exact: true }).click();
  await dlg.getByText(`Saved as “${tplName}”.`).waitFor(); ok(true, 'saving says so');
  ok(await dlg.getByLabel('Saved texts').locator('option', { hasText: tplName }).count() === 1, 'it appears in the list');
  await dlg.getByRole('button', { name: 'Save', exact: true }).click();
  await dlg.getByText(`“${tplName}” was updated.`).waitFor(); ok(true, 'saving under the same name says it was updated');
  ok(await dlg.getByLabel('Saved texts').locator('option', { hasText: tplName }).count() === 1, 'and does not add a second one');
  await c.close();
  [c, p] = await open('en', { width: 375, height: 900 }, `at-a-${st}@test.invalid`);
  await p.getByRole('button', { name: 'Send announcement' }).click();
  const d2 = p.getByRole('dialog'); await d2.waitFor();
  await d2.getByLabel('Saved texts').selectOption({ label: tplName });
  ok((await d2.getByLabel('Subject', { exact: true }).inputValue()) === 'News for you' && (await d2.getByLabel('Message', { exact: true }).inputValue()).includes('{exhibition}'), 'a new dialog loads the saved English text');
  await d2.getByRole('tab', { name: /Русский/ }).click();
  ok((await d2.getByLabel('Message', { exact: true }).inputValue()) === 'Уважаемый {name}, ваш номер {number}.', 'and the Russian text');
  ok((await d2.getByLabel('Save this text as').inputValue()) === tplName, 'the name is ready for a change and a new save');
  await d2.getByRole('button', { name: 'Delete this text' }).click();
  ok(await d2.getByText('Delete it for good?').isVisible(), 'deleting asks first');
  vio = await axeViolations(p); ok(vio.length === 0, 'axe 0 while asking', vio);
  await d2.getByRole('button', { name: 'Keep it' }).click();
  ok(await d2.getByLabel('Saved texts').locator('option', { hasText: tplName }).count() === 1, '"Keep it" keeps it');
  await d2.getByRole('button', { name: 'Delete this text' }).click(); await d2.getByRole('button', { name: 'Yes, delete' }).click();
  await d2.getByText('The saved text was deleted.').waitFor();
  ok(await d2.getByLabel('Saved texts').locator('option', { hasText: tplName }).count() === 0, 'it is gone from the list');
  ok(Number(sql(`SELECT COUNT(*) FROM announcement_templates WHERE name='${tplName}'`)) === 0, 'and from the database');
  await c.close();
  for (const [loc, btn, tab] of [['ru', 'Отправить объявление', 'Сохранённые тексты'], ['zh', '发送公告', '已保存的文本']]) {
    [c, p] = await open(loc, { width: 375, height: 900 }, `at-a-${st}@test.invalid`);
    await p.getByRole('button', { name: btn }).click(); const dl = p.getByRole('dialog'); await dl.waitFor();
    ok(await dl.getByLabel(tab).isVisible(), `${loc}: the saved-texts list is translated`);
    await dl.getByRole('textbox').nth(1).fill(loc === 'ru' ? 'Здравствуйте {name}' : '你好 {name}');
    vio = await axeViolations(p); ok(vio.length === 0, `${loc}: axe 0`, vio);
    await c.close();
  }
  await br.close(); await db.end();
  sql(`DELETE FROM announcement_templates WHERE name LIKE '%${st}%'`);
  sql(`DELETE FROM expo_registrations WHERE exhibition_id IN (SELECT id FROM exhibitions WHERE slug LIKE 'at-%-${st}')`);
  sql(`DELETE FROM exhibitions WHERE slug LIKE 'at-%-${st}'`);
  sql(`DELETE FROM users WHERE email LIKE 'at-%-${st}@test.invalid'`);
  done();
})().catch((e) => { console.error(e); process.exit(1); });
