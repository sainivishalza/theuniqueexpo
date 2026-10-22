// A quick health check of the LIVE website, meant to run every night (and on demand) from GitHub.
// It needs no database and no accounts: it opens the public pages in a phone-sized browser and checks
// that they load, that nothing runs off the side of the screen, and that the menu button can be pressed.
// If SMOKE_BUYER_EMAIL / SMOKE_BUYER_PASSWORD (and/or SMOKE_ADMIN_EMAIL / SMOKE_ADMIN_PASSWORD) are set,
// it also signs in as that test account and checks the signed-in header and the dashboard / admin home.
//
//   SMOKE_BASE_URL   the site to check (default https://theuniqueexpo.com)
//   SMOKE_INSECURE=1 accept an untrusted certificate (only for running behind a proxy on a laptop)
//   CHROMIUM_PATH    an installed Chromium instead of Playwright's own
const { chromium } = require('playwright');

const BASE = (process.env.SMOKE_BASE_URL || 'https://theuniqueexpo.com').replace(/\/$/, '');
const problems = [];
let checks = 0;
const ok = (cond, label, detail) => {
  checks++;
  if (cond) console.log('  ok  ', label);
  else {
    problems.push(`${label}${detail === undefined ? '' : ' -- ' + JSON.stringify(detail)}`);
    console.log('  FAIL', label, detail === undefined ? '' : JSON.stringify(detail));
  }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A network hiccup or a busy moment on the host (502/503/504) gets two more tries before it counts as a problem.
async function get(path) {
  let last = { status: 0, text: '', headers: new Headers(), error: 'no answer' };
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await sleep(4000);
    try {
      const res = await fetch(BASE + path, { redirect: 'manual', headers: { 'user-agent': 'unique-expo-live-check' } });
      last = { status: res.status, text: await res.text(), headers: res.headers };
      if (![502, 503, 504].includes(res.status)) return last;
    } catch (err) {
      last = { status: 0, text: '', headers: new Headers(), error: String(err) };
    }
  }
  return last;
}

// Opens a page, trying again if the connection fails.
async function open(page, path, options = {}) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await sleep(4000);
    try {
      return await page.goto(BASE + path, { waitUntil: 'load', timeout: 60000, ...options });
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

// Whether the elements are fully inside the screen; returns the ones that are not.
const offScreen = (page, selectors) =>
  page.evaluate((sels) => {
    const vw = window.innerWidth;
    const bad = [];
    for (const sel of sels) {
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.right > vw + 0.5 || r.left < -0.5)) bad.push(`${sel} ${Math.round(r.left)}-${Math.round(r.right)} of ${vw}`);
      }
    }
    return bad;
  }, selectors);

async function signIn(context, email, password) {
  const res = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'user-agent': 'unique-expo-live-check' },
    body: JSON.stringify({ email, password }),
  });
  const cookie = /token=([^;]+)/.exec((res.headers.getSetCookie?.() || []).join(';'));
  if (!res.ok || !cookie) return false;
  await context.addCookies([{ name: 'token', value: cookie[1], url: BASE }]);
  return true;
}

