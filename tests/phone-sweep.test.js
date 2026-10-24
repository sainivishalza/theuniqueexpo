// Release check on phones: the main pages of the site, as a visitor, a signed-in buyer and an admin, on emulated phones (touch,
// small screens, 320 px too). Each page must not scroll sideways, must pass the accessibility rules (WCAG 2.1 A/AA) and must have
// tap targets that are big enough (WCAG 2.2: at least 24 x 24 px, links inside a sentence excepted, native check boxes excepted).
// This is the part of "check on real devices" that a machine can do on every release; RELEASE-CHECKLIST.md lists the rest.
const { devices } = require('playwright');
const { BASE, sql, ok, done, mkUsers } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const ipn = () => '198.62.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PHONES = [
  { name: 'iPhone SE', options: devices['iPhone SE'] },
  { name: 'Pixel 5', options: devices['Pixel 5'] },
  { name: '320 px', options: { viewport: { width: 320, height: 640 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, userAgent: devices['iPhone SE'].userAgent } },
];

// Elements a finger has to hit, measured in the page: anything visible that can be tapped and is not a link inside running text.
const SMALL_TARGETS = () => {
  const MIN = 24;
  const sel = 'a[href], button, select, textarea, input:not([type=hidden]):not([type=checkbox]):not([type=radio]), [role=button], [role=link], summary';
  const out = [];
  for (const el of document.querySelectorAll(sel)) {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
    if (el.closest('[aria-hidden=true]')) continue;
    if (el.matches('a[href]') && cs.display === 'inline') {
      // A link in the middle of a sentence is exempt; a link that stands on its own line is not.
      const parent = el.parentElement;
      const text = (parent?.textContent || '').trim();
      if (parent && text.length > (el.textContent || '').trim().length + 12) continue;
    }
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (el.classList.contains('sr-only') || (r.width <= 1 && r.height <= 1)) continue;
    // skip links that are only reachable by keyboard (skip link) and anything off screen to the left/top
    if (r.right < 0 || r.bottom < 0) continue;
    if (r.width < MIN || r.height < MIN) {
      out.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} "${(el.getAttribute('aria-label') || el.textContent || el.getAttribute('name') || '').trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}${window.__SWEEP_CLASSES ? ' {' + String(el.className).slice(0, 110) + '}' : ''}`);
    }
  }
  return out;
};

(async () => {
  const u = await mkUsers('ph');
  const slug = sql("SELECT slug FROM exhibitions WHERE end_date >= UTC_DATE() ORDER BY start_date LIMIT 1");
  const slug2 = sql("SELECT slug FROM exhibitions WHERE end_date >= UTC_DATE() ORDER BY start_date LIMIT 1 OFFSET 1");
  const tour = sql("SELECT slug FROM tours ORDER BY start_date DESC LIMIT 1");
  const blog = sql("SELECT slug FROM blog_posts WHERE published=1 ORDER BY id DESC LIMIT 1");
  const pub = ['', '/exhibitions', slug && `/exhibitions/${slug}`, slug && slug2 && `/exhibitions/compare?slugs=${slug},${slug2}`, '/tours', tour && `/tours/${tour}`, '/blog', blog && `/blog/${blog}`, '/about', '/contact', '/help', '/login', '/register', '/privacy', '/terms', '/china-travel', '/marketplace', '/search'].filter((x) => x !== null && x !== undefined && x !== false);
  const buyerPages = ['/dashboard/buyer', '/dashboard/buyer/wallet', '/dashboard/buyer/wallet/use', '/dashboard/buyer/wallet/invite', '/dashboard/buyer/wallet/ticket', '/dashboard/buyer/support', '/dashboard/buyer/profile', '/dashboard/buyer/registrations', '/dashboard/account', '/messages'];
  const adminPages = ['/admin', '/admin/registrations', '/admin/buyer-profiles', '/admin/exhibitions', '/admin/wallet', '/admin/wallet?tab=referrals', '/admin/wallet?tab=ticketRefunds', '/admin/wallet?tab=bulkTopup', '/admin/support', '/admin/insights', '/admin/email', '/admin/guide'];

  const br = await launch();
  const problems = [];
  const sweep = async (phone, who, token, locale, paths) => {
    const c = await br.newContext({ ...phone.options, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    if (token) await c.addCookies([{ name: 'token', value: token, url: BASE }]);
    await c.addInitScript(() => { Math.random = () => 0.99; window.__SWEEP_CLASSES = !!(typeof process === 'undefined'); });
    const p = await c.newPage();
    for (const path of paths) {
      const label = `${phone.name} · ${who} · ${locale}${path || '/'}`;
      try {
        const res = await p.goto(`${BASE}/${locale}${path}`, { waitUntil: 'networkidle', timeout: 45000 });
        if (!res || res.status() >= 400) { problems.push(`${label}: answered ${res && res.status()}`); continue; }
        await sleep(700);
        const width = await p.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
        if (width.scroll > width.inner + 1) problems.push(`${label}: scrolls sideways (${width.scroll} > ${width.inner})`);
        if (!(await p.evaluate(() => !!document.querySelector('meta[name=viewport]')))) problems.push(`${label}: no viewport meta`);
        const vio = await axeViolations(p);
        if (vio.length) problems.push(`${label}: accessibility ${vio.join(', ')}`);
        const small = await p.evaluate(SMALL_TARGETS);
        if (small.length) problems.push(`${label}: small tap targets: ${[...new Set(small)].slice(0, 6).join(' | ')}${small.length > 6 ? ` (+${small.length - 6})` : ''}`);
      } catch (e) {
        problems.push(`${label}: ${String(e.message).split('\n')[0]}`);
      }
    }
    await c.close();
  };

  for (const phone of PHONES.filter((x) => !process.env.SWEEP_PHONE || x.name === process.env.SWEEP_PHONE)) {
    await sweep(phone, 'visitor', null, 'en', pub);
    await sweep(phone, 'buyer', u.bT, 'en', buyerPages);
    if (phone.name !== '320 px') await sweep(phone, 'admin', u.aT, 'en', adminPages);
  }
  // the other languages, on one phone
  if (!process.env.SWEEP_PHONE || process.env.SWEEP_PHONE === PHONES[0].name) for (const locale of ['ru', 'zh']) await sweep(PHONES[0], 'visitor', null, locale, ['', '/exhibitions', slug && `/exhibitions/${slug}`, '/login', '/register', '/help'].filter(Boolean));
  await br.close();

  console.log(`\n${problems.length} problem(s)`);
  for (const p of problems) console.log('  -', p);
  ok(problems.length === 0, 'no sideways scrolling, accessibility violations or small tap targets on the phone sweep', problems.slice(0, 3));
  done();
})().catch((e) => { console.error(e); process.exit(1); });
