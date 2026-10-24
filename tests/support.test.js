// "Ask our team": a buyer writes to the staff inside the site, staff answer from the admin. Who can do what, whose turn it is, unread
// answers, the notification, staff roles, deleting an account, and the screens in en/ru/zh.
const { BASE, sql, ok, done, mkUsers, onlyAdmins } = require('./helpers/common.js');
const smtp = require('./helpers/fake-smtp.js');
const { launch, axeViolations } = require('./helpers/browser.js');
const bcrypt = require('bcryptjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipn = () => '198.64.' + Math.floor(Math.random() * 256) + '.' + (Math.floor(Math.random() * 250) + 2);
const num = (q) => Number(sql(q) || 0);

(async () => {
  const u = await mkUsers('sp');
  const tag = `sp${Date.now()}`;
  const pw = bcrypt.hashSync('pass1234', 10);
  const J = (body) => JSON.stringify(body);
  const H = (t) => ({ cookie: 'token=' + t, 'Content-Type': 'application/json' });
  const call = async (method, path, token, body) => { const r = await fetch(BASE + path, { method, headers: token ? H(token) : { 'Content-Type': 'application/json' }, body: body ? J(body) : undefined }); return { status: r.status, ...(await r.json().catch(() => ({}))) }; };
  const mkBuyer = async (name) => {
    const email = `${tag}-${name}@test.invalid`;
    sql(`INSERT INTO users (name,email,password_hash,role,country) VALUES ('Support ${name}','${email}','${pw}','buyer','')`);
    const id = Number(sql(`SELECT id FROM users WHERE email='${email}'`));
    const token = /token=([^;]+)/.exec((await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ipn() }, body: J({ email, password: 'pass1234' }) })).headers.getSetCookie().join(';'))[1];
    return { id, email, token };
  };
  const other = await mkBuyer('other');

  console.log('\n== who can write');
  ok((await call('GET', '/api/support/threads')).status === 401, 'a visitor cannot list');
  ok((await call('POST', '/api/support/threads', null, { topic: 'other', subject: 'Hi', body: 'Hello' })).status === 401, 'a visitor cannot write');
  ok((await call('GET', '/api/support/threads', u.aT)).status === 403, 'an admin account has no buyer conversations');
  ok((await call('GET', '/api/support/unread')).status === 401, 'a visitor has no unread count');
  ok((await call('GET', '/api/admin/support', u.bT)).status === 401, 'a buyer cannot read the admin list');
  ok((await call('GET', '/api/admin/support/waiting', u.bT)).status === 401, 'nor the admin count');
  const write = (over, token = u.bT) => call('POST', '/api/support/threads', token, { topic: 'tickets', subject: 'My train ticket', body: 'Hello,\nwhere do I send the receipt?', ...over });
  ok((await write({ topic: 'bogus' })).status === 400, 'an unknown topic is refused');
  ok((await write({ subject: ' ' })).status === 400, 'an empty subject is refused');
  ok((await write({ subject: 'x'.repeat(151) })).status === 400, 'a subject over 150 characters is refused');
  ok((await write({ body: ' ' })).status === 400, 'an empty message is refused');
  ok((await write({ body: 'x'.repeat(4001) })).status === 400, 'a message over 4000 characters is refused');
  ok(num(`SELECT COUNT(*) FROM support_threads WHERE user_id=${u.bId}`) === 0, 'none of those left a conversation behind');

  console.log('\n== a question and its answer');
  const waitingBefore = (await call('GET', '/api/admin/support/waiting', u.aT)).waiting;
  const made = await write({ body: 'Hello,\nwhere do I send the receipt? <b>thanks</b>' });
  ok(made.status === 201 && made.id > 0, 'a buyer writes to the team', made);
  let list = await call('GET', '/api/support/threads', u.bT);
  const mine = list.items.find((x) => x.id === made.id);
  ok(mine && mine.status === 'open' && mine.waitingOn === 'staff' && mine.unread === false && mine.topic === 'tickets', 'it waits for the team and is not "unread" for the buyer', mine);
  ok((await call('GET', '/api/admin/support/waiting', u.aT)).waiting === waitingBefore + 1, 'the admin count goes up by one');
  const adminList = await call('GET', `/api/admin/support?filter=waiting&q=${encodeURIComponent(u.m.b)}`, u.aT);
  const row = adminList.items.find((x) => x.id === made.id);
  ok(row && row.buyerEmail === u.m.b && row.messageCount === 1 && row.waitingOn === 'staff', 'the admin sees it among those waiting, with the buyer\'s details', row);
  ok(!(await call('GET', `/api/admin/support?filter=answered&q=${encodeURIComponent(u.m.b)}`, u.aT)).items.some((x) => x.id === made.id), 'and not among the answered ones');
  let thread = await call('GET', `/api/support/threads/${made.id}`, u.bT);
  ok(thread.messages.length === 1 && thread.messages[0].fromStaff === false && thread.messages[0].body.includes('\n') && thread.messages[0].body.includes('<b>thanks</b>'), 'the message is kept as typed, line break included', thread.messages);
  ok((await call('GET', `/api/support/threads/${made.id}`, other.token)).status === 404, 'another buyer cannot open it');
  ok((await call('POST', `/api/support/threads/${made.id}`, other.token, { body: 'Hello from someone else' })).status === 404, 'another buyer cannot write in it');
  ok(num(`SELECT COUNT(*) FROM support_messages WHERE thread_id=${made.id}`) === 1, 'and nothing was added');
  ok((await call('GET', `/api/support/threads/${made.id}`)).status === 401, 'a visitor cannot open it');

  ok((await call('POST', `/api/admin/support/${made.id}`, u.bT, { action: 'reply', body: 'I am a buyer' })).status === 401, 'a buyer cannot answer as the team');
  ok((await call('POST', `/api/admin/support/${made.id}`, u.aT, { action: 'reply', body: ' ' })).status === 400, 'an empty answer is refused');
  ok((await call('POST', `/api/admin/support/${made.id}`, u.aT, { action: 'bogus' })).status === 400, 'an unknown action is refused');
  ok((await call('POST', '/api/admin/support/999999999', u.aT, { action: 'reply', body: 'Hello' })).status === 404, 'an unknown conversation is not found');
  const answer = await call('POST', `/api/admin/support/${made.id}`, u.aT, { action: 'reply', body: 'Send it on the Ticket refund page of your wallet.' });
  ok(answer.status === 200, 'the team answers', answer);
  await sleep(500);
  ok(num(`SELECT COUNT(*) FROM user_notifications WHERE user_id=${u.bId} AND kind='supportReply'`) === 1, 'the buyer is told on the website');
  ok((await call('GET', '/api/admin/support/waiting', u.aT)).waiting === waitingBefore, 'the admin count goes back down');
  list = await call('GET', '/api/support/threads', u.bT);
  const answered = list.items.find((x) => x.id === made.id);
  ok(answered.waitingOn === 'buyer' && answered.unread === true, 'the buyer sees a new answer', answered);
  ok((await call('GET', '/api/support/unread', u.bT)).unread === 1, 'and the menu count is 1');
  ok((await call('GET', `/api/admin/support?filter=answered&q=${encodeURIComponent(u.m.b)}`, u.aT)).items.some((x) => x.id === made.id), 'the admin finds it under answered');
  thread = await call('GET', `/api/support/threads/${made.id}`, u.bT);
  ok(thread.messages.length === 2 && thread.messages[1].fromStaff === true, 'opening it shows both messages');
  ok((await call('GET', '/api/support/unread', u.bT)).unread === 0 && (await call('GET', '/api/support/threads', u.bT)).items.find((x) => x.id === made.id).unread === false, 'and marks the answer as read');
  ok((await call('POST', `/api/support/threads/${made.id}`, u.bT, { body: ' ' })).status === 400, 'an empty reply is refused');
  ok((await call('POST', `/api/support/threads/${made.id}`, u.bT, { body: 'Thank you, found it.' })).status === 200, 'the buyer replies');
  list = await call('GET', '/api/support/threads', u.bT);
  ok(list.items.find((x) => x.id === made.id).waitingOn === 'staff', 'it waits for the team again');
  const closed = await call('POST', `/api/admin/support/${made.id}`, u.aT, { action: 'close' });
  ok(closed.status === 200 && (await call('GET', `/api/admin/support/${made.id}`, u.aT)).thread.status === 'closed', 'the team closes it');
  ok(!(await call('GET', `/api/admin/support?filter=waiting&q=${encodeURIComponent(u.m.b)}`, u.aT)).items.some((x) => x.id === made.id) && (await call('GET', `/api/admin/support?filter=closed&q=${encodeURIComponent(u.m.b)}`, u.aT)).items.some((x) => x.id === made.id), 'it is under closed, not under waiting');
  ok((await call('POST', `/api/support/threads/${made.id}`, u.bT, { body: 'One more question' })).status === 200 && (await call('GET', `/api/admin/support/${made.id}`, u.aT)).thread.status === 'open', 'the buyer writing again opens it');
  ok((await call('POST', `/api/admin/support/${made.id}`, u.aT, { action: 'close' })).status === 200 && (await call('POST', `/api/admin/support/${made.id}`, u.aT, { action: 'reopen' })).status === 200 && (await call('GET', `/api/admin/support/${made.id}`, u.aT)).thread.status === 'open', 'the team can close and open it again');
  await sleep(400);
  ok(sql("SELECT COUNT(*) FROM admin_audit_log WHERE action IN ('support_replied','support_closed','support_reopened')") !== '0', 'answering and closing are in the activity log');
  ok((await call('GET', '/api/admin/support?filter=all&q=' + encodeURIComponent('nobody-has-this-name-xyz'), u.aT)).items.length === 0, 'a search with no match finds nothing');

  console.log('\n== staff roles');
  const mkStaff = async (preset) => {
    const s = await mkUsers('sp' + preset);
    await call('PUT', '/api/admin/staff-access', u.aT, { userId: num(`SELECT id FROM users WHERE email='${s.m.a}'`), preset });
    return s;
  };
  for (const [preset, allowed] of [['reviewer', true], ['finance', true], ['content', false], ['viewer', false]]) {
    const s = await mkStaff(preset);
    const r = await call('GET', '/api/admin/support', s.aT);
    const w = await call('POST', `/api/admin/support/${made.id}`, s.aT, { action: 'reply', body: `Answer from ${preset}` });
    ok(allowed ? r.status === 200 && w.status === 200 : r.status === 401 && w.status === 401, `${preset}: ${allowed ? 'can read and answer' : 'has no access'}`, [r.status, w.status]);
  }

  console.log('\n== the staff are e-mailed');
  { const cs = await mkStaff('content');
    const rs = await mkStaff('reviewer');
    const restore = onlyAdmins([u.m.a, cs.m.a, rs.m.a]);
    const srv = await smtp.start(2541);
    await call('PUT', '/api/admin/email', u.aT, { enabled: true, host: '127.0.0.1', port: 2541, secure: false, username: 'm', password: 'x', fromName: 'The Unique Expo', fromEmail: 'noreply@theuniqueexpo.test' });
    await sleep(300);
    sql('UPDATE rate_limits SET hits=0');
    // only the "new message from a buyer" e-mails: the daily health e-mail goes to the same admins when e-mail is switched on
    const staffMails = () => srv.messages.filter((m) => m.to.some((t) => t.includes(u.m.a) || t.includes(rs.m.a) || t.includes(cs.m.a)) && (smtp.decode(m.raw).subject || '').startsWith('New message from a buyer'));
    const to = () => staffMails().flatMap((m) => m.to).join(' ');
    const waitMails = async (n) => { for (let i = 0; i < 50 && staffMails().length < n; i++) await sleep(150); };
    const n0 = (await call('POST', '/api/support/threads', u.bT, { topic: 'points', subject: 'Mail test ' + tag, body: 'Please look at my points.' })).id;
    await waitMails(2);
    const first = srv.messages.find((m) => m.to.some((t) => t.includes(u.m.a)));
    const decoded = first && smtp.decode(first.raw);
    ok(staffMails().length === 2 && to().includes(u.m.a) && to().includes(rs.m.a) && !to().includes(cs.m.a), 'a new question e-mails the full-access admin and the reviewer, not content staff', to());
    ok(decoded && decoded.subject.includes('New message from a buyer') && decoded.subject.includes('Mail test ' + tag) && /\/admin\/support/.test(decoded.text), 'with the subject and a link to the messages', decoded && decoded.subject);
    await call('POST', `/api/support/threads/${n0}`, u.bT, { body: 'Second line.' });
    await call('POST', `/api/support/threads/${n0}`, u.bT, { body: 'Third line.' });
    await sleep(1500);
    ok(staffMails().length === 2, 'two more lines in a row are not e-mailed again');
    ok((await call('GET', '/api/admin/attention', u.aT)).supportWaiting >= 1, 'the admin home counts it as waiting');
    await call('POST', `/api/admin/support/${n0}`, u.aT, { action: 'reply', body: 'Looking at it.' });
    await sleep(500);
    await call('POST', `/api/support/threads/${n0}`, u.bT, { body: 'Thank you.' });
    await waitMails(4);
    ok(staffMails().length === 4, 'after the team answered, the next message from the buyer is e-mailed again', staffMails().map((m) => [m.to.join(','), (smtp.decode(m.raw) || {}).subject]));
    await srv.close();
    sql('DELETE FROM mail_settings');
    restore(); }

  console.log('\n== deleting an account');
  const gone = await mkBuyer('gone');
  const g = await write({ subject: 'About my account' }, gone.token);
  ok(num(`SELECT COUNT(*) FROM support_messages WHERE thread_id=${g.id}`) === 1, 'a buyer with a conversation');
  const del = await fetch(BASE + '/api/auth/delete-account', { method: 'POST', headers: { ...H(gone.token), 'x-forwarded-for': ipn() }, body: J({ password: 'pass1234', understand: true }) });
  ok(del.status === 200, 'deletes their account', del.status);
  ok(num(`SELECT COUNT(*) FROM support_threads WHERE id=${g.id}`) === 0 && num(`SELECT COUNT(*) FROM support_messages WHERE thread_id=${g.id}`) === 0, 'the conversation and its messages are gone');

  console.log('\n== screens');
  const br = await launch();
  const open = async (token, p, width = 375) => {
    const ctx = await br.newContext({ viewport: { width, height: 900 }, extraHTTPHeaders: { 'x-forwarded-for': ipn() } });
    await ctx.addCookies([{ name: 'token', value: token, url: BASE }]);
    await ctx.addInitScript(() => { Math.random = () => 0.99; });
    const page = await ctx.newPage();
    await page.goto(BASE + p, { waitUntil: 'domcontentloaded' });
    return [ctx, page];
  };
  const ui = await mkBuyer('ui');

  for (const locale of ['en', 'ru', 'zh']) {
    console.log(`\n== ${locale}: buyer`);
    const [ctx, page] = await open(ui.token, `/${locale}/dashboard/buyer/support`);
    await page.getByTestId('support-new').waitFor();
    await sleep(600);
    if (locale === 'en') ok(await page.getByTestId('support-empty').isVisible(), 'with nothing yet, the page says so');
    const vio0 = await axeViolations(page);
    ok(vio0.length === 0, 'the list is accessible (axe)', vio0);
    await page.getByTestId('support-new').click();
    await page.getByTestId('support-form').waitFor();
    ok(await page.getByTestId('support-send').isDisabled(), 'sending needs a subject and a message');
    await page.locator('input[maxlength="150"]').fill(`Question ${locale}`);
    await page.locator('textarea').fill(`Line one\nLine two <i>${locale}</i>`);
    const text = await page.locator('main, body').first().innerText();
    ok(!/[{}]/.test(text) && !/buyerSupport\./.test(text), 'no raw message keys');
    await sleep(500);
    const vio1 = await axeViolations(page);
    ok(vio1.length === 0, 'the form is accessible (axe)', vio1);
    await page.getByTestId('support-send').click();
    await page.getByTestId('support-conversation').waitFor();
    await page.getByTestId('support-sent').waitFor();
    const shown = await page.getByTestId('msg-buyer').innerText();
    ok(shown.includes(`Line one`) && shown.includes(`<i>${locale}</i>`), 'the conversation shows the message as typed (HTML shown as text)', shown);
    await page.mouse.move(0, 0);
    await sleep(700);
    const vio2 = await axeViolations(page);
    ok(vio2.length === 0, 'the conversation is accessible (axe)', vio2);
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'fits a 375 px phone');
    await ctx.close();
  }

  console.log('\n== admin answers on screen, the buyer sees it');
  { const [ctx, page] = await open(u.aT, '/en/admin/support');
    await page.getByRole('searchbox').fill(ui.email);
    await page.waitForFunction(() => document.querySelectorAll('[data-testid=admin-support-list] > li').length === 3, null, { timeout: 15000 });
    ok(true, 'the three questions of that buyer are listed');
    const first = page.getByTestId('admin-support-list').locator('li').first();
    await first.getByRole('button', { name: 'Open' }).click();
    await page.getByTestId('admin-support-detail').waitFor();
    await page.getByTestId('admin-msg-buyer').first().waitFor();
    ok((await page.getByTestId('admin-msg-buyer').first().innerText()).includes('Line one'), 'the buyer\'s message is shown');
    ok(await page.getByTestId('admin-support-send').isDisabled(), 'an empty answer cannot be sent');
    await page.locator('textarea').fill('Thank you, we will look at it today.');
    await page.getByTestId('admin-support-send').click();
    await page.getByTestId('admin-msg-staff').waitFor();
    ok((await page.getByTestId('admin-msg-staff').innerText()).includes('we will look at it today'), 'the answer appears in the conversation');
    ok((await page.getByTestId('admin-support-detail').innerText()).includes(ui.email), 'the buyer\'s details are above the conversation');
    await page.getByTestId('admin-support-close').click();
    await page.getByTestId('admin-support-reopen').waitFor();
    ok(true, 'closing switches the button to "Open again"');
    const vio = await axeViolations(page);
    ok(vio.length === 0, 'the admin screen is accessible (axe)', vio);
    await ctx.close(); }
  for (const locale of ['en', 'ru', 'zh']) {
    const [ctx, page] = await open(u.aT, `/${locale}/admin/support`);
    await page.getByTestId('admin-support-list').waitFor();
    await sleep(700);
    const text = await page.locator('main, body').first().innerText();
    ok(!/[{}]/.test(text) && !/adminSupport\./.test(text), `${locale}: the admin screen has no raw message keys`);
    const vio = await axeViolations(page);
    ok(vio.length === 0, `${locale}: accessible (axe)`, vio);
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${locale}: fits a 375 px phone`);
    await ctx.close();
  }
  { const [ctx, page] = await open(ui.token, '/en/dashboard/buyer/support');
    await page.getByTestId('support-list').waitFor();
    ok((await page.getByText('New answer').count()) >= 1, 'the buyer sees the "New answer" mark');
    await ctx.close(); }

  await br.close();
  done();
})();
