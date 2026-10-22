const SHOTS=require('./helpers/common.js').SHOTS;
const fs=require('fs'); const { chromium } = require('playwright');
const { execSync } = require('node:child_process');
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');
const axeSrc=require('./helpers/browser.js').axeSource;
const { BASE, sql } = require('./helpers/common.js');
let n=0,f=0; const ok=(c,l,x)=>{n++; if(c) console.log('  ok  ',l); else {f++; console.log('  FAIL',l,x===undefined?'':JSON.stringify(x));}};
const login=async(e)=>/token=([^;]+)/.exec((await fetch(BASE+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:e,password:'pass1234'})})).headers.getSetCookie().join(';'))[1];
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const readX=async(res)=>{const wb=new ExcelJS.Workbook(); await wb.xlsx.load(Buffer.from(await res.arrayBuffer())); return wb;};
(async()=>{
 const st=Date.now(), h=bcrypt.hashSync('pass1234',10);
 const m={a:`mn-a-${st}@test.invalid`,w:`mn-w-${st}@test.invalid`,v:`mn-v-${st}@test.invalid`,e:`mn-e-${st}@test.invalid`};
 sql(`INSERT INTO users (name,email,password_hash,role,country) VALUES ('MN Admin','${m.a}','${h}','admin',''),('MN Wendy','${m.w}','${h}','buyer',''),('MN Victor','${m.v}','${h}','buyer',''),('MN Empty','${m.e}','${h}','buyer','')`);
 const id=(k)=>Number(sql(`SELECT id FROM users WHERE email='${m[k]}'`)); const [w,v,e]=[id('w'),id('v'),id('e')];
 const aT=await login(m.a), wT=await login(m.w), eT=await login(m.e); const H={cookie:'token='+aT,'Content-Type':'application/json'};
 await fetch(BASE+'/api/admin/buyer-profiles',{headers:H});
 sql(`INSERT INTO wallet_withdrawals (user_id,points,method,qr_image,account_name,bank_name,bank_branch,bank_account,note,status,created_at) VALUES
  (${w},500,'bank',NULL,'Wendy Wu','ICBC','Guangzhou Tianhe','6222021234567890123','pay soon','pending',UTC_TIMESTAMP()),
  (${v},300,'alipay','${PNG}','Victor V','','','','','pending',UTC_TIMESTAMP());
  INSERT INTO wallet_withdrawals (user_id,points,method,account_name,bank_name,bank_branch,bank_account,note,status,payout_reference,admin_note,processed_at,created_at) VALUES
  (${w},200,'bank','Wendy Wu','ICBC','','6222021234567890123','','paid','TXN-77','',UTC_TIMESTAMP(),UTC_TIMESTAMP()),
  (${w},150,'bank','Wendy Wu','ICBC','','6222021234567890123','','rejected','','Bank details unclear',UTC_TIMESTAMP(),UTC_TIMESTAMP())`);
 console.log('\n== withdrawals Excel');
 let r=await fetch(BASE+'/api/admin/wallet/export/withdrawals?status=pending',{headers:H}); ok(r.status===200&&/spreadsheetml/.test(r.headers.get('content-type')),'pending file downloads',r.status);
 ok(/withdrawals-pending-\d{4}-\d{2}-\d{2}\.xlsx/.test(r.headers.get('content-disposition')||''),'file name says pending + date',r.headers.get('content-disposition'));
 let wb=await readX(r); let ws=wb.getWorksheet('Withdrawals'); let head=ws.getRow(1).values.slice(1);
 console.log('   headings:',head.join(' | '));
 const rows=[]; ws.eachRow((row,i)=>{ if(i>1) rows.push(row.values.slice(1)); });
 const mine=rows.filter(x=>x[4]&&String(x[4]).includes(`-${st}@`));
 ok(mine.length===2 && mine.every(x=>x[13]==='pending'),'only the two pending requests of these buyers',mine.length);
 const bank=mine.find(x=>x[3]==='MN Wendy'); ok(bank[5]===500 && bank[6]==='China bank' && bank[10]==='6222021234567890123' && typeof bank[10]==='string','bank row: amount is a number, long account number kept as text',[bank[5],bank[6],bank[10]]);
 ok(ws.getImages().length>=1,'the Alipay QR code is embedded in the sheet',ws.getImages().length);
 r=await fetch(BASE+'/api/admin/wallet/export/withdrawals?status=paid',{headers:H}); wb=await readX(r); ws=wb.getWorksheet('Withdrawals'); const paid=[]; ws.eachRow((row,i)=>{ if(i>1&&String(row.getCell(5).value||'').includes(`-${st}@`)) paid.push(row.values.slice(1)); });
 ok(paid.length===1&&paid[0][13]==='paid'&&paid[0][14]==='TXN-77','paid file: only the paid one, with its payout reference',paid);
 r=await fetch(BASE+'/api/admin/wallet/export/withdrawals',{headers:H}); wb=await readX(r); ws=wb.getWorksheet('Withdrawals'); let all=0; ws.eachRow((row,i)=>{ if(i>1&&String(row.getCell(5).value||'').includes(`-${st}@`)) all++; }); ok(all===4,'no status = all four requests',all);
 ok((await fetch(BASE+'/api/admin/wallet/export/withdrawals',{headers:{cookie:'token='+wT}})).status>=401,'a buyer is refused');
 ok((await fetch(BASE+'/api/admin/wallet/export/withdrawals')).status>=401,'signed-out is refused');
 console.log('\n== point movements Excel');
 const adj=await fetch(BASE+`/api/admin/wallet/wallets/${w}`,{method:'POST',headers:H,body:JSON.stringify({action:'adjust',amount:120,note:'Thank you gift',key:'mk'+st+'aaaa'})}); ok(adj.status===200,'gave Wendy 120 points to have a movement',adj.status);
 const today=new Date().toISOString().slice(0,10);
 r=await fetch(BASE+`/api/admin/wallet/export/transactions?from=${today}&to=${today}`,{headers:H}); ok(r.status===200,'today\'s movements download',r.status);
 wb=await readX(r); ws=wb.getWorksheet('Point movements'); head=ws.getRow(1).values.slice(1); console.log('   headings:',head.join(' | '));
 const mv=[]; ws.eachRow((row,i)=>{ if(i>1&&String(row.getCell(5).value||'').includes(`-${st}@`)) mv.push(row.values.slice(1)); });
 ok(mv.length===1&&mv[0][5]==='Manual adjustment'&&mv[0][6]===120&&mv[0][8]==='Thank you gift'&&mv[0][10]==='MN Admin','row: type, +120 as a number, balance, note, done by admin',mv);
 r=await fetch(BASE+'/api/admin/wallet/export/transactions?from=2999-01-01&to=2999-12-31',{headers:H}); wb=await readX(r); ok(wb.getWorksheet('Point movements').rowCount===1,'a future range gives only the heading row');
 for(const q of ['from=2026-13-45','from=abc','to=2026-1-1','from=2026-10-10&to=2026-10-01']){ const bad=await fetch(BASE+`/api/admin/wallet/export/transactions?${q}`,{headers:H}); ok(bad.status===400,'refused: '+q,bad.status); }
 ok((await fetch(BASE+'/api/admin/wallet/export/transactions',{headers:{cookie:'token='+wT}})).status>=401,'a buyer is refused');
 console.log('\n== buyer news');
 const news=await (await fetch(BASE+'/api/wallet/news',{headers:{cookie:'token='+wT}})).json();
 console.log('   ',news.items.map(i=>i.kind+':'+i.points).join(', '));
 ok(news.items.length===3 && news.items.length<=5,'Wendy has 3 items (points added, paid, rejected)',news.items);
 ok(news.items.some(i=>i.kind==='adjustment'&&i.points===120&&i.note==='Thank you gift'),'points added by the team, with the reason');
 ok(news.items.some(i=>i.kind==='withdrawal_paid'&&i.points===200),'paid withdrawal');
 ok(news.items.some(i=>i.kind==='withdrawal_rejected'&&i.points===150&&i.note==='Bank details unclear'),'rejected withdrawal with the reason');
 ok(news.items.every((x,i,a)=>i===0||a[i-1].at>=x.at),'newest first');
 const none=await (await fetch(BASE+'/api/wallet/news',{headers:{cookie:'token='+eT}})).json(); ok(none.items.length===0,'a buyer with nothing sees nothing');
 ok((await fetch(BASE+'/api/wallet/news',{headers:H})).status===403,'an admin account has no news');
 ok((await fetch(BASE+'/api/wallet/news')).status===401,'signed-out refused');
 // someone else's news is never shown: Victor only has his own pending request, so no news
 const vT=await login(m.v); const vn=await (await fetch(BASE+'/api/wallet/news',{headers:{cookie:'token='+vT}})).json(); ok(vn.items.length===0,'another buyer does not see Wendy\'s items');
 console.log('\n== screens');
 const br=await require('./helpers/browser.js').launch();
 const mk=async(t,vp={width:1360,height:900})=>{const c=await br.newContext({viewport:vp,acceptDownloads:true}); await c.addCookies([{name:'token',value:t,url:BASE}]); return c;};
 let c=await mk(aT); let p=await c.newPage(); await p.goto(BASE+'/en/admin/wallet?tab=withdrawals',{waitUntil:'networkidle'});
 let [dl]=await Promise.all([p.waitForEvent('download'),p.getByRole('button',{name:'Download these withdrawals (Excel)'}).click()]); ok(/^withdrawals-pending-/.test(dl.suggestedFilename()),'Withdrawals tab button downloads the pending file',dl.suggestedFilename());
 await p.goto(BASE+'/en/admin/wallet?tab=wallets',{waitUntil:'networkidle'}); await p.getByLabel('From date').fill(today); await p.getByLabel('To date').fill(today);
 [dl]=await Promise.all([p.waitForEvent('download'),p.getByRole('button',{name:'Download point movements (Excel)'}).click()]); ok(/^point-movements-/.test(dl.suggestedFilename()),'Wallets tab button downloads the movements',dl.suggestedFilename());
 await p.screenshot({path:SHOTS+'/money_wallets.png'}); await c.close();
 let bad=0;
 for(const [loc,vp] of [['en',{width:1360,height:900}],['ru',{width:1360,height:900}],['zh',{width:1360,height:900}],['en',{width:375,height:800}]]){
   c=await mk(wT,vp); p=await c.newPage(); await p.goto(`${BASE}/${loc}/dashboard/buyer`,{waitUntil:'networkidle'}); await p.waitForSelector('text=/Rewards news|Новости о баллах|积分动态/');
   const card=await p.locator('section:has(h2:text-matches("Rewards news|Новости о баллах|积分动态"))').innerText();
   if(loc==='en'&&vp.width>400){ ok(/Points added by our team: \+120 points/.test(card)&&/Reason: Thank you gift/.test(card)&&/Your withdrawal of 200 points was paid/.test(card)&&/Your withdrawal of 150 points was not paid/.test(card),'English card shows the three items',card.slice(0,300)); await p.screenshot({path:SHOTS+'/news_card.png'}); }
   else if(vp.width>400) ok(!/news\./.test(card)&&card.length>20,loc+': translated',card.slice(0,120));
   else { const wd=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,vw:innerWidth})); ok(wd.sw<=wd.vw+1,'375px: no sideways overflow',wd); }
   if(vp.width>400){ await p.evaluate(axeSrc); const vio=await p.evaluate(async()=>(await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(x=>x.id)); ok(vio.length===0,loc+': axe 0 violations',vio); }
   await c.close(); }
 // buyer with nothing: no card
 c=await mk(eT); p=await c.newPage(); await p.goto(BASE+'/en/dashboard/buyer',{waitUntil:'networkidle'}); await p.waitForTimeout(1200); ok(await p.locator('text=Rewards news').count()===0,'no news card when there is no news'); await c.close();
 await br.close(); console.log(`\n${n-f}/${n} ok`); process.exit(f?1:0);
})();
