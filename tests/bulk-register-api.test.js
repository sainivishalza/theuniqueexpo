// Registering for several exhibitions at once: what is asked, what is taken from the profile, what is kept.
const { BASE, sql, ok, done, mkUsers, connect, PNG } = require('./helpers/common.js');
const ip = () => '10.2.' + Math.floor(Math.random() * 250) + '.' + (Math.floor(Math.random() * 250) + 1);
const H = (t) => ({ 'Content-Type': 'application/json', cookie: 'token=' + t, 'x-forwarded-for': ip() });
const call = (method, path, t, body) => fetch(BASE + path, { method, headers: H(t), body: body === undefined ? undefined : JSON.stringify(body) });
const list = async (t) => (await (await call('GET', '/api/buyer-registrations', t)).json()).exhibitions;
const plan = async (t, slugs) => { const r = await call('POST', '/api/buyer-registrations/plan', t, { slugs }); return { status: r.status, ...(await r.json()) }; };
const submit = async (t, slugs, answers = {}) => { const r = await call('POST', '/api/buyer-registrations', t, { slugs, answers }); return { status: r.status, ...(await r.json()) }; };
const J = (v) => (typeof v === 'string' ? JSON.parse(v) : v);
const key = (p, k) => p.questions.find((q) => q.key === k);

