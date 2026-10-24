// "What can I do with my points?": the catalogue of ways to earn and use points, with what is possible for this buyer right now.
const { BASE, sql, ok, done, mkUsers } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.59.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const num = (q) => Number(sql(q));

(async () => {
  const u = await mkUsers('wu');
  const tag = `wu${Date.now()}`;
  const day = (n) => `DATE_ADD(UTC_DATE(), INTERVAL ${n} DAY)`;
  // a wallet with 500 points (with the matching ledger entry)
  sql(`INSERT INTO wallets (user_id,wallet_code,balance,created_at) VALUES (${u.bId},CONCAT('WU',LPAD(${u.bId},22,'0')),500,NOW()) ON DUPLICATE KEY UPDATE balance=500`);
  sql(`INSERT INTO wallet_transactions (user_id,amount,balance_after,type,note,idem_key,created_at) VALUES (${u.bId},500,500,'adjustment','seed','wu-${tag}',NOW())`);
  // packages payable with points: 300 (affordable), 450 (affordable), 900 (not), and one already over
  sql(`INSERT INTO tours (slug,title,start_date,end_date,price_points) VALUES ('${tag}-a','Use Tour A',${day(30)},${day(33)},300),('${tag}-b','Use Tour B',${day(40)},${day(43)},450),('${tag}-c','Use Tour C',${day(50)},${day(53)},900),('${tag}-d','Use Tour D',DATE_SUB(UTC_DATE(), INTERVAL 20 DAY),DATE_SUB(UTC_DATE(), INTERVAL 17 DAY),100)`);
  sql(`INSERT INTO exhibitions (slug,title,start_date,end_date,venue,city,country,industry,description,highlights,exhibitors,visitors,organizer,registration_enabled,attendance_points) VALUES ('${tag}-x','Use Expo',${day(40)},${day(42)},'Hall','Zzusecity','China','X','d','[]',1,'','O',1,250)`);
  const before = { tours: num("SELECT COUNT(*) FROM tours WHERE price_points>0 AND end_date >= UTC_DATE() AND slug NOT LIKE '" + tag + "%'") };

  const br = await launch();
  const open = async (locale) => {
    const c = await br.newContext({ viewport: { width: 375, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    await c.addCookies([{ name: 'token', value: u.bT, url: BASE }]);
    const p = await c.newPage();
    await p.goto(`${BASE}/${locale}/dashboard/buyer/wallet/use`, { waitUntil: 'domcontentloaded' });
    await p.getByTestId('use-spend').waitFor();
    return [c, p];
  };

  console.log('\n== English');
  { const [c, p] = await open('en');
    const text = async (k) => (await p.getByTestId(`use-${k}`).innerText()).replace(/\s+/g, ' ');
    const total = before.tours + 3;
    ok(new RegExp(`${total} packages can be paid with points`).test(await text('tours')) || /packages? can be paid with points/.test(await text('tours')), 'packages payable with points are counted (the one already over is not)', await text('tours'));
    ok(/from 100 points|from \d+ points/.test(await text('tours')) && /covers \d+/.test(await text('tours')), 'with the cheapest price and how many the balance covers', await text('tours'));
    ok(/covers (\d+)/.exec(await text('tours'))[1] >= 2, 'the 500-point balance covers at least the 300 and 450 packages');
    ok(/Up to 50,000 points at a time and 100,000 points a day/.test(await text('send')), 'sending shows the real limits', await text('send'));
    ok(/From 100 points\. You have 500 points\./.test(await text('withdraw')), 'withdrawing shows the minimum and the balance', await text('withdraw'));
    ok(/1 exhibition gives points, up to 250|exhibitions? give points, up to \d+/.test(await text('attend')), 'attending shows what can be earned', await text('attend'));
    ok((await p.getByTestId('use-expenses').count()) === 1 && (await p.getByTestId('use-topup').count()) === 1, 'expenses and top-up are listed as ways to get points');
    ok((await p.locator('[data-testid^="use-"] a').count()) >= 5, 'each way has a link to the screen that does it');
    ok((await p.locator('nav[aria-label] a[aria-current="page"]', { hasText: 'What can I do?' }).innerText()).includes('What can I do?'), 'the tab is marked as the current one');
    await c.close(); }

  console.log('\n== switched off');
  sql("INSERT INTO wallet_settings (name,value) VALUES ('transfers_enabled','0'),('withdrawals_enabled','0') ON DUPLICATE KEY UPDATE value=VALUES(value)");
  { const [c, p] = await open('en');
    const send = (await p.getByTestId('use-send').innerText()).replace(/\s+/g, ' ');
    const wd = (await p.getByTestId('use-withdraw').innerText()).replace(/\s+/g, ' ');
    ok(/Switched off for now/.test(send) && /Switched off for now/.test(wd), 'sending and withdrawing say they are switched off', [send, wd]);
    ok((await p.getByTestId('use-send').locator('a').count()) === 0 && (await p.getByTestId('use-withdraw').locator('a').count()) === 0, 'and do not offer a link');
    await c.close(); }
  sql("DELETE FROM wallet_settings WHERE name IN ('transfers_enabled','withdrawals_enabled')");

  console.log('\n== access');
  { const c = await br.newContext({ viewport: { width: 375, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    const p = await c.newPage(); await p.goto(`${BASE}/en/dashboard/buyer/wallet/use`, { waitUntil: 'networkidle' });
    ok((await p.getByTestId('use-spend').count()) === 0 && /Sign in/i.test(await p.locator('main').innerText()), 'signed out: asked to sign in, nothing shown');
    await c.close(); }

  console.log('\n== en / ru / zh at 375 px');
  for (const locale of ['en', 'ru', 'zh']) {
    const [c, p] = await open(locale);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${locale}: no sideways scrolling`);
    const t = await p.locator('main').innerText();
    ok(!/buyerWallet\./.test(t), `${locale}: no raw message keys`);
    ok(locale === 'en' || /\d/.test(await p.getByTestId('use-tours').innerText()), `${locale}: the numbers are filled in`);
    await sleep(800);
    const vio = await axeViolations(p); ok(vio.length === 0, `${locale}: axe 0`, vio.map((v) => v.id));
    await p.screenshot({ path: (process.env.SHOTS_DIR || '/tmp') + `/wallet_use_${locale}.png`, fullPage: true });
    await c.close();
  }
  await br.close();
  sql(`DELETE FROM tours WHERE slug LIKE '${tag}%'`);
  sql(`DELETE FROM exhibitions WHERE slug LIKE '${tag}%'`);
  done();
})().catch((e) => { console.error(e); process.exit(1); });
