// Ticking 2–3 exhibitions on the list and seeing them side by side.
const { spawnSync } = require('node:child_process');
const { BASE, sql, ok, done } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.53.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

(async () => {
  console.log('\n== which names are used');
  const run = (code) => spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '-e', `import('./src/lib/compare.ts').then((m) => { console.log(JSON.stringify(${code})); })`], { encoding: 'utf8' }).stdout.trim();
  ok(run("m.parseCompareSlugs('a,b,a,,c,d')") === '["a","b","c"]', 'blanks and repeats dropped, at most three, order kept');
  ok(run("[m.parseCompareSlugs(undefined), m.parseCompareSlugs('')]") === '[[],[]]', 'nothing given -> nothing chosen');
  ok(run("m.compareHref(['a','b c'])") === '"/exhibitions/compare?slugs=a,b%20c"', 'the link is built safely');

  const tag = `cmp${Date.now()}`;
  sql(`INSERT INTO exhibitions (slug,title,start_date,end_date,venue,city,country,industry,description,highlights,exhibitors,visitors,organizer,registration_enabled) VALUES
    ('${tag}-a','Compare Alpha Expo','${day(30)}','${day(32)}','Hall A','Zzalphacity','China','Cmp Industry','Alpha text','["Robots","Drones"]',1200,'30,000','Org One',1),
    ('${tag}-b','Compare Beta Expo','${day(60)}','${day(62)}','Hall B','Zzbetacity','China','Cmp Industry','Beta text','[]',0,'','Org Two',1),
    ('${tag}-c','Compare Gamma Expo','${day(90)}','${day(92)}','Hall C','Zzgammacity','China','Cmp Other','Gamma text','["Solar"]',560,'10,000','Org Three',0),
    ('${tag}-d','Compare Delta Expo','${day(120)}','${day(122)}','Hall D','Zzdeltacity','China','Cmp Other','Delta text','[]',10,'1,000','Org Four',1)`);
  const get = async (q) => { const r = await fetch(BASE + '/en/exhibitions/compare' + q, { headers: { 'x-forwarded-for': ipn() } }); return [r.status, await r.text(), r.headers]; };

  console.log('\n== the compare page');
  let [st, html, hd] = await get(`?slugs=${tag}-a,${tag}-b,${tag}-c`);
  ok(st === 200 && ['Compare Alpha Expo', 'Compare Beta Expo', 'Compare Gamma Expo', 'Zzalphacity', 'Zzbetacity', 'Zzgammacity', 'Org One', '1,200+', 'Robots'].every((x) => html.includes(x)), 'three chosen -> all three shown with their details');
  ok(/noindex/.test(html), 'it is not offered to search engines');
  ok(!/public.*s-maxage/.test(hd.get('cache-control') || ''), 'it is not stored by the CDN (what is shown depends on the address)', hd.get('cache-control'));
  ok(!html.includes('Compare Delta Expo'), 'an exhibition that was not chosen is not shown');
  [st, html] = await get(`?slugs=${tag}-a,${tag}-a,${tag}-b,${tag}-c,${tag}-d`);
  ok(html.includes('Compare Gamma Expo') && !html.includes('Compare Delta Expo'), 'a fourth is ignored (three at most)');
  [st, html] = await get(`?slugs=${tag}-a`);
  ok(st === 200 && !html.includes('Zzalphacity') && /at least 2/.test(html), 'one is not enough: the page asks for more');
  [st, html] = await get(`?slugs=nope,${tag}-b`);
  ok(st === 200 && /at least 2/.test(html), 'unknown names are ignored');
  [st, html] = await get('');
  ok(st === 200 && /at least 2/.test(html), 'no names: the page explains what to do');
  [st, html] = await get(`?slugs=${encodeURIComponent("<script>alert(1)</script>")},${tag}-b`);
  ok(st === 200 && !html.includes('<script>alert(1)'), 'odd text in the address is harmless');

  console.log('\n== ticking on the list (en / ru / zh, 375 px)');
  const br = await launch();
  for (const locale of ['en', 'ru', 'zh']) {
    const c = await br.newContext({ viewport: { width: 375, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    const p = await c.newPage();
    await p.goto(`${BASE}/${locale}/exhibitions?industry=${encodeURIComponent('Cmp Industry')}`, { waitUntil: 'networkidle' });
    ok((await p.locator('[data-testid=compare-bar]').count()) === 0, `${locale}: nothing ticked -> no bar`);
    const boxes = p.locator('input[type=checkbox][aria-label*="Compare Alpha"], input[type=checkbox][aria-label*="Compare Beta"]');
    ok((await boxes.count()) === 2, `${locale}: each card has its own tick box named after the exhibition`, await boxes.count());
    await boxes.nth(0).click();
    ok(/1/.test(await p.locator('[data-testid=compare-bar]').innerText()) && (await p.locator('[data-testid=compare-bar] a').count()) === 0, `${locale}: with one ticked the compare button is not a link yet`);
    await boxes.nth(1).click();
    await sleep(800);
    const vio = await axeViolations(p);
    ok(vio.length === 0, `${locale}: axe 0 with the bar shown`, vio);
    await p.screenshot({ path: (process.env.SHOTS_DIR || '/tmp') + `/compare_list_${locale}.png` });
    await p.locator('[data-testid=compare-bar] a').click();
    await p.waitForURL(/compare\?slugs=/);
    await p.waitForLoadState('networkidle');
    const body = await p.locator('body').innerText();
    ok(body.includes('Compare Alpha Expo') && body.includes('Compare Beta Expo'), `${locale}: the compare page opens with both`);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${locale}: nothing sticks out at 375 px`);
    await sleep(800);
    const v2 = await axeViolations(p);
    ok(v2.length === 0, `${locale}: compare page axe 0`, v2);
    await p.screenshot({ path: (process.env.SHOTS_DIR || '/tmp') + `/compare_${locale}.png`, fullPage: true });
    await c.close();
  }
  { // at most three can be ticked
    const c = await br.newContext({ viewport: { width: 375, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    const p = await c.newPage();
    await p.goto(`${BASE}/en/exhibitions?view=all`, { waitUntil: 'networkidle' });
    const cb = p.locator(`input[type=checkbox][aria-label*="Compare Alpha"], input[type=checkbox][aria-label*="Compare Beta"], input[type=checkbox][aria-label*="Compare Gamma"], input[type=checkbox][aria-label*="Compare Delta"]`);
    for (let i = 0; i < 3; i++) await cb.nth(i).click();
    ok(await cb.nth(3).isDisabled(), 'after three are ticked the others cannot be');
    ok(/3 of 3/.test(await p.locator('[data-testid=compare-bar]').innerText()), 'the bar says 3 of 3');
    await cb.nth(0).click();
    ok(!(await cb.nth(3).isDisabled()), 'unticking one frees a place');
    await p.getByRole('button', { name: 'Clear' }).click();
    ok((await p.locator('[data-testid=compare-bar]').count()) === 0, 'Clear removes the bar');
    await c.close();
  }
  await br.close();
  sql(`DELETE FROM exhibitions WHERE slug LIKE '${tag}%'`);
  done();
})().catch((e) => { console.error(e); process.exit(1); });
