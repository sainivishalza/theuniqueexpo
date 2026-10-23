// The figures on the home, sign-in and sign-up pages are real (counted from the database), and small ones are left out.
const { spawnSync } = require('node:child_process');
const { BASE, sql, ok, done } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.52.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

(async () => {
  console.log('\n== how a figure is written and when it is shown');
  const run = (code) => spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '-e', `import('./src/lib/site-stats-format.ts').then((m) => { console.log(JSON.stringify(${code})); })`], { encoding: 'utf8' }).stdout.trim();
  ok(run("[m.friendlyCount(7,'en'), m.friendlyCount(99,'en'), m.friendlyCount(100,'en'), m.friendlyCount(149,'en'), m.friendlyCount(1999,'en'), m.friendlyCount(2345,'en')]") === '["7","99","100+","100+","1,900+","2,300+"]', 'small figures are exact, bigger ones are rounded DOWN with a "+" (never more than the truth)');
  ok(run("[m.friendlyCount(2345,'ru'), m.friendlyCount(2345,'zh')]").includes('2'), 'written the way each language writes numbers');
  ok(run("[m.showable({exhibitions:2,upcomingExhibitions:0,exhibitors:0,tours:0,buyers:0,buyerCountries:0},'exhibitions'), m.showable({exhibitions:3,upcomingExhibitions:0,exhibitors:0,tours:0,buyers:49,buyerCountries:4},'exhibitions'), m.showable({exhibitions:0,upcomingExhibitions:0,exhibitors:0,tours:0,buyers:49,buyerCountries:4},'buyers'), m.showable({exhibitions:0,upcomingExhibitions:0,exhibitors:0,tours:0,buyers:50,buyerCountries:5},'buyerCountries')]") === '[false,true,false,true]', 'a figure still small (under 3 exhibitions, 50 buyers, 5 countries...) is not shown');

  console.log('\n== the figures service');
  const r = await fetch(BASE + '/api/site-stats', { headers: { 'x-forwarded-for': ipn() } });
  const stats = await r.json();
  ok(r.status === 200 && /public/.test(r.headers.get('cache-control')) && ['exhibitions', 'upcomingExhibitions', 'exhibitors', 'tours', 'buyers', 'buyerCountries'].every((k) => Number.isInteger(stats[k]) && stats[k] >= 0), 'it answers with whole numbers, and may be cached', stats);
  ok(stats.exhibitions >= Number(sql('SELECT COUNT(*) FROM exhibitions')) - 40 && stats.exhibitions <= Number(sql('SELECT COUNT(*) FROM exhibitions')), 'they are counted from the database (a few minutes behind at most)', [stats.exhibitions, sql('SELECT COUNT(*) FROM exhibitions')]);

  console.log('\n== the pages (en / ru / zh, 375 px)');
  const FAKE = ['15,000+', '500K+', '100K+', '15 000+', '500 тыс', '1.5万', '50万'];
  const slug = `ss-${Date.now()}`;
  sql(`INSERT INTO exhibitions (slug,title,start_date,end_date,industry,registration_enabled) VALUES ('${slug}','Stats Expo','${day(40)}','${day(42)}','Zzz Test Industry',1),('${slug}-b','Stats Expo B','${day(50)}','${day(52)}','Zzz Test Industry',1),('${slug}-c','Other Expo','${day(60)}','${day(62)}','Yyy Other',1)`);
  const br = await launch();
  for (const locale of ['en', 'ru', 'zh']) {
    const c = await br.newContext({ viewport: { width: 375, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    const p = await c.newPage();
    for (const path of ['', '/login', '/register']) {
      await p.goto(`${BASE}/${locale}${path}`, { waitUntil: 'networkidle' });
      const text = await p.locator('body').innerText();
      ok(!FAKE.some((f) => text.includes(f)) && !/\b\d{3,}\+ events\b/.test(text), `${locale}${path || '/'}: none of the old made-up figures (15,000+ exhibitors, 500K+ visitors, 100K+ users, "200+ events"...)`);
      await sleep(800);
      const vio = await axeViolations(p);
      ok(vio.length === 0, `${locale}${path || '/'}: axe 0 at 375 px`, vio);
    }
    await p.goto(`${BASE}/${locale}`, { waitUntil: 'networkidle' });
    const hrefs = await p.locator('a[href*="/exhibitions?industry="]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    ok(hrefs.length >= 2 && hrefs.some((h) => decodeURIComponent(h).includes('Zzz Test Industry')), `${locale}: industry tiles come from the upcoming exhibitions (${hrefs.length} now)`);
    for (const href of hrefs.slice(0, 3)) {
      await p.goto(BASE + href.replace(/^\/(en|ru|zh)/, ''), { waitUntil: 'networkidle' }).catch(() => {});
      await p.goto(BASE + (href.startsWith(`/${locale}`) ? href : `/${locale}${href}`), { waitUntil: 'networkidle' });
      const shown = await p.locator('h3').count();
      ok(shown >= 1, `${locale}: a tile's link (${decodeURIComponent(href.split('industry=')[1] || '')}) shows exhibitions of that industry`, shown);
    }
    await c.close();
  }
  { // the industry link filters the list; an unknown industry is ignored
    const c = await br.newContext({ viewport: { width: 375, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    const p = await c.newPage();
    await p.goto(`${BASE}/en/exhibitions?industry=Zzz%20Test%20Industry`, { waitUntil: 'networkidle' });
    const titles = await p.locator('h3').allInnerTexts();
    ok(titles.some((t) => t.includes('Stats Expo')) && !titles.some((t) => t.includes('Other Expo')), '/exhibitions?industry=… starts with that industry chosen', titles.filter((t) => /Expo/.test(t)));
    await p.goto(`${BASE}/en/exhibitions?industry=No%20Such%20Industry`, { waitUntil: 'networkidle' });
    ok((await p.locator('h3').allInnerTexts()).some((t) => t.includes('Other Expo')), 'an industry nobody has is ignored (everything is shown)');
    await c.close();
  }
  await br.close();
  sql(`DELETE FROM exhibitions WHERE slug LIKE '${slug}%'`);
  done();
})().catch((e) => { console.error(e); process.exit(1); });
