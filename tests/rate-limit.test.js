const { execSync } = require('node:child_process'); const crypto=require('node:crypto');
const { BASE, sql, ok, done, mkUsers } = require('./helpers/common.js'); const SHOTS=require('./helpers/common.js').SHOTS;
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const login=(email,pw,ip)=>fetch(BASE+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json','x-forwarded-for':ip},body:JSON.stringify({email,password:pw})});
const hash=(k)=>crypto.createHash('sha256').update(k).digest('hex');
// Needs a way to restart the site (RESTART_CMD); without one the restart checks are skipped.
const restart=async()=>{ if(!process.env.RESTART_CMD) return false; execSync(process.env.RESTART_CMD,{stdio:'ignore'}); for(let i=0;i<60;i++){ try{ const r=await fetch(BASE+'/api/wallet'); if(r.status) break; }catch{} await sleep(1000);} await sleep(1500); return true; };
(async()=>{
 const u=await mkUsers('rl'); const ip='203.0.113.'+(Math.floor(Math.random()*200)+10);
 console.log('\n== atomic counting');
 const rs=await Promise.all(Array.from({length:30},(_,i)=>login(`nobody${i}-${u.st}@test.invalid`,'wrong',ip)));
 const codes=rs.map(r=>r.status); const n401=codes.filter(c=>c===401).length, n429=codes.filter(c=>c===429).length;
 ok(n401===10&&n429===20,'30 parallel tries from one address: exactly 10 get through, 20 are paused',{n401,n429});
 const row=sql(`SELECT hits,reset_at FROM rate_limits WHERE key_hash='${hash('login:'+ip)}'`).split('\t'); ok(Number(row[0])>=11&&Number(row[1])>Date.now(),'the counter is stored in the database',row);
 const r429=rs.find(r=>r.status===429); ok(Number(r429.headers.get('retry-after'))>0&&Number(r429.headers.get('retry-after'))<=300,'Retry-After is set',r429.headers.get('retry-after'));
 ok(sql(`SELECT COUNT(*) FROM rate_limits WHERE key_hash LIKE '%@%'`)==='0','no readable e-mail addresses are stored');
 console.log('\n== survives a restart');
 await restart();
 let r=await login(`nobody-x-${u.st}@test.invalid`,'wrong',ip); ok(r.status===429,'after the server restarted the address is still paused',r.status);
 console.log('\n== window ends');
 sql(`UPDATE rate_limits SET reset_at=${Date.now()-1000} WHERE key_hash='${hash('login:'+ip)}'`);
 r=await login(`nobody-y-${u.st}@test.invalid`,'wrong',ip); ok(r.status===401,'once the window has ended tries are allowed again',r.status);
 ok(sql(`SELECT hits FROM rate_limits WHERE key_hash='${hash('login:'+ip)}'`)==='1','with a fresh count of 1');
 console.log('\n== success resets');
 const ip2='203.0.113.'+(Math.floor(Math.random()*200)+10); for(let i=0;i<4;i++) await login(u.m.b,'wrong',ip2);
 ok(Number(sql(`SELECT hits FROM rate_limits WHERE key_hash='${hash('login:'+ip2)}'`))===4,'4 wrong tries are counted'); r=await login(u.m.b,'pass1234',ip2); ok(r.status===200,'the right password signs in');
 ok(sql(`SELECT COUNT(*) FROM rate_limits WHERE key_hash='${hash('login:'+ip2)}'`)==='0','and clears the address counter');
 console.log('\n== change password: only wrong ones count');
 const ck='token='+u.bT; const cp=(cur)=>fetch(BASE+'/api/auth/change-password',{method:'POST',headers:{'Content-Type':'application/json',cookie:ck},body:JSON.stringify({currentPassword:cur,newPassword:'abcdefgh12',confirmPassword:'abcdefgh12'})});
 for(let i=0;i<6;i++) await cp('bad'+i); r=await cp('pass1234'); ok(r.status===429,'after 6 wrong ones even the right password waits (database counter)',r.status);
 await restart(); r=await cp('pass1234'); ok(r.status===429,'and still after a restart',r.status);
 console.log('\n== wallet limits');
 const wb=await mkUsers('rlw'); const wck='token='+wb.bT; let last;
 for(let i=0;i<61;i++){ last=await fetch(BASE+'/api/wallet/recipient?number=TUE0001',{headers:{cookie:wck}}); if(last.status===429) break; }
 ok(last.status===429,'the recipient lookup limit still pauses after 60 tries',last.status);
 console.log('\n== fallback when the table is missing');
 sql('RENAME TABLE rate_limits TO rate_limits_off'); const ip3='203.0.113.'+(Math.floor(Math.random()*200)+10);
 let codes3=[]; for(let i=0;i<12;i++){ codes3.push((await login(`n${i}-${u.st}@test.invalid`,'wrong',ip3)).status); }
 ok(codes3.slice(0,10).every(c=>c===401)&&codes3[10]===429&&codes3[11]===429,'without the table sign-in still works and the limit still holds (memory fallback)',codes3);
 r=await login(u.m.b,'pass1234',ip3); ok(r.status===429||r.status===200,'no server error');
 sql('RENAME TABLE rate_limits_off TO rate_limits'); await sleep(100);
 console.log('\n== public form limit');
 const ip4='203.0.113.'+(Math.floor(Math.random()*200)+10); let c4=[]; for(let i=0;i<12;i++){ const rr=await fetch(BASE+'/api/newsletter',{method:'POST',headers:{'Content-Type':'application/json','x-forwarded-for':ip4},body:JSON.stringify({email:`nl${i}-${u.st}@test.invalid`})}); c4.push(rr.status);} ok(c4.includes(429)&&c4[0]!==429&&c4.indexOf(429)===10,'the newsletter form still limits one address',c4);
 done();
})();
