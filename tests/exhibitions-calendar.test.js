// The calendar (month grid) view of the exhibitions page.
const { spawnSync } = require('node:child_process');
const { BASE, sql, ok, done } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.60.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);

(async () => {
  console.log('\n== the month grid');
  const run = (code) => spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '-e', `import('./src/lib/calendar-grid.ts').then((m) => { console.log(JSON.stringify(${code})); })`], { encoding: 'utf8' }).stdout.trim();
  ok(run("m.monthGrid('2031-03').length") === '42', 'March 2031 (starts on a Saturday) needs six weeks');
  ok(run("[m.monthGrid('2031-03')[0].date, m.monthGrid('2031-03')[0].inMonth, m.monthGrid('2031-03')[5].date, m.monthGrid('2031-03')[5].inMonth]") === '["2031-02-24",false,"2031-03-01",true]', 'weeks start on Monday: the grid begins on 24 February and 1 March is a Saturday');
  ok(run("m.monthGrid('2027-02').length") === '28' && run("m.monthGrid('2027-02')[0].date") === '"2027-02-01"', 'February 2027 starts on a Monday and fits four weeks exactly');
  ok(run("m.monthGrid('2024-02').filter((c) => c.inMonth).length") === '29', 'leap year: 29 days');
  ok(run("m.monthGrid('2031-03').every((c, i) => i === 0 || new Date(c.date).getTime() - new Date(m.monthGrid('2031-03')[i - 1].date).getTime() === 86400000)") === 'true', 'days follow one another with no gap or repeat');
  ok(run("[m.shiftMonth('2026-12', 1), m.shiftMonth('2026-01', -1), m.shiftMonth('2026-05', 13), m.shiftMonth('bad', 1)]") === '["2027-01","2025-12","2027-06","bad"]', 'moving between months crosses the year');
  ok(run("m.monthGrid('nonsense').length") === '0', 'rubbish gives an empty grid');

  console.log('\n== on the page');
  const tag = `cal${Date.now()}`;
  const ins = (slug, title, s, e, city, ind) => `('${tag}-${slug}','${title}','${s}','${e}','Hall','${city}','China','${ind}','d','[]',1,'','O',1)`;
  sql(`INSERT INTO exhibitions (slug,title,start_date,end_date,venue,city,country,industry,description,highlights,exhibitors,visitors,organizer,registration_enabled) VALUES
    ${ins('a', 'Calendar Alpha Expo', '2031-03-10', '2031-03-12', 'Zzcalcity', 'Zzcal Industry')},
    ${ins('b', 'Calendar Beta Expo', '2031-03-12', '2031-03-14', 'Zzcalcity', 'Zzcal Other')},
    ${ins('c', 'Calendar Gamma Expo', '2031-04-02', '2031-04-03', 'Zzcalcity', 'Zzcal Industry')}`);
  const br = await launch();
  const open = async (locale, q = '') => {
    const c = await br.newContext({ viewport: { width: 375, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    const p = await c.newPage();
    await p.goto(`${BASE}/${locale}/exhibitions?from=2031-03-01&to=2031-04-30${q}`, { waitUntil: 'networkidle' });
    return [c, p];
  };
  const calBtn = (p, name) => p.getByRole('group', { name: /list|список|列表/i }).getByRole('button', { name });
  { const [c, p] = await open('en');
    // the date range lives in the page's own state, so set it through the fields
    await p.locator('input[type=date]').first().fill('2031-03-01');
    await p.locator('input[type=date]').nth(1).fill('2031-04-30');
    await p.getByRole('button', { name: 'Calendar' }).click();
    await p.getByTestId('exhibitions-calendar').waitFor();
    ok(/March 2031/.test(await p.getByTestId('cal-month').innerText()), 'it opens on the month of the first exhibition in the list', await p.getByTestId('cal-month').innerText());
    for (const d of ['10', '11', '12', '13', '14']) ok((await p.getByTestId(`cal-day-2031-03-${d}`).count()) === 1, `March ${d} is marked (an exhibition runs that day)`);
    ok((await p.getByTestId('cal-day-2031-03-09').count()) === 0 && (await p.getByTestId('cal-day-2031-03-15').count()) === 0, 'the days around it are not');
    ok(/2 exhibitions/.test(await p.getByTestId('cal-day-2031-03-12').getAttribute('aria-label')), 'the 12th says two exhibitions overlap');
    const listText = await p.getByTestId('cal-list').innerText();
    ok(listText.includes('Calendar Alpha Expo') && listText.includes('Calendar Beta Expo') && !listText.includes('Calendar Gamma Expo'), 'the list under the grid shows the month\'s exhibitions');
    await p.getByTestId('cal-day-2031-03-10').click();
    const dayList = await p.getByTestId('cal-list').innerText();
    ok(dayList.includes('Calendar Alpha Expo') && !dayList.includes('Calendar Beta Expo'), 'tapping the 10th lists only what runs that day');
    ok((await p.getByTestId('cal-day-2031-03-10').getAttribute('aria-pressed')) === 'true', 'the chosen day is marked as pressed');
    await p.getByRole('button', { name: 'Show the whole month' }).click();
    ok((await p.getByTestId('cal-list').innerText()).includes('Calendar Beta Expo'), 'one tap returns to the whole month');
    await p.getByRole('button', { name: 'Next month' }).click();
    ok(/April 2031/.test(await p.getByTestId('cal-month').innerText()) && (await p.getByTestId('cal-day-2031-04-02').count()) === 1, 'next month shows April with the 2nd marked');
    ok((await p.getByTestId('cal-list').innerText()).includes('Calendar Gamma Expo'), 'and its exhibition');
    await p.getByRole('button', { name: 'Previous month' }).click();
    await p.getByRole('button', { name: 'Previous month' }).click();
    ok(/February 2031/.test(await p.getByTestId('cal-month').innerText()) && /No exhibitions this month/.test(await p.getByTestId('cal-list').innerText()), 'a month with nothing says so');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no sideways scrolling at 375 px');
    // the filters still apply in the calendar
    await p.getByRole('button', { name: 'Next month' }).click();
    await p.getByLabel('Filter by industry').selectOption('Zzcal Industry');
    ok((await p.getByTestId('cal-day-2031-03-14').count()) === 0 && (await p.getByTestId('cal-day-2031-03-10').count()) === 1, 'choosing an industry removes the other industry\'s days');
    await c.close(); }

  console.log('\n== en / ru / zh at 375 px');
  for (const locale of ['en', 'ru', 'zh']) {
    const [c, p] = await open(locale);
    await p.locator('input[type=date]').first().fill('2031-03-01');
    await p.locator('input[type=date]').nth(1).fill('2031-04-30');
    await p.getByTestId('exhibitions-calendar').waitFor({ state: 'detached', timeout: 500 }).catch(() => {});
    const views = p.locator('[role=group] button[aria-pressed]');
    await views.nth(2).click();
    await p.getByTestId('exhibitions-calendar').waitFor();
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${locale}: no sideways scrolling`);
    ok((await p.getByTestId('cal-day-2031-03-10').count()) === 1, `${locale}: the days are marked`);
    const label = await p.getByTestId('cal-day-2031-03-12').getAttribute('aria-label');
    ok(/2/.test(label) && !/exhibitionsPage/.test(label), `${locale}: the day label is written in the page's language`, label);
    await sleep(900);
    const vio = await axeViolations(p); ok(vio.length === 0, `${locale}: axe 0`, vio.map((v) => v.id));
    await p.screenshot({ path: (process.env.SHOTS_DIR || '/tmp') + `/calendar_${locale}.png`, fullPage: false });
    await c.close();
  }
  await br.close();
  sql(`DELETE FROM exhibitions WHERE slug LIKE '${tag}%'`);
  done();
})().catch((e) => { console.error(e); process.exit(1); });
