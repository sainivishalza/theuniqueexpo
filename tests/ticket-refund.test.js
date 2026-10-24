// Train-ticket refunds: each exhibition either arranges the transport (nothing to refund) or refunds the tickets buyers buy themselves
// as points. The buyer sends the receipt from the station; our team gets the e-invoice from 12306 (with the passport ending shown on
// screen), attaches it with the amount, and approves or rejects. The buyer can then download the e-invoice.
const { BASE, sql, ok, done, mkUsers } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const bcrypt = require('bcryptjs');
const zlib = require('node:zlib');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.62.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const num = (q) => Number(sql(q) || 0);
const balance = (id) => num(`SELECT COALESCE((SELECT balance FROM wallets WHERE user_id=${id}),0)`);

// A 1x1 PNG of a random colour: every receipt photo has to be a different picture (the same photo cannot be sent twice).
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body)); return Buffer.concat([len, body, crc]); };
const makePng = () => {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.from([0, Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256)]);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};
const pngUrl = () => 'data:image/png;base64,' + makePng().toString('base64');

(async () => {
  const u = await mkUsers('tr');
  const tag = `tr${Date.now()}`;
  const pw = bcrypt.hashSync('pass1234', 10);
  const AH = { cookie: 'token=' + u.aT, 'Content-Type': 'application/json' };
  const BH = { cookie: 'token=' + u.bT, 'Content-Type': 'application/json' };
  const J = (body) => JSON.stringify(body);
  const day = (n) => `DATE_ADD(UTC_DATE(), INTERVAL ${n} DAY)`;
  let n = 0;
  const pdf = () => 'data:application/pdf;base64,' + Buffer.from(`%PDF-1.4\n%${tag}-${++n}-${Math.random()}\n%%EOF\n`).toString('base64');
  const mkExpo = (letter) => {
    sql(`INSERT INTO exhibitions (slug,title,start_date,end_date,venue,city,country,industry,description,highlights,exhibitors,visitors,organizer,registration_enabled) VALUES ('${tag}-${letter}','Ticket Expo ${letter}',${day(10)},${day(12)},'Hall','Zzticketcity','China','X','d','[]',1,'','O',1)`);
    return Number(sql(`SELECT id FROM exhibitions WHERE slug='${tag}-${letter}'`));
  };
  const reg = (expo, user, status) => sql(`INSERT INTO expo_registrations (exhibition_id,user_id,status) VALUES (${expo},${user},'${status}')`);
  const expoA = mkExpo('A'), expoB = mkExpo('B'), expoC = mkExpo('C'), expoD = mkExpo('D');
  // the buyer: approved at A, B, and C is only pending; D refunds but the buyer never registered
  sql(`INSERT INTO buyer_profiles (user_id,passport_number) VALUES (${u.bId},'ab 1234567') ON DUPLICATE KEY UPDATE passport_number='ab 1234567'`);
  reg(expoA, u.bId, 'approved'); reg(expoB, u.bId, 'approved'); reg(expoC, u.bId, 'pending');
  const putRule = (id, mode, percent, maxPoints, headers = AH) => fetch(BASE + '/api/admin/wallet/ticket-refunds', { method: 'PUT', headers, body: J({ id, mode, percent, maxPoints }) });
  const options = async (headers = BH) => (await fetch(BASE + '/api/wallet/ticket-refunds', { headers })).json();
  const send = (over, headers = BH) => fetch(BASE + '/api/wallet/ticket-refunds', {
    method: 'POST', headers,
    body: J({ key: 'k' + Date.now() + Math.random().toString(36).slice(2, 10), exhibitionId: expoA, receipt: pngUrl(), ...over }),
  });
  const complete = (id, body, headers = AH) => fetch(BASE + `/api/admin/wallet/expenses/${id}`, { method: 'PATCH', headers, body: J({ action: 'complete', ...body }) });
  const decide = (id, body) => fetch(BASE + `/api/admin/wallet/expenses/${id}`, { method: 'PATCH', headers: AH, body: J(body) });
  const pending = async () => (await (await fetch(BASE + `/api/admin/wallet/expenses?status=pending&q=${encodeURIComponent(u.m.b)}`, { headers: AH })).json()).items;

  console.log('\n== the rule each exhibition has');
  ok((await putRule(expoA, 'bogus', 100, 0)).status === 400, 'an unknown mode is refused');
  ok((await putRule(expoA, 'refund', 0, 0)).status === 400, '0% is refused');
  ok((await putRule(expoA, 'refund', 101, 0)).status === 400, 'more than 100% is refused');
  ok((await putRule(expoA, 'refund', 50.5, 0)).status === 400, 'part percents are refused');
  ok((await putRule(expoA, 'refund', 100, -1)).status === 400, 'a negative limit is refused');
  ok((await putRule(999999999, 'refund', 100, 0)).status === 404, 'an unknown exhibition is not found');
  ok((await putRule(expoA, 'refund', 100, 0, BH)).status === 401, 'a buyer cannot change it');
  ok((await putRule(expoA, 'refund', 100, 0, { 'Content-Type': 'application/json' })).status === 401, 'nobody signed in cannot change it');
  ok((await putRule(expoA, 'refund', 100, 600)).status === 200 && (await putRule(expoC, 'refund', 50, 0)).status === 200 && (await putRule(expoD, 'refund', 100, 0)).status === 200, 'A (100%, up to 600), C (50%) and D are set to refund');
  let rules = await (await fetch(BASE + '/api/admin/wallet/ticket-refunds', { headers: AH })).json();
  const rule = (id) => rules.exhibitions.find((x) => x.id === id);
  ok(rule(expoA).mode === 'refund' && rule(expoA).percent === 100 && rule(expoA).maxPoints === 600 && rule(expoC).percent === 50 && rule(expoB).mode === 'none', 'the admin list returns them; B was never set up: we arrange the transport', [rule(expoA), rule(expoB)]);
  ok((await fetch(BASE + '/api/admin/wallet/ticket-refunds', { headers: BH })).status === 401, 'a buyer cannot read the admin list');
  await sleep(400);
  ok(sql("SELECT COUNT(*) FROM admin_audit_log WHERE action='ticket_refund_rules'") !== '0', 'it is in the activity log');

  console.log('\n== what a buyer can claim');
  ok((await fetch(BASE + '/api/wallet/ticket-refunds')).status === 401, 'a visitor cannot');
  ok((await fetch(BASE + '/api/wallet/ticket-refunds', { headers: AH })).status === 403, 'an admin account cannot');
  let o = await options();
  ok(o.exhibitions.length === 1 && o.exhibitions[0].id === expoA && o.exhibitions[0].percent === 100 && o.exhibitions[0].maxPoints === 600, 'only A: it refunds and the buyer is approved there', o.exhibitions);
  ok(o.arrangedByUs.some((x) => x.id === expoB) && !o.arrangedByUs.some((x) => x.id === expoC), 'B is listed as "we arrange the transport"; C (only pending) is not offered at all', o.arrangedByUs);
  ok(o.passportEnding === '234567', 'the last 6 characters of the passport are given', o.passportEnding);

  console.log('\n== sending a request');
  ok((await send({ key: 'short' })).status === 400, 'a key that is too short is refused');
  let r = await send({ amount: 'abc' });
  ok(r.status === 400 && (await r.json()).code === 'invalid_amount', 'an amount that is not a number is refused');
  ok((await send({ amount: '0' })).status === 400, 'so is 0');
  ok((await send({ amount: '1234567' })).status === 400, 'and an absurd amount');
  r = await send({ invoice: pdf() });
  ok(r.status === 400 && (await r.json()).code === 'invalid_amount', 'an invoice without its amount is refused');
  const same = pngUrl();
  ok((await send({ receipt: same, invoice: same, amount: '10' })).status === 400, 'an invoice identical to the receipt is refused');
  ok((await send({ invoice: 'https://example.com/x.pdf', amount: '10' })).status === 400, 'a link instead of a file is refused');
  ok((await send({ receipt: 'data:text/html;base64,PGI+' })).status === 400, 'a receipt that is not a picture or PDF is refused');
  ok((await send({ ticketNo: 'no' })).status === 400, 'a ticket number that cannot be one is refused');
  r = await send({ exhibitionId: expoB });
  ok(r.status === 403 && (await r.json()).code === 'refund_not_available', 'B arranges the transport: no claim');
  ok((await send({ exhibitionId: expoC })).status === 403, 'C: the buyer is only pending there');
  ok((await send({ exhibitionId: expoD })).status === 403, 'D: the buyer is not registered there');
  ok((await send({ exhibitionId: 999999999 })).status === 404, 'an unknown exhibition is not found');
  ok((await send({}, AH)).status === 403, 'an admin cannot send one');
  ok((await send({}, { 'Content-Type': 'application/json' })).status === 401, 'a visitor cannot send one');
  ok(sql(`SELECT COUNT(*) FROM wallet_expense_claims WHERE user_id=${u.bId} AND kind='train'`) === '0', 'none of those left a request behind');

  const key1 = 'key' + tag + 'one';
  const receipt1 = pngUrl();
  const qr1 = `https://example.invalid/12306?x=${tag}`;
  r = await send({ key: key1, receipt: receipt1, qrText: qr1 });
  const first = await r.json();
  ok(r.status === 201 && first.id > 0, 'only the receipt is enough to send a request', first);
  ok(sql(`SELECT CONCAT(kind,'|',category,'|',IFNULL(amount_cny,'none'),'|',receipt_count,'|',status,'|',exhibition_id) FROM wallet_expense_claims WHERE id=${first.id}`) === `train|train|none|1|pending|${expoA}`, 'saved as a pending train claim with one picture and no amount yet');
  ok(sql(`SELECT LENGTH(receipt_hash) FROM wallet_expense_claims WHERE id=${first.id}`) === '64', 'with a fingerprint of the receipt');
  r = await send({ key: key1, receipt: receipt1 });
  ok(r.status === 200 && (await r.json()).replayed === true, 'a double click is the same request');
  r = await send({ receipt: receipt1 });
  ok(r.status === 409 && (await r.json()).code === 'duplicate_ticket', 'the same receipt photo sent again is refused');
  r = await send({ qrText: qr1 });
  ok(r.status === 409, 'a different photo of the same QR code is refused');
  o = await options();
  ok(o.claims[0].id === first.id && o.claims[0].hasInvoice === false && o.claims[0].status === 'pending', 'the buyer sees it waiting for the e-invoice', o.claims[0]);
  ok(balance(u.bId) === 0, 'nothing is paid yet');
  r = await fetch(BASE + `/api/wallet/ticket-refunds/${first.id}/invoice`, { headers: BH });
  ok(r.status === 404, 'there is no e-invoice to download yet');

  console.log('\n== our team gets the e-invoice');
  let row = (await pending()).find((x) => x.id === first.id);
  ok(row && row.kind === 'train' && row.needsInvoice === true && row.amountCny === null && row.passportEnding === '234567' && row.qrText === qr1 && row.suggestedPoints === 0, 'the review list says the e-invoice is missing and gives the passport ending to type in 12306', row);
  let ap = await decide(first.id, { action: 'approve', points: 536, note: '' });
  ok(ap.status === 409 && (await ap.json()).code === 'invoice_missing' && balance(u.bId) === 0, 'it cannot be approved before the e-invoice and its amount are attached');
  ok((await complete(first.id, { amount: 'abc' })).status === 400, 'an amount that is not a number is refused');
  r = await complete(first.id, { amount: '536.00' });
  ok(r.status === 400 || r.status === 409, 'the amount alone is not enough: the e-invoice file is needed', r.status);
  ok((await complete(first.id, { amount: '536.00', invoice: 'https://example.com/x.pdf' })).status === 400, 'a link instead of a file is refused');
  ok((await complete(first.id, { amount: '536.00', invoice: pdf() }, BH)).status === 401, 'a buyer cannot attach one');
  const inv1 = pdf();
  r = await complete(first.id, { amount: '¥536.00', invoice: inv1, ticketNo: tag.toLowerCase() + 'abc' });
  ok(r.status === 200, 'attaching the e-invoice and its amount works', await r.clone().text());
  ok(sql(`SELECT CONCAT(receipt_count,'|',amount_cny,'|',ticket_no,'|',LENGTH(invoice_hash)) FROM wallet_expense_claims WHERE id=${first.id}`) === `2|536.00|${tag.toUpperCase()}ABC|64`, 'two pictures, the amount, a cleaned ticket number and a fingerprint are saved');
  row = (await pending()).find((x) => x.id === first.id);
  ok(row.needsInvoice === false && row.amountCny === 536 && row.refundMode === 'refund' && row.suggestedPoints === 536 && row.refundedBefore === 0 && row.sameTicket === 0, 'the review list now suggests 536 points under the exhibition\'s rule', row);
  const rec = await (await fetch(BASE + `/api/admin/wallet/expenses/${first.id}`, { headers: AH })).json();
  ok(rec.receipts.length === 2 && rec.receipts[0] === receipt1 && rec.receipts[1] === inv1, 'both pictures are there: the receipt first, the e-invoice second');
  o = await options();
  ok(o.claims[0].hasInvoice === true, 'the buyer sees that the e-invoice is attached');
  r = await fetch(BASE + `/api/wallet/ticket-refunds/${first.id}/invoice`, { headers: BH });
  const bytes = Buffer.from(await r.arrayBuffer());
  ok(r.status === 200 && /application\/pdf/.test(r.headers.get('content-type')) && /attachment/.test(r.headers.get('content-disposition')) && bytes.equals(Buffer.from(inv1.split(',')[1], 'base64')), 'and can download it, byte for byte');
  ok((await fetch(BASE + `/api/wallet/ticket-refunds/${first.id}/invoice`)).status === 401, 'a visitor cannot download it');
  ok((await fetch(BASE + `/api/wallet/ticket-refunds/${first.id}/invoice`, { headers: AH })).status === 403, 'neither can an admin account through the buyer route');
  const other = Number(sql(`INSERT INTO users (name,email,password_hash,role,country) VALUES ('tr Other','${tag}-other@test.invalid','${pw}','buyer',''); SELECT LAST_INSERT_ID()`));
  const otherTok = /token=([^;]+)/.exec((await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ipn() }, body: J({ email: `${tag}-other@test.invalid`, password: 'pass1234' }) })).headers.getSetCookie().join(';'))[1];
  ok((await fetch(BASE + `/api/wallet/ticket-refunds/${first.id}/invoice`, { headers: { cookie: 'token=' + otherTok } })).status === 404, 'another buyer cannot download it');
  // the same e-invoice or ticket number cannot be used for a second request
  const dupe = await (await send({})).json();
  r = await complete(dupe.id, { amount: '536.00', invoice: inv1 });
  ok(r.status === 409 && (await r.json()).code === 'duplicate_ticket', 'the same e-invoice attached to another request is refused');
  r = await complete(dupe.id, { amount: '536.00', invoice: pdf(), ticketNo: tag.toLowerCase() + 'abc' });
  ok(r.status === 409, 'so is the same ticket number');
  ap = await decide(dupe.id, { action: 'reject', note: 'Duplicate' });
  ok(ap.status === 200, 'the duplicate request is rejected');

  console.log('\n== the admin decides');
  ap = await decide(first.id, { action: 'approve', points: 536, note: 'Checked' });
  ok(ap.status === 200 && balance(u.bId) === 536, 'approving pays the points: 536', balance(u.bId));
  ok(sql(`SELECT type FROM wallet_transactions WHERE user_id=${u.bId} ORDER BY id DESC LIMIT 1`) === 'expense', 'as an "expense" row in the statement');
  ap = await decide(first.id, { action: 'approve', points: 536, note: '' });
  ok(ap.status === 409 && balance(u.bId) === 536, 'approving twice pays once');
  ok((await complete(first.id, { amount: '1.00', invoice: pdf() })).status === 409, 'a decided request can no longer be changed');
  o = await options();
  ok(o.exhibitions[0].refundedPoints === 536 && o.claims.find((x) => x.id === first.id).pointsAwarded === 536, 'the buyer sees it approved, with the points');
  // a buyer who already has the e-invoice can send it with the request; the limit of 600 leaves 64 points
  const second = await (await send({ invoice: pdf(), amount: '100' })).json();
  row = (await pending()).find((x) => x.id === second.id);
  ok(row.needsInvoice === false && row.refundedBefore === 536 && row.suggestedPoints === 64, 'one sent with its invoice is ready for review at once; the exhibition\'s limit leaves 64 points', row);
  ap = await decide(second.id, { action: 'reject', note: 'Wrong train' });
  ok(ap.status === 200 && balance(u.bId) === 536, 'rejecting pays nothing');
  ok((await send({ invoice: pdf(), amount: '100' })).status === 201, 'a rejected request does not block a new one');
  // exhibition C: 50%, no limit, once the buyer is approved there
  sql(`UPDATE expo_registrations SET status='approved' WHERE exhibition_id=${expoC} AND user_id=${u.bId}`);
  const c = await (await send({ exhibitionId: expoC })).json();
  ok((await complete(c.id, { amount: '301', invoice: pdf() })).status === 200, 'our team attaches the e-invoice for C');
  ok((await pending()).find((x) => x.id === c.id).suggestedPoints === 150, 'C refunds 50%: ¥301 suggests 150 points (rounded down)');
  await putRule(expoC, 'none', 100, 0);
  row = (await pending()).find((x) => x.id === c.id);
  ok(row.refundMode === 'none' && row.suggestedPoints === 0, 'if the exhibition stops refunding, the waiting request shows it (nothing suggested)');
  ok((await send({ exhibitionId: expoC })).status === 403, 'and new requests are refused');
  const mism = await (await fetch(BASE + '/api/admin/wallet/overview', { headers: AH })).json();
  ok(!mism.mismatches || mism.mismatches.length === 0, 'every balance still equals its statement');

  console.log('\n== screens');
  await putRule(expoC, 'refund', 50, 0);
  const br = await launch();
  const open = async (token, p, width = 375) => {
    const ctx = await br.newContext({ viewport: { width, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    if (token) await ctx.addCookies([{ name: 'token', value: token, url: BASE }]);
    const page = await ctx.newPage();
    await page.goto(BASE + p, { waitUntil: 'domcontentloaded' });
    return [ctx, page];
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tr-'));
  const pngFile = () => { const f = path.join(tmp, `receipt-${++n}.png`); fs.writeFileSync(f, makePng()); return f; };
  const pdfFile = () => { const f = path.join(tmp, `invoice-${++n}.pdf`); fs.writeFileSync(f, `%PDF-1.4\n%${tag}-ui-${n}-${Date.now()}\n%%EOF\n`); return f; };

  for (const locale of ['en', 'ru', 'zh']) {
    console.log(`\n== ${locale}: buyer page`);
    const [ctx, p] = await open(u.bT, `/${locale}/dashboard/buyer/wallet/ticket`);
    await p.getByTestId('ticket-form').waitFor();
    await sleep(700);
    const text = (await p.getByTestId('ticket-rule').innerText()).replace(/\s+/g, ' ');
    ok(!/[{}]/.test(text) && /100/.test(text) && /600/.test(text) && /536/.test(text), 'the rule shows the share, the limit and what is already refunded', text);
    const opts = await p.locator('select option').allInnerTexts();
    ok(opts.length === 2 && opts.includes('Ticket Expo A') && opts.includes('Ticket Expo C'), 'the exhibitions that refund and the buyer is approved for are offered', opts);
    ok((await p.getByTestId('ticket-passport').innerText()).includes('234567'), 'the passport ending is shown, so the buyer can check it');
    ok((await p.getByTestId('ticket-history').locator('li').count()) >= 1, 'earlier requests are listed');
    ok((await p.getByTestId(`ticket-invoice-${first.id}`).count()) === 1, 'an approved request with an e-invoice offers the download');
    ok((await p.locator('nav a[aria-current="page"]').count()) >= 1, 'the tab is marked as the current one');
    ok(await p.getByTestId('ticket-submit').isDisabled(), 'sending is not possible before the receipt is there');
    if (locale === 'en') {
      await p.locator('input[type=file]').nth(0).setInputFiles(pngFile());
      await sleep(500);
      ok(await p.getByTestId('ticket-submit').isEnabled(), 'the receipt alone is enough to send');
      await p.locator('input[type=file]').nth(1).setInputFiles(pdfFile());
      await sleep(300);
      ok(await p.getByTestId('ticket-submit').isDisabled(), 'an e-invoice added without its amount cannot be sent');
      await p.getByLabel('Amount on the e-invoice (RMB)').fill('1000');
      await sleep(300);
      ok(/64 points/.test(await p.getByTestId('ticket-estimate').innerText()), 'the estimate respects the limit (¥1000 would give 64)', await p.getByTestId('ticket-estimate').innerText());
      await p.getByLabel('Amount on the e-invoice (RMB)').fill('abc');
      ok(await p.getByTestId('ticket-submit').isDisabled(), 'text as the amount cannot be sent');
      await p.getByLabel(/E-ticket number/).fill('bad');
      ok(await p.getByTestId('ticket-submit').isDisabled(), 'a bad ticket number cannot be sent');
      await p.getByLabel(/E-ticket number/).fill('');
      // take the e-invoice off again: only the receipt is sent
      await p.getByRole('button', { name: 'Remove' }).last().click();
      await p.getByLabel('Amount on the e-invoice (RMB)').fill('');
      await p.getByTestId('ticket-submit').click();
      await p.getByTestId('ticket-sent').waitFor();
      const mine = sql(`SELECT id FROM wallet_expense_claims WHERE user_id=${u.bId} AND kind='train' AND status='pending' AND receipt_count=1 ORDER BY id DESC LIMIT 1`);
      ok(mine !== '', 'sending from the page creates the request');
      ok(/getting your e-invoice/.test(await p.getByTestId(`ticket-stage-${mine}`).innerText()), 'and the page says we are getting the e-invoice');
    }
    const vio = await axeViolations(p);
    ok(vio.length === 0, 'accessible (axe)', vio);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'fits a 375 px phone');
    await ctx.close();
  }

  console.log('\n== a buyer with nothing to claim, and one without a passport number');
  { reg(expoB, other, 'approved');
    const [ctx, p] = await open(otherTok, '/en/dashboard/buyer/wallet/ticket');
    await p.getByTestId('ticket-none').waitFor();
    ok(/Ticket Expo B/.test(await p.getByTestId('ticket-none').innerText()), 'B (we arrange the transport) is named, with nothing to claim');
    ok((await p.getByTestId('ticket-form').count()) === 0, 'no form is offered');
    await ctx.close();
    reg(expoA, other, 'approved');
    const [ctx2, p2] = await open(otherTok, '/en/dashboard/buyer/wallet/ticket');
    await p2.getByTestId('ticket-form').waitFor();
    await p2.getByTestId('ticket-passport-missing').waitFor();
    ok((await p2.getByTestId('ticket-passport-missing').getByRole('link').count()) === 1, 'without a passport number on file, the buyer is sent to the profile');
    await p2.locator('input[type=file]').nth(0).setInputFiles(pngFile());
    await sleep(500);
    ok(await p2.getByTestId('ticket-submit').isDisabled(), 'and cannot send: our team needs it to get the e-invoice');
    await ctx2.close(); }

  for (const locale of ['en', 'ru', 'zh']) {
    console.log(`\n== ${locale}: admin rules tab`);
    const [ctx, p] = await open(u.aT, `/${locale}/admin/wallet?tab=ticketRefunds`);
    await p.getByTestId('ticket-rules').waitFor();
    await p.getByTestId(`ticket-rule-${expoA}`).waitFor();
    await sleep(700);
    const text = await p.locator('main').innerText();
    ok(!/[{}]/.test(text) && !/adminWallet\./.test(text), 'no raw message keys');
    const vio = await axeViolations(p);
    ok(vio.length === 0, 'accessible (axe)', vio);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'fits a 375 px phone');
    await ctx.close();
  }

  console.log('\n== admin edits a rule on screen');
  { const [ctx, p] = await open(u.aT, '/en/admin/wallet?tab=ticketRefunds');
    const card = p.getByTestId(`ticket-rule-${expoD}`);
    await card.waitFor();
    await card.getByLabel('Refund share (%) for Ticket Expo D').fill('80');
    await card.getByLabel('Most points for Ticket Expo D').fill('300');
    await card.getByRole('button', { name: 'Save Ticket Expo D' }).click();
    await card.getByRole('status').waitFor();
    rules = await (await fetch(BASE + '/api/admin/wallet/ticket-refunds', { headers: AH })).json();
    ok(rule(expoD).percent === 80 && rule(expoD).maxPoints === 300 && rule(expoD).mode === 'refund', 'the rule is changed on screen', rule(expoD));
    await card.getByLabel('Refund share (%) for Ticket Expo D').fill('150');
    ok(await card.getByRole('button', { name: 'Save Ticket Expo D' }).isDisabled(), '150% cannot be saved');
    await card.getByLabel('Refund share (%) for Ticket Expo D').fill('80');
    await card.getByLabel('Refund rule for Ticket Expo D').selectOption('none');
    await card.getByRole('button', { name: 'Save Ticket Expo D' }).click();
    await card.getByRole('status').waitFor();
    rules = await (await fetch(BASE + '/api/admin/wallet/ticket-refunds', { headers: AH })).json();
    ok(rule(expoD).mode === 'none', 'and switched back to "we arrange the transport"');
    await ctx.close(); }

  console.log('\n== our team gets the e-invoice on screen');
  { const waiting = Number(sql(`SELECT id FROM wallet_expense_claims WHERE user_id=${u.bId} AND kind='train' AND status='pending' AND receipt_count=1 ORDER BY id DESC LIMIT 1`));
    const [ctx, p] = await open(u.aT, '/en/admin/wallet?tab=expenses');
    await p.getByRole('searchbox').first().fill(u.m.b);
    const card = p.getByTestId(`expense-train-${waiting}`).locator('xpath=ancestor::li[1]');
    await card.waitFor({ timeout: 15000 });
    ok(/Needs e-invoice/.test(await card.innerText()), 'the waiting request is marked "Needs e-invoice"');
    await card.getByRole('button', { name: /Review/ }).click();
    await p.getByTestId(`expense-passport-${waiting}`).waitFor();
    ok((await p.getByTestId(`expense-passport-${waiting}`).innerText()).includes('234567'), 'the passport ending to type into 12306 is shown');
    ok(await p.getByTestId(`expense-blocked-${waiting}`).isVisible(), 'it says the e-invoice must be attached before approving');
    ok(await card.getByRole('button', { name: /Approve/ }).isDisabled(), 'and Approve is not possible yet');
    await card.getByText('Station receipt').waitFor();
    ok((await card.getByText('Station receipt').count()) === 1, 'the receipt is shown, labelled');
    ok(await p.getByTestId(`expense-invoice-save-${waiting}`).isDisabled(), 'saving needs the file and the amount');
    await card.locator('input[type=file]').setInputFiles(pdfFile());
    await card.getByLabel('Amount on the e-invoice (RMB)').fill('50');
    await p.getByTestId(`expense-invoice-save-${waiting}`).click();
    await p.getByTestId(`expense-blocked-${waiting}`).waitFor({ state: 'detached', timeout: 15000 });
    ok(true, 'after saving, the "attach first" notice is gone');
    await sleep(800);
    ok(await card.getByRole('button', { name: /Approve/ }).isEnabled(), 'Approve works now');
    const prefilled = await card.locator('input[inputmode="numeric"]').first().inputValue();
    ok(prefilled === '50', 'the points box starts from the rule\'s suggestion', prefilled);
    await card.getByText('E-invoice', { exact: true }).first().waitFor();
    ok((await card.getByText('E-invoice', { exact: true }).count()) >= 1, 'the e-invoice is shown next to the receipt');
    const before = balance(u.bId);
    await card.getByRole('button', { name: /Approve/ }).click();
    await sleep(1500);
    ok(balance(u.bId) === before + 50, 'approving on screen pays the points', [before, balance(u.bId)]);
    await ctx.close();
    const [ctx2, p2] = await open(u.bT, '/en/dashboard/buyer/wallet/ticket');
    await p2.getByTestId(`ticket-invoice-${waiting}`).waitFor();
    ok(true, 'and the buyer can download the e-invoice from their page');
    await ctx2.close(); }

  await br.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  done();
})();
