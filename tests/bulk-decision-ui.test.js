// The admin's registrations page: tick rows, approve or reject them together.
const bcrypt = require('bcryptjs');
const { BASE, sql, ok, done, mkUsers, connect, SHOTS } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const ip = () => '10.5.' + Math.floor(Math.random() * 250) + '.' + (Math.floor(Math.random() * 250) + 1);

(async () => {
  const db = await connect();
  const st = Date.now();
  const u = await mkUsers('bu2');
  const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const slug = `bdu-${st}`;
  await db.query('INSERT INTO exhibitions (slug,title,start_date,end_date,city,registration_enabled) VALUES (?,?,?,?,?,1)', [slug, `Decide UI ${st}`, day(30), day(33), 'Guangzhou']);
  const [[ex]] = await db.query('SELECT id FROM exhibitions WHERE slug=?', [slug]);
  const h = bcrypt.hashSync('pass1234', 10);
  const schema = JSON.stringify([{ id: 'f_name', label: 'Full name', type: 'text', required: true }]);
  const people = [['Alice', 'pending'], ['Bruno', 'pending'], ['Carla', 'pending'], ['Dmitri', 'confirmed'], ['Elena', 'rejected']];
  const ids = {};
  for (const [name, status] of people) {
    sql(`INSERT INTO users (name,email,password_hash,role,country,status) VALUES ('${name} Decide','${name.toLowerCase()}-${st}@test.invalid','${h}','buyer','','active')`);
    const uid = Number(sql(`SELECT id FROM users WHERE email='${name.toLowerCase()}-${st}@test.invalid'`));
    await db.query('INSERT INTO expo_registrations (exhibition_id,user_id,custom_answers,form_schema_snapshot,status) VALUES (?,?,?,?,?)', [ex.id, uid, JSON.stringify({ f_name: `${name} Decide` }), schema, status]);
    ids[name] = Number(sql(`SELECT id FROM expo_registrations WHERE exhibition_id=${ex.id} AND user_id=${uid}`));
  }
  const dbStatus = (name) => sql(`SELECT status FROM expo_registrations WHERE id=${ids[name]}`);

  const br = await launch();
  const open = async (vp = { width: 1280, height: 1000 }, loc = 'en') => {
    const c = await br.newContext({ viewport: vp, extraHTTPHeaders: { 'x-forwarded-for': ip() } });
    await c.addCookies([{ name: 'token', value: u.aT, url: BASE }]);
    const p = await c.newPage();
    await p.goto(BASE + `/${loc}/admin/exhibitions/${slug}/registrations`, { waitUntil: 'networkidle' });
    await p.getByText('Alice Decide').waitFor();
    return [c, p];
  };

  console.log('\n== choosing rows');
  let [c, p] = await open();
  ok((await p.getByText(/registrations? selected/).count()) === 0, 'no bar until something is ticked');
  await p.getByLabel('Select Alice Decide').check();
  ok(await p.getByText('1 registration selected').isVisible() && await p.getByRole('button', { name: 'Approve', exact: true }).isVisible() && await p.getByRole('button', { name: 'Reject', exact: true }).isVisible(), 'ticking a row shows how many are selected, with Approve and Reject');
  await p.getByLabel('Select all shown').check();
  ok(await p.getByText('5 registrations selected').isVisible(), '"Select all shown" ticks every row');
  await p.getByLabel('Select all shown').uncheck();
  ok((await p.getByText(/registrations? selected/).count()) === 0, 'and unticks them');
  await p.getByRole('button', { name: /^pending \(3\)/ }).click();
  await p.getByLabel('Select all shown').check();
  ok(await p.getByText('3 registrations selected').isVisible(), 'with a status filter it ticks only the rows shown');
  await p.getByRole('button', { name: /^All \(5\)/ }).click();
  ok((await p.getByText(/registrations? selected/).count()) === 0, 'changing the filter clears the selection (nothing hidden is acted on)');
  const v1 = await axeViolations(p); ok(v1.length === 0, 'the list: axe 0 violations', v1);

  console.log('\n== approving together');
  await p.getByRole('button', { name: /^pending \(3\)/ }).click();
  await p.getByLabel('Select all shown').check();
  await p.getByRole('button', { name: 'Approve', exact: true }).click();
  const dlg = p.getByRole('dialog', { name: 'Approve 3 registrations' });
  await dlg.waitFor();
  ok(await dlg.getByLabel('Buyers confirm attendance by').inputValue() === day(29), 'the dialog proposes the exhibition\'s default confirm-by date (the day before it starts)', await dlg.getByLabel('Buyers confirm attendance by').inputValue());
  const v2 = await axeViolations(p); ok(v2.length === 0, 'the dialog: axe 0 violations', v2);
  await p.screenshot({ path: SHOTS + '/bulk-decision-dialog.png' });
  await dlg.getByLabel('Buyers confirm attendance by').fill(day(25));
  await dlg.getByRole('button', { name: 'Approve 3 registrations' }).click();
  await dlg.getByRole('status').waitFor();
  ok((await dlg.getByRole('status').innerText()) === '3 registrations updated.', 'it reports how many were updated');
  ok(['Alice', 'Bruno', 'Carla'].every((n) => dbStatus(n) === 'approved') && sql(`SELECT confirm_by FROM expo_registrations WHERE id=${ids.Alice}`).startsWith(day(25)), 'they are approved with the chosen date');
  await dlg.getByRole('button', { name: 'Close' }).click();
  await p.getByLabel('Change status for Alice Decide').waitFor();
  ok((await p.getByLabel('Change status for Alice Decide').inputValue()) === 'approved', 'the list shows them as approved without reloading the page');
  ok((await p.getByText(/registrations? selected/).count()) === 0, 'and the selection is cleared');

  console.log('\n== rejecting, with one that must be left alone');
  await p.getByLabel('Select Alice Decide').check();
  await p.getByLabel('Select Dmitri Decide').check();
  await p.getByRole('button', { name: 'Reject', exact: true }).click();
  const dlg2 = p.getByRole('dialog', { name: 'Reject 2 registrations' });
  await dlg2.waitFor();
  ok(await dlg2.getByLabel('Buyers confirm attendance by').count() === 0, 'rejecting asks for no date');
  await dlg2.getByRole('button', { name: 'Reject 2 registrations' }).click();
  await dlg2.getByRole('status').waitFor();
  const txt = await dlg2.innerText();
  ok(/1 registration updated\./.test(txt) && /1 was left as it is/.test(txt), 'it says one was rejected and one was left as it is (Dmitri had already confirmed)', txt);
  ok(dbStatus('Alice') === 'rejected' && dbStatus('Dmitri') === 'confirmed', 'Alice is rejected, Dmitri stays confirmed');
  await dlg2.getByRole('button', { name: 'Close' }).click();
  await p.screenshot({ path: SHOTS + '/bulk-decision-done.png' });
  await c.close();

  console.log('\n== Cancel leaves everything as it was');
  [c, p] = await open();
  await p.getByLabel('Select Bruno Decide').check();
  await p.getByRole('button', { name: 'Reject', exact: true }).click();
  await p.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  ok((await p.getByRole('dialog').count()) === 0 && dbStatus('Bruno') === 'approved', 'cancelling the dialog changes nothing');
  await c.close();

  console.log('\n== other languages and a phone');
  sql(`UPDATE expo_registrations SET status='pending', approved_at=NULL WHERE id IN (${ids.Alice},${ids.Bruno})`);
  for (const [loc, approve, title] of [['ru', 'Одобрить', 'Одобрить 2 регистрации'], ['zh', '批准', '批准 2 条报名']]) {
    [c, p] = await open({ width: 375, height: 800 }, loc);
    await p.getByLabel(/Alice Decide/).first().check();
    await p.getByLabel(/Bruno Decide/).first().check();
    await p.getByRole('button', { name: approve, exact: true }).click();
    const d = p.getByRole('dialog', { name: title });
    await d.waitFor();
    const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const raw = await p.evaluate(() => /adminBulkDecision\./.test(document.body.innerText));
    ok(over <= 0 && !raw, `${loc} 375px: the dialog fits and is in words`, [over, raw]);
    const v = await axeViolations(p); ok(v.length === 0, `${loc}: axe 0 violations`, v);
    await c.close();
  }

  await db.query('DELETE FROM expo_registrations WHERE exhibition_id=?', [ex.id]);
  await db.query('DELETE FROM exhibitions WHERE id=?', [ex.id]);
  sql(`DELETE FROM users WHERE email LIKE '%-${st}@test.invalid' AND name LIKE '% Decide'`);
  await db.end(); await br.close();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
