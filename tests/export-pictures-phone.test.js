// The buyer profiles Excel: a document cell holds the picture (a drawing over the cell, which phone viewers do not draw) and a link
// that opens the picture, so the sheet is usable on a phone. The link works for a signed-in admin only.
const { BASE, sql, ok, done, mkUsers, PNG } = require('./helpers/common.js');
const ExcelJS = require('exceljs');

(async () => {
  const u = await mkUsers('ep');
  const AH = { cookie: 'token=' + u.aT, 'Content-Type': 'application/json' };
  sql(`INSERT INTO buyer_profiles (user_id) VALUES (${u.bId}) ON DUPLICATE KEY UPDATE user_id=user_id`);
  const put = (type, value) => fetch(`${BASE}/api/admin/buyer-profiles/${u.bId}/documents/${type}`, { method: 'PUT', headers: AH, body: JSON.stringify({ value }) });
  ok((await put('passportFront', PNG)).status === 200, 'a passport picture is saved');
  ok((await put('visaPage', 'data:application/pdf;base64,' + Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF').toString('base64'))).status === 200, 'a PDF visa page is saved');

  const res = await fetch(`${BASE}/api/admin/buyer-profiles/export/excel`, { method: 'POST', headers: AH, body: JSON.stringify({ userIds: [u.bId], fields: ['name', 'passportFront', 'visaPage', 'businessCard'] }) });
  ok(res.status === 200, 'the export works');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(await res.arrayBuffer()));
  const sheet = wb.worksheets[0];
  const head = sheet.getRow(1).values.slice(1);
  const row = sheet.getRow(2);
  const cellOf = (label) => row.getCell(head.indexOf(label) + 1).value;
  const passport = cellOf('Passport Front Page');
  ok(passport && passport.text === 'Open picture' && passport.hyperlink === `https://theuniqueexpo.com/api/admin/buyer-profiles/${u.bId}/documents/passportFront`, 'the passport cell has an "Open picture" link', passport);
  ok(sheet.getImages().length === 1, 'the picture itself is still embedded for Excel and WPS on a computer', sheet.getImages().length);
  const visa = cellOf('Visa Page');
  ok(visa && visa.text === 'Open PDF file' && /\/documents\/visaPage$/.test(visa.hyperlink), 'a PDF gets an "Open PDF file" link', visa);
  const card = cellOf('Business Card');
  ok(card === null || card === undefined || card === '', 'a document the buyer has not uploaded has an empty cell', card);
  ok(row.height >= 90, 'the row is tall enough for the picture and the link line', row.height);

  // The link opens the picture only for a signed-in admin.
  const path = new URL(passport.hyperlink).pathname;
  const asAdmin = await fetch(BASE + path, { headers: { cookie: 'token=' + u.aT } });
  ok(asAdmin.status === 200 && /^image\//.test(asAdmin.headers.get('content-type') || ''), 'signed in as admin, the link shows the picture', asAdmin.status);
  ok((await fetch(BASE + path)).status === 401, 'nobody signed in cannot open it');
  ok((await fetch(BASE + path, { headers: { cookie: 'token=' + u.bT } })).status === 401, 'a buyer cannot open it either');
  done();
})().catch((e) => { console.error(e); process.exit(1); });
