// Importing buyers from a collection-form Excel file: rows with their columns in another order are read by the look of their values;
// the same person is found by buyer number, passport, phone, WeChat, then email (a different passport always means a different person);
// an existing buyer only gets empty details filled and a differing detail waits for the admin's choice; a check changes nothing.
const { BASE, sql, ok, done, mkUsers } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const ExcelJS = require('exceljs');
const bcrypt = require('bcryptjs');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const u = await mkUsers('iu');
  const tag = String(Date.now()).slice(-7);
  const pw = bcrypt.hashSync('pass1234', 10);
  const AH = { cookie: 'token=' + u.aT, 'Content-Type': 'application/json' };
  const BH = { cookie: 'token=' + u.bT, 'Content-Type': 'application/json' };
  const phone = (i) => `13${tag}${i}0`.slice(0, 11);
  const pass = (i) => `IU${tag}${i}`;
  const mail = (i) => `iu${tag}${i}@test.invalid`;
  const expo = `IU Expo ${tag}`;
  let seq = 0;
  const mk = (name, fields) => {
    const email = fields.email || `iu-own-${tag}-${++seq}@test.invalid`;
    sql(`INSERT INTO users (name,email,password_hash,role,country) VALUES ('${name}','${email}','${pw}','buyer','')`);
    const id = Number(sql(`SELECT id FROM users WHERE email='${email}'`));
    const cols = { passport_number: fields.passport || '', phone_number: fields.phone || '', wechat_id: fields.wechat || '', company_name: fields.company || '', job_title: fields.job || '', gender: fields.gender || '', date_of_birth: fields.dob || '', nationality: fields.nationality || '' };
    sql(`INSERT INTO buyer_profiles (user_id,${Object.keys(cols).join(',')}) VALUES (${id},${Object.values(cols).map((v) => `'${v}'`).join(',')})`);
    return id;
  };
  const profile = (id, col) => sql(`SELECT ${col} FROM buyer_profiles WHERE user_id=${id}`);
  const users = (where) => Number(sql(`SELECT COUNT(*) FROM users WHERE ${where}`));
  const call = (mode, buyers) => fetch(BASE + '/api/admin/buyers/import', { method: 'POST', headers: AH, body: JSON.stringify({ mode, buyers }) }).then((r) => r.json());

  // ---- 1. the Excel file, with two ordinary rows and one in a different column order
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(expo);
  ws.addRow(['序号', 'Passport Name', 'Passport No.', 'Visa type', 'Phone', 'WeChat', 'Email', 'Gender', 'Date of birth', 'Nationality', 'Company', 'Position', 'Products']);
  ws.addRow([1, 'Anna Newcomer', pass(1), 'Work or Business Visa', phone(1), `anna${tag}`, mail(1), 'female', '1978年02月', 'Russia', 'Anna Trading', 'Manager', 'Furniture']);
  ws.addRow([2, 'Boris Ordinary', pass(2), 'Other non-Student visa', phone(2), `boris${tag}`, mail(2), 'male', '1985-07-15', 'Russia', 'Boris LLC', 'CEO', 'Lamps']);
  // our own buyer number first, everything else one place to the right, the visa type last
  ws.addRow([3, 'TUE0166', 'DMITRY GVOZDENSKIY', pass(3), `dige${tag}`, phone(3), mail(3), 'male', '1979年11月', 'Russia', 'MEBELTORG LTD', 'CEO', 'Other non-Student visa']);
  const xlsxPath = path.join(os.tmpdir(), `iu-${tag}.xlsx`);
  await wb.xlsx.writeFile(xlsxPath);
  const xlsx = fs.readFileSync(xlsxPath);

  console.log('\n== reading the Excel file');
  const form = () => { const f = new FormData(); f.append('files', new Blob([xlsx]), 'cosm.xlsx'); return f; };
  ok((await fetch(BASE + '/api/admin/buyers/parse-sheets', { method: 'POST', headers: { cookie: 'token=' + u.bT }, body: form() })).status === 401, 'a buyer cannot read a file');
  const parsed = await (await fetch(BASE + '/api/admin/buyers/parse-sheets', { method: 'POST', headers: { cookie: 'token=' + u.aT }, body: form() })).json();
  ok(parsed.buyers?.length === 3, 'three people are read', parsed.buyers?.length ?? parsed);
  const dm = parsed.buyers.find((b) => b.passportNumber === pass(3));
  ok(dm && dm.name === 'DMITRY GVOZDENSKIY' && dm.phone === phone(3) && dm.wechatId === `dige${tag}` && dm.email === mail(3), 'the row in another column order is read correctly', dm);
  ok(dm.buyerNumber === 'TUE0166' && dm.visaType === 'Other non-Student visa' && dm.dateOfBirth === '1979-11-01', 'its buyer number, visa and birth date are in the right places', dm);
  ok(parsed.repaired.length === 1 && parsed.repaired[0].buyerNumber === 'TUE0166', 'the corrected row is listed to look at', parsed.repaired);
  const an = parsed.buyers.find((b) => b.passportNumber === pass(1));
  ok(an.dateOfBirth === '1978-02-01' && an.dateOfBirthApproximate === 'yes', 'a birth date with only a month becomes day 1 and is marked approximate', an);
  ok(parsed.buyers.find((b) => b.passportNumber === pass(2)).dateOfBirth === '1985-07-15', 'a full birth date stays as it is');

  // ---- 2. who is who
  console.log('\n== finding the same person');
  const e1 = mk('Existing One', { passport: pass(11), phone: phone(11), wechat: `wx${tag}11`, email: mail(11), company: 'Old Co', gender: 'female', dob: '1990-05-01', nationality: 'Russia' });
  const e2 = mk('Existing Two', { passport: pass(12), phone: phone(12), wechat: `wx${tag}12`, company: '' });
  const e3 = mk('Existing Three', { passport: pass(13), phone: phone(13), wechat: `wx${tag}13` });
  const e4 = mk('Existing Four', { passport: pass(14), phone: phone(14), wechat: `wx${tag}14` });
  const e5 = mk('Existing Five', { passport: pass(15), phone: phone(15), wechat: `wx${tag}15`, email: mail(15) });
  const n1 = 700000 + Math.floor(Math.random() * 99000);
  sql(`UPDATE users SET buyer_no=${n1} WHERE id=${e5}`);
  const base = { password: 'pass1234', expos: [expo] };
  const resp = await call('check', [
    { ...base, row: 1, name: 'Existing One', passportNumber: pass(11).toLowerCase(), email: mail(91), jobTitle: 'Director', companyName: 'New Co', gender: 'female', dateOfBirth: '1990-05-20', dateOfBirthApproximate: 'yes', nationality: 'russia' },
    { ...base, row: 2, name: 'Existing Two', phone: `+86 ${phone(12)}`, companyName: 'Two Co' },
    { ...base, row: 3, name: 'Existing Three', wechatId: `WX${tag}13`.toUpperCase(), jobTitle: 'Buyer' },
    { ...base, row: 4, name: 'Existing Four', email: mail(15), passportNumber: pass(14) },
    { ...base, row: 5, name: 'Existing Five', buyerNumber: 'TUE' + n1, jobTitle: 'Owner' },
    { ...base, row: 6, name: 'Twin Of One', phone: phone(11), passportNumber: pass(16), email: mail(96) },
    { ...base, row: 7, name: 'Brand New', passportNumber: pass(17), email: mail(97) },
  ]);
  const r = (n) => resp.results.find((x) => x.row === n);
  ok(r(1).matchedBy === 'passport' && r(1).status === 'updated', 'found by passport number, capitals and spaces do not matter', r(1));
  ok(r(1).fills.map((f) => f.field).sort().join() === 'contactEmail,jobTitle', 'only the empty details are filled (a job title and a contact email)', r(1).fills);
  ok(r(1).conflicts.map((f) => f.field).join() === 'companyName', 'a company that differs is a conflict; the same gender, nationality and birth month are not', r(1).conflicts);
  ok(r(2).matchedBy === 'phone' && r(2).fills.some((f) => f.field === 'companyName'), 'found by phone number (with +86 and spaces); an empty company is filled', r(2));
  ok(r(3).matchedBy === 'wechat' && r(3).fills.some((f) => f.field === 'jobTitle'), 'found by WeChat ID, capitals do not matter', r(3));
  ok(r(4).matchedBy === 'passport', 'the passport is looked at before the email', r(4));
  ok(r(5).matchedBy === 'buyerNumber' && r(5).status === 'updated', 'found by our own buyer number', r(5));
  ok(r(6).status === 'created' && !r(6).matchedBy, 'someone sharing only a phone number but with another passport is a new person', r(6));
  ok(r(7).status === 'created', 'a stranger is new', r(7));
  ok(profile(e1, 'job_title') === '' && profile(e1, 'company_name') === 'Old Co' && users(`email='${mail(97)}'`) === 0, 'a check changes nothing and creates no one');
  ok(Number(sql(`SELECT COUNT(*) FROM buyer_expos WHERE name='${expo}'`)) === 0, 'a check does not create the expo');

  console.log('\n== saving');
  const useNew = [{ ...base, row: 1, name: 'Existing One', passportNumber: pass(11), email: mail(91), jobTitle: 'Director', companyName: 'New Co', useNew: ['companyName', 'notAField'] }];
  const keep = [{ ...base, row: 1, name: 'Existing One', passportNumber: pass(11), email: mail(91), jobTitle: 'Director', companyName: 'New Co' }];
  const a1 = await call('apply', keep);
  ok(a1.results[0].status === 'updated' && profile(e1, 'job_title') === 'Director' && profile(e1, 'contact_email') === mail(91), 'empty details are filled');
  ok(profile(e1, 'company_name') === 'Old Co', 'a saved company is not replaced unless chosen');
  ok(Number(sql(`SELECT COUNT(*) FROM buyer_expos WHERE name='${expo}'`)) === 1 && Number(sql(`SELECT COUNT(*) FROM buyer_profile_expos l JOIN buyer_expos e ON e.id=l.expo_id WHERE l.user_id=${e1} AND e.name='${expo}'`)) === 1, 'the expo is added');
  const a2 = await call('apply', useNew);
  ok(profile(e1, 'company_name') === 'New Co' && a2.results[0].used.join() === 'companyName', 'a conflict the admin chose is replaced');
  const a3 = await call('apply', keep.map((k) => ({ ...k, companyName: 'New Co' })));
  ok(a3.results[0].status === 'already_registered', 'running it again changes nothing', a3.results[0]);
  const a4 = await call('apply', [{ ...base, row: 6, name: 'Twin Of One', phone: phone(11), passportNumber: pass(16), email: mail(96) }]);
  ok(a4.results[0].status === 'created' && users(`email='${mail(96)}'`) === 1 && profile(e1, 'passport_number') === pass(11), 'the twin gets their own account and the first person keeps their passport', a4.results[0]);
  const a5 = await call('apply', [{ ...base, row: 8, name: 'Twin Two', phone: phone(11), passportNumber: pass(18), email: mail(96) }]);
  ok(a5.results[0].status === 'created' && users(`email LIKE 'passport-${pass(18).toLowerCase()}@%'`) === 1, 'an inbox someone else uses is kept as a contact email only; they sign in by passport', a5.results[0]);
  const b = await call('apply', [{ ...base, row: 1, name: 'Existing Two', phone: phone(12), companyName: 'Two Co', dateOfBirth: '1985-03-01' }]);
  ok(b.results[0].status === 'updated' && profile(e2, 'company_name') === 'Two Co', 'filling by phone number works');
  const refine = await call('check', [{ ...base, row: 1, name: 'Existing One', passportNumber: pass(11), dateOfBirth: '1990-05-20' }]);
  ok(refine.results[0].fills.some((f) => f.field === 'dateOfBirth') && refine.results[0].conflicts.length === 0, 'a birth date saved as day 1 is made exact when the file has the real day', refine.results[0]);
  const blockedStaff = await call('check', [{ ...base, row: 1, name: 'Admin Person', email: u.m.a }]);
  ok(blockedStaff.results[0].status === 'failed' && /admin/.test(blockedStaff.results[0].reason), 'a staff account is never touched', blockedStaff.results[0]);
  ok((await fetch(BASE + '/api/admin/buyers/import', { method: 'POST', headers: BH, body: JSON.stringify({ mode: 'check', buyers: [{ name: 'x' }] }) })).status === 401, 'a buyer cannot import');
  void e3; void e4;

  // ---- 3. the page
  console.log('\n== the page');
  const browser = await launch();
  for (const locale of ['en', 'ru', 'zh']) {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } });
    await ctx.addCookies([{ name: 'token', value: u.aT, url: BASE }]);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/${locale}/admin/users/import-buyers`, { waitUntil: 'domcontentloaded' });
    await page.locator('#import-excel').waitFor();
    // the file holds one existing buyer (e1) whose company differs, plus new people
    const wb2 = new ExcelJS.Workbook();
    const w2 = wb2.addWorksheet(`UI ${locale} ${tag}`);
    w2.addRow(['Passport Name', 'Passport No.', 'Phone', 'Email', 'Company', 'Position']);
    w2.addRow(['Existing One', pass(11), phone(11), mail(91), `Brand ${locale}`, 'Director']);
    w2.addRow([`Fresh ${locale}`, `IU${tag}${locale}`.slice(0, 14), `13${tag}${locale === 'en' ? 5 : locale === 'ru' ? 6 : 7}0`.slice(0, 11), `ui${locale}${tag}@test.invalid`, 'Fresh Co', 'Boss']);
    const p2 = path.join(os.tmpdir(), `iu-ui-${locale}-${tag}.xlsx`);
    await wb2.xlsx.writeFile(p2);
    await page.locator('#import-excel').setInputFiles(p2);
    await page.getByTestId('import-check').or(page.getByRole('button', { name: /^(Check the file|Проверить файл|检查文件)$/ })).first().waitFor();
    const checkBtn = page.getByRole('button', { name: /^(Check the file|Проверить файл|检查文件)$/ });
    await checkBtn.waitFor();
    const importBtn = page.getByRole('button', { name: /(Import|Импорт|导入)/ }).last();
    ok(await importBtn.isDisabled(), `${locale}: importing waits for the check`);
    await checkBtn.click();
    await page.getByTestId('import-check').waitFor();
    const summary = await page.getByTestId('import-check').innerText();
    ok(!/[{}]/.test(summary) && /1/.test(summary), `${locale}: the check says what will happen`, summary);
    ok(await importBtn.isEnabled(), `${locale}: importing is possible after the check`);
    await page.getByRole('button', { name: /(Review|Проверить людей|查看)/ }).click();
    const dlg = page.getByTestId('import-review');
    await dlg.waitFor();
    const saved = profile(e1, 'company_name');
    ok((await dlg.innerText()).includes(`Brand ${locale}`) && (await dlg.innerText()).includes(saved), `${locale}: the window shows the saved and the file's value`, saved);
    ok(await page.getByTestId('import-review-close').evaluate((el) => el === document.activeElement), `${locale}: focus moves into the window`);
    await dlg.getByRole('radio').nth(1).check();
    await page.mouse.move(0, 0);
    await sleep(700);
    ok((await axeViolations(page)).length === 0, `${locale}: no accessibility problems in the window`, await axeViolations(page));
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${locale}: no sideways scrolling at 375px`);
    await page.keyboard.press('Escape');
    await dlg.waitFor({ state: 'detached' });
    await importBtn.click();
    await page.getByText(/Fresh/).first().waitFor();
    await sleep(500);
    if (locale === 'en') {
      ok(profile(e1, 'company_name') === `Brand ${locale}`, 'the file\'s company was used because it was chosen in the window');
    }
    const after = await axeViolations(page);
    ok(after.length === 0, `${locale}: no accessibility problems after importing`, after);
    await ctx.close();
  }
  await browser.close();
  fs.rmSync(xlsxPath, { force: true });
  done();
})().catch((e) => { console.error(e); process.exit(1); });
