const SHOTS=require('./helpers/common.js').SHOTS;
const { chromium } = require('playwright');
const { execSync } = require('node:child_process');
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');
const { BASE, sql } = require('./helpers/common.js');
let n=0,f=0; const ok=(c,l,x)=>{n++; if(c) console.log('  ok  ',l); else {f++; console.log('  FAIL',l,x===undefined?'':JSON.stringify(x));}};
const login=async(e)=>/token=([^;]+)/.exec((await fetch(BASE+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:e,password:'pass1234'})})).headers.getSetCookie().join(';'))[1];
(async()=>{
 const st=Date.now(), h=bcrypt.hashSync('pass1234',10);
 const mails={a:`ex-a-${st}@test.invalid`,b1:`ex-b1-${st}@test.invalid`,b2:`ex-b2-${st}@test.invalid`,b3:`ex-b3-${st}@test.invalid`,x:`ex-x-${st}@test.invalid`};
 sql(`INSERT INTO users (name,email,password_hash,role,country) VALUES ('EX Admin','${mails.a}','${h}','admin',''),('EX Buyer One','${mails.b1}','${h}','buyer',''),('EX Buyer Two','${mails.b2}','${h}','buyer',''),('EX Buyer Three','${mails.b3}','${h}','buyer',''),('EX Exhibitor','${mails.x}','${h}','exhibitor','')`);
 const id=(k)=>Number(sql(`SELECT id FROM users WHERE email='${mails[k]}'`));
 const [b1,b2,b3,x]=[id('b1'),id('b2'),id('b3'),id('x')];
 const aT=await login(mails.a), b1T=await login(mails.b1); const H={cookie:'token='+aT,'Content-Type':'application/json'};
 await fetch(BASE+'/api/admin/buyer-profiles',{headers:H});
 const bulk=(body,hd=H)=>fetch(BASE+'/api/admin/wallet/bulk-adjust',{method:'POST',headers:hd,body:JSON.stringify(body)});
 console.log('\n== bulk points API');
 const key='bk'+st+'xyz1';
 let r=await bulk({userIds:[b1,b2,b3,x],amount:50,note:'Welcome bonus',key}); let j=await r.json();
 ok(r.status===200 && j.added===3 && j.failed.length===1 && j.failed[0].userId===x,'3 buyers credited, the exhibitor reported as failed',j);
 const bal=(u)=>Number(sql(`SELECT COALESCE((SELECT balance FROM wallets WHERE user_id=${u}),-1)`));
 ok(bal(b1)===50&&bal(b2)===50&&bal(b3)===50,'each buyer has 50 points',[bal(b1),bal(b2),bal(b3)]);
 ok(bal(x)===-1,'the exhibitor got no wallet');
 r=await bulk({userIds:[b1,b2,b3],amount:50,note:'Welcome bonus',key}); j=await r.json();
 ok(r.status===200 && bal(b1)===50&&bal(b2)===50&&bal(b3)===50,'sending the same request again does not credit twice',[bal(b1),bal(b2),bal(b3)]);
 ok(sql(`SELECT COUNT(*) FROM wallet_transactions WHERE user_id=${b2} AND note='Welcome bonus' AND type='adjustment'`)==='1','one ledger row with the reason per buyer');
 const bad=[[{userIds:[b1],amount:0,note:'abc',key:'k12345678'},'amount 0'],[{userIds:[b1],amount:100001,note:'abc',key:'k12345678'},'over the limit'],[{userIds:[b1],amount:-5,note:'abc',key:'k12345678'},'negative'],[{userIds:[b1],amount:5,note:'a',key:'k12345678'},'reason too short'],[{userIds:[b1],amount:5,note:'abc',key:'!'},'bad key'],[{userIds:[],amount:5,note:'abc',key:'k12345678'},'no buyers'],[{userIds:Array.from({length:501},(_,i)=>i+1),amount:5,note:'abc',key:'k12345678'},'501 buyers'],[{userIds:['1'],amount:5,note:'abc',key:'k12345678'},'ids not numbers'],[{userIds:[b1],amount:'5',note:'abc',key:'k12345678'},'amount as text']];
 for(const [body,label] of bad){ const rr=await bulk(body); ok(rr.status===400,'refused: '+label,rr.status); }
 ok(bal(b1)===50,'refused requests changed nothing');
 const rb=await bulk({userIds:[b1],amount:5,note:'abc',key:'k87654321'},{cookie:'token='+b1T,'Content-Type':'application/json'}); ok(rb.status===401||rb.status===403,'a buyer cannot use it',rb.status);
 const rn=await fetch(BASE+'/api/admin/wallet/bulk-adjust',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}); ok(rn.status===401||rn.status===403,'signed-out refused',rn.status);
 const ov=await (await fetch(BASE+'/api/admin/wallet/overview',{headers:H})).json(); ok(!ov.mismatches||ov.mismatches.length===0,'ledger still balances',ov.mismatches);
 console.log('\n== waiting count');
 const w0=(await (await fetch(BASE+'/api/admin/wallet/waiting',{headers:H})).json()).waiting;
 sql(`INSERT INTO wallet_topups (user_id,points,proof,status,created_at) VALUES (${b1},10,'x','pending',UTC_TIMESTAMP()),(${b2},10,'x','pending',UTC_TIMESTAMP()); INSERT INTO wallet_withdrawals (user_id,points,method,status,created_at) VALUES (${b3},10,'bank','pending',UTC_TIMESTAMP())`);
 const w1=(await (await fetch(BASE+'/api/admin/wallet/waiting',{headers:H})).json()).waiting;
 ok(w1===w0+3,'counts topups + withdrawals + claims',[w0,w1]);
 const wn=await fetch(BASE+'/api/admin/wallet/waiting',{headers:{cookie:'token='+b1T}}); ok(wn.status===401||wn.status===403,'a buyer cannot read it',wn.status);
 console.log('\n== screens');
 const br=await require('./helpers/browser.js').launch();
 const mk=async(loc='en',vp={width:1360,height:900})=>{const c=await br.newContext({viewport:vp,acceptDownloads:true}); await c.addCookies([{name:'token',value:aT,url:BASE}]); return c;};
 let c=await mk(); let p=await c.newPage();
 await p.goto(BASE+'/en/admin/buyer-profiles',{waitUntil:'networkidle'}); await p.waitForSelector('tbody tr');
 const badge=await p.locator('nav a[href$="/admin/wallet"] [aria-label$="waiting"]').first().getAttribute('aria-label'); ok(badge===`${w1} waiting`,'menu shows the waiting count',badge);
 // filters
 const rows=(await (await fetch(BASE+'/api/admin/buyer-profiles',{headers:H})).json()); const list=rows.profiles||rows.rows||rows;
 const count=async()=>{ for(let i=0;i<60;i++){ const b=p.getByRole('button',{name:/^Show \d+ more$/}); if(await b.count()===0) break; await b.click(); } return p.locator('tbody tr').filter({has:p.locator('td.sticky')}).count(); };
 const ps=p.getByLabel('Filter by reward points');
 await ps.selectOption('has'); await p.waitForTimeout(400); ok(await count()===list.filter(r=>r.rewardPoints>0).length,'"Has points" count matches',[await count(),list.filter(r=>r.rewardPoints>0).length]);
 await ps.selectOption('none'); await p.waitForTimeout(400); ok(await count()===list.filter(r=>r.rewardPoints<=0).length,'"No points" count matches');
 await ps.selectOption('top'); await p.waitForTimeout(400);
 const firstPts=await p.locator('tbody tr').first().innerText(); const maxPts=Math.max(...list.map(r=>r.rewardPoints)); ok(new RegExp(maxPts.toLocaleString('en-US')+' points').test(firstPts),'"Most points first" puts the highest on top',[maxPts,firstPts.slice(0,60)]);
 await ps.selectOption('');
 // bulk via the screen
 await p.getByRole('textbox').first().fill(`-${st}@`); await p.waitForTimeout(600);
 await p.getByLabel('Select all').check();
 await p.getByRole('button',{name:'Give points'}).click(); await p.waitForSelector('[role=dialog]');
 await p.getByLabel('Points for each buyer').fill('25'); await p.getByLabel(/^Reason/).fill('Screen test bonus');
 const summ=await p.locator('[role=dialog]').innerText(); ok(/3 buyer\(s\) × 25 points = 75 points in total/.test(summ),'dialog shows the total before confirming',summ.slice(0,200));
 await p.screenshot({path:SHOTS+'/bulk_dialog.png'});
 await p.getByRole('button',{name:'Give points',exact:true}).last().click(); await p.getByRole('status').filter({hasText:'Added 25 points to 3 buyer(s).'}).waitFor({timeout:10000}); ok(true,'screen reports "Added 25 points to 3 buyer(s)."');
 ok(bal(b1)===75&&bal(b2)===75&&bal(b3)===75,'balances are now 75',[bal(b1),bal(b2),bal(b3)]);
 await p.getByRole('dialog').getByRole('button',{name:'Close'}).click(); await p.waitForTimeout(800);
 ok(/75 points/.test(await p.locator('tbody tr').first().innerText()),'the list shows 75 points after closing');
 // Excel
 await p.getByRole('button',{name:/Export.*Excel/i}).first().click(); await p.waitForSelector('text=always included');
 const [dl]=await Promise.all([p.waitForEvent('download'),p.getByRole('button',{name:/Export.*Excel/i}).last().click()]);
 const wb=new ExcelJS.Workbook(); await wb.xlsx.readFile(await dl.path()); const ws=wb.getWorksheet('Buyers'); const head=ws.getRow(1).values.slice(1);
 const ci=head.indexOf('Reward Points'); ok(ci>=0 && head[ci+1]==='Passport Front Page','Excel has a Reward Points column just before the photos',head.slice(-9));
 let vals=[]; ws.eachRow((r,i)=>{ if(i>1) vals.push(r.getCell(ci+1).value); }); ok(vals.length===3 && vals.every(v=>v===75),'Excel points are numbers (75 each)',vals);
 await c.close();
 // other languages: badge + dialog labels
 for(const loc of ['ru','zh']){ c=await mk(); p=await c.newPage(); await p.goto(`${BASE}/${loc}/admin/buyer-profiles`,{waitUntil:'networkidle'}); await p.waitForSelector('tbody tr');
   const lab=await p.locator('nav a[href$="/admin/wallet"] [aria-label]').first().getAttribute('aria-label'); ok(lab && !/waiting|shell\./.test(lab),loc+': badge label translated',lab); await c.close(); }
 // badge hidden at zero
 sql(`UPDATE wallet_topups SET status='cancelled' WHERE status='pending'; UPDATE wallet_withdrawals SET status='cancelled' WHERE status='pending'; UPDATE wallet_expense_claims SET status='rejected' WHERE status='pending'`);
 c=await mk(); p=await c.newPage(); await p.goto(BASE+'/en/admin/buyer-profiles',{waitUntil:'networkidle'}); await p.waitForTimeout(1500);
 ok(await p.locator('nav a[href$="/admin/wallet"] [aria-label$="waiting"]').count()===0,'no badge when nothing is waiting'); await c.close();
 await br.close(); console.log(`\n${n-f}/${n} ok`); process.exit(f?1:0);
})();
