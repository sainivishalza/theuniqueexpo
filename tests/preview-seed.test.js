// The demo data for the preview copy of the site (scripts/preview-seed.mjs): it makes sign-ins that work, can run again
const { execFileSync } = require('node:child_process');
const { BASE, DB, sql, ok, done } = require('./helpers/common.js');

const run = (password) => execFileSync(process.execPath, ['scripts/preview-seed.mjs'], {
  encoding: 'utf8',
  env: { ...process.env, DB_HOST: DB.host || '127.0.0.1', DB_USER: DB.user, DB_PASSWORD: DB.password, DB_NAME: DB.name, ...(password ? { PREVIEW_PASSWORD: password } : {}) },
});
const login = (email, password) => fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.8.' + Math.floor(Math.random() * 250) + '.' + (Math.floor(Math.random() * 250) + 1) }, body: JSON.stringify({ email, password }) }).then(async (r) => ({ status: r.status, ...(await r.json().catch(() => ({}))) }));

(async () => {
  const first = run('Pw-first-1234');
  const accounts = first.split('\n').filter((l) => l.startsWith('ACCOUNT '));
  ok(accounts.length === 2 && accounts[0] === 'ACCOUNT admin preview-admin@preview.invalid Pw-first-1234', 'it prints the two demo sign-ins', accounts);
  let r = await login('preview-admin@preview.invalid', 'Pw-first-1234');
  ok(r.status === 200 && r.user && r.user.role === 'admin', 'the demo admin can sign in');
  r = await login('preview-buyer@preview.invalid', 'Pw-first-1234');
  ok(r.status === 200 && r.user && r.user.role === 'buyer', 'the demo buyer can sign in');
  const count = () => ({
    users: Number(sql("SELECT COUNT(*) FROM users WHERE email LIKE '%@preview.invalid'")),
    expos: Number(sql("SELECT COUNT(*) FROM exhibitions WHERE slug LIKE 'preview-%-demo'")),
    regs: Number(sql("SELECT COUNT(*) FROM expo_registrations r JOIN users u ON u.id=r.user_id WHERE u.email LIKE '%@preview.invalid'")),
  });
  const a = count();
  ok(a.users === 10 && a.expos === 4 && a.regs === 8, 'two accounts, eight demo buyers, four exhibitions, eight registrations', a);
  const second = run();
  const b = count();
  ok(JSON.stringify(a) === JSON.stringify(b), 'running it again doubles nothing', b);
  const pw = second.split('\n')[0].split(' ')[3];
  ok(pw && pw !== 'Pw-first-1234' && pw.length >= 10, 'without a given password it makes a random one', pw && pw.length);
  r = await login('preview-admin@preview.invalid', 'Pw-first-1234');
  ok(r.status === 401, 'and the old password stops working');
  r = await login('preview-admin@preview.invalid', pw);
  ok(r.status === 200, 'the new one works');
  const list = await (await fetch(BASE + '/api/exhibitions')).json();
  ok((list.exhibitions || []).some((e) => e.slug === 'preview-canton-demo'), 'the demo exhibitions show on the public list');
  done();
})().catch((e) => { console.error(e); process.exit(1); });
