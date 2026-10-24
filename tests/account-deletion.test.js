// A person deletes their own account: what stops them, what is wiped, what stays for the books, and that nothing else is touched.
const bcrypt = require('bcryptjs');
const { BASE, sql, ok, done, mkUsers, login, connect } = require('./helpers/common.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const smtp = require('./helpers/fake-smtp.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.63.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const H = (t) => ({ 'Content-Type': 'application/json', cookie: 'token=' + t, 'x-forwarded-for': ipn() });
const call = (method, path, body, t) => fetch(BASE + path, { method, headers: H(t), body: body ? JSON.stringify(body) : undefined }).then(async (r) => ({ status: r.status, setCookie: r.headers.get('set-cookie') || '', ...(await r.json().catch(() => ({}))) }));
const num = (q) => Number(sql(q));
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

(async () => {
  const st = Date.now(), pw = bcrypt.hashSync('pass1234', 10);
  const srv = await smtp.start(2543);
  const admin = await mkUsers('ad');
  await fetch(BASE + '/api/admin/email', { method: 'PUT', headers: H(admin.aT), body: JSON.stringify({ enabled: true, host: '127.0.0.1', port: 2543, secure: false, username: 'm', password: 'x', fromName: 'The Unique Expo', fromEmail: 'noreply@theuniqueexpo.test' }) });
  const conn = await connect();
  const mkBuyer = async (tag) => {
    const email = `ad-${tag}-${st}@test.invalid`;
    await conn.query(`INSERT INTO users (name,email,password_hash,role,country) VALUES (?,?,?,'buyer','China')`, [`Del ${tag}`, email, pw]);
    const [[row]] = await conn.query('SELECT id FROM users WHERE email=?', [email]);
    return { id: row.id, email, token: await login(email) };
  };
  const day = (n) => `DATE_ADD(UTC_DATE(), INTERVAL ${n} DAY)`;
  const tag = `ad${st}`;
  sql(`INSERT INTO exhibitions (slug,title,start_date,end_date,registration_enabled) VALUES ('${tag}-up','Del Upcoming Expo',${day(30)},${day(32)},1),('${tag}-past','Del Past Expo',DATE_SUB(UTC_DATE(), INTERVAL 40 DAY),DATE_SUB(UTC_DATE(), INTERVAL 38 DAY),1)`);
  const upId = num(`SELECT id FROM exhibitions WHERE slug='${tag}-up'`), pastId = num(`SELECT id FROM exhibitions WHERE slug='${tag}-past'`);

  console.log('\n== who cannot delete');
  ok((await call('GET', '/api/auth/delete-account', null, '')).status === 401, 'signing in is needed');
  let r = await call('GET', '/api/auth/delete-account', null, admin.aT);
  ok(r.blockers.includes('admin_account'), 'an administrator is told to ask another administrator');
  ok((await call('POST', '/api/auth/delete-account', { password: 'pass1234', understand: true }, admin.aT)).status === 409, 'and cannot delete the account from here');
  ok(num(`SELECT COUNT(*) FROM users WHERE id=${num(`SELECT id FROM users WHERE email='${admin.m.a}'`)} AND deleted_at IS NULL`) === 1, 'the administrator account is untouched');

  const rich = await mkBuyer('rich');
  const other = await mkBuyer('other');
  // reward points: a wallet with 120 points
  sql(`INSERT INTO wallets (user_id,wallet_code,balance,created_at) VALUES (${rich.id},CONCAT('AD',LPAD(${rich.id},22,'0')),120,NOW())`);
  sql(`INSERT INTO wallet_transactions (user_id,amount,balance_after,type,note,idem_key,created_at) VALUES (${rich.id},120,120,'adjustment','seed','ad1-${st}',NOW())`);
  r = await call('GET', '/api/auth/delete-account', null, rich.token);
  ok(r.blockers.join() === 'wallet_balance' && r.balance === 120, 'points left: the person is told how many', r);
  r = await call('POST', '/api/auth/delete-account', { password: 'pass1234', understand: true }, rich.token);
  ok(r.status === 409 && r.code === 'blocked' && r.blockers.includes('wallet_balance'), 'and the deletion is refused');
  ok(num(`SELECT COUNT(*) FROM users WHERE id=${rich.id} AND name='Del rich'`) === 1, 'nothing was changed');
  // spend them down, but leave a withdrawal waiting
  sql(`INSERT INTO wallet_transactions (user_id,amount,balance_after,type,note,idem_key,created_at) VALUES (${rich.id},-120,0,'withdrawal_hold','seed','ad2-${st}',NOW())`);
  sql(`UPDATE wallets SET balance=0 WHERE user_id=${rich.id}`);
  sql(`INSERT INTO wallet_withdrawals (user_id,points,method,status,qr_image,account_name,bank_name,note,created_at) VALUES (${rich.id},120,'alipay','pending','${PNG}','Rich Person','Some Bank','pay me',NOW())`);
  r = await call('GET', '/api/auth/delete-account', null, rich.token);
  ok(r.blockers.join() === 'pending_money' && r.pendingMoney === 1, 'a money request waiting also stops it', r);
  sql(`UPDATE wallet_withdrawals SET status='paid', processed_at=NOW() WHERE user_id=${rich.id}`);

  // personal data in many places
  const email = rich.email;
  sql(`INSERT INTO buyer_profiles (user_id,company_name,nationality,passport_number,contact_person,phone_number,doc_passport_front,doc_business_card) VALUES (${rich.id},'Rich Co','Chinese','E1234567','Rich Person','+86 138 0000 1111','${PNG}','${PNG}')`);
  sql(`INSERT INTO expo_registrations (exhibition_id,user_id,full_name,nationality,passport_number,company_name,phone,email,doc_passport_front,custom_answers,status) VALUES (${upId},${rich.id},'Rich Person','Chinese','E1234567','Rich Co','+86 138 0000 1111','${email}','${PNG}','{"x":"secret"}','approved'),(${pastId},${rich.id},'Rich Person','Chinese','E1234567','Rich Co','+86 138 0000 1111','${email}','${PNG}','{"x":"secret"}','attended')`);
  sql(`INSERT INTO exhibition_favorites (user_id, exhibition_id) VALUES (${rich.id},${upId})`);
  sql(`INSERT INTO user_notifications (user_id,kind,params,path) VALUES (${rich.id},'announcement','{}','/')`);
  sql(`INSERT INTO exhibitor_reviews (exhibitor_slug,user_id,user_name,rating,comment) VALUES ('x',${rich.id},'Rich Person',5,'great')`);
  sql(`INSERT INTO business_trip_inquiries (user_id,name,email,phone) VALUES (${rich.id},'Rich Person','${email}','123')`);
  sql(`INSERT INTO business_trip_inquiries (user_id,name,email,phone) VALUES (NULL,'Rich Anonymous','${email.toUpperCase()}','456')`);
  sql(`INSERT INTO newsletter_subscribers (email) VALUES ('${email}')`);
  sql(`INSERT INTO rfqs (title,buyer_id,buyer_name) VALUES ('Rich RFQ',${rich.id},'Rich Person')`);
  sql(`INSERT INTO wallet_topups (user_id,points,proof,note,status,approved_points,created_at) VALUES (${rich.id},50,'${PNG}','my note','approved',50,NOW())`);
  sql(`INSERT INTO wallet_expense_claims (user_id,category,title,amount_text,note,receipts,receipt_count,status,created_at) VALUES (${rich.id},'taxi','Taxi','20','receipt note','["${PNG}"]',1,'approved',NOW())`);
  sql(`INSERT INTO email_log (user_id,to_email,kind,subject,status) VALUES (${rich.id},'${email}','test','Hello Rich Person','sent')`);
  // the other buyer has the same kinds of data: it must stay
  sql(`INSERT INTO buyer_profiles (user_id,company_name,passport_number,doc_passport_front) VALUES (${other.id},'Other Co','P7654321','${PNG}')`);
  sql(`INSERT INTO expo_registrations (exhibition_id,user_id,full_name,passport_number,status) VALUES (${upId},${other.id},'Other Person','P7654321','approved')`);
  sql(`INSERT INTO exhibition_favorites (user_id, exhibition_id) VALUES (${other.id},${upId})`);
  const ledgerBefore = num(`SELECT COALESCE(SUM(amount),0) FROM wallet_transactions WHERE user_id=${rich.id}`);

  console.log('\n== asking in the wrong way');
  r = await call('GET', '/api/auth/delete-account', null, rich.token);
  ok(r.blockers.length === 0 && r.upcomingRegistrations === 1, 'nothing stops it now; one upcoming registration would be cancelled', r);
  ok((await call('POST', '/api/auth/delete-account', { password: 'pass1234' }, rich.token)).code === 'invalid_input', 'without "I understand": refused');
  ok((await call('POST', '/api/auth/delete-account', { password: '', understand: true }, rich.token)).code === 'invalid_input', 'without a password: refused');
  ok((await call('POST', '/api/auth/delete-account', { password: 'wrong-password', understand: true }, rich.token)).code === 'wrong_password', 'with a wrong password: refused');
  ok(num(`SELECT COUNT(*) FROM buyer_profiles WHERE user_id=${rich.id}`) === 1 && num(`SELECT COUNT(*) FROM users WHERE id=${rich.id} AND deleted_at IS NULL`) === 1, 'and nothing was deleted');

  console.log('\n== deleting');
  const n0 = srv.messages.length;
  r = await call('POST', '/api/auth/delete-account', { password: 'pass1234', understand: true }, rich.token);
  ok(r.status === 200 && r.ok === true && r.cancelled === 1, 'it is done; the upcoming registration was cancelled', r);
  ok(/token=;|token=""|Max-Age=0|max-age=0/i.test(r.setCookie), 'the sign-in cookie is cleared');
  const [[u]] = await conn.query('SELECT name,email,status,country,deleted_at,password_hash FROM users WHERE id=?', [rich.id]);
  ok(u.name === 'Deleted account' && u.email === `deleted-${rich.id}@noemail.invalid` && u.status === 'suspended' && u.deleted_at && u.country === '', 'the account is an empty shell: no name, an address that cannot get mail, marked deleted');
  ok(!(await bcrypt.compare('pass1234', u.password_hash)), 'the password is gone');
  const attempt = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ipn() }, body: JSON.stringify({ email, password: 'pass1234' }) });
  ok(attempt.status >= 400, 'signing in with the old details no longer works');
  ok((await call('GET', '/api/auth/me', null, rich.token)).status === 401 || !(await call('GET', '/api/auth/me', null, rich.token)).user, 'the old session is ended');
  ok(num(`SELECT COUNT(*) FROM buyer_profiles WHERE user_id=${rich.id}`) === 0, 'the profile and its documents are gone');
  ok(num(`SELECT COUNT(*) FROM exhibition_favorites WHERE user_id=${rich.id}`) === 0 && num(`SELECT COUNT(*) FROM user_notifications WHERE user_id=${rich.id}`) === 0 && num(`SELECT COUNT(*) FROM exhibitor_reviews WHERE user_id=${rich.id}`) === 0, 'favourites, notifications and reviews are gone');
  ok(num(`SELECT COUNT(*) FROM business_trip_inquiries WHERE user_id=${rich.id} OR LOWER(email)=LOWER('${email}')`) === 0, 'inquiries are gone, including one sent without signing in from the same address');
  ok(num(`SELECT COUNT(*) FROM newsletter_subscribers WHERE email='${email}'`) === 0, 'the newsletter address is gone');
  const [regs] = await conn.query(`SELECT status, full_name, passport_number, company_name, phone, email, doc_passport_front, custom_answers FROM expo_registrations WHERE user_id=? ORDER BY exhibition_id`, [rich.id]);
  ok(regs.length === 2, 'both registrations are kept for the exhibitions\' numbers');
  ok(regs.every((x) => !x.full_name && !x.passport_number && !x.company_name && !x.phone && !x.email && !x.doc_passport_front && !x.custom_answers), 'but without the person: no name, passport, company, phone, e-mail, document or answers', regs);
  ok(regs.map((x) => x.status).sort().join() === 'attended,cancelled' || regs.map((x) => x.status).sort().join() === 'cancelled,attended', 'the upcoming one is cancelled, the one already attended stays attended', regs.map((x) => x.status));
  ok((await conn.query('SELECT buyer_name FROM rfqs WHERE buyer_id=?', [rich.id]))[0][0].buyer_name === 'Deleted account', 'a marketplace request keeps its content but not the name');
  console.log('\n== the books still add up');
  ok(num(`SELECT COALESCE(SUM(amount),0) FROM wallet_transactions WHERE user_id=${rich.id}`) === ledgerBefore && num(`SELECT COUNT(*) FROM wallet_transactions WHERE user_id=${rich.id}`) === 2, 'the wallet entries are all still there, with the same amounts');
  ok(num(`SELECT balance FROM wallets WHERE user_id=${rich.id}`) === 0, 'and the balance still matches them (0)');
  const [[wd]] = await conn.query('SELECT qr_image, account_name, bank_name, note, points, status FROM wallet_withdrawals WHERE user_id=?', [rich.id]);
  ok(!wd.qr_image && wd.account_name === '' && wd.bank_name === '' && wd.note === '' && wd.points === 120 && wd.status === 'paid', 'payout details are wiped; the amount and status stay');
  const [[tp]] = await conn.query('SELECT proof, note, points FROM wallet_topups WHERE user_id=?', [rich.id]);
  ok(tp.proof === '' && tp.note === '' && tp.points === 50, 'top-up proof is wiped; the amount stays');
  const [[ex]] = await conn.query('SELECT receipts, note, receipt_count FROM wallet_expense_claims WHERE user_id=?', [rich.id]);
  ok(ex.receipts === '[]' && ex.note === '' && ex.receipt_count === 0, 'expense receipts are wiped');
  const [[lg]] = await conn.query('SELECT to_email, subject FROM email_log WHERE user_id=?', [rich.id]);
  ok(lg.to_email === 'deleted' && lg.subject === '', 'the mail log keeps its count, not the address');
  const books = await call('GET', '/api/admin/wallet/overview', null, admin.aT);
  ok(Array.isArray(books.mismatches) && !books.mismatches.some((m) => m.userId === rich.id), 'the admin books check finds no mismatch for this account');
  console.log('\n== the person is told, and nobody else is touched');
  for (let i = 0; i < 40 && srv.messages.length === n0; i++) await sleep(150);
  const m = srv.messages.slice(n0).find((x) => x.to.join().includes(email));
  ok(!!m && /account was deleted/i.test(smtp.decode(m.raw).subject), 'an e-mail says the account was deleted, sent to the address it had');
  ok(num(`SELECT COUNT(*) FROM buyer_profiles WHERE user_id=${other.id} AND passport_number='P7654321'`) === 1 && num(`SELECT COUNT(*) FROM expo_registrations WHERE user_id=${other.id} AND passport_number='P7654321'`) === 1 && num(`SELECT COUNT(*) FROM exhibition_favorites WHERE user_id=${other.id}`) === 1, 'another buyer\'s data is untouched');
  ok((await call('POST', '/api/auth/delete-account', { password: 'pass1234', understand: true }, rich.token)).status === 401, 'asking again fails: the session is gone');
  const again = await call('POST', '/api/auth/register', { name: 'Back Again', email, password: 'pass1234', role: 'buyer', country: 'China' }, '');
  ok(again.status < 300, 'the same e-mail address can be used to sign up again', again);

  console.log('\n== the screen (en / ru / zh, 375 px)');
  const br = await launch();
  const open = async (locale, token) => {
    const c = await br.newContext({ viewport: { width: 375, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    await c.addCookies([{ name: 'token', value: token, url: BASE }]);
    const p = await c.newPage();
    await p.goto(`${BASE}/${locale}/dashboard/account`, { waitUntil: 'domcontentloaded' });
    await p.getByTestId('delete-account').waitFor();
    return [c, p];
  };
  const blocked = await mkBuyer('blocked');
  sql(`INSERT INTO wallets (user_id,wallet_code,balance,created_at) VALUES (${blocked.id},CONCAT('AE',LPAD(${blocked.id},22,'0')),75,NOW())`);
  sql(`INSERT INTO wallet_transactions (user_id,amount,balance_after,type,note,idem_key,created_at) VALUES (${blocked.id},75,75,'adjustment','seed','ad3-${st}',NOW())`);
  for (const locale of ['en', 'ru', 'zh']) {
    const [c, p] = await open(locale, blocked.token);
    await p.getByTestId('delete-account').locator('button').first().click();
    await p.getByTestId('delete-blockers').waitFor();
    ok(/75/.test(await p.getByTestId('delete-blockers').innerText()), `${locale}: the points that stop the deletion are shown`);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${locale}: no sideways scrolling`);
    await sleep(800);
    const vio = await axeViolations(p); ok(vio.length === 0, `${locale}: axe 0`, vio);
    await c.close();
  }
  const free = await mkBuyer('free');
  { const [c, p] = await open('en', free.token);
    await p.getByTestId('delete-account').locator('button').first().click();
    await p.getByLabel('Your password').waitFor();
    const submit = p.getByRole('button', { name: 'Delete my account for good' });
    ok(await submit.isDisabled(), 'the delete button waits for the password and the tick');
    await p.getByLabel('Your password').fill('pass1234');
    await p.getByLabel('I understand that this cannot be undone.').click();
    await sleep(500);
    const vio = await axeViolations(p); ok(vio.length === 0, 'form: axe 0', vio);
    await submit.click();
    await p.waitForURL((u) => !/dashboard\/account/.test(u.pathname), { timeout: 15000 });
    ok(num(`SELECT COUNT(*) FROM users WHERE id=${free.id} AND deleted_at IS NOT NULL`) === 1, 'confirming in the browser deletes the account and leaves the page');
    await c.close(); }
  await br.close();
  await conn.end();
  await srv.close();
  sql(`DELETE FROM exhibitions WHERE slug LIKE '${tag}%'`);
  done();
})().catch((e) => { console.error(e); process.exit(1); });
