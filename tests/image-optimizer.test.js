// Website pictures are resized and compressed when saved, and the ones already stored can be made smaller from Admin -> Pictures.
const sharp = require('sharp');
const { BASE, sql, ok, done, mkUsers, connect } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.61.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const H = (t) => ({ 'Content-Type': 'application/json', cookie: 'token=' + t, 'x-forwarded-for': ipn() });
const api = (method, path, body, t) => fetch(BASE + path, { method, headers: H(t), body: body ? JSON.stringify(body) : undefined }).then(async (r) => ({ status: r.status, ...(await r.json().catch(() => ({}))) }));
const noisy = (w, h, q = 88) => sharp({ create: { width: w, height: h, channels: 3, background: '#808080', noise: { type: 'gaussian', mean: 128, sigma: 70 } } }).jpeg({ quality: q }).toBuffer();
const url = (buf, type = 'jpeg') => `data:image/${type};base64,${buf.toString('base64')}`;
const bytesOf = (dataUrl) => Math.floor((dataUrl.split(',')[1].length * 3) / 4);
const decode = (dataUrl) => Buffer.from(dataUrl.split(',')[1], 'base64');

(async () => {
  const u = await mkUsers('io');
  const tag = `io${Date.now()}`;
  const big = await noisy(3200, 2100);
  const small = await sharp({ create: { width: 200, height: 150, channels: 3, background: '#2a7' } }).jpeg().toBuffer();
  const alpha = await sharp({ create: { width: 2600, height: 1800, channels: 4, background: { r: 20, g: 120, b: 200, alpha: 0.5 }, noise: { type: 'gaussian', mean: 128, sigma: 40 } } }).png().toBuffer();
  const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  console.log(`  (test pictures: big ${(big.length / 1e6).toFixed(1)} MB, transparent png ${(alpha.length / 1e6).toFixed(1)} MB)`);
  const reader = await connect();
  const stored = async (table, col, where) => String((await reader.query(`SELECT ${col} AS v FROM ${table} WHERE ${where}`))[0][0].v);

  console.log('\n== on upload');
  let r = await api('POST', '/api/admin/exhibitions', { slug: `${tag}-a`, title: 'Optimise A', startDate: '2032-01-01', endDate: '2032-01-03', image: url(big), galleryImages: [url(big), url(small), 'https://example.com/pic.jpg'] }, u.aT);
  ok(r.status === 201, 'a 3200 px, several-MB poster is accepted', r);
  const img = await stored('exhibitions', 'image', `slug='${tag}-a'`);
  const meta = await sharp(decode(img)).metadata();
  ok(bytesOf(img) < big.length * 0.7 && Math.max(meta.width, meta.height) <= 1800, `it is stored smaller (${(big.length / 1e6).toFixed(1)} MB -> ${(bytesOf(img) / 1e6).toFixed(2)} MB) and no longer than 1800 px (${meta.width}x${meta.height})`);
  ok(meta.format === 'jpeg' && /^data:image\/jpeg;/.test(img), 'still a JPEG');
  ok(Math.abs(meta.width / meta.height - 3200 / 2100) < 0.02, 'the proportions are kept');
  const gal = (await reader.query(`SELECT gallery_images AS v FROM exhibitions WHERE slug='${tag}-a'`))[0][0].v;
  ok(bytesOf(gal[0]) < big.length * 0.7 && gal[1] === url(small) && gal[2] === 'https://example.com/pic.jpg', 'gallery: the big one is smaller, the small one and the link are untouched');
  r = await api('POST', '/api/admin/exhibitions', { slug: `${tag}-b`, title: 'Optimise B', startDate: '2032-01-01', endDate: '2032-01-03', image: url(small) }, u.aT);
  ok(r.status === 201 && await stored('exhibitions', 'image', `slug='${tag}-b'`) === url(small), 'a small picture is stored exactly as uploaded');
  r = await api('POST', '/api/admin/exhibitions', { slug: `${tag}-c`, title: 'Optimise C', startDate: '2032-01-01', endDate: '2032-01-03', image: url(alpha, 'png') }, u.aT);
  const aimg = await stored('exhibitions', 'image', `slug='${tag}-c'`);
  const ameta = await sharp(decode(aimg)).metadata();
  ok(r.status === 201 && ameta.format === 'png' && ameta.hasAlpha === true && Math.max(ameta.width, ameta.height) <= 1800, 'a transparent PNG stays a PNG with its transparency, resized', ameta);
  r = await api('POST', '/api/admin/exhibitions', { slug: `${tag}-d`, title: 'Optimise D', startDate: '2032-01-01', endDate: '2032-01-03', image: url(gif, 'gif') }, u.aT);
  ok(r.status === 201 && await stored('exhibitions', 'image', `slug='${tag}-d'`) === url(gif, 'gif'), 'a GIF is left alone');
  r = await api('POST', '/api/admin/exhibitions', { slug: `${tag}-e`, title: 'Optimise E', startDate: '2032-01-01', endDate: '2032-01-03', image: 'data:image/png;base64,' + Buffer.from('not really a picture'.repeat(20000)).toString('base64') }, u.aT);
  ok(r.status === 201 || r.status === 400, 'a "picture" that is not one is still handled by the old checks (not crashed)', r.status);
  r = await api('POST', '/api/admin/exhibitions', { slug: `${tag}-f`, title: 'Optimise F', startDate: '2032-01-01', endDate: '2032-01-03', image: 'data:text/html;base64,PGgxPmhpPC9oMT4=' }, u.aT);
  ok(r.status === 400, 'a non-image data URL is still refused');
  r = await api('POST', '/api/admin/team-members', { name: 'Optimise Person', role: 'Tester', photo: url(big), displayOrder: 1 }, u.aT);
  const tm = sql(`SELECT id FROM team_members WHERE name='Optimise Person' ORDER BY id DESC LIMIT 1`);
  ok(r.status < 300 && bytesOf(await stored('team_members', 'photo', `id=${tm}`)) < big.length * 0.7, 'team photos are optimised too');
  r = await api('POST', '/api/admin/tours', { slug: `${tag}-t`, title: 'Optimise Tour', startDate: '2032-02-01', endDate: '2032-02-03', image: url(big) }, u.aT);
  ok(r.status < 300 && bytesOf(await stored('tours', 'image', `slug='${tag}-t'`)) < big.length * 0.7, 'and tour pictures');

  console.log('\n== the pictures already stored');
  // pictures stored the old way (straight into the table, as a big phone photo)
  const conn = await connect();
  const oldUrl = url(big);
  await conn.query(`INSERT INTO exhibitions (slug,title,start_date,end_date,image,gallery_images) VALUES (?,?,?,?,?,?)`, [`${tag}-old`, 'Optimise Old', '2032-03-01', '2032-03-03', oldUrl, JSON.stringify([oldUrl, url(small)])]);
  await conn.query(`INSERT INTO blog_posts (slug,title,excerpt,content,cover_image,published) VALUES (?,?,?,?,?,1)`, [`${tag}-blog`, 'Optimise Blog', 'x', 'y', oldUrl]);
  ok((await api('GET', '/api/admin/image-optimizer', null, u.bT)).status === 401 && (await api('POST', '/api/admin/image-optimizer', { apply: false }, u.bT)).status === 401, 'a buyer cannot use it');
  ok((await api('POST', '/api/admin/image-optimizer', { apply: 'yes' }, u.aT)).code === 'bad_request' && (await api('POST', '/api/admin/image-optimizer', { apply: false, cursor: "0:0'; DROP" }, u.aT)).code === 'bad_request', 'bad input is refused');
  const sizes = await api('GET', '/api/admin/image-optimizer', null, u.aT);
  ok(sizes.totalBytes >= big.length * 3 && sizes.sources.some((s) => s.table === 'blog_posts' && s.count >= 1), 'it reports how big the stored pictures are', sizes.totalBytes);
  const loop = async (apply) => {
    let cursor = null; const sum = { scanned: 0, changed: 0, before: 0, after: 0, kept: 0, calls: 0 };
    for (let i = 0; i < 400; i++) {
      const b = await api('POST', '/api/admin/image-optimizer', { cursor, apply }, u.aT);
      if (b.status !== 200) return { error: b };
      for (const k of ['scanned', 'changed', 'before', 'after', 'kept']) sum[k] += b[k];
      sum.calls++;
      if (b.next === null) break;
      cursor = b.next;
    }
    return sum;
  };
  const beforeRow = (await conn.query(`SELECT LENGTH(image) AS n FROM exhibitions WHERE slug=?`, [`${tag}-old`]))[0][0].n;
  const check = await loop(false);
  const afterCheckRow = (await conn.query(`SELECT LENGTH(image) AS n FROM exhibitions WHERE slug=?`, [`${tag}-old`]))[0][0].n;
  ok(check.changed >= 2 && check.after < check.before * 0.7, `"check" measures what could be saved (${(check.before / 1e6).toFixed(1)} -> ${(check.after / 1e6).toFixed(1)} MB)`, check);
  ok(afterCheckRow === beforeRow, 'and changes nothing');
  const applied = await loop(true);
  const [[oldRow]] = await conn.query(`SELECT image, gallery_images FROM exhibitions WHERE slug=?`, [`${tag}-old`]);
  const om = await sharp(decode(oldRow.image)).metadata();
  ok(applied.changed >= 2 && oldRow.image.length < beforeRow * 0.7 && Math.max(om.width, om.height) <= 1800, 'applying replaces the poster with a smaller copy', { applied, len: oldRow.image.length, beforeRow });
  const og = typeof oldRow.gallery_images === 'string' ? JSON.parse(oldRow.gallery_images) : oldRow.gallery_images;
  ok(bytesOf(og[0]) < big.length * 0.7 && og[1] === url(small), 'gallery lists are handled picture by picture');
  const [[blogRow]] = await conn.query(`SELECT cover_image FROM blog_posts WHERE slug=?`, [`${tag}-blog`]);
  ok(blogRow.cover_image.length < beforeRow * 0.7, 'blog covers too');
  const again = await loop(true);
  ok(again.changed === 0, 'running it again changes nothing (already small)', again);
  ok(sql(`SELECT COUNT(*) FROM admin_audit_log WHERE action IN ('images_optimize_started','images_optimize_finished')`) >= 2, 'the start and the end are in the activity log');

  console.log('\n== the screen (en / ru / zh, 375 px)');
  const br = await launch();
  for (const locale of ['en', 'ru', 'zh']) {
    const c = await br.newContext({ viewport: { width: 375, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    await c.addCookies([{ name: 'token', value: u.aT, url: BASE }]);
    const p = await c.newPage(); await p.goto(`${BASE}/${locale}/admin/image-optimizer`, { waitUntil: 'domcontentloaded' });
    await p.getByTestId('pictures-sizes').waitFor();
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${locale}: no sideways scrolling`);
    await sleep(800);
    const vio = await axeViolations(p); ok(vio.length === 0, `${locale}: axe 0`, vio);
    if (locale === 'en') {
      await p.getByRole('button', { name: 'Check how much can be saved' }).click();
      await p.getByTestId('pictures-result').getByText(/Done\./).waitFor({ timeout: 60000 });
      ok(/Check \(nothing was changed\)/.test(await p.getByTestId('pictures-result').innerText()), 'en: the check runs and says nothing was changed');
    }
    await c.close();
  }
  await br.close();
  await conn.end();
  await reader.end();
  sql(`DELETE FROM exhibitions WHERE slug LIKE '${tag}%'`);
  sql(`DELETE FROM blog_posts WHERE slug LIKE '${tag}%'`);
  sql(`DELETE FROM tours WHERE slug LIKE '${tag}%'`);
  sql(`DELETE FROM team_members WHERE name='Optimise Person'`);
  done();
})().catch((e) => { console.error(e); process.exit(1); });
