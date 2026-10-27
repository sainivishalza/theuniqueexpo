// Importing the ZIP of pictures together with the Excel file: pictures whose file names differ go straight to the column's document;
// pictures with the same name are sorted by what is written on them; a saved (verified) picture is kept unless the admin ticks
// "replace"; the ZIP is opened in the browser and only the chosen pictures are saved. Made-up documents only.
const { BASE, sql, ok, done, mkUsers } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const { draw, SIZES } = require('./helpers/synthetic-pictures.js');
const ExcelJS = require('exceljs');
const JSZip = require('jszip');
const sharp = require('sharp');
const bcrypt = require('bcryptjs');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const KINDS = ['passportFront', 'visaPage', 'businessCard', 'cantonFairCard', 'buyerPhoto'];
const COLUMN = { passportFront: 'doc_passport_front', visaPage: 'doc_visa_page', businessCard: 'doc_business_card', cantonFairCard: 'doc_canton_fair_card', buyerPhoto: 'doc_buyer_photo' };

(async () => {
  const u = await mkUsers('ip');
  const tag = String(Date.now()).slice(-7);
  const AH = { cookie: 'token=' + u.aT };
  const who = (given, surname, n) => ({ given, surname, passport: `PX${tag}${n}`, email: `ip${tag}${n}@test.invalid`, wechat: `wx${tag}${n}`, country: 'Utopia' });
  const amy = who('AMY', 'AMBIGUOUS', 1), ben = who('BEN', 'DIRECT', 2), cara = who('CARA', 'EXISTING', 3), dan = who('DAN', 'NOPICS', 4);
  const phone = (n) => `13${tag}${n}0`.slice(0, 11);
  const stamp = { amy: '2026-10-10 10.00.00', ben: '2026-10-10 11.00.00', cara: '2026-10-10 12.00.00', dan: '2026-10-10 13.00.00' };

  // ---- the ZIP
  const zip = new JSZip();
  const add = (name, data, store = false) => zip.file(name, data, { compression: store ? 'STORE' : 'DEFLATE' });
  // Amy uploaded five pictures that all arrived named "picture-0_01.png": the ZIP keeps them as picture-0_01.png and picture-0_01（1）.png ... in upload order.
  const amyOrder = ['businessCard', 'passportFront', 'buyerPhoto', 'visaPage', 'cantonFairCard'];
  const amySub = 'Amy 艾米';
  for (let i = 0; i < amyOrder.length; i++) {
    add(`pics/${amySub}_${stamp.amy}_picture-0_01${i === 0 ? '' : `（${i}）`}.png`, await draw(amyOrder[i], amy), i % 2 === 0);
  }
  const names = (sub, st, ext) => Object.fromEntries(KINDS.map((k, i) => [k, `${sub}_${st}_IMG_${i}${tag}_01.${ext}`]));
  const benFiles = names('Ben', stamp.ben, 'jpeg');
  const caraFiles = names('Cara', stamp.cara, 'png');
  for (const k of KINDS) add(`pics/${benFiles[k]}`, await draw(k, ben, 'jpeg'));
  for (const k of KINDS) add(`pics/${caraFiles[k]}`, await draw(k, cara), true);
  add('pics/Zed_2026-10-10 14.00.00_IMG_9_01.jpeg', await draw('buyerPhoto', ben, 'jpeg'));
  add('__MACOSX/pics/._ignored.png', Buffer.from('x'));
  const zipPath = path.join(os.tmpdir(), `ip-${tag}.zip`);
  fs.writeFileSync(zipPath, await zip.generateAsync({ type: 'nodebuffer' }));

  // ---- the Excel file
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`IP Expo ${tag}`);
  ws.addRow(['序号', 'Passport Name', 'Passport No.', 'Visa type', 'Phone', 'WeChat', 'Email', 'Gender', 'Date of birth', 'Nationality', 'Company', 'Position', 'Passport picture', 'Visa picture', 'Business card', 'Canton Badge', 'Personal Image', '提交者']);
  const row = (n, p, files, sub) => ws.addRow([n, `${p.given} ${p.surname}`, p.passport, 'Work or Business Visa', phone(n), p.wechat, p.email, 'Female', '1990年05月', 'Utopia', 'Sunshine Trading', 'Manager', ...files, sub]);
  const amyName = `${amySub}_${stamp.amy}_picture-0_01.png`;
  row(1, amy, [amyName, amyName, amyName, amyName, amyName], amySub);
  row(2, ben, KINDS.map((k) => benFiles[k]), 'Ben');
  row(3, cara, KINDS.map((k) => caraFiles[k]), 'Cara');
  row(4, dan, KINDS.map((k) => `Dan_${stamp.dan}_IMG_${k}_01.jpeg`), 'Dan');
  const xlsxPath = path.join(os.tmpdir(), `ip-${tag}.xlsx`);
  await wb.xlsx.writeFile(xlsxPath);

  // Cara already has an account with a verified passport picture.
  const h = bcrypt.hashSync('pass1234', 10);
  sql(`INSERT INTO users (name,email,password_hash,role,country) VALUES ('CARA EXISTING','${cara.email}','${h}','buyer','')`);
  const caraId = Number(sql(`SELECT id FROM users WHERE email='${cara.email}'`));
  sql(`INSERT INTO buyer_profiles (user_id,passport_number) VALUES (${caraId},'${cara.passport}')`);
  const put = (id, type, buf) => fetch(`${BASE}/api/admin/buyer-profiles/${id}/documents/${type}`, { method: 'PUT', headers: { ...AH, 'Content-Type': 'application/json' }, body: JSON.stringify({ value: 'data:image/png;base64,' + buf.toString('base64') }) });
  const originalPassport = await sharp({ create: { width: 321, height: 123, channels: 3, background: '#0a0' } }).png().toBuffer();
  ok((await put(caraId, 'passportFront', originalPassport)).status === 200, 'Cara has a saved passport picture');
  const doc = async (id, type) => {
    const res = await fetch(`${BASE}/api/admin/buyer-profiles/${id}/documents/${type}`, { headers: AH });
    if (res.status !== 200) return null;
    const m = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
    return `${m.width}x${m.height}`;
  };

  console.log('\n== the page');
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } });
  await ctx.addCookies([{ name: 'token', value: u.aT, url: BASE }]);
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) problems.push(m.text()); });
  await page.goto(`${BASE}/en/admin/users/import-buyers`, { waitUntil: 'domcontentloaded' });
  await page.locator('#import-excel').waitFor();
  ok(await page.locator('#import-zip').count() === 0, 'the ZIP is asked for once the Excel file is read');
  await page.locator('#import-excel').setInputFiles(xlsxPath);
  await page.getByText(/Read 4 rows/).waitFor();
  await page.locator('#import-zip').waitFor();
  await page.locator('#import-zip').setInputFiles(zipPath);
  const summary = page.getByTestId('pictures-summary');
  await summary.waitFor({ timeout: 240000 });
  const text = await summary.innerText();
  ok(/10 pictures placed as the Excel file says/.test(text), 'Ben\'s and Cara\'s ten pictures are placed as the Excel file says', text);
  ok(/5 pictures sorted by the computer/.test(text), 'Amy\'s five are sorted by the computer', text);
  ok(/1 people in the Excel file have no pictures/.test(text), 'Dan has no pictures in this ZIP', text);
  ok(/1 pictures in the ZIP belong to nobody/.test(text), 'the stray picture is reported (and the Mac junk folder ignored)', text);

  console.log('\n== the review window');
  await summary.getByRole('button', { name: 'Review the pictures' }).click();
  const dlg = page.getByTestId('pictures-review');
  await dlg.waitFor();
  await dlg.getByLabel('Only people to check').uncheck();
  const amyCard = dlg.locator('section[aria-label="AMY AMBIGUOUS"]');
  await amyCard.waitFor();
  const slotOf = async (card, fileName) => card.locator('select').nth(await card.locator('label', { hasText: fileName }).evaluateAll((els, f) => els.findIndex((e) => e.textContent.includes(f)), fileName)).inputValue();
  const amyFiles = amyOrder.map((_, i) => `picture-0_01${i === 0 ? '' : `（${i}）`}.png`);
  const got = [];
  for (let i = 0; i < amyFiles.length; i++) {
    const labels = await amyCard.locator('label[for^="slot-"]').allInnerTexts();
    const index = labels.findIndex((l) => (i === 0 ? /picture-0_01\.png$/.test(l.trim()) : l.includes(`（${i}）`)));
    got.push(await amyCard.locator('select').nth(index).inputValue());
  }
  ok(JSON.stringify(got) === JSON.stringify(amyOrder), 'Amy\'s pictures are sorted into the right documents by what is written on them', got);
  const benCard = dlg.locator('section[aria-label="BEN DIRECT"]');
  const benSlots = await benCard.locator('select').evaluateAll((els) => els.map((e) => e.value));
  ok(KINDS.every((k) => benSlots.includes(k)), 'Ben\'s pictures are placed by the Excel columns', benSlots);
  ok(!(await dlg.innerText()).includes('DAN NOPICS'), 'a person with no pictures is not in the list');
  await page.mouse.move(0, 0);
  await sleep(800);
  const axe = await axeViolations(page);
  ok(axe.length === 0, 'no accessibility problems in the window', axe);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no sideways scrolling at 375px');
  // moving a picture to a document takes it from the picture that had it
  const selects = amyCard.locator('select');
  const original = await selects.evaluateAll((els) => els.map((e) => e.value));
  ok(JSON.stringify(original) === JSON.stringify(amyOrder), 'the pictures stay in the order they are in the ZIP', original);
  // the second picture (the passport) is set to "Business card", which the first picture had
  await selects.nth(1).selectOption('businessCard');
  const moved = await selects.evaluateAll((els) => els.map((e) => e.value));
  ok(moved.filter((v) => v === 'businessCard').length === 1 && moved[0] === '' && moved[1] === 'businessCard', 'one picture per document: choosing a document frees it from the other picture', moved);
  await selects.nth(1).selectOption('passportFront');
  await selects.nth(0).selectOption('businessCard');
  const restored = await selects.evaluateAll((els) => els.map((e) => e.value));
  ok(JSON.stringify(restored) === JSON.stringify(original), 'Amy\'s documents are placed as they were', restored);
  await page.keyboard.press('Escape');
  await dlg.waitFor({ state: 'detached' });

  console.log('\n== saving');
  await page.getByRole('button', { name: 'Check the file' }).click();
  await page.getByTestId('import-check').waitFor();
  await page.getByRole('button', { name: 'Review the pictures' }).click();
  await dlg.waitFor();
  await dlg.getByLabel('Only people to check').uncheck();
  const caraCard = dlg.locator('section[aria-label="CARA EXISTING"]');
  await caraCard.waitFor();
  const replaceBox = caraCard.getByLabel(/Replace the saved Passport/);
  ok(await replaceBox.count() === 1 && !(await replaceBox.isChecked()), 'Cara\'s saved passport picture is offered for replacing, not ticked');
  ok((await caraCard.innerText()).includes('verified picture is already saved'), 'it says the saved picture is verified');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Import 4 buyer/ }).click();
  await page.getByTestId('pictures-report').waitFor({ timeout: 240000 });
  const report = await page.getByTestId('pictures-report').innerText();
  ok(/14 pictures saved/.test(report) && /1 saved pictures were kept/.test(report), 'the report: 14 saved (5 + 5 + 4) and 1 kept', report);

  const amyId = Number(sql(`SELECT id FROM users WHERE email='${amy.email}'`));
  const benId = Number(sql(`SELECT id FROM users WHERE email='${ben.email}'`));
  for (const k of KINDS) {
    const size = SIZES[k].join('x');
    ok((await doc(amyId, k)) === size, `Amy's ${k} is the right picture`, await doc(amyId, k));
    ok((await doc(benId, k)) === size, `Ben's ${k} is the right picture`, await doc(benId, k));
  }
  ok((await doc(caraId, 'passportFront')) === '321x123', 'Cara\'s saved passport picture was not replaced');
  for (const k of KINDS.slice(1)) ok((await doc(caraId, k)) === SIZES[k].join('x'), `Cara's empty ${k} was filled`);
  ok(problems.length === 0, 'no errors in the browser (our security rules allow the ZIP, QR and text readers)', problems.slice(0, 3));
  ok((await axeViolations(page)).length === 0, 'no accessibility problems after saving');

  console.log('\n== replacing a saved picture on request');
  await page.getByRole('button', { name: 'Check the file' }).click();
  await page.getByTestId('import-check').waitFor();
  await page.getByRole('button', { name: 'Review the pictures' }).click();
  await dlg.waitFor();
  await dlg.getByLabel('Only people to check').uncheck();
  await caraCard.waitFor();
  await caraCard.getByLabel(/Replace the saved Passport/).check();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Import 4 buyer/ }).click();
  await page.getByText(/pictures saved to the profiles/).last().waitFor({ timeout: 240000 });
  await sleep(500);
  ok((await doc(caraId, 'passportFront')) === SIZES.passportFront.join('x'), 'after ticking replace, Cara\'s passport picture is the new one');

  console.log('\n== progress while the text reader starts, and when it cannot');
  const probe = async (block) => {
    const c = await browser.newContext({ viewport: { width: 375, height: 800 } });
    await c.addCookies([{ name: 'token', value: u.aT, url: BASE }]);
    const pg = await c.newPage();
    if (block) await pg.route('**/vendor/ocr/tesseract-core-simd-lstm.wasm.js', (r) => r.abort());
    else await pg.route('**/vendor/ocr/eng.traineddata.gz', async (r) => { await sleep(2500); r.continue(); });
    await pg.goto(`${BASE}/en/admin/users/import-buyers`, { waitUntil: 'domcontentloaded' });
    await pg.locator('#import-excel').setInputFiles(xlsxPath);
    await pg.locator('#import-zip').waitFor();
    await pg.locator('#import-zip').setInputFiles(zipPath);
    return [c, pg];
  };
  const [slowCtx, slowPage] = await probe(false);
  await slowPage.getByTestId('pictures-progress').waitFor();
  await slowPage.getByText(/Starting the text reader|Downloading the text reader|reading picture/).first().waitFor({ timeout: 60000 });
  ok(await slowPage.getByRole('button', { name: 'Stop' }).count() === 1, 'while reading, the page says what it is doing and offers Stop');
  await slowPage.getByTestId('pictures-summary').waitFor({ timeout: 240000 });
  ok(!(await slowPage.getByTestId('pictures-summary').innerText()).includes('did not work'), 'a slow start still ends well');
  await slowCtx.close();
  const [badCtx, badPage] = await probe(true);
  await badPage.getByTestId('pictures-summary').waitFor({ timeout: 240000 });
  const badText = await badPage.getByTestId('pictures-summary').innerText();
  ok(/did not work/.test(badText) && /5 pictures sorted by the computer/.test(badText), 'if the text reader cannot start, the pictures are still placed and the problem is said', badText);
  ok(/1 people need a look/.test(badText), 'and the person is marked to be checked', badText);
  await badCtx.close();

  await browser.close();
  for (const f of [zipPath, xlsxPath]) fs.rmSync(f, { force: true });
  done();
})().catch((e) => { console.error(e); process.exit(1); });
