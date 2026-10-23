// Cancelling several of your own registrations at once.
const { BASE, sql, ok, done, mkUsers, connect, SHOTS } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const ip = () => '10.9.' + Math.floor(Math.random() * 250) + '.' + (Math.floor(Math.random() * 250) + 1);
const H = (t) => ({ 'Content-Type': 'application/json', cookie: 'token=' + t, 'x-forwarded-for': ip() });
const post = (t, body) => fetch(BASE + '/api/expo-registrations/cancel-many', { method: 'POST', headers: H(t), body: JSON.stringify(body) });

(async () => {
  const db = await connect();
  const st = Date.now();
  const S = String(st).slice(-6);
  const u = await mkUsers('bc');
  const other = await mkUsers('bo');
  const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const expos = [];
  for (let i = 1; i <= 8; i++) {
    const slug = `bc-${i}-${st}`;
    await db.query('INSERT INTO exhibitions (slug,title,start_date,end_date,city,registration_enabled) VALUES (?,?,?,?,?,1)', [slug, `Cancelme ${i} ${S}`, day(20 + i * 5), day(23 + i * 5), 'Guangzhou']);
    const [[row]] = await db.query('SELECT id FROM exhibitions WHERE slug=?', [slug]);
    expos.push({ slug, id: row.id, title: `Cancelme ${i} ${S}` });
  }
  const reg = async (x, uid, status, extra = '') => { await db.query(`INSERT INTO expo_registrations (exhibition_id,user_id,custom_answers,form_schema_snapshot,status${extra ? ',' + extra.split('=')[0] : ''}) VALUES (?,?,'{}','[]',?${extra ? ',' + extra.split('=')[1] : ''})`, [x.id, uid, status]); return Number(sql(`SELECT id FROM expo_registrations WHERE exhibition_id=${x.id} AND user_id=${uid}`)); };
  const r1 = await reg(expos[0], u.bId, 'pending');
  const r2 = await reg(expos[1], u.bId, 'approved');
  const r3 = await reg(expos[2], u.bId, 'confirmed');
  const r4 = await reg(expos[3], u.bId, 'rejected');
  const r5 = await reg(expos[4], u.bId, 'attended');
  const r6 = await reg(expos[5], u.bId, 'approved', `confirm_by='${day(-2)}'`);   // approved but past its confirm-by date: expired
  const r7 = await reg(expos[6], u.bId, 'cancelled');
  const rx = await reg(expos[0], other.bId, 'pending');                              // someone else's
  const statusOf = (id) => sql(`SELECT status FROM expo_registrations WHERE id=${id}`);

  console.log('\n== the API');
  ok((await fetch(BASE + '/api/expo-registrations/cancel-many', { method: 'POST', body: '{}' })).status === 401, 'signed-out is refused');
  let r = await post(u.bT, { ids: [] }); ok(r.status === 400, 'no registrations chosen is refused');
  r = await post(u.bT, { ids: 'x' }); ok(r.status === 400, 'a malformed list is refused');
  r = await post(u.bT, { ids: Array.from({ length: 41 }, (_, i) => i + 1) }); ok(r.status === 400, 'more than 40 is refused');
  r = await post(u.bT, { ids: [-1, 0, 1.5, 'a'] }); ok(r.status === 400, 'ids that are not positive whole numbers leave nothing, so are refused');
  ok(['pending', 'approved', 'confirmed'].every((s, i) => statusOf([r1, r2, r3][i]) === s), 'nothing changed so far');
  r = await post(u.bT, { ids: [r1, r2, r3, r4, r5, r6, r7, rx, 999999999] });
  const j = await r.json();
  ok(r.status === 200 && j.cancelled.sort().join() === [r1, r2, r3].sort().join(), 'pending, approved and confirmed registrations are cancelled', j);
  ok(j.notCancelled.sort().join() === [r4, r5, r6, r7, rx, 999999999].sort().join(), 'rejected, attended, expired and already cancelled ones are not, nor is someone else\'s, nor an unknown id', j.notCancelled);
  ok(statusOf(r1) === 'cancelled' && statusOf(r2) === 'cancelled' && statusOf(r3) === 'cancelled' && sql(`SELECT cancelled_at IS NOT NULL FROM expo_registrations WHERE id=${r1}`) === '1', 'they are cancelled, with the time');
  ok(statusOf(r4) === 'rejected' && statusOf(r5) === 'attended' && statusOf(r6) === 'approved' && statusOf(rx) === 'pending', 'the others are untouched (and the other person\'s is still pending)');
  r = await post(u.bT, { ids: [r1] }); const again = await r.json(); ok(again.cancelled.length === 0 && again.notCancelled.length === 1, 'cancelling again changes nothing');

  console.log('\n== the screen');
  sql(`UPDATE expo_registrations SET status='pending', cancelled_at=NULL WHERE id IN (${r1},${r2})`);
  sql(`UPDATE expo_registrations SET status='confirmed', cancelled_at=NULL WHERE id=${r3}`);
  const br = await launch();
  const open = async (loc = 'en', vp = { width: 1100, height: 1000 }) => {
    const c = await br.newContext({ viewport: vp, extraHTTPHeaders: { 'x-forwarded-for': ip() } });
    await c.addCookies([{ name: 'token', value: u.bT, url: BASE }]);
    const p = await c.newPage();
    await p.goto(BASE + `/${loc}/dashboard/buyer/registrations`, { waitUntil: 'networkidle' });
    return [c, p];
  };
  let [c, p] = await open();
  await p.getByRole('heading', { name: expos[0].title }).waitFor();
  ok(await p.getByText('Tick the registrations you want to cancel.').isVisible(), 'with two or more that can be cancelled, a hint says to tick them');
  ok(await p.getByLabel(`Select ${expos[0].title}`).isVisible() && await p.getByLabel(`Select ${expos[2].title}`).isVisible() && (await p.getByLabel(`Select ${expos[3].title}`).count()) === 0 && (await p.getByLabel(`Select ${expos[4].title}`).count()) === 0, 'only those that can be cancelled have a tick (not rejected or attended ones)');
  await p.getByLabel(`Select ${expos[0].title}`).check(); await p.getByLabel(`Select ${expos[2].title}`).check();
  ok(await p.getByText('2 registrations selected').isVisible(), 'the bar counts the ticks');
  const v1 = await axeViolations(p); ok(v1.length === 0, 'the list with ticks: axe 0 violations', v1);
  await p.getByRole('button', { name: 'Cancel 2 registrations' }).click();
  const dlg = p.getByRole('dialog', { name: 'Cancel 2 registrations?' });
  await dlg.waitFor();
  ok(await dlg.getByText(expos[0].title).isVisible() && await dlg.getByText(expos[2].title).isVisible() && !(await dlg.getByText(expos[1].title).count()), 'the dialog lists exactly those two');
  const v2 = await axeViolations(p); ok(v2.length === 0, 'the dialog: axe 0 violations', v2);
  await p.screenshot({ path: SHOTS + '/bulk-cancel-dialog.png' });
  await dlg.getByRole('button', { name: 'Keep them' }).click();
  ok((await p.getByRole('dialog').count()) === 0 && statusOf(r1) === 'pending', '"Keep them" closes it and changes nothing');
  await p.getByRole('button', { name: 'Cancel 2 registrations' }).click();
  await p.getByRole('dialog').getByRole('button', { name: 'Yes, cancel them' }).click();
  const st2 = p.getByRole('dialog').getByRole('status');
  await st2.waitFor();
  ok((await st2.innerText()) === '2 registrations cancelled.', 'it reports how many were cancelled');
  ok(statusOf(r1) === 'cancelled' && statusOf(r3) === 'cancelled' && statusOf(r2) === 'pending', 'those two are cancelled, the unticked one is not');
  await p.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  await p.getByText('Cancelled', { exact: true }).first().waitFor();
  ok((await p.getByText('Tick the registrations you want to cancel.').count()) === 0 && (await p.getByText(/registrations? selected/).count()) === 0, 'the list updates: one left that can be cancelled, so no more ticks');
  ok((await p.getByLabel(/^Select Cancelme/).count()) === 0, 'a single cancellable registration has no tick (it is cancelled on its exhibition page)');
  await c.close();

  console.log('\n== other languages');
  sql(`UPDATE expo_registrations SET status='pending', cancelled_at=NULL WHERE id IN (${r1},${r3})`);
  for (const [loc, hint, confirmTitle] of [['ru', 'Отметьте регистрации, которые хотите отменить.', 'Отменить 2 регистрации?'], ['zh', '勾选您想取消的报名。', '取消 2 条报名？']]) {
    [c, p] = await open(loc, { width: 375, height: 800 });
    await p.getByText(hint).waitFor();
    const sel = (x) => p.getByLabel(loc === 'ru' ? `Выбрать: ${x.title}` : `选择 ${x.title}`, { exact: true });
    await sel(expos[0]).check(); await sel(expos[1]).check();
    await p.getByRole('button', { name: new RegExp(loc === 'ru' ? 'Отменить 2' : '取消 2') }).click();
    const d = p.getByRole('dialog', { name: confirmTitle });
    await d.waitFor();
    const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const raw = await p.evaluate(() => /cancelMany\./.test(document.body.innerText));
    ok(over <= 0 && !raw, `${loc} 375px: the dialog fits and is in words`, [over, raw]);
    const v = await axeViolations(p); ok(v.length === 0, `${loc}: axe 0 violations`, v);
    await c.close();
  }

  await db.query('DELETE FROM expo_registrations WHERE exhibition_id IN (?)', [expos.map((e) => e.id)]);
  await db.query('DELETE FROM exhibitions WHERE id IN (?)', [expos.map((e) => e.id)]);
  await db.end(); await br.close();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
