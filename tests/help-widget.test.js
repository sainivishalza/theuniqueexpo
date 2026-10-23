// The help box on every public page: search the Help Center answers, then hand the question over to WhatsApp.
const { BASE, sql, ok, done } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.54.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);

(async () => {
  const br = await launch();
  const open = async (locale, path = '', width = 375) => {
    const c = await br.newContext({ viewport: { width, height: 800 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    const p = await c.newPage();
    await p.goto(`${BASE}/${locale}${path}`, { waitUntil: 'networkidle' });
    return [c, p];
  };
  const launcher = (p) => p.locator('button[aria-controls], button[aria-expanded]').last();
  const panel = (p) => p.getByRole('dialog');

  const helpItems = {};
  for (const l of ['en', 'ru', 'zh']) helpItems[l] = (await (await fetch(`${BASE}/api/pages/help-center?locale=${l}`)).json()).content.items;
  ok(helpItems.en.length >= 3, 'the Help Center has answers to search', helpItems.en.length);

  console.log('\n== no WhatsApp number set: the box falls back to the contact page');
  for (const locale of ['en', 'ru', 'zh']) {
    const [c, p] = await open(locale);
    const l = launcher(p);
    ok((await l.getAttribute('aria-expanded')) === 'false' && (await panel(p).count()) === 0, `${locale}: closed until it is opened`);
    await l.click();
    await panel(p).waitFor();
    ok(await p.locator('input[type=search]').evaluate((el) => el === document.activeElement), `${locale}: the cursor is in the search box`);
    await p.locator('[data-testid=help-results]').waitFor();
    ok((await p.locator('[data-testid=help-results] > li').count()) >= 3, `${locale}: with nothing typed it shows the common questions`);
    const first = helpItems[locale][0];
    const word = first.title.split(/\s+/).sort((a, b) => b.length - a.length)[0].replace(/[?？,.]/g, '');
    await p.locator('input[type=search]').fill(word);
    await sleep(300);
    const titles = await p.locator('[data-testid=help-results] summary').allInnerTexts();
    ok(titles.some((t) => t.includes(first.title)), `${locale}: typing "${word}" finds "${first.title.slice(0, 40)}…"`, titles);
    await p.locator('[data-testid=help-results] summary', { hasText: first.title }).first().click();
    ok((await p.locator('[data-testid=help-results] details[open] p').first().innerText()).includes(first.description.slice(0, 20)), `${locale}: opening a question shows its answer`);
    await p.locator('input[type=search]').fill('qqzzxxnothing');
    await sleep(300);
    ok((await p.locator('[data-testid=help-none]').count()) === 1, `${locale}: words nobody wrote about -> a plain "no answer" note`);
    const contact = panel(p).locator('a[href$="/contact"]');
    ok((await contact.count()) === 1 && (await panel(p).locator('a[href*="wa.me"]').count()) === 0, `${locale}: no WhatsApp link without a number, a contact link instead`);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${locale}: nothing sticks out at 375 px`);
    await sleep(800);
    const vio = await axeViolations(p);
    ok(vio.length === 0, `${locale}: axe 0 with the box open`, vio);
    await p.screenshot({ path: (process.env.SHOTS_DIR || '/tmp') + `/help_${locale}.png` });
    await p.keyboard.press('Escape');
    ok((await panel(p).count()) === 0 && (await l.evaluate((el) => el === document.activeElement)), `${locale}: Escape closes it and puts the cursor back on the button`);
    await c.close();
  }

  console.log('\n== with a WhatsApp number: the typed question is carried over');
  const profile = JSON.stringify({ legalName: 'The Unique Expo', whatsapp: '+86 138 0000 0000' });
  sql(`INSERT INTO company_profile (id, content) VALUES (1, '${profile}') ON DUPLICATE KEY UPDATE content = VALUES(content)`);
  await sleep(31000); // the server keeps the company details for 30 seconds
  {
    const [c, p] = await open('en', '/exhibitions/compare');
    await launcher(p).click();
    await panel(p).waitFor();
    const wa = panel(p).locator('a[href*="wa.me"]');
    ok((await wa.count()) === 1 && (await wa.getAttribute('href')).startsWith('https://wa.me/8613800000000?text='), 'the WhatsApp button points at the company number');
    ok(/new tab/.test(await wa.innerText()) || (await wa.getAttribute('target')) === '_blank', 'it opens in a new tab');
    await p.locator('input[type=search]').fill('visa for Russians?');
    await sleep(300);
    const href = await wa.getAttribute('href');
    ok(decodeURIComponent(href.split('text=')[1]).includes('visa for Russians?'), 'what was typed goes into the WhatsApp message', decodeURIComponent(href.split('text=')[1]));
    ok(/Send this question/.test(await wa.innerText()), 'the button says it will send the question');
    await sleep(800);
    const vio = await axeViolations(p);
    ok(vio.length === 0, 'axe 0 with the WhatsApp button', vio);
    await c.close();
  }
  sql(`UPDATE company_profile SET content = JSON_SET(content, '$.whatsapp', '') WHERE id = 1`);
  await br.close();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
