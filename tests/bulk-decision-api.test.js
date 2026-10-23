// Approving or rejecting several exhibition registrations at once.
const bcrypt = require('bcryptjs');
const { BASE, sql, ok, done, mkUsers, connect } = require('./helpers/common.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ip = () => '10.4.' + Math.floor(Math.random() * 250) + '.' + (Math.floor(Math.random() * 250) + 1);
const H = (t) => ({ 'Content-Type': 'application/json', cookie: 'token=' + t, 'x-forwarded-for': ip() });
const post = (t, body) => fetch(BASE + '/api/admin/expo-registrations/bulk-status', { method: 'POST', headers: H(t), body: JSON.stringify(body) });

(async () => {
  const db = await connect();
  const st = Date.now();
  const u = await mkUsers('bd');
  const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const mkExpo = async (tag, startIn) => {
    const slug = `bd-${tag}-${st}`;
    await db.query('INSERT INTO exhibitions (slug,title,start_date,end_date,city,registration_enabled) VALUES (?,?,?,?,?,1)', [slug, `Decide ${tag} ${st}`, day(startIn), day(startIn + 3), 'Guangzhou']);
    const [[row]] = await db.query('SELECT id FROM exhibitions WHERE slug=?', [slug]);
    return { slug, id: row.id, start: day(startIn) };
  };
  const E1 = await mkExpo('one', 30), E2 = await mkExpo('two', 50);
  const h = bcrypt.hashSync('pass1234', 10);
  const mkBuyer = (tag) => {
    sql(`INSERT INTO users (name,email,password_hash,role,country,status) VALUES ('Dec ${tag}','dec-${tag}-${st}@test.invalid','${h}','buyer','','active')`);
    return Number(sql(`SELECT id FROM users WHERE email='dec-${tag}-${st}@test.invalid'`));
  };
  const reg = (expo, uid, status) => {
    sql(`INSERT INTO expo_registrations (exhibition_id,user_id,custom_answers,form_schema_snapshot,status) VALUES (${expo.id},${uid},'{}','[]','${status}')`);
    return Number(sql(`SELECT id FROM expo_registrations WHERE exhibition_id=${expo.id} AND user_id=${uid}`));
  };
  const statusOf = (id) => sql(`SELECT status FROM expo_registrations WHERE id=${id}`);
  const row = (id) => sql(`SELECT CONCAT_WS('|',status,IFNULL(confirm_by,''),IF(approved_at IS NULL,'noappr','appr')) FROM expo_registrations WHERE id=${id}`);

  const statuses = ['pending', 'rejected', 'approved', 'confirmed', 'attended', 'cancelled', 'absent'];
  const buyers = {}; const regs = {};
  for (const s of statuses) { buyers[s] = mkBuyer(s); regs[s] = reg(E1, buyers[s], s); }
  const b2 = mkBuyer('two'), r2 = reg(E2, b2, 'pending');

  const auditFloor = Number(sql('SELECT IFNULL(MAX(id),0) FROM admin_audit_log'));
  console.log('\n== who can use it');
  ok((await fetch(BASE + '/api/admin/expo-registrations/bulk-status', { method: 'POST', body: '{}' })).status === 401, 'signed-out is refused');
  ok((await post(u.bT, { ids: [regs.pending], status: 'approved' })).status === 401, 'a buyer is refused');
  ok(statusOf(regs.pending) === 'pending', 'and nothing changed');

  console.log('\n== refusals');
  let r = await post(u.aT, { ids: [], status: 'approved' }); ok(r.status === 400 && (await r.json()).code === 'none', 'nothing selected');
  r = await post(u.aT, { ids: 'x', status: 'approved' }); ok(r.status === 400, 'a malformed list');
  r = await post(u.aT, { ids: Array.from({ length: 201 }, (_, i) => i + 1), status: 'approved' }); ok(r.status === 400 && (await r.json()).code === 'too_many', 'more than 200');
  r = await post(u.aT, { ids: [regs.pending], status: 'confirmed' }); ok(r.status === 400 && (await r.json()).code === 'invalid_status', 'only approve or reject is allowed in bulk');
  r = await post(u.aT, { ids: [regs.pending], status: 'approved', confirmBy: '2026-13-45' }); ok(r.status === 400 && (await r.json()).code === 'invalid_date', 'a bad date');
  r = await post(u.aT, { ids: [-1, 0, 1.5, 'a'], status: 'approved' }); ok(r.status === 400, 'ids that are not positive whole numbers are ignored (nothing left, so refused)');
  ok(statusOf(regs.pending) === 'pending', 'nothing changed');

  console.log('\n== approving');
  const date = day(40);
  r = await post(u.aT, { ids: statuses.map((s) => regs[s]).concat([r2, 999999999]), status: 'approved', confirmBy: date });
  let j = await r.json();
  ok(r.status === 200 && j.updated === 3 && j.unchanged === 1 && j.skipped === 4 && j.notFound === 1, 'pending, rejected and the other exhibition\'s pending are approved; already approved is unchanged; confirmed/attended/cancelled/absent are skipped; the unknown id is reported', j);
  ok(row(regs.pending) === `approved|${date}|appr` && row(regs.rejected) === `approved|${date}|appr` && row(r2) === `approved|${date}|appr`, 'with the confirm-by date and the approval time');
  ok(['confirmed', 'attended', 'cancelled', 'absent'].every((s) => statusOf(regs[s]) === s), 'buyers who already confirmed, attended, cancelled or were absent were left alone');
  ok(j.results.find((x) => x.id === regs.approved).outcome === 'unchanged' && j.results.find((x) => x.id === regs.confirmed).outcome === 'skipped', 'each result says what happened');

  console.log('\n== each exhibition\'s own default date');
  sql(`UPDATE expo_registrations SET status='pending', approved_at=NULL, confirm_by=NULL WHERE id IN (${regs.pending},${r2})`);
  r = await post(u.aT, { ids: [regs.pending, r2], status: 'approved' }); j = await r.json();
  const [[d1]] = await db.query('SELECT confirm_by FROM expo_registrations WHERE id=?', [regs.pending]);
  const [[d2]] = await db.query('SELECT confirm_by FROM expo_registrations WHERE id=?', [r2]);
  const iso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
  ok(j.updated === 2 && iso(d1.confirm_by) && iso(d2.confirm_by) && iso(d1.confirm_by) !== iso(d2.confirm_by) && iso(d1.confirm_by) < E1.start && iso(d2.confirm_by) < E2.start, 'with no date given each gets its own exhibition\'s default, before that exhibition starts', [iso(d1.confirm_by), iso(d2.confirm_by)]);

  console.log('\n== rejecting');
  sql(`UPDATE expo_registrations SET status='pending', approved_at=NULL, confirm_by=NULL WHERE id=${regs.rejected}`);
  r = await post(u.aT, { ids: statuses.map((s) => regs[s]), status: 'rejected' }); j = await r.json();
  ok(r.status === 200 && j.updated === 3 && j.unchanged === 0 && j.skipped === 4, 'pending and approved ones are rejected (three of them); confirmed, attended, cancelled and absent are skipped', j);
  ok(statusOf(regs.pending) === 'rejected' && statusOf(regs.rejected) === 'rejected' && statusOf(regs.approved) === 'rejected', 'they are rejected');
  ok(['confirmed', 'attended', 'cancelled', 'absent'].every((s) => statusOf(regs[s]) === s), 'the confirmed/attended/cancelled/absent are still as they were');
  r = await post(u.aT, { ids: [regs.pending], status: 'rejected' }); j = await r.json(); ok(j.updated === 0 && j.unchanged === 1, 'rejecting again changes nothing');

  console.log('\n== the buyers are told, and it is logged');
  await sleep(1500);
  const kinds = (uid) => sql(`SELECT kind FROM user_notifications WHERE user_id=${uid} ORDER BY id`).split('\n').filter(Boolean);
  ok(kinds(buyers.pending).join() === 'registrationApproved,registrationApproved,registrationRejected', 'a buyer sees each decision on the website', kinds(buyers.pending));
  ok(kinds(buyers.rejected).join() === 'registrationApproved,registrationRejected' && kinds(buyers.approved).join() === 'registrationRejected', 'one notice per change, of the right kind', [kinds(buyers.rejected), kinds(buyers.approved)]);
  ok(kinds(buyers.confirmed).length === 0 && kinds(buyers.attended).length === 0, 'a skipped registration sends nothing');
  ok(kinds(b2).filter((k) => k === 'registrationApproved').length >= 1, 'the other exhibition\'s buyer was told too');
  const log = sql(`SELECT details FROM admin_audit_log WHERE action='expo_registrations_bulk_status' AND id > ${auditFloor} ORDER BY id`).split('\n');
  ok(log.length === 3, 'every bulk change that changed something is in the activity log (and the ones that changed nothing are not)', log);
  ok(/^approved: 3 of 9 selected \(ids /.test(log[0]) && /^approved: 2 of 2 /.test(log[1]) && /^rejected: 3 of 7 /.test(log[2]), 'with what was decided and how many', log);

  console.log('\n== the admin list shows the new status');
  const list = (await (await fetch(BASE + '/api/admin/expo-registrations?exhibition=' + E1.slug, { headers: H(u.aT) })).json()).registrations;
  ok(list.find((x) => String(x.id) === String(regs.pending)).status === 'rejected' && list.find((x) => String(x.id) === String(regs.confirmed)).status === 'confirmed', 'in the exhibition\'s list');

  await db.query('DELETE FROM expo_registrations WHERE exhibition_id IN (?)', [[E1.id, E2.id]]);
  await db.query('DELETE FROM exhibitions WHERE id IN (?)', [[E1.id, E2.id]]);
  sql(`DELETE FROM users WHERE email LIKE 'dec-%-${st}@test.invalid'`);
  await db.end();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
