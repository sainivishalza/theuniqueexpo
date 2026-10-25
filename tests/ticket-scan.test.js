// Scanning with the camera: the "Check tickets" page (admin) and "Send points" (buyer). The browser is given a fake camera
// that films a QR code, so the whole path runs: open the camera, read the code, look the ticket up.
// Headless Chromium has no built-in QR reader, so this is the same JavaScript reader an iPhone uses.
const bcrypt = require('bcryptjs');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHmac } = require('node:crypto');
const { chromium } = require('playwright');
const QRCode = require('qrcode');
const sharp = require('sharp');
const { BASE, sql, ok, done, mkUsers, login } = require('./helpers/common.js');
const { axeViolations } = require('./helpers/browser.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.72.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const secret = () => process.env.JWT_SECRET || /^JWT_SECRET=(.*)$/m.exec(fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8'))[1].trim().replace(/^["']|["']$/g, '');
const ticketCode = (id) => `${id}.${createHmac('sha256', secret()).update(`e-ticket:${id}`).digest('base64url').slice(0, 16)}`;

// A few frames of a camera picture (white page, the QR code in the middle) as a .y4m file Chromium can play as a camera.
async function cameraFile(text, name) {
  const W = 640, H = 480;
  const qr = await QRCode.toBuffer(text, { width: 360, margin: 2, errorCorrectionLevel: 'M' });
  const y = await sharp({ create: { width: W, height: H, channels: 3, background: '#ffffff' } })
    .composite([{ input: qr, gravity: 'centre' }]).greyscale().raw().toBuffer();
  const plane = Buffer.alloc((W / 2) * (H / 2), 128);
  const frames = [];
  for (let i = 0; i < 10; i++) frames.push(Buffer.from('FRAME\n'), y, plane, plane);
  const file = path.join(os.tmpdir(), `${name}-${Date.now()}.y4m`);
  fs.writeFileSync(file, Buffer.concat([Buffer.from(`YUV4MPEG2 W${W} H${H} F10:1 Ip A1:1 C420jpeg\n`), ...frames]));
  return file;
}
const launchWith = (video) => chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-video-capture=${video}`],
});

(async () => {
  const u = await mkUsers('ts');
  const st = Date.now(), pw = bcrypt.hashSync('pass1234', 10);
  const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  // one confirmed registration to check in
  const email = `ts-${st}@test.invalid`;
  sql(`INSERT INTO users (name,email,password_hash,role,country) VALUES ('Scan Visitor','${email}','${pw}','buyer','')`);
  const visitor = Number(sql(`SELECT id FROM users WHERE email='${email}'`));
  sql(`INSERT INTO buyer_profiles (user_id,passport_name,company_name) VALUES (${visitor},'SCAN VISITOR','Scan Trading Ltd')`);
  sql(`INSERT INTO exhibitions (slug,title,start_date,end_date,venue,city,country,industry,description,highlights,exhibitors,visitors,organizer,registration_enabled) VALUES ('ts-${st}','Scan Expo ${st}','${day(10)}','${day(12)}','Hall','Zzscancity','China','X','d','[]',1,'','O',1)`);
  const expo = Number(sql(`SELECT id FROM exhibitions WHERE slug='ts-${st}'`));
  sql(`INSERT INTO expo_registrations (exhibition_id,user_id,status) VALUES (${expo},${visitor},'confirmed')`);
  const rid = Number(sql(`SELECT id FROM expo_registrations WHERE exhibition_id=${expo} AND user_id=${visitor}`));
  const link = `https://theuniqueexpo.com/en/admin/ticket-check?code=${encodeURIComponent(ticketCode(rid))}`;

  const mkContext = (br, token, locale = 'en', width = 375, permissions = ['camera']) => br.newContext({ viewport: { width, height: 800 }, permissions, extraHTTPHeaders: { 'x-forwarded-for': ipn() } }).then(async (c) => {
    await c.addCookies([{ name: 'token', value: token, url: BASE }]);
    return c;
  });

  console.log('\n== the e-ticket QR code is read by the camera');
  let br = await launchWith(await cameraFile(link, 'ticket'));
  for (const locale of ['en', 'ru', 'zh']) {
    const c = await mkContext(br, u.aT, locale);
    const p = await c.newPage();
    await p.goto(`${BASE}/${locale}/admin/ticket-check`, { waitUntil: 'networkidle' });
    const scan = p.getByTestId('scan-ticket');
    await scan.waitFor();
    ok(!/[{}]/.test(await scan.innerText()) && (await scan.innerText()).length > 5, `${locale}: there is a scan button`, await scan.innerText());
    sql(`UPDATE expo_registrations SET status='confirmed', checked_in_at=NULL WHERE id=${rid}`);
    await scan.click();
    await p.getByTestId('qr-camera').waitFor();
    if (locale === 'en') {
      ok(true, 'en: pressing it opens the camera');
      await sleep(400);
      ok((await axeViolations(p)).length === 0, 'en: axe 0 with the camera open');
    }
    await p.getByTestId('ticket-card').waitFor({ timeout: 20000 });
    ok((await p.getByTestId('ticket-card').innerText()).includes('SCAN VISITOR'), `${locale}: the scan shows who the ticket belongs to`);
    ok((await p.getByTestId('qr-camera').count()) === 0, `${locale}: the camera closes by itself`);
    ok((await p.locator('#ticket-code').inputValue()) === ticketCode(rid), `${locale}: and the code is in the box`);
    ok((await scan.count()) === 1, `${locale}: the button is there for the next ticket`);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${locale}: nothing sticks out at 375 px`);
    await p.mouse.move(0, 0);
    await sleep(900);
    const vio = await axeViolations(p);
    ok(vio.length === 0, `${locale}: axe 0 with the ticket shown`, vio);
    if (locale === 'en') {
      await p.getByRole('button', { name: /Let them in/ }).click();
      await p.getByText('Checked in. Welcome!').waitFor();
      ok(sql(`SELECT status FROM expo_registrations WHERE id=${rid}`) === 'attended', 'en: and they can be let in from there');
      await scan.click();
      await p.getByTestId('ticket-card').waitFor({ timeout: 20000 });
      ok(/already|Checked in/i.test(await p.getByTestId('ticket-card').innerText()), 'en: scanning the same ticket again shows it was used');
    }
    await c.close();
  }
  ok((await (await mkContext(br, u.bT)).newPage().then(async (p) => { await p.goto(`${BASE}/en/admin/ticket-check`, { waitUntil: 'networkidle' }); return p.getByTestId('scan-ticket').count(); })) === 0, 'a buyer does not get the page (no scan button)');
  await br.close();

  console.log('\n== another kind of QR code is ignored');
  br = await launchWith(await cameraFile('https://example.com/menu', 'foreign'));
  {
    const c = await mkContext(br, u.aT);
    const p = await c.newPage();
    await p.goto(`${BASE}/en/admin/ticket-check`, { waitUntil: 'networkidle' });
    await p.getByTestId('scan-ticket').click();
    await p.getByTestId('qr-camera').waitFor();
    await sleep(3500);
    ok((await p.getByTestId('ticket-card').count()) === 0 && (await p.getByTestId('qr-camera').count()) === 1, 'a QR code that is not a ticket changes nothing and the camera stays open');
    await p.getByRole('button', { name: 'Close the camera' }).click();
    ok((await p.getByTestId('qr-camera').count()) === 0, 'Close the camera closes it');
    await c.close();
  }
  await br.close();

  console.log('\n== the camera is not allowed');
  br = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  {
    const c = await mkContext(br, u.aT, 'en', 375, []);
    const p = await c.newPage();
    await p.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' }));
    });
    await p.goto(`${BASE}/en/admin/ticket-check`, { waitUntil: 'networkidle' });
    await p.getByTestId('scan-ticket').click();
    await p.getByTestId('scan-problem').waitFor();
    ok(/blocked/i.test(await p.getByTestId('scan-problem').innerText()) && (await p.getByTestId('qr-camera').count()) === 0, 'a blocked camera says so and says what to do');
    ok((await p.locator('#ticket-code').count()) === 1, 'the code can still be typed');
    await sleep(800);
    ok((await axeViolations(p)).length === 0, 'axe 0 with the message');
    await c.close();
    const c2 = await mkContext(br, u.aT, 'en', 375, []);
    const p2 = await c2.newPage();
    await p2.addInitScript(() => { Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true }); });
    await p2.goto(`${BASE}/en/admin/ticket-check`, { waitUntil: 'networkidle' });
    await sleep(500);
    ok((await p2.getByTestId('scan-ticket').count()) === 0 && (await p2.getByText(/cannot open the camera/).count()) === 1, 'a browser with no camera support gets a plain note instead of a button');
    await c2.close();
  }
  await br.close();

  console.log('\n== sending points: the buyer scans a wallet QR code');
  {
    const b2 = `ts2-${st}@test.invalid`;
    sql(`INSERT INTO users (name,email,password_hash,role,country) VALUES ('Scan Friend','${b2}','${pw}','buyer','')`);
    const friendToken = await login(b2);
    const wallet = await (await fetch(BASE + '/api/wallet', { headers: { cookie: 'token=' + friendToken } })).json();
    const codeOf = (o) => (o && typeof o === 'object' ? (typeof o.walletCode === 'string' ? o.walletCode : Object.values(o).map(codeOf).find(Boolean)) : null);
    const wcode = codeOf(wallet);
    ok(/^[A-Za-z0-9_-]{24}$/.test(wcode || ''), 'the friend has a wallet code', Object.keys(wallet));
    br = await launchWith(await cameraFile(`https://theuniqueexpo.com/en/dashboard/buyer/wallet/send?to=${wcode}`, 'wallet'));
    const c = await mkContext(br, u.bT);
    const p = await c.newPage();
    await p.goto(`${BASE}/en/dashboard/buyer/wallet/send`, { waitUntil: 'networkidle' });
    await p.getByRole('button', { name: /Scan/ }).first().click();
    await p.getByTestId('qr-camera').waitFor();
    await p.getByText('Your password').first().waitFor({ timeout: 20000 });
    ok((await p.getByRole('button', { name: /Scan/ }).count()) === 0, 'the wallet QR code is read and the form moves on to the amount');
    ok((await p.getByTestId('qr-camera').count()) === 0, 'and the camera closes');
    await c.close();
    await br.close();
  }
  done();
})().catch((e) => { console.error(e); process.exit(1); });
