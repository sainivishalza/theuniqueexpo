// Top up several buyers at once, found by passport number: one amount for everyone, a check first (who is found, which numbers
// are not), then everyone found is paid in one go. A number nobody has is an alert; the buyers who were found are still paid.
const { BASE, sql, ok, done, mkUsers } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const bcrypt = require('bcryptjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.63.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const num = (q) => Number(sql(q) || 0);
const balance = (id) => num(`SELECT COALESCE((SELECT balance FROM wallets WHERE user_id=${id}),0)`);

(async () => {
  const u = await mkUsers('bt');
  const tag = `BT${Date.now()}`;
  const pw = bcrypt.hashSync('pass1234', 10);
  const AH = { cookie: 'token=' + u.aT, 'Content-Type': 'application/json' };
  const BH = { cookie: 'token=' + u.bT, 'Content-Type': 'application/json' };
  const J = (body) => JSON.stringify(body);
  let n = 0;
  const mk = (name, passport, extra = '') => {
    const email = `${tag.toLowerCase()}-${++n}@test.invalid`;
    sql(`INSERT INTO users (name,email,password_hash,role,country${extra ? ',' + extra.split('=')[0] : ''}) VALUES ('${name}','${email}','${pw}','buyer',''${extra ? ',' + extra.split('=')[1] : ''})`);
    const id = Number(sql(`SELECT id FROM users WHERE email='${email}'`));
    sql(`INSERT INTO buyer_profiles (user_id,passport_number) VALUES (${id},'${passport}')`);
    return id;
  };
  // five buyers with different passports; one stored with spaces and a dash; a pair sharing one number; a suspended one; a deleted one
  const p = (i) => `${tag}${i}`;
  const b1 = mk('Topup One', p(1)), b2 = mk('Topup Two', p(2)), b3 = mk('Topup Three', p(3)), b4 = mk('Topup Four', `${tag.slice(0, 4)} ${tag.slice(4)}-4`), b5 = mk('Topup Five', p(5));
  const d1 = mk('Topup Twin A', p(6)), d2 = mk('Topup Twin B', p(6));
  const sus = mk('Topup Suspended', p(7), "status='suspended'");
  const del = mk('Topup Deleted', p(8), 'deleted_at=NOW()');
  const typed = [p(1).toLowerCase(), ` ${p(2)} `, p(3), `${tag.slice(0, 3).toLowerCase()} ${tag.slice(3).toLowerCase()}4`, p(5), p(5), 'ZZ99999999', 'AB1', p(6), p(7), p(8)];
  const passports = typed.join('\n');
  const check = (text, headers = AH) => fetch(BASE + '/api/admin/wallet/bulk-topup', { method: 'POST', headers, body: J({ action: 'check', passports: text }) });
  const pay = (over, headers = AH) => fetch(BASE + '/api/admin/wallet/bulk-topup', { method: 'POST', headers, body: J({ action: 'pay', passports, amount: 100, note: 'Welcome bonus', key: 'k' + Date.now() + Math.random().toString(36).slice(2, 10), ...over }) });

  console.log('\n== checking the numbers');
  ok((await check(passports, { 'Content-Type': 'application/json' })).status === 401, 'nobody signed in cannot');
  ok((await check(passports, BH)).status === 401, 'a buyer cannot');
  ok((await check('')).status === 400, 'an empty list is refused');
  ok((await check(Array.from({ length: 501 }, (_, i) => `AB${100000 + i}`).join('\n'))).status === 400, 'more than 500 numbers are refused');
  const res = await (await check(passports)).json();
  const found = new Map(res.found.map((f) => [f.userId, f]));
  ok(found.size === 5 && [b1, b2, b3, b4, b5].every((id) => found.has(id)), 'the five buyers are found: capitals, spaces and dashes do not matter', res.found.map((f) => f.name));
  ok(found.get(b1).name === 'Topup One' && found.get(b4).name === 'Topup Four', 'each found buyer is shown by name');
  ok(res.notFound.includes('ZZ99999999') && res.notFound.includes('AB1') && res.notFound.length === 2, 'a number nobody has, and one that cannot be a passport number, are listed as not found', res.notFound);
  ok(res.ambiguous.length === 1 && res.ambiguous[0].toUpperCase() === p(6), 'a number two buyers share is flagged: nobody is paid for it', res.ambiguous);
  ok(res.blocked.length === 2, 'a suspended and a deleted account are flagged and not paid', res.blocked);
  ok(res.typed === 10, 'the same number typed twice counts once', res.typed);
  ok([d1, d2, sus, del].every((id) => !found.has(id)), 'none of those four is in the found list');
  ok([b1, b2, b3, b4, b5, d1, d2, sus, del].every((id) => balance(id) === 0), 'checking pays nobody');

  console.log('\n== paying');
  ok((await pay({}, { 'Content-Type': 'application/json' })).status === 401, 'nobody signed in cannot');
  ok((await pay({}, BH)).status === 401, 'a buyer cannot');
  ok((await pay({ amount: undefined })).status === 400, 'no amount is refused');
  ok((await pay({ amount: 0 })).status === 400, '0 is refused');
  ok((await pay({ amount: 100001 })).status === 400, 'more than 100,000 each is refused');
  ok((await pay({ amount: 10.5 })).status === 400, 'part points are refused');
  ok((await pay({ note: 'x' })).status === 400, 'a reason that is too short is refused');
  ok((await pay({ key: 'short' })).status === 400, 'a bad request key is refused');
  ok((await pay({ passports: 'ZZ99999999' })).status === 404, 'when nobody is found there is nothing to pay');
  ok([b1, b2, b3, b4, b5].every((id) => balance(id) === 0), 'none of those refused requests paid anyone');
  const key = 'key' + Date.now() + 'bt';
  let r = await pay({ key, amount: 250 });
  const paid = await r.json();
  ok(r.status === 200 && paid.paid === 5 && paid.failed === 0 && paid.amount === 250, 'five buyers are paid', paid);
  ok([b1, b2, b3, b4, b5].every((id) => balance(id) === 250), 'each of the five received exactly 250 points');
  ok([d1, d2, sus, del].every((id) => balance(id) === 0), 'nobody else did');
  ok(paid.notFound.length === 2 && paid.ambiguous.length === 1 && paid.blocked.length === 2, 'the answer repeats what was not found, so it can be alerted', paid);
  ok(num(`SELECT COUNT(*) FROM wallet_transactions WHERE user_id IN (${[b1, b2, b3, b4, b5].join(',')}) AND type='adjustment' AND amount=250 AND note='Welcome bonus'`) === 5, 'each buyer\'s statement shows the 250 points with the reason');
  r = await pay({ key, amount: 250 });
  const again = await r.json();
  ok(r.status === 200 && [b1, b2, b3, b4, b5].every((id) => balance(id) === 250), 'sending the same request again pays nobody twice', again);
  r = await pay({ amount: 250 });
  ok(r.status === 200 && balance(b1) === 500, 'a new request (a new key) is a new payment');
  await sleep(400);
  ok(sql("SELECT COUNT(*) FROM admin_audit_log WHERE action='points_bulk_topup'") !== '0', 'it is in the activity log');
  const mism = await (await fetch(BASE + '/api/admin/wallet/overview', { headers: AH })).json();
  ok(!mism.mismatches || mism.mismatches.length === 0, 'every balance still equals its statement');

  console.log('\n== screens');
  const br = await launch();
  const open = async (token, path, width = 375) => {
    const ctx = await br.newContext({ viewport: { width, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    await ctx.addCookies([{ name: 'token', value: token, url: BASE }]);
    const page = await ctx.newPage();
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
    return [ctx, page];
  };
  const fresh = [1, 2, 3].map((i) => mk(`Screen ${i}`, `${tag}9${i}`));
  const screenList = `${tag}91\n${tag}92\n${tag}93\nNOSUCH12345`;

  for (const locale of ['en', 'ru', 'zh']) {
    console.log(`\n== ${locale}`);
    const [ctx, page] = await open(u.aT, `/${locale}/admin/wallet?tab=bulkTopup`);
    await page.getByTestId('bulk-topup').waitFor();
    await sleep(600);
    ok(await page.getByTestId('bulk-check').isDisabled(), 'checking needs numbers');
    await page.locator('textarea').fill(screenList);
    await page.locator('input[inputmode="numeric"]').fill('40');
    await page.locator('input[maxlength="200"]').fill('Test top-up');
    await page.getByTestId('bulk-check').click();
    await page.getByTestId('bulk-found').waitFor();
    ok((await page.getByTestId('bulk-found').locator('li').count()) === 3, 'the three buyers found are listed');
    const alertText = await page.getByTestId('bulk-notFound').innerText();
    ok(alertText.includes('NOSUCH12345') && !/[{}]/.test(alertText), 'the number nobody has is shown as an alert', alertText);
    const summary = await page.getByTestId('bulk-summary').innerText();
    ok(/120/.test(summary) && !/[{}]/.test(summary), 'the summary says who gets how much in total', summary);
    ok(await page.getByTestId('bulk-pay').isEnabled(), 'paying is possible');
    await page.locator('textarea').fill(screenList + '\nCHANGED999');
    await page.getByTestId('bulk-stale').waitFor();
    ok(await page.getByTestId('bulk-pay').count() === 0, 'a changed list cannot be paid before it is checked again');
    await page.locator('textarea').fill(screenList);
    const vio = await axeViolations(page);
    ok(vio.length === 0, 'accessible (axe)', vio);
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'fits a 375 px phone');
    if (locale === 'en') {
      await page.getByTestId('bulk-check').click();
      await page.getByTestId('bulk-found').waitFor();
      ok(await page.getByTestId('bulk-pay').isEnabled(), 'checked again, paying works');
      await page.getByTestId('bulk-pay').click();
      await page.getByTestId('bulk-done').waitFor();
      ok(/40 points added to 3 buyers/.test(await page.getByTestId('bulk-done').innerText()), 'the done message says 3 buyers got 40 points');
      ok(fresh.every((id) => balance(id) === 40), 'all three received the points');
      ok((await page.getByTestId('bulk-notFound').innerText()).includes('NOSUCH12345'), 'the not-found alert stays after paying');
      ok((await page.getByTestId('bulk-pay').count()) === 0, 'the same list cannot be paid again from the screen');
    }
    await ctx.close();
  }

  await br.close();
  done();
})();
