// The monthly statement for the accountant (Admin -> Wallet -> Overview): opening, movements, closing, the check, per buyer.
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');
const { BASE, sql, ok, done, mkUsers } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.56.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const H = (t) => ({ cookie: 'token=' + t, 'x-forwarded-for': ipn() });
const num = (q) => Number(sql(q));

(async () => {
  const u = await mkUsers('ws');
  const st = Date.now(), h = bcrypt.hashSync('pass1234', 10);
  // two buyers and a small ledger in April and May 2019 (months nobody else has written to)
  const mk = (tag) => { const e = `ws-${tag}-${st}@test.invalid`; sql(`INSERT INTO users (name,email,password_hash,role,country) VALUES ('Stmt ${tag}','${e}','${h}','buyer','')`); return num(`SELECT id FROM users WHERE email='${e}'`); };
  const A = mk('a'), B = mk('b');
  sql("DELETE FROM wallet_transactions WHERE created_at < '2019-07-01'");
  const tx = (uid, amount, after, type, at, key) => sql(`INSERT INTO wallet_transactions (user_id,amount,balance_after,type,note,idem_key,created_at) VALUES (${uid},${amount},${after},'${type}','stmt','${key}-${st}','${at}')`);
  tx(A, 1000, 1000, 'topup', '2019-04-10 09:00:00', 'a1');
  tx(B, 300, 300, 'attendance', '2019-04-12 09:00:00', 'b1');
  tx(A, -200, 800, 'transfer_out', '2019-05-05 10:00:00', 'a2');
  tx(B, 200, 500, 'transfer_in', '2019-05-05 10:00:00', 'b2');
  tx(A, -300, 500, 'withdrawal_hold', '2019-05-20 10:00:00', 'a3');
  tx(B, -100, 400, 'purchase', '2019-05-21 10:00:00', 'b3');
  tx(B, 50, 450, 'adjustment', '2019-05-31 23:30:00', 'b4');
  tx(A, 10, 510, 'attendance', '2019-06-01 00:00:00', 'a4'); // the first second of June: not May
  sql(`INSERT IGNORE INTO wallets (user_id,wallet_code,balance,created_at) VALUES (${A},'WS${st}A000000000000000',510,NOW()),(${B},'WS${st}B000000000000000',450,NOW())`);
  sql(`INSERT INTO wallet_withdrawals (user_id,points,method,status,processed_at,created_at) VALUES (${A},300,'alipay','paid','2019-05-28 08:00:00','2019-05-20 10:00:00')`);
  sql(`INSERT INTO wallet_topups (user_id,points,proof,status,approved_points,reviewed_at,created_at) VALUES (${A},1000,'x','approved',1000,'2019-04-10 09:00:00','2019-04-09 09:00:00')`);

  const get = (q, t = u.aT) => fetch(BASE + '/api/admin/wallet/export/monthly' + q, { headers: H(t) });
  console.log('\n== access and input');
  ok((await get('?month=2019-05', u.bT)).status === 401 || (await get('?month=2019-05', u.bT)).status === 403, 'a buyer cannot download it');
  for (const bad of ['', '?month=', '?month=2019-13', '?month=2019-5', '?month=19-05', '?month=abc', '?month=1999-01', '?month=2019-05-01']) {
    ok((await get(bad)).status === 400, `refused: ${bad || '(no month)'}`);
  }

  console.log('\n== May 2019');
  const res = await get('?month=2019-05');
  ok(res.status === 200 && /spreadsheetml/.test(res.headers.get('content-type')) && /wallet-statement-2019-05\.xlsx/.test(res.headers.get('content-disposition')), 'an Excel file named for the month');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(await res.arrayBuffer()));
  const sum = wb.getWorksheet('Summary');
  const rows = {};
  sum.eachRow((row) => { const label = String(row.getCell(1).value ?? ''); rows[label] = [2, 3, 4, 5].map((c) => row.getCell(c).value); });
  ok(rows['Opening balance (all buyers)'][0] === 1300, 'opening balance = what was in the wallets on 1 May', rows['Opening balance (all buyers)']);
  ok(JSON.stringify(rows['Transfer sent'].slice(0, 3)) === '[0,200,-200]' && JSON.stringify(rows['Transfer received'].slice(0, 3)) === '[200,0,200]', 'transfers by kind (added / taken / net)', [rows['Transfer sent'], rows['Transfer received']]);
  ok(rows['Withdrawal (points held)'][1] === 300 && rows['Package purchase'][1] === 100 && rows['Manual adjustment'][0] === 50, 'withdrawals, purchases and adjustments');
  ok(!rows['Top-up'] && !rows['Attendance points'], 'kinds with no movement in May are not listed (April and June entries are left out)');
  const total = rows['Total'];
  ok(total[0] === 250 && total[1] === 600 && total[2] === -350 && total[3] === 5, 'totals: 250 added, 600 taken, 5 entries', total);
  ok(rows['Closing balance (all buyers)'][0] === 950, 'closing = opening + added - taken = 950');
  const balances = num('SELECT COALESCE(SUM(balance),0) FROM wallets'), ledger = num('SELECT COALESCE(SUM(amount),0) FROM wallet_transactions');
  ok(rows["Sum of all buyers' balances now"][0] === balances && rows['Total of all ledger entries now'][0] === ledger && rows['Difference (0 means the books agree)'][0] === balances - ledger, 'the check against the buyers\' balances', [balances, ledger]);
  ok(rows['Withdrawals paid out (RMB)'][0] === 300 && rows['Withdrawals paid out (number of requests)'][0] === 1, 'withdrawals paid in May: 1 request, 300 RMB');
  ok(rows['Top-ups approved (RMB)'][0] === 0, 'the April top-up is not counted in May');
  const det = wb.getWorksheet('By buyer');
  const people = {};
  det.eachRow((row, n) => { if (n > 1) people[String(row.getCell(2).value)] = [4, 5, 6, 7].map((c) => row.getCell(c).value); });
  ok(JSON.stringify(people['Stmt a']) === '[1000,0,500,500]', 'per buyer A: opening 1000, added 0, taken 500, closing 500', people['Stmt a']);
  ok(JSON.stringify(people['Stmt b']) === '[300,250,100,450]', 'per buyer B: opening 300, added 250, taken 100, closing 450', people['Stmt b']);

  console.log('\n== other months');
  const apr = new ExcelJS.Workbook();
  await apr.xlsx.load(Buffer.from(await (await get('?month=2019-04')).arrayBuffer()));
  const ar = {}; apr.getWorksheet('Summary').eachRow((row) => { ar[String(row.getCell(1).value ?? '')] = [2, 3, 4].map((c) => row.getCell(c).value); });
  ok(ar['Opening balance (all buyers)'][0] === 0 && ar['Closing balance (all buyers)'][0] === 1300 && ar['Top-up'][0] === 1000, 'April: opens at 0, closes at 1300, with the 1000 top-up');
  const empty = new ExcelJS.Workbook();
  await empty.xlsx.load(Buffer.from(await (await get('?month=2019-03')).arrayBuffer()));
  const er = {}; empty.getWorksheet('Summary').eachRow((row) => { er[String(row.getCell(1).value ?? '')] = row.getCell(2).value; });
  ok(er['Closing balance (all buyers)'] === 0 && 'No movements in this month' in er, 'a month with nothing in it says so');
  ok(empty.getWorksheet('By buyer').rowCount === 1, 'and lists no buyers');

  console.log('\n== the screen (en / ru / zh, 375 px)');
  const br = await launch();
  for (const locale of ['en', 'ru', 'zh']) {
    const c = await br.newContext({ viewport: { width: 375, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() }, acceptDownloads: true });
    await c.addCookies([{ name: 'token', value: u.aT, url: BASE }]);
    const p = await c.newPage(); await p.goto(`${BASE}/${locale}/admin/wallet`, { waitUntil: 'domcontentloaded' });
    await p.getByTestId('wallet-statement').waitFor();
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${locale}: no sideways scrolling`);
    await sleep(900);
    const vio = await axeViolations(p); ok(vio.length === 0, `${locale}: axe 0`, vio);
    if (locale === 'en') {
      await p.getByTestId('wallet-statement').locator('input[type=month]').fill('2019-05');
      const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Download the statement' }).click()]);
      ok(/wallet-statement-2019-05\.xlsx$/.test(dl.suggestedFilename()), 'the button downloads the chosen month', dl.suggestedFilename());
    }
    await c.close();
  }
  await br.close();
  sql("DELETE FROM wallet_transactions WHERE created_at < '2019-07-01'");
  sql(`DELETE FROM wallets WHERE user_id IN (${A},${B})`);
  sql(`DELETE FROM wallet_withdrawals WHERE user_id IN (${A},${B})`);
  sql(`DELETE FROM wallet_topups WHERE user_id IN (${A},${B})`);
  done();
})().catch((e) => { console.error(e); process.exit(1); });
