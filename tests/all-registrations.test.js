// The admin's list of every registration: filters, search, counts, pages, the buyer's own details, the Excel export.
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');
const { BASE, sql, ok, done, mkUsers, connect } = require('./helpers/common.js');
const ip = () => '10.6.' + Math.floor(Math.random() * 250) + '.' + (Math.floor(Math.random() * 250) + 1);
const H = (t) => ({ 'Content-Type': 'application/json', cookie: 'token=' + t, 'x-forwarded-for': ip() });

(async () => {
  const db = await connect();
  const st = Date.now();
  const u = await mkUsers('ar');
  const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const mkExpo = async (tag, startIn, schema) => {
    const slug = `ar-${tag}-${st}`;
    await db.query('INSERT INTO exhibitions (slug,title,start_date,end_date,city,registration_enabled,registration_form_schema) VALUES (?,?,?,?,?,1,?)', [slug, `Allreg ${tag} ${st}`, day(startIn), day(startIn + 3), 'Guangzhou', schema ? JSON.stringify(schema) : null]);
    const [[row]] = await db.query('SELECT id FROM exhibitions WHERE slug=?', [slug]);
    return { slug, id: row.id, title: `Allreg ${tag} ${st}` };
  };
  const X1 = await mkExpo('one', 30), X2 = await mkExpo('two', 60), X3 = await mkExpo('big', 90);
  const h = bcrypt.hashSync('pass1234', 10);
  let nextNo = Number(sql('SELECT IFNULL(MAX(buyer_no),0) FROM users')) + 100;
  const mkBuyer = (tag, name, over = {}) => {
    const email = over.email || `ar-${tag}-${st}@test.invalid`;
    sql(`INSERT INTO users (name,email,password_hash,role,country,status,buyer_no) VALUES ('${name}','${email}','${h}','buyer','','active',${++nextNo})`);
    const id = Number(sql(`SELECT id FROM users WHERE email='${email}'`));
    return { id, no: nextNo, email };
  };
  const reg = async (x, b, status, over = {}) => {
    const cols = { exhibition_id: x.id, user_id: b.id, status, custom_answers: '{}', form_schema_snapshot: '[]', ...over };
    const keys = Object.keys(cols);
    await db.query(`INSERT INTO expo_registrations (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, keys.map((k) => cols[k]));
    return Number(sql(`SELECT id FROM expo_registrations WHERE exhibition_id=${x.id} AND user_id=${b.id}`));
  };
  const profile = (b, f) => sql(`INSERT INTO buyer_profiles (user_id,company_name,nationality,phone_number) VALUES (${b.id},'${f.company}','${f.nationality}','${f.phone}') ON DUPLICATE KEY UPDATE company_name=VALUES(company_name), nationality=VALUES(nationality), phone_number=VALUES(phone_number)`);

  const anna = mkBuyer('anna', 'Anna Petrova'), omar = mkBuyer('omar', 'Omar Haddad'), li = mkBuyer('li', 'Li Wei'), ph = mkBuyer('ph', 'Phone Only', { email: `phone-1393${String(st).slice(-7)}@noemail.invalid` }), pct = mkBuyer('pct', 'Percent 100% Co');
  profile(anna, { company: 'Anna Trading', nationality: 'Russia', phone: '+7 111' });
  profile(omar, { company: 'Haddad Imports', nationality: 'Jordan', phone: '+962 222' });
  profile(li, { company: 'Wei Ltd', nationality: 'China', phone: '+86 333' });
  profile(ph, { company: '=HYPERLINK("http://evil.example","x")', nationality: 'Russia', phone: '' });
  profile(pct, { company: 'Percent Co', nationality: 'Jordan', phone: '' });
  const std = { full_name: '', nationality: '', company_name: '', phone: '', email: '' };
  const rA1 = await reg(X1, anna, 'pending', { full_name: 'Anna Petrova', nationality: 'Russia', company_name: 'Anna Trading', phone: '+7 111', email: anna.email });
  const rA2 = await reg(X2, anna, 'approved', { full_name: 'Anna Petrova', nationality: 'Russia', company_name: 'Anna Trading', email: anna.email, confirm_by: day(10) });
  const rO1 = await reg(X1, omar, 'approved', { full_name: 'Omar Haddad', nationality: 'Jordan', company_name: 'Haddad Imports', email: omar.email, confirm_by: day(-3) });  // expired
  const rO2 = await reg(X2, omar, 'confirmed', { full_name: 'Omar Haddad', nationality: 'Jordan', company_name: 'Haddad Imports', email: omar.email });
  const rL = await reg(X1, li, 'rejected', { custom_answers: JSON.stringify({ f: 'x' }), form_schema_snapshot: JSON.stringify([{ id: 'f', label: 'Anything', type: 'text' }]) });  // custom form: no name/company/country of its own
  const rP = await reg(X2, ph, 'pending', { full_name: '', company_name: '' });
  const rC = await reg(X2, pct, 'cancelled', { full_name: 'Percent 100% Co', company_name: 'Percent Co', nationality: 'Jordan' });
  // Fifty-five more for the paging
  const bulk = [];
  for (let i = 1; i <= 55; i++) bulk.push(mkBuyer('b' + i, 'Bulk Buyer ' + i));
  for (const b of bulk) await reg(X3, b, 'pending', { full_name: b.email.split('@')[0], nationality: 'Egypt' });

  const get = async (qs, t = u.aT) => { const r = await fetch(BASE + '/api/admin/expo-registrations/all?' + qs, { headers: H(t) }); return { status: r.status, ...(await r.json()) }; };
  const mine = [X1.slug, X2.slug];
  const ids = (j) => j.rows.map((x) => Number(x.id));

  console.log('\n== who can use it');
  ok((await fetch(BASE + '/api/admin/expo-registrations/all')).status === 401, 'signed-out is refused');
  ok((await get('', u.bT)).status === 401, 'a buyer is refused');
  ok((await fetch(BASE + '/api/admin/expo-registrations/all/export', { headers: H(u.bT) })).status === 401, 'and cannot export');

  console.log('\n== the list');
  let j = await get(`exhibition=${X1.slug}`);
  ok(j.status === 200 && j.total === 3 && ids(j).sort().join() === [rA1, rO1, rL].sort().join(), 'one exhibition lists its own registrations', ids(j));
  ok(j.rows.every((x) => x.exhibitionSlug === X1.slug && x.exhibitionTitle === X1.title), 'each row names its exhibition');
  const row = (j2, id) => j2.rows.find((x) => Number(x.id) === id);
  ok(row(j, rA1).name === 'Anna Petrova' && row(j, rA1).company === 'Anna Trading' && row(j, rA1).country === 'Russia' && row(j, rA1).buyerNumber === `TUE${String(anna.no).padStart(4, '0')}` && row(j, rA1).email === anna.email, 'a standard registration shows its own details and the buyer number', row(j, rA1));
  ok(row(j, rL).name === 'Li Wei' && row(j, rL).company === 'Wei Ltd' && row(j, rL).country === 'China' && row(j, rL).email === li.email, 'a registration with an organiser\'s own form shows the buyer\'s account and profile details', row(j, rL));
  ok(row(j, rO1).effectiveStatus === 'expired' && row(j, rO1).status === 'approved', 'an approved registration past its confirm-by date reads "expired"');
  ok(j.counts.pending === 1 && j.counts.expired === 1 && j.counts.rejected === 1 && j.counts.approved === undefined, 'status counts for the exhibition', j.counts);
  ok(j.exhibitions.some((e) => e.slug === X1.slug && e.count === 3) && j.exhibitions.some((e) => e.slug === X3.slug && e.count === 55), 'the exhibition pick-list carries each one\'s number of registrations');
  ok(['Russia', 'Jordan', 'China', 'Egypt'].every((c) => j.countries.includes(c)), 'and the countries seen', j.countries);

  console.log('\n== filters');
  j = await get(`exhibition=${X1.slug}&status=expired`); ok(j.total === 1 && ids(j)[0] === rO1, 'status "expired"');
  j = await get(`exhibition=${X2.slug}&status=approved`); ok(j.total === 1 && ids(j)[0] === rA2, 'status "approved" does not include the expired one');
  j = await get(`exhibition=${X2.slug}&status=approved`); ok(j.counts.pending === 1 && j.counts.approved === 1 && j.counts.confirmed === 1 && j.counts.cancelled === 1, 'the counts ignore the status filter (so the chips keep their numbers)', j.counts);
  j = await get(`exhibition=${X2.slug}&country=Jordan`); ok(j.total === 2 && ids(j).sort().join() === [rO2, rC].sort().join(), 'country filter', ids(j));
  j = await get(`exhibition=${X1.slug}&country=China`); ok(j.total === 1 && ids(j)[0] === rL, 'a custom-form registration is found by its buyer\'s profile country');
  j = await get(`status=nonsense&exhibition=${X1.slug}`); ok(j.total === 3, 'an unknown status is ignored, not an error');
  j = await get(`exhibition=no-such`); ok(j.total === 0 && j.rows.length === 0, 'an unknown exhibition lists nothing');

  console.log('\n== search');
  const q = async (text, extra = '') => (await get(`q=${encodeURIComponent(text)}${extra}`));
  j = await q('petrova'); ok(ids(j).sort().join() === [rA1, rA2].sort().join(), 'by name (both of Anna\'s registrations)', ids(j));
  j = await q('haddad imports'); ok(ids(j).sort().join() === [rO1, rO2].sort().join(), 'by company');
  j = await q(omar.email); ok(ids(j).sort().join() === [rO1, rO2].sort().join(), 'by e-mail');
  j = await q(`TUE${String(li.no).padStart(4, '0')}`); ok(ids(j).join() === [rL].join(), 'by buyer number (TUE…)', ids(j));
  j = await q('+962 222'); ok(ids(j).length === 2, 'by phone number (profile)');
  j = await q('Wei'); ok(ids(j).includes(rL), 'a custom-form registration is found by the buyer\'s account name');
  j = await q(X2.title); ok(j.total === 4 && j.rows.every((x) => x.exhibitionSlug === X2.slug), 'by exhibition title', j.total);
  j = await q('%'); ok(j.total === 1 && ids(j)[0] === rC, '"%" is a letter, not a wildcard (only the "100%" name matches)', ids(j));
  j = await q('_'); ok(j.total === 0, '"_" is not a wildcard either');
  j = await q("x' OR '1'='1"); ok(j.status === 200 && j.total === 0, 'quotes are harmless');
  j = await q('petrova', `&exhibition=${X2.slug}&status=approved`); ok(ids(j).join() === [rA2].join(), 'search combines with the other filters');

  console.log('\n== placeholders');
  j = await get(`exhibition=${X2.slug}&q=Phone`); ok(j.total === 1 && j.rows[0].email === '' && /^TUE/.test(j.rows[0].buyerNumber), 'a buyer with no real e-mail address shows an empty e-mail', j.rows[0]);

  console.log('\n== pages');
  j = await get(`exhibition=${X3.slug}`);
  ok(j.total === 55 && j.rows.length === 50 && j.page === 1 && j.pageSize === 50, 'a page holds 50', [j.total, j.rows.length]);
  const p2 = await get(`exhibition=${X3.slug}&page=2`);
  ok(p2.rows.length === 5 && p2.page === 2 && !ids(p2).some((x) => ids(j).includes(x)), 'page 2 has the other five, none repeated');
  const p9 = await get(`exhibition=${X3.slug}&page=9`); ok(p9.rows.length === 5, 'a page past the end shows the last one');
  const p0 = await get(`exhibition=${X3.slug}&page=-4`); ok(p0.rows.length === 50, 'a bad page number shows the first');
  ok(j.rows[0].createdAt >= j.rows[49].createdAt, 'newest first');

  console.log('\n== Excel export');
  const exp = async (qs) => { const r = await fetch(BASE + '/api/admin/expo-registrations/all/export?' + qs, { headers: H(u.aT) }); const buf = Buffer.from(await r.arrayBuffer()); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf); return { r, ws: wb.worksheets[0] }; };
  let e = await exp(`exhibition=${X1.slug}`);
  ok(e.r.status === 200 && /spreadsheetml/.test(e.r.headers.get('content-type')) && /registrations-\d{4}-\d\d-\d\d\.xlsx/.test(e.r.headers.get('content-disposition')), 'an .xlsx file');
  const header = e.ws.getRow(1).values.slice(1);
  ok(header[0] === 'Registration No.' && header.includes('Exhibition') && header.includes('Status'), 'with a heading row', header);
  ok(e.ws.rowCount === 4, 'one row per registration the filter shows', e.ws.rowCount);
  e = await exp(`exhibition=${X3.slug}`);
  ok(e.ws.rowCount === 56, 'all pages are exported, not just the one on screen', e.ws.rowCount);
  e = await exp(`exhibition=${X2.slug}&q=Phone`);
  ok(String(e.ws.getRow(2).getCell(6).value).startsWith("'="), 'a company name that starts with "=" is kept as text, not a formula', e.ws.getRow(2).getCell(6).value);
  e = await exp(`status=expired&exhibition=${X1.slug}`);
  ok(e.ws.rowCount === 2 && e.ws.getRow(2).getCell(9).value === 'expired', 'filters apply to the export too');

  console.log('\n== bulk actions work on this list too');
  const r = await fetch(BASE + '/api/admin/expo-registrations/bulk-status', { method: 'POST', headers: H(u.aT), body: JSON.stringify({ ids: [rA1, rP], status: 'approved', confirmBy: day(20) }) });
  const bj = await r.json();
  ok(bj.updated === 2, 'registrations of different exhibitions are approved together', bj);
  j = await get(`status=approved&q=${encodeURIComponent('Phone')}`); ok(ids(j).includes(rP), 'and show as approved here');

  await db.query('DELETE FROM expo_registrations WHERE exhibition_id IN (?)', [[X1.id, X2.id, X3.id]]);
  await db.query('DELETE FROM exhibitions WHERE id IN (?)', [[X1.id, X2.id, X3.id]]);
  sql(`DELETE FROM buyer_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'ar-%-${st}@test.invalid' OR email LIKE 'phone-1393%')`);
  sql(`DELETE FROM users WHERE email LIKE 'ar-%-${st}@test.invalid' OR email='phone-1393${String(st).slice(-7)}@noemail.invalid'`);
  await db.end();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