(async () => {
  const db = await connect();
  const st = Date.now();
  const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const mkExpo = async (tag, over = {}) => {
    const slug = `br-${tag}-${st}`;
    await db.query('INSERT INTO exhibitions (slug,title,start_date,end_date,city,registration_enabled,registration_form_schema) VALUES (?,?,?,?,?,?,?)',
      [slug, `Bulk ${tag} ${st}`, over.start || day(30), over.end || day(33), 'Guangzhou', over.enabled === false ? 0 : 1, over.schema ? JSON.stringify(over.schema) : null]);
    const [[row]] = await db.query('SELECT id FROM exhibitions WHERE slug=?', [slug]);
    return { slug, id: row.id };
  };
  const schemaC = [
    { id: 'f_name', label: 'Company  name:', type: 'text', required: true },
    { id: 'f_staff', label: 'Number of staff', type: 'text', required: true, helpText: 'How many people come' },
    { id: 'f_visa', label: 'Do you need a visa letter?', type: 'radio', required: true, options: ['Yes', 'No'] },
    { id: 'f_int', label: 'Interests', type: 'checkbox', required: false, options: ['Tools', 'Textile'] },
    { id: 'f_card', label: 'Business card', type: 'file', required: true },
    { id: 'f_note', label: 'Comments', type: 'textarea', required: false },
  ];
  const schemaF = [{ id: 'f_staff2', label: 'number of staff', type: 'text', required: true }, { id: 'f_hotel', label: 'Hotel wanted', type: 'radio', required: false, options: ['Yes', 'No'] }];
  const A = await mkExpo('a'), B = await mkExpo('b'), C = await mkExpo('c', { schema: schemaC }), F = await mkExpo('f', { schema: schemaF });
  const closed = await mkExpo('closed', { enabled: false }), ended = await mkExpo('ended', { start: day(-20), end: day(-17) });

  const u = await mkUsers('br');
  const buyer = u.bT, bId = u.bId;
  const profile = (patch) => fetch(BASE + '/api/buyer-profile', { method: 'PATCH', headers: H(buyer), body: JSON.stringify(patch) });

  console.log('\n== who can use it');
  ok((await fetch(BASE + '/api/buyer-registrations')).status === 401, 'signed-out is refused');
  ok((await call('GET', '/api/buyer-registrations', u.aT)).status === 403, 'an admin is refused (buyers only)');
  ok((await call('POST', '/api/buyer-registrations/plan', u.aT, { slugs: [A.slug] })).status === 403, 'and cannot ask for a plan');
  const ex = await mkUsers('bx'); sql(`UPDATE users SET role='exhibitor' WHERE id=${ex.bId}`);
  const exT = await require('./helpers/common.js').login(ex.m.b);
  ok((await call('POST', '/api/buyer-registrations', exT, { slugs: [A.slug] })).status === 403, 'an exhibitor is refused');

  console.log('\n== the list of exhibitions');
  let items = await list(buyer);
  const mine = items.filter((e) => e.slug.endsWith('-' + st));
  ok(['a', 'b', 'c', 'f'].every((t) => mine.some((e) => e.slug === `br-${t}-${st}`)), 'upcoming exhibitions open for registration are listed');
  ok(!mine.some((e) => e.slug === closed.slug) && !mine.some((e) => e.slug === ended.slug), 'a closed one and a finished one are not');
  const a0 = mine.find((e) => e.slug === A.slug);
  ok(a0.status === null && a0.canRegister === true && a0.title === `Bulk a ${st}` && a0.city === 'Guangzhou' && a0.startDate === day(30), 'each one carries its title, dates, city and "not registered yet"', a0);
  ok(items.every((e, i, a) => i === 0 || a[i - 1].startDate <= e.startDate), 'soonest first');

  console.log('\n== the plan: an empty profile asks for everything it lacks');
  let p = await plan(buyer, [A.slug]);
  ok(p.status === 200 && p.exhibitions[0].state === 'new', 'the plan for the standard form', p.exhibitions);
  const keysA = p.questions.map((q) => q.key);
  ok(['core:gender', 'core:nationality', 'core:passportNumber', 'core:phone', 'core:companyName', 'core:companyType', 'core:companyScale', 'core:purposeOfVisit', 'core:infoSource', 'core:exportingMarkets', 'core:docPassportFront', 'core:docBusinessCard', 'core:docVisaPage', 'core:docBusinessLicense'].every((k) => keysA.includes(k)), 'with an empty profile every detail is asked', keysA);
  ok(!keysA.includes('core:email'), 'but not the e-mail address (the account has one)');
  ok(key(p, 'core:companyTypeOther').showIf.equals === 'Other' && key(p, 'core:exportingMarketOther').showIf.includes === 'Other', 'the "please specify" questions only appear after "Other"');
  ok(key(p, 'core:docPassportFront').kind === 'file' && key(p, 'core:gender').options.join() === 'male,female', 'files are file questions, gender has its choices');

  console.log('\n== the plan: what the profile already has is not asked');
  await profile({ companyName: 'Profile Co', nationality: 'russia', passportNumber: 'P1234567', phoneNumber: '+7 999 111', gender: 'male' });
  p = await plan(buyer, [A.slug]);
  const k2 = p.questions.map((q) => q.key);
  ok(!['core:gender', 'core:nationality', 'core:passportNumber', 'core:phone', 'core:companyName'].some((k) => k2.includes(k)), 'gender, nationality (even typed in lower case), passport, phone and company are taken from the profile', k2);
  ok(['core:companyType', 'core:companyScale', 'core:purposeOfVisit', 'core:infoSource', 'core:exportingMarkets'].every((k) => k2.includes(k)), 'what the profile has no field for is still asked');
  await profile({ nationality: 'Narnia', gender: 'other' });
  p = await plan(buyer, [A.slug]);
  ok(key(p, 'core:nationality') && key(p, 'core:gender'), 'a profile value that does not fit the form (a nationality not in its list, gender "other") is asked again');
  await profile({ nationality: 'Russia', gender: 'male' });

  const known = Object.fromEntries(p.known.map((k) => [k.key, k]));
  ok(known['core:companyName'].text === 'Profile Co' && known['core:passportNumber'].text === 'P1234567' && known['core:phone'].text === '+7 999 111' && known['core:nationality'].text === 'Russia' && known['core:gender'].text === 'male', 'what comes from the profile is listed as "already known" (with its values) so the screen can show it', Object.keys(known));
  ok(known['core:fullName'] && known['core:fullName'].text.length > 0 && known['core:email'] && known['core:email'].exhibitions.join() === A.slug, 'the full name and e-mail address that will be sent are listed too');
  ok(!p.known.some((k) => p.questions.some((q) => q.key === k.key)), 'nothing is both asked and "known"');

  console.log('\n== an organiser\'s own form');
  p = await plan(buyer, [C.slug]);
  const kc = p.questions.map((q) => q.key);
  ok(!kc.some((k) => /company name/.test(k)), '"Company  name:" is recognised as the profile\'s company name and not asked');
  const staff = p.questions.find((q) => /number of staff/.test(q.key));
  ok(staff && staff.kind === 'text' && staff.required === true && staff.help === 'How many people come' && staff.label === 'Number of staff', 'an unknown question is asked with its own text, help and "required"', staff);
  const visa = p.questions.find((q) => /visa letter/.test(q.key));
  ok(visa.kind === 'radio' && visa.options.join() === 'Yes,No' && visa.required, 'choices are kept');
  const interests = p.questions.find((q) => /interests/.test(q.key));
  ok(interests.kind === 'checkbox' && interests.required === false, 'an optional question is asked and marked optional');
  ok(p.questions.find((q) => /business card/.test(q.key)).kind === 'file' && p.questions.find((q) => /comments/.test(q.key)).kind === 'textarea', 'a file and a long text');
  p = await plan(buyer, [A.slug, C.slug, F.slug]);
  const staffQ = p.questions.filter((q) => /number of staff/.test(q.key));
  ok(staffQ.length === 1 && staffQ[0].exhibitions.sort().join() === [C.slug, F.slug].sort().join(), 'the same question in two exhibitions is asked once ("Number of staff" / "number of staff")', staffQ.map((q) => q.exhibitions));
  ok(p.questions.find((q) => /hotel wanted/.test(q.key)).required === false, 'and required only if one of them requires it');
  ok(p.questions.some((q) => q.key === 'core:companyType'), 'the standard form questions come along with the custom ones');

  console.log('\n== refusals');
  let r = await submit(buyer, [A.slug], {});
  ok(r.status === 400 && r.code === 'missing' && r.keys.includes('core:companyType') && r.keys.includes('core:docPassportFront'), 'registering without the answers is refused and says which are missing', r.keys);
  ok(Number(sql(`SELECT COUNT(*) FROM expo_registrations WHERE user_id=${bId}`)) === 0, 'nothing was created');
  const good = { 'core:companyType': 'Importer', 'core:companyScale': '11-20', 'core:purposeOfVisit': 'Placing an Order', 'core:infoSource': 'Ana', 'core:exportingMarkets': ['Europe', 'Africa'], 'core:docPassportFront': PNG, 'core:docBusinessCard': PNG, 'core:docVisaPage': PNG, 'core:docBusinessLicense': PNG };
  r = await submit(buyer, [A.slug], { ...good, 'core:companyType': 'Spaceship' }); ok(r.status === 400 && r.code === 'invalid' && r.keys.includes('core:companyType'), 'an answer that is not one of the choices is refused', r);
  r = await submit(buyer, [A.slug], { ...good, 'core:exportingMarkets': ['Europe', 'Mars'] }); ok(r.status === 400 && r.code === 'invalid', 'so is a choice list with a stranger in it');
  r = await submit(buyer, [A.slug], { ...good, 'core:docVisaPage': 'data:text/html;base64,PGI+aGk8L2I+' }); ok(r.status === 400 && r.code === 'invalid_file' && r.keys.includes('core:docVisaPage'), 'a file that is not an image or PDF is refused', r);
  r = await submit(buyer, [A.slug], { ...good, 'core:companyType': 'Other' }); ok(r.status === 400 && r.code === 'missing' && r.keys.includes('core:companyTypeOther'), '"Other" needs its "please specify"', r.keys);
  r = await submit(buyer, [], {}); ok(r.status === 400, 'no exhibition chosen is refused');
  r = await submit(buyer, Array.from({ length: 41 }, (_, i) => 'x' + i), {}); ok(r.status === 400, 'more than 40 at once is refused');
  r = await call('POST', '/api/buyer-registrations', buyer, { slugs: 'nope' }); ok(r.status === 400, 'a malformed request is refused');
  ok(Number(sql(`SELECT COUNT(*) FROM expo_registrations WHERE user_id=${bId}`)) === 0 && sql(`SELECT COUNT(*) FROM buyer_extra_info WHERE user_id=${bId}`) === '0', 'and still nothing was created or saved');

  console.log('\n== registering for one exhibition with the standard form');
  r = await submit(buyer, [A.slug], good);
  ok(r.status === 200 && r.results.length === 1 && r.results[0].outcome === 'registered' && r.results[0].slug === A.slug, 'registered', r);
  const [[regA]] = await db.query('SELECT * FROM expo_registrations WHERE user_id=? AND exhibition_id=?', [bId, A.id]);
  ok(regA.status === 'pending' && regA.registration_type === 'buyer' && regA.company_name === 'Profile Co' && regA.nationality === 'Russia' && regA.passport_number === 'P1234567' && regA.phone === '+7 999 111' && regA.gender === 'male', 'the registration carries the profile\'s details', [regA.company_name, regA.nationality, regA.passport_number]);
  ok(regA.company_type === 'Importer' && regA.company_scale === '11-20' && regA.purpose_of_visit === 'Placing an Order' && regA.info_source === 'Ana' && J(regA.exporting_markets).join() === 'Europe,Africa', 'and the answers just given');
  ok(regA.email === u.m.b && regA.full_name === 'br Buyer' && !!regA.doc_passport_front, 'the account e-mail and name, and the documents');
  ok(sql(`SELECT has_doc_passport_front FROM buyer_profiles WHERE user_id=${bId}`) === '1' && sql(`SELECT doc_passport_front_status FROM buyer_profiles WHERE user_id=${bId}`) === 'verified', 'the documents are now on the profile too');
  const extras = sql(`SELECT info_key FROM buyer_extra_info WHERE user_id=${bId} ORDER BY info_key`).split('\n');
  ok(['core:companyScale', 'core:companyType', 'core:exportingMarkets', 'core:infoSource', 'core:purposeOfVisit'].every((k) => extras.includes(k)), 'the answers the profile has no field for are kept on it', extras);
  ok(sql(`SELECT company_name FROM buyer_profiles WHERE user_id=${bId}`) === 'Profile Co', 'the profile\'s own details were not touched');
  items = await list(buyer);
  ok(items.find((e) => e.slug === A.slug).status === 'pending' && items.find((e) => e.slug === A.slug).canRegister === false, 'the list now shows it as registered (pending)');
  r = await submit(buyer, [A.slug], good); ok(r.status === 200 && r.results[0].outcome === 'already_registered', 'registering again is reported, not duplicated');
  ok(Number(sql(`SELECT COUNT(*) FROM expo_registrations WHERE user_id=${bId} AND exhibition_id=${A.id}`)) === 1, 'one registration only');

  console.log('\n== the next ones need less');
  p = await plan(buyer, [B.slug]);
  ok(!p.questions.some((q) => q.kind === 'file'), 'documents are not asked again');
  ok(key(p, 'core:companyType').value === 'Importer' && key(p, 'core:companyScale').value === '11-20' && key(p, 'core:exportingMarkets').value.join() === 'Europe,Africa' && key(p, 'core:infoSource').value === 'Ana', 'earlier answers come prefilled');
  r = await submit(buyer, [B.slug, C.slug, F.slug, closed.slug, ended.slug, 'no-such-expo'], {});
  ok(r.status === 400 && r.code === 'missing' && r.keys.some((k) => /number of staff/.test(k)) && r.keys.some((k) => /visa letter/.test(k)) && !r.keys.some((k) => /business card/.test(k)), 'the organiser\'s required questions are missing (the business card is already on the profile)', r.keys);
  const cust = (await plan(buyer, [C.slug, F.slug])).questions.filter((q) => q.key.startsWith('custom:'));
  const ans = {}; for (const q of cust) { if (/number of staff/.test(q.key)) ans[q.key] = '12'; if (/visa letter/.test(q.key)) ans[q.key] = 'Yes'; if (/interests/.test(q.key)) ans[q.key] = ['Textile']; if (/business card/.test(q.key)) ans[q.key] = PNG; if (/comments/.test(q.key)) ans[q.key] = 'See you there'; if (/hotel/.test(q.key)) ans[q.key] = 'No'; }
  r = await submit(buyer, [B.slug, C.slug, F.slug, closed.slug, ended.slug, 'no-such-expo'], { ...ans, 'core:companyType': 'Importer', 'core:companyScale': '21-50', 'core:purposeOfVisit': 'Finding New Products', 'core:infoSource': 'Other', 'core:infoSourceOther': 'A friend', 'core:exportingMarkets': ['Asia Pacific'] });
  const by = Object.fromEntries((r.results || []).map((x) => [x.slug, x.outcome]));
  ok(r.status === 200 && by[B.slug] === 'registered' && by[C.slug] === 'registered' && by[F.slug] === 'registered' && by[closed.slug] === 'closed' && by[ended.slug] === 'closed' && by['no-such-expo'] === 'unknown', 'three registered, the closed ones and the unknown one reported', by);
  ok((r.results || []).map((x) => x.slug).join() === [B.slug, C.slug, F.slug, closed.slug, ended.slug, 'no-such-expo'].join(), 'results in the order chosen');
  const [[regB]] = await db.query('SELECT * FROM expo_registrations WHERE user_id=? AND exhibition_id=?', [bId, B.id]);
  ok(regB.company_scale === '21-50' && regB.info_source === 'Other' && regB.info_source_other === 'A friend' && regB.doc_passport_front, 'the second standard-form registration has the newer answers and the saved documents');
  const [[regC]] = await db.query('SELECT * FROM expo_registrations WHERE user_id=? AND exhibition_id=?', [bId, C.id]);
  const aC = J(regC.custom_answers);
  ok(aC.f_name === 'Profile Co' && aC.f_staff === '12' && aC.f_visa === 'Yes' && aC.f_int.join() === 'Textile' && aC.f_note === 'See you there' && String(aC.f_card).startsWith('data:'), 'the organiser\'s form: its own field ids, the profile\'s company name, the answers', Object.keys(aC));
  ok(J(regC.form_schema_snapshot).length === 6 && regC.status === 'pending', 'with the form as it was at the time');
  const [[regF]] = await db.query('SELECT * FROM expo_registrations WHERE user_id=? AND exhibition_id=?', [bId, F.id]);
  const aF = J(regF.custom_answers);
  ok(aF.f_staff2 === '12' && aF.f_hotel === 'No', 'the shared question\'s answer went to the second form too');
  ok(Number(sql(`SELECT COUNT(*) FROM expo_registrations WHERE user_id=${bId} AND exhibition_id IN (${closed.id},${ended.id})`)) === 0, 'nothing was created for the closed ones');
  const extras2 = sql(`SELECT info_key FROM buyer_extra_info WHERE user_id=${bId}`).split('\n');
  ok(extras2.some((k) => /number of staff/.test(k)) && extras2.some((k) => /visa letter/.test(k)) && extras2.includes('core:infoSourceOther'), 'the organiser\'s answers are kept on the profile as well');
  p = await plan(buyer, [B.slug, C.slug]);
  ok(p.exhibitions.every((e) => e.state === 'already_registered'), 'both now show as already registered');

  console.log('\n== kept answers are offered next time');
  const f2 = await mkExpo('g', { schema: [{ id: 'g_staff', label: 'NUMBER OF STAFF?', type: 'text', required: true }, { id: 'g_card', label: 'business card', type: 'file', required: true }] });
  p = await plan(buyer, [f2.slug]);
  const staffG = p.questions.find((q) => /number of staff/.test(q.key));
  ok(staffG && staffG.value === '12', 'a question worded a little differently is recognised and comes prefilled', staffG);
  const cardG = p.questions.find((q) => /business card/.test(q.key));
  ok(!cardG, 'a business-card question is answered by the document on the profile');
  r = await submit(buyer, [f2.slug], {});
  ok(r.status === 200 && r.results[0].outcome === 'registered', 'so registering needs no new typing at all', r);

  console.log('\n== cancelled registrations can be submitted again');
  sql(`UPDATE expo_registrations SET status='cancelled', cancelled_at=NOW() WHERE user_id=${bId} AND exhibition_id=${B.id}`);
  items = await list(buyer);
  ok(items.find((e) => e.slug === B.slug).canRegister === true && items.find((e) => e.slug === B.slug).status === 'cancelled', 'a cancelled one can be registered for again');
  p = await plan(buyer, [B.slug]); ok(p.exhibitions[0].state === 'resubmit', 'the plan says "again"');
  r = await submit(buyer, [B.slug], { 'core:companyType': 'Exporter', 'core:companyScale': '0-10', 'core:purposeOfVisit': 'Placing an Order', 'core:infoSource': 'Tahir', 'core:exportingMarkets': ['Europe'] });
  ok(r.status === 200 && r.results[0].outcome === 'registered_again', 'registered again', r);
  const [[regB2]] = await db.query('SELECT status, cancelled_at, company_scale, company_type FROM expo_registrations WHERE user_id=? AND exhibition_id=?', [bId, B.id]);
  ok(regB2.status === 'pending' && regB2.cancelled_at === null && regB2.company_scale === '0-10' && regB2.company_type === 'Exporter', 'it is pending again with the new answers');
  ok(Number(sql(`SELECT COUNT(*) FROM expo_registrations WHERE user_id=${bId} AND exhibition_id=${B.id}`)) === 1, 'still one row');

  console.log('\n== a buyer with an empty profile: answers go to the profile');
  const e = await mkUsers('be');
  const eT = e.bT;
  sql(`UPDATE users SET email='phone-1390${String(st).slice(-7)}@noemail.invalid' WHERE id=${e.bId}`);
  p = await plan(eT, [A.slug]);
  ok(key(p, 'core:email') && key(p, 'core:gender') && key(p, 'core:companyName') && key(p, 'core:passportNumber'), 'with no real e-mail address and an empty profile, even those are asked', p.questions.map((q) => q.key));
  r = await submit(eT, [A.slug], { ...good, 'core:gender': 'female', 'core:nationality': 'France', 'core:passportNumber': 'F777', 'core:phone': '+33 1 11', 'core:email': 'nobody@example.com', 'core:companyName': 'Empty Profile SA' });
  ok(r.status === 200 && r.results[0].outcome === 'registered', 'registered', r);
  const prof = sql(`SELECT CONCAT_WS('|',gender,nationality,passport_number,phone_number,contact_email,company_name) FROM buyer_profiles WHERE user_id=${e.bId}`);
  ok(prof === 'female|France|F777|+33 1 11|nobody@example.com|Empty Profile SA', 'the profile now has them', prof);
  ok(sql(`SELECT COUNT(*) FROM buyer_extra_info WHERE user_id=${e.bId} AND info_key IN ('core:gender','core:passportNumber','core:companyName')`) === '0', 'and they are not duplicated among the saved answers');
  ok(sql(`SELECT email FROM users WHERE id=${e.bId}`).startsWith('phone-'), 'the sign-in address was not changed');
  r = await submit(eT, [A.slug], { ...good, 'core:email': 'not-an-address' }); ok(r.status === 200 && r.results[0].outcome === 'already_registered', 'already registered, so no further checking');
  r = await submit((await mkUsers('bz')).bT, [A.slug], { ...good, 'core:gender': 'female', 'core:nationality': 'France', 'core:passportNumber': 'x'.repeat(101), 'core:phone': '1', 'core:email': 'a@b.co', 'core:companyName': 'Z' });
  ok(r.status === 400 && r.code === 'invalid' && r.keys.includes('core:passportNumber'), 'an answer longer than the profile field allows is refused', r.keys);
  const byU = await mkUsers('by'); sql(`UPDATE users SET email='phone-1391${String(st).slice(-7)}@noemail.invalid' WHERE id=${byU.bId}`);
  r = await submit(byU.bT, [A.slug], { ...good, 'core:gender': 'female', 'core:nationality': 'France', 'core:passportNumber': 'x', 'core:phone': '1', 'core:email': 'broken', 'core:companyName': 'Z' });
  ok(r.status === 400 && r.keys.includes('core:email'), 'a malformed e-mail address is refused');

  console.log('\n== other people\'s data is never involved');
  ok(sql(`SELECT COUNT(*) FROM expo_registrations WHERE user_id=${u.bId} AND exhibition_id=${A.id}`) === '1' && sql(`SELECT COUNT(*) FROM buyer_extra_info WHERE user_id=${e.bId} AND value LIKE '%Profile Co%'`) === '0', 'each buyer has only their own registrations and answers');
  const pe = await plan(eT, [B.slug]);
  ok(key(pe, 'core:companyScale').value === '11-20', 'a buyer is offered only their own saved answers (not the other buyer\'s "0-10")', key(pe, 'core:companyScale').value);

  console.log('\n== the admin sees each exhibition\'s own list');
  const adminList = async (slug) => (await (await call('GET', '/api/admin/expo-registrations?exhibition=' + slug, u.aT)).json()).registrations;
  const la = await adminList(A.slug), lb = await adminList(B.slug), lc = await adminList(C.slug);
  const mineIn = (l) => l.filter((x) => String(x.userId) === String(bId));
  ok(mineIn(la).length === 1 && mineIn(lb).length === 1 && mineIn(lc).length === 1, 'a buyer who registered for several exhibitions is in the list of each, once', [la.length, lb.length, lc.length]);
  const ra = mineIn(la)[0];
  ok(ra.companyName === 'Profile Co' && ra.passportNumber === 'P1234567' && ra.phone === '+7 999 111' && ra.nationality === 'Russia' && ra.companyScale === '11-20' && ra.fullName, 'the list shows the details taken from the profile and the answers given', ra);
  ok(la.some((x) => String(x.userId) === String(e.bId)) && !lb.some((x) => String(x.userId) === String(e.bId)), 'a buyer is only in the lists of the exhibitions they chose');
  const rc = mineIn(lc)[0];
  ok(rc.customAnswers && Object.keys(rc.customAnswers).length >= 3, 'the organiser\'s own form answers are in that exhibition\'s list', rc.customAnswers);

  await db.query('DELETE FROM expo_registrations WHERE exhibition_id IN (?)', [[A.id, B.id, C.id, F.id, f2.id, closed.id, ended.id]]);
  await db.query('DELETE FROM exhibitions WHERE id IN (?)', [[A.id, B.id, C.id, F.id, f2.id, closed.id, ended.id]]);
  await db.end();
  done();
})().catch((e) => { console.error(e); process.exit(1); });
