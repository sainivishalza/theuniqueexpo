// What the CDN in front of the site may keep: public content APIs for a few minutes, pictures with a version for a year, and
// nothing personal at all.
const { BASE, sql, ok, done, PNG, mkUsers } = require('./helpers/common.js');
const ipn = () => '198.48.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const get = (path, headers = {}) => fetch(BASE + path, { headers: { 'x-forwarded-for': ipn(), ...headers }, redirect: 'manual' });

(async () => {
  const st = Date.now();
  const slug = `cc-${st}`;
  sql(`INSERT INTO exhibitions (slug,title,start_date,end_date,image,registration_enabled) VALUES ('${slug}','Cache ${st}',DATE_ADD(UTC_DATE(),INTERVAL 20 DAY),DATE_ADD(UTC_DATE(),INTERVAL 22 DAY),'${PNG}',1)`);

  console.log('\n== content APIs');
  for (const [path, maxAge, sMax] of [['/api/exhibitions', 30, 120], ['/api/tours', 30, 120], ['/api/events', 30, 120], ['/api/blog', 30, 120], ['/api/faq', 60, 180], ['/api/company-profile', 60, 180], ['/api/team-members', 30, 120], ['/api/videos', 30, 120], ['/api/slideshow-photos', 30, 120], ['/api/partner-tiers', 30, 120]]) {
    const r = await get(path);
    const cc = r.headers.get('cache-control') || '';
    ok(r.status === 200 && cc.includes('public') && cc.includes(`max-age=${maxAge}`) && cc.includes(`s-maxage=${sMax}`) && cc.includes('stale-while-revalidate'), `${path}: the browser keeps it ${maxAge} s, the CDN ${sMax} s`, [r.status, cc]);
    ok(!r.headers.get('set-cookie'), `${path}: sets no cookie (a response with a cookie is never kept by a CDN)`);
  }

  console.log('\n== pictures');
  const list = await (await get('/api/exhibitions')).json();
  const mine = list.exhibitions.find((e) => e.slug === slug);
  ok(mine && /\/image\?v=\d+$/.test(mine.image), 'the list points at a picture with a version', mine && mine.image);
  let r = await get(mine.image);
  let cc = r.headers.get('cache-control') || '';
  ok(r.status === 200 && /image\/png/.test(r.headers.get('content-type')) && cc.includes('max-age=31536000') && cc.includes('immutable') && cc.includes('s-maxage=31536000'), 'a picture asked for with its version is kept for a year', cc);
  r = await get(`/api/exhibitions/${slug}/image`); cc = r.headers.get('cache-control') || '';
  ok(r.status === 200 && cc.includes('max-age=3600') && !cc.includes('immutable'), 'without a version only an hour', cc);
  sql(`UPDATE exhibitions SET updated_at=DATE_ADD(updated_at, INTERVAL 1 SECOND) WHERE slug='${slug}'`);
  const after = (await (await get('/api/exhibitions')).json()).exhibitions.find((e) => e.slug === slug);
  ok(after.image !== mine.image, 'a changed picture gets a new address, so a year of caching can never show an old one', [mine.image, after.image]);

  console.log('\n== nothing personal is public');
  const u = await mkUsers('cc');
  for (const [path, token] of [['/api/auth/me', u.bT], ['/api/auth/staff-role', u.aT], ['/api/notifications', u.bT], ['/api/buyer-profile', u.bT], ['/api/admin/insights', u.aT], ['/api/wallet', u.bT]]) {
    const res = await get(path, { cookie: 'token=' + token });
    const c = res.headers.get('cache-control') || '';
    ok(!/public|s-maxage/.test(c), `${path}: never marked public`, [res.status, c]);
  }
  sql(`DELETE FROM exhibitions WHERE slug='${slug}'`);
  done();
})().catch((e) => { console.error(e); process.exit(1); });
