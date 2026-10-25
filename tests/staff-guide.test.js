// The staff guide (Admin -> Staff guide): each role sees its own tasks, links only to screens the role may open.
const { BASE, sql, ok, done, mkUsers } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.58.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const H = (t) => ({ 'Content-Type': 'application/json', cookie: 'token=' + t, 'x-forwarded-for': ipn() });
const api = (method, path, body, t) => fetch(BASE + path, { method, headers: H(t), body: body ? JSON.stringify(body) : undefined }).then(async (r) => ({ status: r.status, ...(await r.json().catch(() => ({}))) }));
const num = (q) => Number(sql(q));

(async () => {
  const u = await mkUsers('sg');
  const mkStaff = async (preset) => {
    const s = await mkUsers('sg' + preset);
    await api('PUT', '/api/admin/staff-access', { userId: num(`SELECT id FROM users WHERE email='${s.m.a}'`), preset }, u.aT);
    return s;
  };
  const staff = { reviewer: await mkStaff('reviewer'), content: await mkStaff('content'), finance: await mkStaff('finance'), viewer: await mkStaff('viewer') };
  const br = await launch();
  const open = async (token, locale = 'en', width = 375) => {
    const c = await br.newContext({ viewport: { width, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    await c.addCookies([{ name: 'token', value: token, url: BASE }]);
    const p = await c.newPage();
    await p.goto(`${BASE}/${locale}/admin/guide`, { waitUntil: 'domcontentloaded' });
    await p.getByTestId('guide-everyone').waitFor();
    return [c, p];
  };
  const tasks = async (p) => p.locator('[data-testid^="task-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid').replace('task-', '')));
  const links = async (p) => p.locator('[data-testid^="task-"] a').evaluateAll((els) => els.map((e) => e.getAttribute('href').replace(/^\/(en|ru|zh)/, '')));

  console.log('\n== what each role sees');
  { const [c, p] = await open(u.aT);
    const t = await tasks(p);
    ok(['twoStep', 'approve', 'documents', 'doorCheck', 'addExhibition', 'helpAnswers', 'topups', 'statement', 'look'].every((k) => t.includes(k)), 'full access: the tasks of every role', t);
    ok((await p.getByTestId('guide-role').count()) === 0, 'and no "your role" note');
    await c.close(); }
  const expected = {
    reviewer: { has: ['approve', 'documents', 'announce', 'doorCheck', 'exportList'], not: ['addExhibition', 'topups', 'look'], links: ['/admin/registrations', '/admin/buyer-profiles', '/admin/ticket-check'] },
    content: { has: ['addExhibition', 'editPages', 'helpAnswers', 'blog'], not: ['approve', 'topups', 'look'], links: ['/admin/exhibitions', '/admin/pages', '/admin/blog'] },
    finance: { has: ['topups', 'withdrawals', 'expenses', 'topupMany', 'ticketInvoice', 'statement', 'scheduled'], not: ['approve', 'addExhibition'], links: ['/admin/wallet', '/admin/scheduled-exports'] },
    viewer: { has: ['look', 'numbers'], not: ['approve', 'topups', 'addExhibition'], links: ['/admin/registrations', '/admin/insights'] },
  };
  for (const [role, e] of Object.entries(expected)) {
    const [c, p] = await open(staff[role].aT);
    const t = await tasks(p);
    ok(e.has.every((k) => t.includes(k)) && t.includes('twoStep') && t.includes('findThings'), `${role}: their own tasks and the ones for everyone`, t);
    ok(e.not.every((k) => !t.includes(k)), `${role}: nothing from the other roles`, t);
    ok((await p.getByTestId('guide-role').count()) === 1, `${role}: told which role the page is for`);
    const l = await links(p);
    ok(e.links.every((h) => l.includes(h)), `${role}: links to their screens`, l);
    await c.close();
  }
  { // a link only appears where the role may open the screen: the viewer sees steps for "Open Reports" but the guide never links to a screen they cannot open
    const [c, p] = await open(staff.reviewer.aT);
    const l = await links(p);
    ok(!l.includes('/admin/wallet') && !l.includes('/admin/exhibitions'), 'a reviewer is never linked to a screen they cannot open', l);
    await c.close(); }

  console.log('\n== access');
  ok((await fetch(BASE + '/en/admin/guide', { redirect: 'manual' })).status < 500, 'the page answers');
  { const c = await br.newContext({ viewport: { width: 375, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    await c.addCookies([{ name: 'token', value: u.bT, url: BASE }]);
    const p = await c.newPage(); await p.goto(`${BASE}/en/admin/guide`, { waitUntil: 'networkidle' });
    ok((await p.getByTestId('guide-everyone').count()) === 0, 'a buyer sees none of it');
    await c.close(); }

  console.log('\n== en / ru / zh at 375 px');
  for (const locale of ['en', 'ru', 'zh']) {
    const [c, p] = await open(u.aT, locale);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${locale}: no sideways scrolling`);
    const steps = await p.locator('[data-testid="task-approve"] li').count();
    ok(steps >= 4, `${locale}: steps are listed one by one`, steps);
    const text = await p.locator('main, body').first().innerText();
    ok(!/adminGuide\./.test(text), `${locale}: no raw message keys`);
    await sleep(800);
    const vio = await axeViolations(p); ok(vio.length === 0, `${locale}: axe 0`, vio.map((v) => v.id));
    await c.close();
  }
  { const [c, p] = await open(staff.finance.aT, 'zh');
    ok(/奖励积分钱包/.test(await p.getByTestId('task-topups').innerText()), 'zh: finance sees the wallet task in Chinese');
    await c.close(); }
  await br.close();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
