// The WeChat QR code in the help box: the admin uploads it (Admin -> Company profile), visitors see "Chat with us on WeChat"
// and the code, and it disappears again when removed.
const { BASE, ok, done, mkUsers } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.71.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);

(async () => {
  const sharp = require('sharp');
  const u = await mkUsers('wq');
  const AH = { cookie: 'token=' + u.aT, 'Content-Type': 'application/json' };
  const BH = { cookie: 'token=' + u.bT, 'Content-Type': 'application/json' };
  const png = await sharp({ create: { width: 220, height: 220, channels: 3, background: '#ffffff' } }).png().toBuffer();
  const dataUrl = 'data:image/png;base64,' + png.toString('base64');
  const post = (image, headers = AH) => fetch(BASE + '/api/admin/wechat-qr', { method: 'POST', headers, body: JSON.stringify({ image }) });
  const profile = async () => (await (await fetch(BASE + '/api/admin/company-profile', { headers: AH })).json()).profile;

  console.log('\n== the picture');
  await fetch(BASE + '/api/admin/wechat-qr', { method: 'DELETE', headers: AH });
  ok((await fetch(BASE + '/api/wechat-qr')).status === 404, 'no picture yet: nothing is served');
  ok((await profile()).wechatQrVersion === '', 'and the site is not told to offer one');
  ok((await post(dataUrl, { 'Content-Type': 'application/json' })).status === 401, 'nobody signed in cannot upload');
  ok((await post(dataUrl, BH)).status === 401, 'a buyer cannot upload');
  ok((await post('data:text/html;base64,PGgxPmhpPC9oMT4=')).status === 400, 'a web page is refused');
  ok((await post('data:image/gif;base64,R0lGODlhAQABAAAAACw=')).status === 400, 'a GIF is refused');
  ok((await post('https://example.com/qr.png')).status === 400, 'a link is refused: only an uploaded picture');
  ok((await post('data:image/png;base64,' + 'A'.repeat(4.5 * 1024 * 1024))).status === 400, 'a picture over 3 MB is refused');
  ok((await fetch(BASE + '/api/admin/wechat-qr', { method: 'DELETE' })).status === 401, 'nobody signed in cannot remove it either');
  ok((await post(dataUrl)).status === 200, 'an admin uploads the picture');
  const got = await fetch(BASE + '/api/wechat-qr');
  const bytes = Buffer.from(await got.arrayBuffer());
  ok(got.status === 200 && got.headers.get('content-type') === 'image/png' && bytes.equals(png), 'visitors get exactly that picture, without signing in');
  ok(got.headers.get('x-content-type-options') === 'nosniff', 'served as a picture only');
  const p1 = await profile();
  ok(/^\d+$/.test(p1.wechatQrVersion), 'the site is told to offer it', p1.wechatQrVersion);
  const saveProfile = (extra) => fetch(BASE + '/api/admin/company-profile', { method: 'PUT', headers: AH, body: JSON.stringify({ ...p1, ...extra }) });
  ok((await saveProfile({ wechatQrVersion: '', wechatId: 'unique_expo' })).status === 200, 'the company details can be saved');
  const p2 = await profile();
  ok(p2.wechatQrVersion === p1.wechatQrVersion && p2.wechatId === 'unique_expo', 'saving them keeps the picture, and keeps the WeChat ID');
  ok((await (await fetch(BASE + '/api/company-profile')).json()).profile.wechatQrVersion === p1.wechatQrVersion, 'the public company details carry only the stamp, not the picture');

  console.log('\n== the help box (375 px)');
  const br = await launch();
  const open = async (locale) => {
    const c = await br.newContext({ viewport: { width: 375, height: 800 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    const p = await c.newPage();
    await p.goto(`${BASE}/${locale}`, { waitUntil: 'networkidle' });
    return [c, p];
  };
  for (const locale of ['en', 'ru', 'zh']) {
    const [c, p] = await open(locale);
    const launcher = p.locator('button[aria-controls], button[aria-expanded]').last();
    await launcher.click();
    const panel = p.getByRole('dialog');
    await panel.waitFor();
    const btn = p.getByTestId('help-wechat');
    ok(await btn.isVisible(), `${locale}: the WeChat button is in the help box`);
    ok(!/[{}]/.test(await btn.innerText()), `${locale}: its text is translated`, await btn.innerText());
    await btn.click();
    await p.getByTestId('wechat-view').waitFor();
    await p.waitForFunction(() => { const i = document.querySelector('[data-testid=wechat-qr]'); return i && i.complete && i.naturalWidth > 0; });
    ok(true, `${locale}: the QR code picture is shown`);
    ok((await p.getByTestId('wechat-id').innerText()).includes('unique_expo'), `${locale}: with the WeChat ID`);
    ok((await p.locator('[data-testid=wechat-view] a[download]').count()) === 1, `${locale}: and a link to save the picture`);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${locale}: nothing sticks out at 375 px`);
    await p.mouse.move(0, 0);
    await sleep(900);
    const vio = await axeViolations(p);
    ok(vio.length === 0, `${locale}: axe 0 with the QR code open`, vio);
    if (locale === 'en') {
      await p.getByRole('button', { name: 'Back to the answers' }).click();
      ok((await p.getByTestId('help-wechat').count()) === 1 && (await p.getByTestId('wechat-view').count()) === 0, 'Back returns to the answers');
      await p.getByTestId('help-wechat').click();
      await p.keyboard.press('Escape');
      await launcher.click();
      await p.getByRole('dialog').waitFor();
      ok((await p.getByTestId('wechat-view').count()) === 0, 'closing the box and opening it again starts at the answers');
    }
    await c.close();
  }

  console.log('\n== the admin screen');
  {
    const c = await br.newContext({ viewport: { width: 375, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    await c.addCookies([{ name: 'token', value: u.aT, url: BASE }]);
    const p = await c.newPage();
    await p.goto(`${BASE}/en/admin/company-profile`, { waitUntil: 'networkidle' });
    await p.getByTestId('wechat-preview').waitFor();
    ok(true, 'the saved QR code is previewed');
    await p.getByRole('button', { name: 'Remove the QR code' }).click();
    await p.getByTestId('wechat-message').waitFor();
    ok(/removed/.test(await p.getByTestId('wechat-message').innerText()) && (await p.getByTestId('wechat-preview').count()) === 0, 'Remove hides the preview');
    ok((await fetch(BASE + '/api/wechat-qr')).status === 404 && (await profile()).wechatQrVersion === '', 'and the picture is gone for visitors');
    await p.setInputFiles('#company-wechatQr', { name: 'qr.png', mimeType: 'image/png', buffer: png });
    await p.getByTestId('wechat-preview').waitFor();
    ok(/saved/.test(await p.getByTestId('wechat-message').innerText()), 'choosing a picture saves it at once');
    ok((await fetch(BASE + '/api/wechat-qr')).status === 200, 'and visitors can see it');
    await p.mouse.move(0, 0);
    await sleep(900);
    const vio = await axeViolations(p);
    ok(vio.length === 0, 'the admin screen: axe 0', vio);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'fits a 375 px phone');
    await c.close();
  }

  console.log('\n== removed: the button goes');
  await fetch(BASE + '/api/admin/wechat-qr', { method: 'DELETE', headers: AH });
  {
    const [c, p] = await open('en');
    await p.locator('button[aria-controls], button[aria-expanded]').last().click();
    await p.getByRole('dialog').waitFor();
    ok((await p.getByTestId('help-wechat').count()) === 0, 'without a picture the help box has no WeChat button');
    await c.close();
  }
  await fetch(BASE + '/api/admin/company-profile', { method: 'PUT', headers: AH, body: JSON.stringify({ ...p1, wechatId: '' }) });
  await br.close();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