(async () => {
  console.log(`Checking ${BASE}`);

  console.log('\n== pages and files');
  for (const path of ['/en', '/ru', '/zh', '/en/exhibitions', '/en/tours', '/en/login', '/en/register', '/en/forgot-password', '/en/contact', '/en/search']) {
    const r = await get(path);
    ok(r.status === 200, `${path} loads (200)`, r.status || r.error);
  }
  const robots = await get('/robots.txt');
  ok(robots.status === 200 && /sitemap/i.test(robots.text), 'robots.txt lists the sitemap');
  const sitemap = await get('/sitemap.xml');
  ok(sitemap.status === 200 && /<urlset/.test(sitemap.text) && (sitemap.text.match(/<loc>/g) || []).length > 20, 'sitemap.xml has pages');
  const me = await get('/api/auth/me');
  ok(me.status === 200 && /"user":null/.test(me.text), 'signed out: /api/auth/me answers "no user"');
  const wallet = await get('/api/wallet/balance');
  ok(wallet.status === 401, 'wallet balance refuses signed-out requests', wallet.status);
  const admin = await get('/api/admin/attention');
  ok(admin.status === 401, 'admin API refuses signed-out requests', admin.status);
  const home = await get('/en');
  ok(!!home.headers.get('content-security-policy') && home.headers.get('x-content-type-options') === 'nosniff', 'security headers are present');
  ok(/<title>[^<]{5,}<\/title>/.test(home.text), 'the home page has a title');

  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const newContext = (width) => browser.newContext({ viewport: { width, height: 800 }, isMobile: true, ignoreHTTPSErrors: process.env.SMOKE_INSECURE === '1' });

  console.log('\n== phone widths, signed out');
  for (const width of [320, 375, 414]) {
    for (const path of ['/en', '/ru', '/zh', '/en/exhibitions', '/en/login']) {
      await sleep(1500); // be gentle with the host
      const ctx = await newContext(width);
      const page = await ctx.newPage();
      try {
        await open(page, path);
        await sleep(1200);
        const widths = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: window.innerWidth }));
        ok(widths.sw <= widths.vw + 1, `${path} @${width}px: nothing runs off the side`, widths);
        if (path !== '/en/login') {
          const bad = await offScreen(page, ['button[aria-label*="menu" i]']);
          ok(bad.length === 0, `${path} @${width}px: the menu button is on the screen`, bad);
        }
      } catch (err) {
        ok(false, `${path} @${width}px: page opens`, String(err).slice(0, 160));
      }
      await ctx.close();
    }
  }

  console.log('\n== the menu opens on a phone');
  {
    const ctx = await newContext(375);
    const page = await ctx.newPage();
    try {
      await open(page, '/en');
      await sleep(1000);
      // The page may still be starting up when the button is first pressed: press it again if nothing opened.
      for (let attempt = 0; attempt < 3; attempt++) {
        await page.getByRole('button', { name: /Open menu|Close menu/ }).first().click({ timeout: 10000 });
        if (await page.waitForSelector('#mobile-nav-menu', { state: 'visible', timeout: 4000 }).then(() => true).catch(() => false)) break;
        await sleep(1500);
      }
      await page.waitForSelector('#mobile-nav-menu', { state: 'visible', timeout: 5000 });
      const links = await page.locator('#mobile-nav-menu a').count();
      ok(links >= 5, 'tapping the menu button shows the menu links', links);
    } catch (err) {
      ok(false, 'the menu opens on a phone', String(err).slice(0, 200));
    }
    await ctx.close();
  }

  const buyer = [process.env.SMOKE_BUYER_EMAIL, process.env.SMOKE_BUYER_PASSWORD];
  if (buyer[0] && buyer[1]) {
    console.log('\n== signed in as the test buyer');
    for (const width of [320, 375, 414]) {
      const ctx = await newContext(width);
      if (!(await signIn(ctx, buyer[0], buyer[1]))) {
        ok(false, 'the test buyer can sign in');
        await ctx.close();
        break;
      }
      const page = await ctx.newPage();
      for (const path of ['/en', '/en/dashboard/buyer', '/en/dashboard/buyer/profile']) {
        try {
          await open(page, path);
          await sleep(1500);
          const bad = await offScreen(page, ['button[aria-label*="menu" i]', 'header a[aria-label^="My wallet"]', 'nav a[aria-label^="My wallet"]']);
          ok(bad.length === 0, `buyer ${path} @${width}px: menu button and wallet pill are on the screen`, bad);
          const widths = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: window.innerWidth }));
          ok(widths.sw <= widths.vw + 1, `buyer ${path} @${width}px: nothing runs off the side`, widths);
        } catch (err) {
          ok(false, `buyer ${path} @${width}px: page opens`, String(err).slice(0, 160));
        }
      }
      await ctx.close();
    }
  } else {
    console.log('\n(no test buyer configured: signed-in buyer checks skipped)');
  }

  const adminAcct = [process.env.SMOKE_ADMIN_EMAIL, process.env.SMOKE_ADMIN_PASSWORD];
  if (adminAcct[0] && adminAcct[1]) {
    console.log('\n== signed in as the test admin');
    const ctx = await newContext(1360);
    if (!(await signIn(ctx, adminAcct[0], adminAcct[1]))) {
      ok(false, 'the test admin can sign in');
    } else {
      const page = await ctx.newPage();
      try {
        await open(page, '/en/admin');
        await page.getByRole('heading', { name: 'Needs your attention' }).waitFor({ timeout: 20000 });
        ok(true, 'the admin home opens with "Needs your attention"');
        for (const path of ['/en/admin/buyer-profiles', '/en/admin/wallet', '/en/admin/email']) {
          const r = await open(page, path);
          await sleep(1000);
          ok(r.status() === 200 && (await page.locator('main, body').first().innerText()).length > 200, `admin ${path} opens`, r.status());
        }
      } catch (err) {
        ok(false, 'the admin pages open', String(err).slice(0, 200));
      }
    }
    await ctx.close();
  } else {
    console.log('\n(no test admin configured: admin checks skipped)');
  }

  await browser.close();
  console.log(`\n${checks - problems.length}/${checks} checks passed`);
  if (problems.length) {
    console.log('\nProblems:');
    for (const p of problems) console.log(' - ' + p);
    process.exit(1);
  }
})().catch((err) => {
  console.error('The live check itself crashed:', err);
  process.exit(2);
});
