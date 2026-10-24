// Train-ticket refunds: each exhibition either arranges the transport (nothing to refund) or refunds the tickets buyers buy themselves
// as points. A buyer sends the station receipt, the e-invoice from 12306 and the amount; an admin approves or rejects.
const { BASE, sql, ok, done, mkUsers, PNG } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const bcrypt = require('bcryptjs');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.62.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const num = (q) => Number(sql(q) || 0);
const balance = (id) => num(`SELECT COALESCE((SELECT balance FROM wallets WHERE user_id=${id}),0)`);

(async () => {
  const u = await mkUsers('tr');
  const tag = `tr${Date.now()}`;
  const pw = bcrypt.hashSync('pass1234', 10);
  const AH = { cookie: 'token=' + u.aT, 'Content-Type': 'application/json' };
  const BH = { cookie: 'token=' + u.bT, 'Content-Type': 'application/json' };
  const J = (body) => JSON.stringify(body);
  const day = (n) => `DATE_ADD(UTC_DATE(), INTERVAL ${n} DAY)`;
  let n = 0;
  // a PDF that is different every time (what 12306 gives out is different for every ticket)
  const pdf = () => 'data:application/pdf;base64,' + Buffer.from(`%PDF-1.4\n%${tag}-${++n}-${Math.random()}\n%%EOF\n`).toString('base64');
  const mkExpo = (letter, extra = '') => {
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
    body: J({ key: 'k' + Date.now() + Math.random().toString(36).slice(2, 10), exhibitionId: expoA, receipt: PNG, invoice: pdf(), amount: '536.00', ...over }),
  });

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
  ok(o.passportEnding === '234567', 'the last 6 characters of the passport are given for 12306', o.passportEnding);

  console.log('\n== sending a request');
  ok((await send({ key: 'short' })).status === 400, 'a key that is too short is refused');
  let r = await send({ amount: 'abc' });
  ok(r.status === 400 && (await r.json()).code === 'invalid_amount', 'an amount that is not a number is refused');
  ok((await send({ amount: '0' })).status === 400, 'so is 0');
  ok((await send({ amount: '1234567' })).status === 400, 'and an absurd amount');
  ok((await send({ invoice: PNG })).status === 400, 'an invoice identical to the receipt is refused');
  ok((await send({ invoice: 'https://example.com/x.pdf' })).status === 400, 'a link instead of a file is refused');
  ok((await send({ receipt: 'data:text/html;base64,PGI+' })).status === 400, 'a file that is not a picture or PDF is refused');
  ok((await send({ ticketNo: 'no' })).status === 400, 'a ticket number that cannot be one is refused');
  r = await send({ exhibitionId: expoB });
  ok(r.status === 403 && (await r.json()).code === 'refund_not_available', 'B arranges the transport: no claim');
  r = await send({ exhibitionId: expoC });
  ok(r.status === 403, 'C: the buyer is only pending there');
  r = await send({ exhibitionId: expoD });
  ok(r.status === 403, 'D: the buyer is not registered there');
  r = await send({ exhibitionId: 999999999 });
  ok(r.status === 404, 'an unknown exhibition is not found');
  ok((await send({}, AH)).status === 403, 'an admin cannot send one');
  ok((await send({}, { 'Content-Type': 'application/json' })).status === 401, 'a visitor cannot send one');
  ok(sql(`SELECT COUNT(*) FROM wallet_expense_claims WHERE user_id=${u.bId} AND kind='train'`) === '0', 'none of those left a request behind');

  const key1 = 'key' + tag + 'one';
  const tno = 'AB' + Date.now(); // unique per run: a ticket number can only be claimed once
  const inv1 = pdf();
  r = await send({ key: key1, invoice: inv1, amount: '¥536.00', ticketNo: tno.toLowerCase().replace(/(.{4})/g, '$1 '), qrText: 'https://example.invalid/12306?x=1' });
  const first = await r.json();
  ok(r.status === 201 && first.id > 0, 'a valid request is accepted', first);
  ok(sql(`SELECT CONCAT(kind,'|',category,'|',amount_cny,'|',ticket_no,'|',receipt_count,'|',status,'|',exhibition_id) FROM wallet_expense_claims WHERE id=${first.id}`) === `train|train|536.00|${tno}|2|pending|${expoA}`, 'saved as a pending train claim with the amount, a cleaned ticket number and two pictures');
  ok(sql(`SELECT LENGTH(invoice_hash) FROM wallet_expense_claims WHERE id=${first.id}`) === '64', 'with a fingerprint of the invoice');
  r = await send({ key: key1, invoice: inv1, amount: '536.00' });
  ok(r.status === 200 && (await r.json()).replayed === true, 'a double click is the same request');
  r = await send({ invoice: inv1 });
  ok(r.status === 409 && (await r.json()).code === 'duplicate_ticket', 'the same invoice sent again is refused');
  r = await send({ ticketNo: tno });
  ok(r.status === 409, 'a different file with the same ticket number is refused');
  ok(balance(u.bId) === 0, 'nothing is paid yet');

  console.log('\n== the admin decides');
  let list = await (await fetch(BASE + `/api/admin/wallet/expenses?status=pending&q=${encodeURIComponent(u.m.b)}`, { headers: AH })).json();
  let row = list.items.find((x) => x.id === first.id);
  ok(row && row.kind === 'train' && row.amountCny === 536 && row.ticketNo === tno && row.refundMode === 'refund' && row.suggestedPoints === 536 && row.refundedBefore === 0 && row.sameTicket === 0, 'the review list carries the amount, the exhibition\'s rule and the suggested points', row);
  const rec = await (await fetch(BASE + `/api/admin/wallet/expenses/${first.id}`, { headers: AH })).json();
  ok(rec.receipts.length === 2 && rec.receipts[0] === PNG && rec.receipts[1] === inv1, 'both pictures are there: the receipt first, the invoice second');
  let ap = await fetch(BASE + `/api/admin/wallet/expenses/${first.id}`, { method: 'PATCH', headers: AH, body: J({ action: 'approve', points: 536, note: 'Checked' }) });
  ok(ap.status === 200 && balance(u.bId) === 536, 'approving pays the points: 536', balance(u.bId));
  ok(sql(`SELECT type FROM wallet_transactions WHERE user_id=${u.bId} ORDER BY id DESC LIMIT 1`) === 'expense', 'as an "expense" row in the statement');
  ap = await fetch(BASE + `/api/admin/wallet/expenses/${first.id}`, { method: 'PATCH', headers: AH, body: J({ action: 'approve', points: 536, note: '' }) });
  ok(ap.status === 409 && balance(u.bId) === 536, 'approving twice pays once');
  o = await options();
  ok(o.exhibitions[0].refundedPoints === 536 && o.claims[0].status === 'approved' && o.claims[0].pointsAwarded === 536 && o.claims[0].amountCny === 536, 'the buyer sees it approved, with the points', o.claims[0]);
  // the limit of 600 points: the next ticket of ¥100 only has 64 points left
  const second = await (await send({ amount: '100' })).json();
  list = await (await fetch(BASE + `/api/admin/wallet/expenses?status=pending&q=${encodeURIComponent(u.m.b)}`, { headers: AH })).json();
  row = list.items.find((x) => x.id === second.id);
  ok(row.refundedBefore === 536 && row.suggestedPoints === 64, 'the exhibition\'s limit of 600 leaves 64 points for the next ticket', row);
  // rejecting frees the ticket again
  ap = await fetch(BASE + `/api/admin/wallet/expenses/${second.id}`, { method: 'PATCH', headers: AH, body: J({ action: 'reject', note: 'Wrong train' }) });
  ok(ap.status === 200 && balance(u.bId) === 536, 'rejecting pays nothing');
  const reuse = await send({ invoice: pdf(), amount: '100' });
  ok(reuse.status === 201, 'a rejected request does not block a new one');
  // the same invoice sent in a second request after the first was rejected is flagged for the admin, never silently paid
  // exhibition C: 50% and no limit, once the buyer is approved there
  sql(`UPDATE expo_registrations SET status='approved' WHERE exhibition_id=${expoC} AND user_id=${u.bId}`);
  const c = await (await send({ exhibitionId: expoC, amount: '301' })).json();
  list = await (await fetch(BASE + `/api/admin/wallet/expenses?status=pending&q=${encodeURIComponent(u.m.b)}`, { headers: AH })).json();
  ok(list.items.find((x) => x.id === c.id).suggestedPoints === 150, 'C refunds 50%: ¥301 suggests 150 points (rounded down)');
  // the exhibition stops refunding while a request is waiting
  await putRule(expoC, 'none', 100, 0);
  list = await (await fetch(BASE + `/api/admin/wallet/expenses?status=pending&q=${encodeURIComponent(u.m.b)}`, { headers: AH })).json();
  ok(list.items.find((x) => x.id === c.id).refundMode === 'none' && list.items.find((x) => x.id === c.id).suggestedPoints === 0, 'if the exhibition stops refunding, the waiting request shows it (nothing suggested)');
  ok((await send({ exhibitionId: expoC })).status === 403, 'and new requests are refused');
  const mism = await (await fetch(BASE + '/api/admin/wallet/overview', { headers: AH })).json();
  ok(!mism.mismatches || mism.mismatches.length === 0, 'every balance still equals its statement');

  console.log('\n== screens');
  // a state the buyer screen shows well: A refunds up to 600, the buyer has 536 refunded already
  await putRule(expoC, 'refund', 50, 0);
  const br = await launch();
  const open = async (token, p, width = 375) => {
    const ctx = await br.newContext({ viewport: { width, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    if (token) await ctx.addCookies([{ name: 'token', value: token, url: BASE }]);
    await ctx.addInitScript(() => { Math.random = () => 0.99; });
    const page = await ctx.newPage();
    await page.goto(BASE + p, { waitUntil: 'domcontentloaded' });
    return [ctx, page];
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tr-'));
  const png = path.join(tmp, 'receipt.png');
  fs.writeFileSync(png, Buffer.from(PNG.split(',')[1], 'base64'));
  const pdfFile = () => { const f = path.join(tmp, `invoice-${++n}.pdf`); fs.writeFileSync(f, `%PDF-1.4\n%${tag}-ui-${n}-${Date.now()}\n%%EOF\n`); return f; };

  for (const locale of ['en', 'ru', 'zh']) {
    console.log(`\n== ${locale}: buyer page`);
    const [ctx, p] = await open(u.bT, `/${locale}/dashboard/buyer/wallet/ticket`);
    await p.getByTestId('ticket-form').waitFor();
    await sleep(700);
    const rule = (await p.getByTestId('ticket-rule').innerText()).replace(/\s+/g, ' ');
    ok(!/[{}]/.test(rule) && /100/.test(rule) && /600/.test(rule) && /536/.test(rule), 'the rule shows the share, the limit and what is already refunded', rule);
    const options = await p.locator('select option').allInnerTexts();
    ok(options.length === 2 && options.includes('Ticket Expo A') && options.includes('Ticket Expo C'), 'the exhibitions that refund and the buyer is approved for are offered', options);
    ok((await p.getByTestId('ticket-passport').innerText()).includes('234567'), 'the passport ending for 12306 is shown');
    ok((await p.getByTestId('ticket-history').locator('li').count()) >= 1, 'earlier requests are listed');
    ok((await p.locator('nav a[aria-current="page"]').count()) >= 1, 'the tab is marked as the current one');
    ok(await p.getByTestId('ticket-submit').isDisabled(), 'sending is not possible before the files and the amount are there');
    if (locale === 'en') {
      await p.locator('input[type=file]').nth(0).setInputFiles(png);
      await p.getByTestId('ticket-qr-failed').waitFor({ timeout: 10000 });
      ok(true, 'a receipt photo whose QR code cannot be read says to scan the paper receipt instead');
      await p.locator('input[type=file]').nth(1).setInputFiles(pdfFile());
      await p.getByLabel('Amount on the e-invoice (RMB)').fill('1000');
      await sleep(300);
      ok(/64 points/.test(await p.getByTestId('ticket-estimate').innerText()), 'the estimate respects the limit (¥1000 would give 64)', await p.getByTestId('ticket-estimate').innerText());
      await p.getByLabel('Amount on the e-invoice (RMB)').fill('abc');
      ok(await p.getByTestId('ticket-submit').isDisabled(), 'text as the amount cannot be sent');
      await p.getByLabel('Amount on the e-invoice (RMB)').fill('50');
      await p.getByLabel(/E-ticket number/).fill('bad');
      ok(await p.getByTestId('ticket-submit').isDisabled(), 'a bad ticket number cannot be sent');
      await p.getByLabel(/E-ticket number/).fill('');
      await p.getByTestId('ticket-submit').click();
      await p.getByTestId('ticket-sent').waitFor();
      ok(num(`SELECT COUNT(*) FROM wallet_expense_claims WHERE user_id=${u.bId} AND kind='train' AND amount_cny=50 AND status='pending'`) === 1, 'sending from the page creates the request');
      ok((await p.getByTestId('ticket-history').innerText()).includes('50.00'), 'and it shows in the list');
    }
    const vio = await axeViolations(p);
    ok(vio.length === 0, 'accessible (axe)', vio);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'fits a 375 px phone');
    await ctx.close();
  }

  console.log('\n== a buyer with nothing to claim, and one without a passport number');
  { const other = Number(sql(`INSERT INTO users (name,email,password_hash,role,country) VALUES ('tr Other','${tag}-other@test.invalid','${pw}','buyer',''); SELECT LAST_INSERT_ID()`));
    reg(expoB, other, 'approved');
    const tok = /token=([^;]+)/.exec((await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ipn() }, body: J({ email: `${tag}-other@test.invalid`, password: 'pass1234' }) })).headers.getSetCookie().join(';'))[1];
    const [ctx, p] = await open(tok, '/en/dashboard/buyer/wallet/ticket');
    await p.getByTestId('ticket-none').waitFor();
    ok(/Ticket Expo B/.test(await p.getByTestId('ticket-none').innerText()), 'B (we arrange the transport) is named, with nothing to claim');
    ok((await p.getByTestId('ticket-form').count()) === 0, 'no form is offered');
    await ctx.close();
    reg(expoA, other, 'approved');
    const [ctx2, p2] = await open(tok, '/en/dashboard/buyer/wallet/ticket');
    await p2.getByTestId('ticket-form').waitFor();
    await p2.getByTestId('ticket-passport-missing').waitFor();
    ok((await p2.getByTestId('ticket-passport-missing').getByRole('link').count()) === 1, 'without a passport number on file, the buyer is sent to the profile');
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

  console.log('\n== admin edits a rule and reviews a request on screen');
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
  { const waiting = await (await send({ amount: '200', invoice: pdf() })).json();
    const [ctx, p] = await open(u.aT, '/en/admin/wallet?tab=expenses');
    await p.getByRole('searchbox').first().fill(u.m.b);
    await p.getByTestId(`expense-train-${waiting.id}`).waitFor({ timeout: 15000 });
    const info = (await p.getByTestId(`expense-train-${waiting.id}`).innerText()).replace(/\s+/g, ' ');
    ok(/¥200\.00/.test(info) && /suggests 64 points/.test(info), 'the review card shows the invoice amount and the rule\'s suggestion (the limit leaves 64)', info);
    const card = p.getByTestId(`expense-train-${waiting.id}`).locator('xpath=ancestor::li[1]');
    await card.getByRole('button', { name: /Review/ }).click();
    await card.locator('input[inputmode="numeric"]').first().waitFor();
    const prefilled = await card.locator('input[inputmode="numeric"]').first().inputValue();
    ok(prefilled === '64', 'the points box starts from the suggestion', prefilled);
    ok((await card.getByText('Station receipt').count()) === 1 && (await card.getByText('E-invoice').count()) >= 1, 'the two pictures are labelled');
    await card.locator('input[inputmode="numeric"]').first().fill('64');
    const before = balance(u.bId);
    await card.getByRole('button', { name: /Approve/ }).click();
    await sleep(1500);
    ok(balance(u.bId) === before + 64, 'approving on screen pays the points', [before, balance(u.bId)]);
    await ctx.close(); }

  await br.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  done();
})();
