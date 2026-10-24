// Referral programme: a buyer invites another buyer with a personal link; the admin chooses when points are paid, how many, and the cap.
// Covers the rules (signup / approved / attended), the cap, rejection, ineligible accounts, payment races, and the three screens in en/ru/zh.
const { BASE, sql, ok, done, mkUsers } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const bcrypt = require('bcryptjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.61.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const num = (q) => Number(sql(q) || 0);
const balance = (id) => num(`SELECT COALESCE((SELECT balance FROM wallets WHERE user_id=${id}),0)`);

(async () => {
  const u = await mkUsers('rf');
  const tag = `rf${Date.now()}`;
  const pw = bcrypt.hashSync('pass1234', 10);
  const AH = { cookie: 'token=' + u.aT, 'Content-Type': 'application/json' };
  const BH = { cookie: 'token=' + u.bT, 'Content-Type': 'application/json' };
  const J = (body) => JSON.stringify(body);
  const rules = (over) => ({ enabled: true, trigger: 'signup', referrerPoints: 50, referredPoints: 20, maxPerReferrer: 2, ...over });
  const putRules = (over) => fetch(BASE + '/api/admin/wallet/referrals', { method: 'PUT', headers: AH, body: J(rules(over)) });
  const settle = async () => (await fetch(BASE + '/api/admin/wallet/referrals', { method: 'POST', headers: AH, body: J({ action: 'settle' }) })).json();
  const me = async (headers = BH) => (await fetch(BASE + '/api/referrals/me', { headers })).json();
  let seq = 0;
  // a buyer who signs up through the public form, optionally with an invitation code
  const signUp = async (role, invite) => {
    const email = `${tag}-${++seq}@test.invalid`;
    const r = await fetch(BASE + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ipn() }, body: J({ name: `Rf Person ${seq}`, email, password: 'pass1234', role, country: '', invite }) });
    const j = await r.json();
    return { status: r.status, id: j.user && j.user.id, email };
  };
  const mkBuyer = (name) => {
    const email = `${tag}-${name}@test.invalid`;
    sql(`INSERT INTO users (name,email,password_hash,role,country) VALUES ('${name}','${email}','${pw}','buyer','')`);
    return Number(sql(`SELECT id FROM users WHERE email='${email}'`));
  };
  const refRow = (referredId) => sql(`SELECT CONCAT(status,'|',referrer_points,'|',referred_points) FROM buyer_referrals WHERE referred_id=${referredId}`);
  const ledger = (id) => sql(`SELECT COUNT(*) FROM wallet_transactions WHERE user_id=${id} AND type='referral'`);

  console.log('\n== the rules an admin sets');
  let r = await putRules({ referrerPoints: 0, referredPoints: 0 });
  ok(r.status === 400, 'switched on with nothing to pay is refused', r.status);
  r = await putRules({ trigger: 'bogus' });
  ok(r.status === 400, 'an unknown stage is refused', r.status);
  r = await putRules({ referrerPoints: -5 });
  ok(r.status === 400, 'negative points are refused', r.status);
  r = await putRules({ referrerPoints: 1.5 });
  ok(r.status === 400, 'part points are refused', r.status);
  r = await putRules({ maxPerReferrer: 100000 });
  ok(r.status === 400, 'an absurd cap is refused', r.status);
  r = await fetch(BASE + '/api/admin/wallet/referrals', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: J(rules()) });
  ok(r.status === 401, 'nobody signed in cannot change them', r.status);
  r = await fetch(BASE + '/api/admin/wallet/referrals', { method: 'PUT', headers: BH, body: J(rules()) });
  ok(r.status === 401, 'a buyer cannot change them', r.status);
  r = await fetch(BASE + '/api/admin/wallet/referrals', { headers: BH });
  ok(r.status === 401, 'a buyer cannot read the admin list', r.status);
  r = await putRules();
  ok(r.status === 200, 'valid rules are saved', r.status);
  let admin = await (await fetch(BASE + '/api/admin/wallet/referrals', { headers: AH })).json();
  ok(admin.settings.enabled === true && admin.settings.trigger === 'signup' && admin.settings.referrerPoints === 50 && admin.settings.referredPoints === 20 && admin.settings.maxPerReferrer === 2, 'and read back the same', admin.settings);
  const offer = await (await fetch(BASE + '/api/referrals/offer')).json();
  ok(offer.enabled === true && offer.referredPoints === 20 && offer.trigger === 'signup', 'the sign-up page is told what a new buyer is offered', offer);
  await sleep(500);
  ok(sql("SELECT COUNT(*) FROM admin_audit_log WHERE action='referral_settings_saved'") !== '0', 'saving the rules is in the activity log');

  console.log('\n== personal codes');
  r = await fetch(BASE + '/api/referrals/me');
  ok(r.status === 401, 'a visitor has no code', r.status);
  r = await fetch(BASE + '/api/referrals/me', { headers: AH });
  ok(r.status === 403, 'an admin account has no code', r.status);
  const mine = await me();
  ok(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{10}$/.test(mine.code), 'a buyer gets a 10-character code', mine.code);
  ok((await me()).code === mine.code, 'it stays the same', mine.code);
  const other = mkBuyer('other');
  const otherTok = (await (await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ipn() }, body: J({ email: `${tag}-other@test.invalid`, password: 'pass1234' }) })).headers.getSetCookie().join(';'));
  const otherMe = await me({ cookie: 'token=' + /token=([^;]+)/.exec(otherTok)[1] });
  ok(otherMe.code !== mine.code, 'another buyer gets a different one');

  console.log('\n== paid at sign-up (cap 2)');
  const n1 = await signUp('buyer', mine.code);
  ok(n1.status === 200 && refRow(n1.id) === 'rewarded|50|20', 'a buyer who joins through the link is rewarded at once', refRow(n1.id));
  ok(balance(u.bId) === 50 && balance(n1.id) === 20, 'inviter +50, new buyer +20', [balance(u.bId), balance(n1.id)]);
  ok(ledger(u.bId) === '1' && ledger(n1.id) === '1', 'each has one "referral" row in their statement');
  let sum = await me();
  ok(sum.invited === 1 && sum.rewarded === 1 && sum.earned === 50 && sum.items.length === 1 && sum.items[0].name.includes('*'), 'the inviter sees it, with the name masked', sum);
  ok(!JSON.stringify(sum).includes('@'), 'no e-mail address in what the inviter sees');
  let again = await settle();
  ok(again.paid === 0 && balance(u.bId) === 50 && balance(n1.id) === 20, 'paying again changes nothing', again);
  const n2 = await signUp('buyer', mine.code);
  ok(refRow(n2.id) === 'rewarded|50|20' && balance(u.bId) === 100, 'the second friend is rewarded too', [refRow(n2.id), balance(u.bId)]);
  const n3 = await signUp('buyer', mine.code);
  ok(refRow(n3.id) === 'pending|0|0' && balance(u.bId) === 100 && balance(n3.id) === 0, 'the third is over the cap of 2: it waits, nobody is paid', [refRow(n3.id), balance(u.bId)]);
  sum = await me();
  ok(sum.limitReached === true && sum.rewarded === 2 && sum.invited === 3, 'the inviter is told the limit is reached', sum);
  r = await putRules({ maxPerReferrer: 3 });
  const s2 = await settle();
  ok(s2.paid >= 1 && refRow(n3.id) === 'rewarded|50|20' && balance(u.bId) === 150 && balance(n3.id) === 20, 'raising the cap and paying waiting referrals pays it', [s2, balance(u.bId)]);
  const mism = await (await fetch(BASE + '/api/admin/wallet/overview', { headers: AH })).json();
  ok(!mism.mismatches || mism.mismatches.length === 0, 'every balance still equals its statement', mism.mismatches);

  console.log('\n== invitations that must not count');
  const bad = await signUp('buyer', 'AAAAAAAAAA');
  ok(bad.status === 200 && refRow(bad.id) === '', 'an unknown code still lets the person sign up, with no referral');
  const junk = await signUp('buyer', 'not a code');
  ok(junk.status === 200 && refRow(junk.id) === '', 'so does a code that is not even a code');
  const exh = await signUp('exhibitor', mine.code);
  ok(exh.status === 200 && refRow(exh.id) === '', 'an exhibitor who uses a buyer link is not a referral');
  await putRules({ enabled: false, maxPerReferrer: 0 });
  const off = await signUp('buyer', mine.code);
  ok(off.status === 200 && refRow(off.id) === '', 'with the programme off, no referral is recorded');
  ok((await (await fetch(BASE + '/api/referrals/offer')).json()).enabled === false, 'and the sign-up page is told it is off');
  ok((await me()).settings.enabled === false, 'and so is the inviter');
  await putRules({ maxPerReferrer: 0 });

  console.log('\n== paid when the new buyer attends');
  await putRules({ trigger: 'attended', referrerPoints: 40, referredPoints: 10, maxPerReferrer: 0 });
  const day = (n) => `DATE_ADD(UTC_DATE(), INTERVAL ${n} DAY)`;
  sql(`INSERT INTO exhibitions (slug,title,start_date,end_date,venue,city,country,industry,description,highlights,exhibitors,visitors,organizer,registration_enabled) VALUES ('${tag}-x','Referral Expo',${day(10)},${day(12)},'Hall','Zzrefcity','China','X','d','[]',1,'','O',1)`);
  const expoId = Number(sql(`SELECT id FROM exhibitions WHERE slug='${tag}-x'`));
  const c = await signUp('buyer', mine.code);
  ok(refRow(c.id) === 'pending|0|0' && balance(c.id) === 0, 'signing up alone pays nothing', refRow(c.id));
  sql(`INSERT INTO expo_registrations (exhibition_id,user_id,status) VALUES (${expoId},${c.id},'pending')`);
  const regId = Number(sql(`SELECT id FROM expo_registrations WHERE user_id=${c.id}`));
  const patch = (id, status) => fetch(BASE + `/api/admin/expo-registrations/${id}`, { method: 'PATCH', headers: AH, body: J({ status }) });
  r = await patch(regId, 'approved');
  ok(r.status === 200 && refRow(c.id) === 'pending|0|0', 'an approved registration is not enough yet', refRow(c.id));
  r = await patch(regId, 'attended');
  ok(r.status === 200 && refRow(c.id) === 'rewarded|40|10', 'attending pays it', refRow(c.id));
  ok(balance(u.bId) === 190 && balance(c.id) === 10, 'inviter +40, new buyer +10', [balance(u.bId), balance(c.id)]);
  await patch(regId, 'confirmed');
  await patch(regId, 'attended');
  ok(balance(u.bId) === 190 && balance(c.id) === 10, 'marking it attended again does not pay again');

  console.log('\n== paid when a registration is approved');
  await putRules({ trigger: 'approved', referrerPoints: 30, referredPoints: 0, maxPerReferrer: 0 });
  const d = await signUp('buyer', mine.code);
  sql(`INSERT INTO expo_registrations (exhibition_id,user_id,status) VALUES (${expoId},${d.id},'pending')`);
  const regD = Number(sql(`SELECT id FROM expo_registrations WHERE user_id=${d.id}`));
  ok(refRow(d.id) === 'pending|0|0', 'waits at sign-up');
  await patch(regD, 'approved');
  ok(refRow(d.id) === 'rewarded|30|0' && balance(u.bId) === 220 && balance(d.id) === 0, 'approval pays the inviter only when the new buyer gets nothing', [refRow(d.id), balance(u.bId), balance(d.id)]);
  ok(ledger(d.id) === '0', 'the new buyer has no referral row when the bonus is 0');

  console.log('\n== an admin turns one down');
  await putRules({ trigger: 'attended', referrerPoints: 40, referredPoints: 10, maxPerReferrer: 0 });
  const e = await signUp('buyer', mine.code);
  const refE = Number(sql(`SELECT id FROM buyer_referrals WHERE referred_id=${e.id}`));
  r = await fetch(BASE + '/api/admin/wallet/referrals', { method: 'POST', headers: AH, body: J({ action: 'reject', id: refE, note: 'Same person as another account' }) });
  ok(r.status === 200 && refRow(e.id) === 'rejected|0|0', 'a waiting referral can be rejected', refRow(e.id));
  r = await fetch(BASE + '/api/admin/wallet/referrals', { method: 'POST', headers: AH, body: J({ action: 'reject', id: refE }) });
  ok(r.status === 409, 'and only once', r.status);
  r = await fetch(BASE + '/api/admin/wallet/referrals', { method: 'POST', headers: AH, body: J({ action: 'reject', id: 'x' }) });
  ok(r.status === 400, 'a bad id is refused', r.status);
  r = await fetch(BASE + '/api/admin/wallet/referrals', { method: 'POST', headers: BH, body: J({ action: 'settle' }) });
  ok(r.status === 401, 'a buyer cannot pay referrals', r.status);
  sql(`INSERT INTO expo_registrations (exhibition_id,user_id,status) VALUES (${expoId},${e.id},'pending')`);
  await patch(Number(sql(`SELECT id FROM expo_registrations WHERE user_id=${e.id}`)), 'attended');
  ok(refRow(e.id) === 'rejected|0|0' && balance(u.bId) === 220 && balance(e.id) === 0, 'a rejected referral is never paid', [refRow(e.id), balance(u.bId)]);
  sum = await me();
  ok(sum.items.some((i) => i.status === 'rejected') && sum.invited === sum.items.filter((i) => i.status !== 'rejected').length, 'the inviter does not count it');
  admin = await (await fetch(BASE + '/api/admin/wallet/referrals?status=rejected&q=' + encodeURIComponent(`${tag}-${seq}`), { headers: AH })).json();
  ok(admin.items.length >= 1 && admin.items.every((i) => i.status === 'rejected') && admin.totals.rejected >= 1, 'the admin list filters and searches', admin.items.length);

  console.log('\n== each exhibition can pay its own points');
  await putRules({ trigger: 'attended', referrerPoints: 40, referredPoints: 10, maxPerReferrer: 0 });
  const mkExpo = (letter) => {
    sql(`INSERT INTO exhibitions (slug,title,start_date,end_date,venue,city,country,industry,description,highlights,exhibitors,visitors,organizer,registration_enabled) VALUES ('${tag}-${letter}','Referral Expo ${letter}',${day(20)},${day(22)},'Hall','Zzrefcity','China','X','d','[]',1,'','O',1)`);
    return Number(sql(`SELECT id FROM exhibitions WHERE slug='${tag}-${letter}'`));
  };
  const expoA = mkExpo('A'), expoB = mkExpo('B'), expoC = mkExpo('C');
  const setExpo = (id, a, b, headers = AH) => fetch(BASE + '/api/admin/wallet/referrals', { method: 'POST', headers, body: J({ action: 'exhibition', id, referrerPoints: a, referredPoints: b }) });
  ok((await setExpo(expoA, -1, 5)).status === 400, 'negative points for an exhibition are refused');
  ok((await setExpo(expoA, 1.5, 5)).status === 400, 'part points are refused');
  ok((await setExpo(expoA, 'x', 5)).status === 400, 'text is refused');
  ok((await setExpo(expoA, 100001, 5)).status === 400, 'an absurd amount is refused');
  ok((await setExpo(999999999, 5, 5)).status === 404, 'an unknown exhibition is not found');
  ok((await setExpo(expoA, 5, 5, BH)).status === 401, 'a buyer cannot set them');
  ok((await setExpo(expoA, 100, 25)).status === 200 && (await setExpo(expoB, 70, null)).status === 200 && (await setExpo(expoC, 0, 15)).status === 200, 'three exhibitions get their own points');
  admin = await (await fetch(BASE + '/api/admin/wallet/referrals?status=none', { headers: AH })).json();
  const rowOf = (id) => admin.exhibitions.find((x) => x.id === id);
  ok(rowOf(expoA).referrerPoints === 100 && rowOf(expoA).referredPoints === 25 && rowOf(expoB).referrerPoints === 70 && rowOf(expoB).referredPoints === null && rowOf(expoC).referrerPoints === 0, 'the admin list returns them (empty = default)', [rowOf(expoA), rowOf(expoB), rowOf(expoC)]);
  ok(rowOf(expoId).referrerPoints === null && rowOf(expoId).referredPoints === null, 'an exhibition nobody set up keeps the default');
  const attend = async (expo) => {
    const who = await signUp('buyer', mine.code);
    sql(`INSERT INTO expo_registrations (exhibition_id,user_id,status) VALUES (${expo},${who.id},'pending')`);
    const reg = Number(sql(`SELECT id FROM expo_registrations WHERE user_id=${who.id}`));
    return { id: who.id, reg };
  };
  let before = balance(u.bId);
  const fA = await attend(expoA);
  await patch(fA.reg, 'attended');
  ok(refRow(fA.id) === 'rewarded|100|25' && balance(u.bId) === before + 100 && balance(fA.id) === 25, 'attending exhibition A pays its 100 + 25', [refRow(fA.id), balance(u.bId) - before]);
  ok(sql(`SELECT exhibition_id FROM buyer_referrals WHERE referred_id=${fA.id}`) === String(expoA), 'and records which exhibition it was for');
  before = balance(u.bId);
  const fB = await attend(expoB);
  await patch(fB.reg, 'attended');
  ok(refRow(fB.id) === 'rewarded|70|10' && balance(u.bId) === before + 70 && balance(fB.id) === 10, 'B sets only the inviter: the new buyer gets the default 10', [refRow(fB.id)]);
  before = balance(u.bId);
  const fC = await attend(expoC);
  await patch(fC.reg, 'attended');
  ok(refRow(fC.id) === 'rewarded|0|15' && balance(u.bId) === before && balance(fC.id) === 15 && ledger(fC.id) === '1', 'C pays the inviter nothing and the new buyer 15', [refRow(fC.id), balance(u.bId) - before]);
  // approved stage uses the exhibition of the approved registration
  await putRules({ trigger: 'approved', referrerPoints: 40, referredPoints: 10, maxPerReferrer: 0 });
  before = balance(u.bId);
  const fApp = await attend(expoA);
  await patch(fApp.reg, 'approved');
  ok(refRow(fApp.id) === 'rewarded|100|25' && balance(u.bId) === before + 100, 'approval at exhibition A pays A\'s points too', refRow(fApp.id));
  // paying waiting ones later uses the exhibition the buyer reached the stage at
  await putRules({ trigger: 'attended', referrerPoints: 40, referredPoints: 10, maxPerReferrer: 0 });
  const fLate = await signUp('buyer', mine.code);
  sql(`INSERT INTO expo_registrations (exhibition_id,user_id,status) VALUES (${expoB},${fLate.id},'attended')`);
  ok(refRow(fLate.id) === 'pending|0|0', 'a buyer marked attended behind the scenes is still waiting');
  await settle();
  ok(refRow(fLate.id) === 'rewarded|70|10', '"Pay waiting referrals now" uses that exhibition\'s points', refRow(fLate.id));
  // sign-up has no exhibition: the default applies, whatever the exhibitions say
  await putRules({ trigger: 'signup', referrerPoints: 40, referredPoints: 10, maxPerReferrer: 0 });
  const fSign = await signUp('buyer', mine.code);
  ok(refRow(fSign.id) === 'rewarded|40|10', 'paid at sign-up, the default applies');
  await putRules({ trigger: 'attended', referrerPoints: 40, referredPoints: 10, maxPerReferrer: 0 });
  sum = await me();
  const byExpo = Object.fromEntries(sum.byExhibition.map((x) => [x.title, x]));
  ok(byExpo['Referral Expo A'].mine === 100 && byExpo['Referral Expo A'].theirs === 25 && byExpo['Referral Expo B'].mine === 70 && byExpo['Referral Expo B'].theirs === 10 && byExpo['Referral Expo C'].mine === 0 && byExpo['Referral Expo C'].theirs === 15, 'the inviter sees what each exhibition pays', sum.byExhibition);
  admin = await (await fetch(BASE + '/api/admin/wallet/referrals?status=rewarded&q=' + encodeURIComponent(fLate.email), { headers: AH })).json();
  ok(admin.items.some((i) => i.exhibitionTitle === 'Referral Expo B'), 'the admin list says which exhibition paid it');

  console.log('\n== accounts that cannot be paid');
  const t = mkBuyer('suspendme');
  const tTok = /token=([^;]+)/.exec((await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ipn() }, body: J({ email: `${tag}-suspendme@test.invalid`, password: 'pass1234' }) })).headers.getSetCookie().join(';'))[1];
  const tCode = (await me({ cookie: 'token=' + tTok })).code;
  const w = await signUp('buyer', tCode);
  ok(refRow(w.id) === 'pending|0|0', 'a referral to a buyer is waiting for the attended stage');
  sql(`UPDATE users SET status='suspended' WHERE id=${t}`);
  await putRules({ trigger: 'signup', referrerPoints: 40, referredPoints: 10, maxPerReferrer: 0 });
  await settle();
  ok(refRow(w.id) === 'pending|0|0' && balance(t) === 0 && balance(w.id) === 0, 'a suspended inviter is not paid, and neither is the friend', [refRow(w.id), balance(t)]);
  const afterSuspend = await signUp('buyer', tCode);
  ok(refRow(afterSuspend.id) === '', 'a suspended buyer\'s link records nothing');
  sql(`UPDATE users SET status='active' WHERE id=${t}`);
  await settle();
  ok(refRow(w.id) === 'rewarded|40|10' && balance(t) === 40 && balance(w.id) === 10, 'reactivated, it is paid', [refRow(w.id), balance(t)]);

  console.log('\n== several paid at the same moment');
  const racer = mkBuyer('racer');
  const kids = [1, 2, 3, 4, 5].map((i) => mkBuyer('racekid' + i));
  await putRules({ trigger: 'attended', referrerPoints: 10, referredPoints: 5, maxPerReferrer: 2 });
  for (const k of kids) sql(`INSERT INTO buyer_referrals (referrer_id,referred_id,created_at) VALUES (${racer},${k},UTC_TIMESTAMP())`);
  await putRules({ trigger: 'signup', referrerPoints: 10, referredPoints: 5, maxPerReferrer: 2 });
  await Promise.all([settle(), settle(), settle(), settle()]);
  const paidKids = kids.filter((k) => refRow(k).startsWith('rewarded')).length;
  ok(paidKids === 2 && balance(racer) === 20, 'four payments at once still stop at the cap of 2', [paidKids, balance(racer)]);
  ok(kids.every((k) => (refRow(k).startsWith('rewarded') ? balance(k) === 5 && ledger(k) === '1' : balance(k) === 0)), 'each rewarded friend got exactly one +5');
  const mism2 = await (await fetch(BASE + '/api/admin/wallet/overview', { headers: AH })).json();
  ok(!mism2.mismatches || mism2.mismatches.length === 0, 'the ledger still balances after the race', mism2.mismatches);

  console.log('\n== screens');
  // a state the buyer screen shows well: attended stage, 50 + 20, cap 3 (the buyer has already been rewarded more often than that)
  await putRules({ trigger: 'attended', referrerPoints: 50, referredPoints: 20, maxPerReferrer: 3 });
  const pending = mkBuyer('pendingone');
  sql(`INSERT INTO buyer_referrals (referrer_id,referred_id,created_at) VALUES (${u.bId},${pending},UTC_TIMESTAMP())`);
  const pendingRef = Number(sql(`SELECT id FROM buyer_referrals WHERE referred_id=${pending}`));
  const code = (await me()).code;
  const br = await launch();
  const open = async (token, path, width = 375) => {
    const ctx = await br.newContext({ viewport: { width, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'], extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    if (token) await ctx.addCookies([{ name: 'token', value: token, url: BASE }]);
    await ctx.addInitScript(() => { Math.random = () => 0.99; });
    const p = await ctx.newPage();
    await p.goto(BASE + path, { waitUntil: 'domcontentloaded' });
    return [ctx, p];
  };

  for (const locale of ['en', 'ru', 'zh']) {
    console.log(`\n== ${locale}: buyer invite page`);
    const [ctx, p] = await open(u.bT, `/${locale}/dashboard/buyer/wallet/invite`);
    await p.getByTestId('invite-link').waitFor();
    await p.getByTestId('invite-rule').waitFor();
    await sleep(800);
    const link = await p.getByTestId('invite-link').inputValue();
    ok(link.endsWith(`/${locale}/register?invite=${code}`), 'the link carries the code and the language', link);
    const rule = (await p.getByTestId('invite-rule').innerText()).replace(/\s+/g, ' ');
    ok(!/[{}]/.test(rule) && /50/.test(rule) && /20/.test(rule), 'the rule shows the points the admin set', rule);
    if (locale === 'en') ok(/When|For each friend who attends an exhibition/.test(rule) && /Up to 3 rewarded friends/.test(rule), 'and the stage and the cap', rule);
    ok(await p.getByTestId('invite-limit').isVisible(), 'a buyer over the cap is told so');
    ok((await p.getByTestId('invite-code').innerText()).includes(code), 'the code is shown too');
    const byExpoText = await p.getByTestId('invite-by-expo').innerText();
    ok(byExpoText.includes('Referral Expo A') && /100/.test(byExpoText) && !/[{}]/.test(byExpoText), 'exhibitions with their own points are listed', byExpoText);
    const stats = (await p.getByTestId('invite-stats').innerText()).replace(/\s+/g, ' ');
    ok(/\d/.test(stats), 'the three counters are shown', stats);
    ok((await p.getByTestId('invite-list').locator('li').count()) >= 5, 'the people invited are listed');
    ok((await p.getByTestId('invite-list').innerText()).includes('*'), 'names are masked');
    await p.getByTestId('invite-copy').click();
    await sleep(300);
    if (locale === 'en') ok(/Link copied/.test(await p.locator('main').innerText()), 'copying says so');
    ok((await p.locator('nav a[aria-current="page"]').count()) >= 1, 'the Invite tab is marked as the current one');
    const vio = await axeViolations(p);
    ok(vio.length === 0, 'accessible (axe)', vio);
    const w375 = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    ok(w375, 'fits a 375 px phone');
    await ctx.close();
  }

  console.log('\n== buyer page when the programme is off');
  await putRules({ enabled: false, maxPerReferrer: 0 });
  { const [ctx, p] = await open(u.bT, '/en/dashboard/buyer/wallet/invite');
    await p.getByTestId('invite-off').waitFor();
    ok((await p.getByTestId('invite-link').count()) === 0, 'no link is offered');
    await ctx.close(); }
  await putRules({ trigger: 'attended', referrerPoints: 50, referredPoints: 20, maxPerReferrer: 3 });

  console.log('\n== sign-up page with an invitation');
  for (const locale of ['en', 'ru', 'zh']) {
    const [ctx, p] = await open(null, `/${locale}/register?invite=${code}`);
    await p.getByTestId('register-invited').waitFor();
    const text = (await p.getByTestId('register-invited').innerText()).replace(/\s+/g, ' ');
    ok(/20/.test(text) && !/[{}]/.test(text), `${locale}: the newcomer is told what they get`, text);
    await ctx.close();
  }
  { const [ctx, p] = await open(null, '/en/register');
    await sleep(800);
    ok((await p.getByTestId('register-invited').count()) === 0, 'no invitation, no banner');
    await ctx.close(); }
  { const [ctx, p] = await open(null, `/en/register?invite=${code}`);
    await p.getByTestId('register-invited').waitFor();
    const email = `${tag}-ui@test.invalid`;
    await p.locator('#name').fill('Rf Ui Person');
    await p.locator('#email').fill(email);
    await p.locator('#password').fill('pass1234');
    await p.getByRole('button', { name: /create/i }).last().click();
    await p.waitForURL('**/dashboard/buyer**', { timeout: 20000 });
    const newId = Number(sql(`SELECT id FROM users WHERE email='${email}'`));
    ok(refRow(newId) === 'pending|0|0', 'signing up through the page records the referral', refRow(newId));
    await ctx.close(); }

  for (const locale of ['en', 'ru', 'zh']) {
    console.log(`\n== ${locale}: admin Referrals tab`);
    const [ctx, p] = await open(u.aT, `/${locale}/admin/wallet?tab=referrals`);
    await p.getByTestId('referral-form').waitFor();
    await p.getByTestId('referral-list').waitFor();
    await sleep(800);
    const totals = (await p.getByTestId('referral-totals').innerText()).replace(/\s+/g, ' ');
    ok(/\d/.test(totals), 'totals are shown', totals);
    ok((await p.getByTestId(`referral-${pendingRef}`).count()) === 1, 'the waiting referral is listed');
    ok((await p.getByTestId('referral-list').innerText()).includes('Rf Person'), 'with the names');
    const html = await p.locator('main').innerText();
    ok(!/[{}]/.test(html) && !/adminWallet\./.test(html), 'no raw message keys');
    const vio = await axeViolations(p);
    ok(vio.length === 0, 'accessible (axe)', vio);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'fits a 375 px phone');
    await ctx.close();
  }

  console.log('\n== admin edits the rules on screen, and rejects one');
  { const [ctx, p] = await open(u.aT, '/en/admin/wallet?tab=referrals');
    await p.getByTestId('referral-form').waitFor();
    await sleep(600);
    await p.getByLabel('Points for the buyer who invites').fill('77');
    await p.getByLabel('Points for the new buyer').fill('33');
    await p.getByLabel('Most rewarded referrals per buyer (0 = no limit)').fill('9');
    await p.getByLabel(/Pay the points when the new buyer/).selectOption('approved');
    await p.getByRole('button', { name: /^Save$/ }).click();
    await p.getByTestId('referral-saved').waitFor();
    const saved = (await (await fetch(BASE + '/api/admin/wallet/referrals', { headers: AH })).json()).settings;
    ok(saved.referrerPoints === 77 && saved.referredPoints === 33 && saved.maxPerReferrer === 9 && saved.trigger === 'approved' && saved.enabled === true, 'the new rules are in effect', saved);
    await p.getByLabel('Points for the new buyer').fill('0');
    await p.getByLabel('Points for the buyer who invites').fill('0');
    ok(await p.getByRole('button', { name: /^Save$/ }).isDisabled(), 'switched on with nothing to pay cannot be saved');
    await p.getByLabel('Points for the buyer who invites').fill('77');
    await p.getByLabel('Find an exhibition').fill('Referral Expo B');
    await sleep(300);
    await p.getByTestId(`referral-expo-${expoB}`).getByLabel('Inviter points for Referral Expo B').fill('');
    await p.getByTestId(`referral-expo-${expoB}`).getByLabel('New buyer points for Referral Expo B').fill('12');
    await p.getByTestId(`referral-expo-${expoB}`).getByRole('button', { name: 'Save Referral Expo B' }).click();
    await p.getByTestId(`referral-expo-${expoB}`).getByRole('status').waitFor();
    const row = (await (await fetch(BASE + '/api/admin/wallet/referrals?status=none', { headers: AH })).json()).exhibitions.find((x) => x.id === expoB);
    ok(row.referrerPoints === null && row.referredPoints === 12, 'an exhibition\'s points are edited on screen (empty = default)', row);
    await p.getByTestId(`referral-expo-${expoB}`).getByLabel('New buyer points for Referral Expo B').fill('abc');
    ok(await p.getByTestId(`referral-expo-${expoB}`).getByRole('button', { name: 'Save Referral Expo B' }).isDisabled(), 'text cannot be saved');
    await p.getByLabel('Find an exhibition').fill('');
    p.on('dialog', (dlg) => dlg.accept());
    await p.getByLabel('Show').selectOption('pending');
    await sleep(800);
    ok((await p.getByTestId('referral-list').locator('li').count()) >= 1 && !(await p.getByTestId('referral-list').innerText()).includes('Rewarded'), 'the filter shows only waiting ones');
    await p.getByTestId(`referral-reject-${pendingRef}`).click();
    await sleep(1200);
    ok(refRow(pending) === 'rejected|0|0', 'rejecting from the screen works', refRow(pending));
    await p.getByTestId('referral-settle').click();
    await p.getByTestId('referral-settled').waitFor();
    ok(/paid/.test(await p.getByTestId('referral-settled').innerText()), 'the pay-waiting button reports what it did');
    await ctx.close(); }

  await br.close();
  // leave the programme off, as a fresh site has it
  await putRules({ enabled: false, maxPerReferrer: 0 });
  done();
})();
