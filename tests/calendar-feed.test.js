// The exhibitions calendar people can subscribe to, and the date range / by-month view on the exhibitions page.
const { BASE, sql, ok, done } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.46.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

(async () => {
  const st = Date.now();
  const mk = (tag, start, end, extra = '') => { const slug = `cal-${tag}-${st}`; sql(`INSERT INTO exhibitions (slug,title,start_date,end_date,venue,city,country,description,description_ru,registration_enabled${extra ? ',' + extra.split('|')[0] : ''}) VALUES ('${slug}','Calendar ${tag} ${st}','${start}','${end}','Hall A, Gate 2','Guangzhou','China','English text; with, commas','Русский текст',1${extra ? ',' + extra.split('|')[1] : ''})`); return slug; };
  const soon = mk('soon', day(20), day(22));
  const endedRecently = mk('recent', day(-6), day(-3));
  const longGone = mk('gone', day(-60), day(-57));
  const may = mk('may', '2099-05-10', '2099-05-12');
  const june = mk('june', '2099-06-20', '2099-06-22');

  console.log('\n== the feed');
  const get = (q = '') => fetch(BASE + '/api/calendar/exhibitions.ics' + q, { headers: { 'x-forwarded-for': ipn() } });
  let r = await get(); let text = await r.text();
  ok(r.status === 200 && /^text\/calendar/.test(r.headers.get('content-type')) && /public/.test(r.headers.get('cache-control')), 'it answers as a calendar file, which may be cached', [r.status, r.headers.get('content-type')]);
  ok(text.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0') && text.trimEnd().endsWith('END:VCALENDAR') && !/(^|[^\r])\n/.test(text.replace(/\r\n/g, '')), 'a proper calendar with CRLF line ends');
  ok(/X-WR-CALNAME:The Unique Expo: exhibitions/.test(text) && /REFRESH-INTERVAL;VALUE=DURATION:PT12H/.test(text), 'it has a name and asks to be read again every 12 hours');
  const event = (slug, t = text) => (t.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || []).find((e) => e.replace(/\r\n /g, '').includes(`/exhibitions/${slug}`));
  ok(!!event(soon) && !!event(endedRecently) && !!event(may), 'upcoming exhibitions and one that ended 3 days ago are in it');
  ok(!event(longGone), 'one that ended two months ago is not');
  const e1 = event(may).replace(/\r\n /g, '');
  ok(/DTSTART;VALUE=DATE:20990510/.test(e1) && /DTEND;VALUE=DATE:20990513/.test(e1), 'dates are whole days, the end is the day after (as the format requires)', e1);
  ok(/SUMMARY:Calendar may /.test(e1) && /LOCATION:Hall A\\, Gate 2\\, Guangzhou\\, China/.test(e1) && /DESCRIPTION:English text\; with\\, commas/.test(e1), 'title, place and description, with commas and semicolons escaped', e1);
  ok(new RegExp(`UID:exhibition-\\d+@theuniqueexpo.com`).test(e1) && /URL:https:\/\/theuniqueexpo.com\/en\/exhibitions\/cal-may-/.test(e1), 'a lasting id (so a change updates the entry instead of doubling it) and a link to the page');
  ok(text.split('\r\n').every((l) => Buffer.byteLength(l) <= 75), 'no line is longer than 75 bytes');
  r = await get('?locale=ru'); text = await r.text();
  ok(/X-WR-CALNAME:The Unique Expo: выставки/.test(text) && /DESCRIPTION:Русский текст/.test(event(may, text).replace(/\r\n /g, '')) && /\/ru\/exhibitions\/cal-may-/.test(event(may, text).replace(/\r\n /g, '')), 'in Russian when asked (name, description, links)');
  r = await get('?locale=xx'); text = await r.text(); ok(/X-WR-CALNAME:The Unique Expo: exhibitions/.test(text), 'an unknown language falls back to English');
  const sorted = (await (await get()).text()).match(/DTSTART;VALUE=DATE:\d+/g);
  ok(sorted.length >= 4, 'every event has its start day', sorted.length);

  console.log('\n== the exhibitions page (en / ru / zh, 375 px)');
  const br = await launch();
  for (const locale of ['en', 'ru', 'zh']) {
    const c = await br.newContext({ viewport: { width: 375, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    const p = await c.newPage(); await p.goto(`${BASE}/${locale}/exhibitions`, { waitUntil: 'networkidle' });
    const sub = p.getByTestId('subscribe-calendar'); await sub.waitFor();
    ok((await sub.getAttribute('href')) === `webcal://theuniqueexpo.com/api/calendar/exhibitions.ics?locale=${locale}`, `${locale}: the "add to my calendar" link points at the feed in this language`);
    const dates = p.locator('input[type="date"]');
    await dates.nth(0).fill('2099-05-01'); await dates.nth(1).fill('2099-05-31');
    await sleep(500);
    const titles = await p.locator('h3').allInnerTexts();
    ok(titles.some((t) => t.includes(`Calendar may ${st}`)) && !titles.some((t) => t.includes(`Calendar june ${st}`)) && !titles.some((t) => t.includes(`Calendar soon ${st}`)), `${locale}: the date range keeps only exhibitions that overlap it`, titles.filter((t) => /Calendar/.test(t)));
    await dates.nth(0).fill('2099-05-12'); await sleep(300);
    ok((await p.locator('h3').allInnerTexts()).some((t) => t.includes(`Calendar may ${st}`)), `${locale}: an exhibition that ends on the first chosen day still counts`);
    await dates.nth(0).fill('2099-05-13'); await sleep(300);
    ok(!(await p.locator('h3').allInnerTexts()).some((t) => t.includes(`Calendar may ${st}`)), `${locale}: and one that ended the day before does not`);
    await dates.nth(0).fill('2099-05-01'); await dates.nth(1).fill('2099-07-01'); await sleep(300);
    await p.getByRole('button', { name: /By month|По месяцам|按月份/ }).click();
    const groups = p.getByTestId('exhibitions-by-month'); await groups.waitFor();
    const headings = await groups.locator('h2').allInnerTexts();
    ok(headings.length === 2 && /2099/.test(headings[0]) && /2099/.test(headings[1]) && headings[0] !== headings[1], `${locale}: "by month" shows one heading per month, oldest first`, headings);
    ok((await groups.locator('section').first().locator('h3').allInnerTexts()).join().includes(`Calendar may ${st}`), `${locale}: each exhibition is under its month`);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${locale}: no sideways scrolling`);
    await sleep(700);
    const v = await axeViolations(p); ok(v.length === 0, `${locale}: no accessibility violations`, v.map((x) => x.id));
    await p.getByRole('button', { name: /Clear dates|Сбросить даты|清除日期/ }).click();
    ok((await dates.nth(0).inputValue()) === '' && (await dates.nth(1).inputValue()) === '', `${locale}: "clear dates" empties both`);
    await c.close();
  }
  await br.close();
  sql(`DELETE FROM exhibitions WHERE slug LIKE 'cal-%-${st}'`);
  done();
})().catch((e) => { console.error(e); process.exit(1); });
