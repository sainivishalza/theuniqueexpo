// Public pages may be kept by the CDN for a minute; everything personal, interactive or query-driven never is.
const { BASE, ok, done, mkUsers } = require('./helpers/common.js');
const { launch } = require('./helpers/browser.js');
const ip = () => '10.5.' + Math.floor(Math.random() * 250) + '.' + (Math.floor(Math.random() * 250) + 1);
const get = (path, headers = {}) => fetch(BASE + path, { redirect: 'manual', headers: { 'x-forwarded-for': ip(), ...headers } });
const cc = (r) => r.headers.get('cache-control') || '';
const isPublic = (r) => /(^|,\s*)public\b/.test(cc(r)) && /s-maxage=60\b/.test(cc(r));

(async () => {
  console.log('\n== public pages are cacheable for a minute');
  const PUBLIC = ['/en', '/ru', '/zh', '/en/about', '/en/exhibitions', '/ru/blog', '/zh/tours', '/en/events', '/en/services', '/en/services/visa-setup', '/en/privacy', '/en/contact', '/en/help', '/en/magazine', '/en/videos', '/en/china-travel', '/en/plan-business-trip'];
  for (const p of PUBLIC) {
    const r = await get(p);
    ok(r.status === 200 && isPublic(r) && !r.headers.get('set-cookie'), `${p}: 200, public for 60 s, no cookie set`, [r.status, cc(r), r.headers.get('set-cookie')]);
  }
  ok(!/max-age=[1-9]/.test(cc(await get('/en'))), 'the browser itself is not told to keep it (max-age=0)', cc(await get('/en')));

  console.log('\n== what is never cached');
  let r;
  const PRIVATE = ['/en/login', '/en/register', '/en/forgot-password', '/en/search', '/en/favorites', '/en/messages', '/en/marketplace', '/en/dashboard', '/en/dashboard/buyer', '/en/admin', '/en/admin/users', '/en/exhibitions/x/register', '/en/exhibitions/x/check-in', '/en/tours/x/register', '/en/services/visa-setup/apply', '/en/services/business-tours/x/apply', '/en/confirm-email', '/en/reset-password'];
  for (const p of PRIVATE) {
    const r = await get(p);
    ok(!isPublic(r), `${p}: not public`, cc(r));
  }
  for (const p of ['/en/exhibitions?view=past', '/en/blog?category=news', '/en/china-travel?exhibitionSlug=x', '/en/exhibitions?q=a']) {
    const r = await get(p);
    ok(!isPublic(r), `${p}: a page whose content depends on the query is not public`, cc(r));
  }
  r = await get('/en/exhibitions?utm_source=newsletter');
  ok(isPublic(r) && !r.headers.get('set-cookie'), 'a tracking query (utm_source) does not change the page: still public, no cookie', [cc(r), r.headers.get('set-cookie')]);
  r = await get('/en/exhibitions?view=past');
  ok(!r.headers.get('set-cookie') || !isPublic(r), 'a response that sets a cookie is never marked public', [cc(r), r.headers.get('set-cookie')]);
  const u = await mkUsers('pc');
  r = await get('/en/exhibitions', { cookie: 'token=' + u.bT });
  ok(!isPublic(r), 'someone with a sign-in cookie gets the normal never-cached answer', cc(r));
  r = await get('/en/exhibitions', { cookie: 'a=b; token=' + u.bT });
  ok(!isPublic(r), 'also when it is not the first cookie', cc(r));
  r = await get('/api/auth/me'); ok(!isPublic(r), 'API answers are not public', cc(r));
  r = await get('/api/health'); ok(!isPublic(r), 'nor is the health check', cc(r));
  r = await get('/api/wallet/balance'); ok(!isPublic(r), 'nor the wallet', cc(r));
  r = await get('/not-a-locale/about'); ok(!isPublic(r), 'a path that is not under a language is not public', [r.status, cc(r)]);
  r = await get('/en/exhibitions/../admin'); ok(!isPublic(r) || r.status !== 200, 'a path trick does not slip into the public list', [r.status, cc(r)]);

  console.log('\n== the page is the same for everyone');
  for (const p of ['/en', '/en/exhibitions', '/ru/blog', '/en/services']) {
    const anon = await (await get(p)).text();
    const signed = await (await get(p, { cookie: 'token=' + u.bT })).text();
    const admin = await (await get(p, { cookie: 'token=' + u.aT })).text();
    ok(anon === signed && anon === admin, `${p}: the HTML is identical for a visitor, a buyer and an admin (so keeping one copy is safe)`, [anon.length, signed.length, admin.length]);
  }
  const a1 = await (await get('/en/exhibitions')).text(); const a2 = await (await get('/en/exhibitions')).text();
  ok(a1 === a2, 'two visitors get exactly the same bytes');

  console.log('\n== navigation payloads and the browser');
  r = await get('/en/exhibitions', { rsc: '1' });
  ok(r.status === 307 && /_rsc/.test(r.headers.get('location') || ''), 'a bare navigation-payload request is redirected to its own address (with ?_rsc)', [r.status, r.headers.get('location')]);
  r = await get('/en/exhibitions?_rsc=abc', { rsc: '1' });
  ok(!isPublic(r), 'and a payload request (?_rsc) is never public', [r.status, cc(r), r.headers.get('content-type')]);
  r = await get('/en/exhibitions', { 'next-router-prefetch': '1' }); ok(!isPublic(r), 'a prefetch request is never public', cc(r));
  r = await get('/en/exhibitions', { 'next-router-state-tree': '%5B%22%22%5D' }); ok(!isPublic(r), 'a request with the router state is never public', cc(r));
  const br = await launch();
  const c = await br.newContext({ viewport: { width: 1440, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ip() } });
  const p = await c.newPage();
  const seen = [];
  p.on('response', (res) => { const url = res.url(); if (/_rsc=/.test(url)) seen.push({ url, type: res.headers()['content-type'] || '', cc: res.headers()['cache-control'] || '' }); });
  await p.goto(BASE + '/en', { waitUntil: 'networkidle' });
  const first = await p.evaluate(() => document.cookie);
  ok(!/NEXT_LOCALE/.test(first), 'a first visit sets no language cookie (the language is in the address)', first);
  await p.locator('a[href="/en/exhibitions"]:visible').first().click();
  await p.waitForURL('**/en/exhibitions', { timeout: 20000 });
  await p.waitForTimeout(800);
  ok(await p.getByRole('heading', { level: 1 }).first().isVisible(), 'clicking a link inside the site still opens the next page');
  ok(seen.length > 0 && seen.every((s) => !/public/.test(s.cc)), 'the pages the browser fetches while navigating (with ?_rsc=) are never public', seen.map((s) => s.url + ' ' + s.cc));
  // language switch remembers the choice itself
  await p.goto(BASE + '/en', { waitUntil: 'networkidle' });
  await p.locator('button:visible', { hasText: 'English' }).first().click();
  await p.locator('button:visible', { hasText: 'Русский' }).first().click();
  await p.waitForURL('**/ru**', { timeout: 20000 });
  const cookie = (await c.cookies()).find((k) => k.name === 'NEXT_LOCALE');
  ok(cookie && cookie.value === 'ru', 'switching the language still remembers the choice (the language cookie is set by the switcher, not by the cached pages)', cookie);
  await c.close();
  // signing in still works from a cached page
  const c2 = await br.newContext({ viewport: { width: 1200, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ip() } });
  const p2 = await c2.newPage();
  await p2.goto(BASE + '/en/login', { waitUntil: 'networkidle' });
  await p2.fill('#email', u.m.b); await p2.fill('#password', 'pass1234');
  await p2.getByRole('button', { name: 'Sign In' }).click();
  await p2.waitForURL('**/dashboard**', { timeout: 20000 });
  await p2.goto(BASE + '/en/exhibitions', { waitUntil: 'networkidle' });
  ok(await p2.getByRole('link', { name: /dashboard/i }).first().isVisible().catch(() => false) || (await p2.locator('a[href$="/dashboard"]').count()) > 0, 'after signing in, a public page shows the signed-in header (drawn in the browser)');
  await c2.close();
  await br.close();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
