const fs=require('fs'); const crypto=require('node:crypto');
const { BASE, sql, ok, done, mkUsers, login, PNG } = require('./helpers/common.js'); const SHOTS=require('./helpers/common.js').SHOTS;
const bcrypt = require('bcryptjs');
const smtp=require('./helpers/fake-smtp.js');
const { chromium } = require('playwright');
const axeSrc=require('./helpers/browser.js').axeSource;
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const H=(t,extra={})=>({'Content-Type':'application/json',cookie:'token='+t,...extra});
const ipn=()=>'198.51.'+Math.floor(Math.random()*256)+'.'+(Math.floor(Math.random()*250)+2);
const AXE=async(p)=>{ await p.evaluate(axeSrc); return p.evaluate(async()=>(await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(x=>x.id+':'+x.nodes.length)); };
const waitMail=async(srv,n,ms=6000)=>{ const t0=Date.now(); while(srv.messages.length<n&&Date.now()-t0<ms) await sleep(100); return srv.messages.length>=n; };
(async()=>{
 sql("DELETE FROM mail_settings; DELETE FROM email_log; DELETE FROM password_resets");
 const u=await mkUsers('em'); const srv=await smtp.start(2525);
 const settings={enabled:true,host:'127.0.0.1',port:2525,secure:false,username:'mailer',password:'s3cret-smtp-pass',fromName:'The Unique Expo',fromEmail:'noreply@theuniqueexpo.test'};
 console.log('\n== settings API');
 await fetch(BASE+'/api/admin/email',{method:'PUT',headers:H(u.aT),body:JSON.stringify({enabled:false,host:'',port:587,secure:false,username:'',password:'',fromName:'The Unique Expo',fromEmail:''})});
 let r=await fetch(BASE+'/api/admin/email',{headers:H(u.bT)}); ok(r.status===401,'a buyer cannot read the e-mail settings'); r=await fetch(BASE+'/api/admin/email'); ok(r.status===401,'signed-out cannot');
 r=await fetch(BASE+'/api/admin/email',{headers:H(u.aT)}); let j=await r.json(); ok(r.status===200&&j.settings.enabled===false&&j.settings.hasPassword===false&&!('password' in j.settings),'starts switched off, with no password',j.settings);
 r=await fetch(BASE+'/api/auth/forgot-password'); j=await r.json(); ok(j.enabled===false,'"Forgot password" is not offered while e-mail is off');
 const put=(body,t=u.aT)=>fetch(BASE+'/api/admin/email',{method:'PUT',headers:H(t),body:JSON.stringify(body)});
 r=await put({...settings,host:'bad host!'}); ok(r.status===400&&(await r.json()).code==='invalid_host','a bad host name is refused');
 r=await put({...settings,port:0}); ok(r.status===400,'port 0 is refused'); r=await put({...settings,port:70000}); ok(r.status===400,'port 70000 is refused');
 r=await put({...settings,fromEmail:'not-an-email'}); ok(r.status===400&&(await r.json()).code==='invalid_from','a bad sender address is refused');
 r=await put({...settings,fromName:'a\r\nBcc: x@y.z'}); ok(r.status===400,'a sender name with a line break is refused (header injection)');
 r=await put({...settings,host:'',enabled:true}); ok(r.status===400&&(await r.json()).code==='incomplete','switching on without a server is refused');
 r=await put(settings,u.bT); ok(r.status===401,'a buyer cannot save');
 r=await put(settings); j=await r.json(); ok(r.status===200&&j.settings.enabled&&j.settings.hasPassword&&!JSON.stringify(j).includes('s3cret'),'saved; the password is not sent back',j);
 const enc=sql("SELECT password_enc FROM mail_settings WHERE id=1"); ok(enc.length>20&&!enc.includes('s3cret'),'and it is stored encrypted');
 r=await put({...settings,password:undefined,host:'localhost'}); j=await r.json(); ok(r.status===200&&j.settings.hasPassword&&j.settings.host==='localhost','saving without a password keeps the saved one'); await put(settings);
 r=await fetch(BASE+'/api/auth/forgot-password'); j=await r.json(); ok(j.enabled===true,'now "Forgot password" is offered');
 console.log('\n== test e-mail');
 r=await fetch(BASE+'/api/admin/email',{method:'POST',headers:H(u.bT),body:'{}'}); ok(r.status===401,'a buyer cannot send a test');
 r=await fetch(BASE+'/api/admin/email',{method:'POST',headers:H(u.aT),body:JSON.stringify({locale:'ru'})}); j=await r.json(); ok(r.status===200&&j.ok,'the test is sent',j);
 ok(await waitMail(srv,1),'the fake mail server received it'); let m=srv.messages[0]; let d=smtp.decode(m.raw); ok(m.to[0].includes(u.m.a),'to the admin\'s own address',m.to); ok(/Тестовое письмо/.test(d.subject),'subject in Russian',d.subject); ok(/From: .*noreply@theuniqueexpo.test/i.test(m.raw)||/noreply@theuniqueexpo.test/.test(m.from),'from the saved sender');
 ok(/text\/html/.test(m.raw)&&/text\/plain/.test(m.raw),'with both a plain and an HTML part');
 j=await (await fetch(BASE+'/api/admin/email',{headers:H(u.aT)})).json(); ok(j.log[0].status==='sent'&&j.log[0].kind==='test','the log shows it as sent',j.log[0]);
 await srv.close(); r=await fetch(BASE+'/api/admin/email',{method:'POST',headers:H(u.aT),body:'{}'}); j=await r.json(); ok(r.status===502&&j.ok===false&&/ECONNREFUSED|ECONN|connect/i.test(j.error),'with the server down the test says why',j);
 j=await (await fetch(BASE+'/api/admin/email',{headers:H(u.aT)})).json(); ok(j.log[0].status==='failed'&&!JSON.stringify(j).includes('s3cret'),'a failure is logged, without the password',j.log[0]);
 const srv2=await smtp.start(2525);
 console.log('\n== forgot password');
 const fp=(email,ip=ipn(),extra={})=>fetch(BASE+'/api/auth/forgot-password',{method:'POST',headers:{'Content-Type':'application/json','x-forwarded-for':ip,...extra},body:JSON.stringify({email})});
 r=await fp('nonsense'); ok(r.status===400,'a malformed address is refused');
 const t0=Date.now(); r=await fp(`nobody-${u.st}@test.invalid`); const unk=await r.text(); const tUnk=Date.now()-t0; ok(r.status===200&&JSON.parse(unk).ok,'an unknown address gets the normal answer');
 const before=srv2.messages.length; await sleep(800); ok(srv2.messages.length===before,'and nothing is sent to it');
 const t1=Date.now(); r=await fp(u.m.b,ipn(),{referer:BASE+'/ru/forgot-password'}); const kn=await r.text(); const tKn=Date.now()-t1; ok(r.status===200&&kn===unk,'a known address gets exactly the same answer (cannot tell who has an account)',[unk,kn]);
 ok(Math.abs(tKn-tUnk)<400,'and about as quickly',[tUnk,tKn]);
 ok(await waitMail(srv2,before+1),'the reset e-mail arrives'); m=srv2.messages[srv2.messages.length-1]; d=smtp.decode(m.raw); ok(/Сброс пароля/.test(d.subject),'in the language of the page it was asked from (Russian)',d.subject);
 const link=/https:\/\/theuniqueexpo\.com\/ru\/reset-password\?token=([A-Za-z0-9_-]{43})/.exec(d.text); ok(!!link,'it contains a reset link with a 256-bit token'); const token=link&&link[1];
 ok(sql(`SELECT COUNT(*) FROM password_resets WHERE token_hash LIKE '${token.slice(0,10)}%'`)==='0'&&sql(`SELECT COUNT(*) FROM password_resets WHERE token_hash='${crypto.createHash('sha256').update(token).digest('hex')}'`)==='1','only the hash of the token is stored');
 ok(Number(sql(`SELECT expires_at FROM password_resets WHERE user_id=${u.bId}`))-Date.now()>3500000&&Number(sql(`SELECT expires_at FROM password_resets WHERE user_id=${u.bId}`))-Date.now()<=3600000,'it expires in one hour');
 // second request replaces the first link
 const cnt=srv2.messages.length; await fp(u.m.b); await waitMail(srv2,cnt+1); const d2=smtp.decode(srv2.messages[srv2.messages.length-1].raw); const token2=/reset-password\?token=([A-Za-z0-9_-]{43})/.exec(d2.text)[1];
 ok(token2!==token,'asking again makes a new link'); ok(sql(`SELECT COUNT(*) FROM password_resets WHERE user_id=${u.bId}`)==='1','and only one link is valid at a time');
 r=await fetch(BASE+'/api/auth/reset-password?token='+token); j=await r.json(); ok(j.valid===false,'the replaced link no longer works'); r=await fetch(BASE+'/api/auth/reset-password?token='+token2); j=await r.json(); ok(j.valid===true,'the newest link works');
 r=await fetch(BASE+'/api/auth/reset-password?token=short'); j=await r.json(); ok(j.valid===false,'a junk token is invalid');
 // per-email limit: 3 per hour
 const c3=srv2.messages.length; await fp(u.m.b); await sleep(800); ok(srv2.messages.length===c3+1,'a third request for the same address is still sent'); await fp(u.m.b); await sleep(800); ok(srv2.messages.length===c3+1,'a fourth is silently not sent (limit 3 per hour per address)');
 const ipx=ipn(); const codes=[]; for(let i=0;i<7;i++) codes.push((await fp(`x${i}-${u.st}@test.invalid`,ipx)).status); ok(codes.slice(0,5).every(c=>c===200)&&codes[5]===429,'from one network address: 5 requests per hour, then 429',codes);
 console.log('\n== reset password');
 sql(`DELETE FROM password_resets WHERE user_id=${u.bId}`); await sql(`UPDATE rate_limits SET hits=0`);
 const sessionBefore='token='+u.bT; r=await fetch(BASE+'/api/auth/me',{headers:{cookie:sessionBefore}}); j=await r.json(); ok(j.user&&j.user.id===u.bId,'the buyer has a signed-in session before the reset');
 const cnt2=srv2.messages.length; await fp(u.m.b); await waitMail(srv2,cnt2+1); const tk=/reset-password\?token=([A-Za-z0-9_-]{43})/.exec(smtp.decode(srv2.messages[srv2.messages.length-1].raw).text)[1];
 const rp=(body,ip=ipn())=>fetch(BASE+'/api/auth/reset-password',{method:'POST',headers:{'Content-Type':'application/json','x-forwarded-for':ip},body:JSON.stringify(body)});
 r=await rp({token:tk,newPassword:'short1',confirmPassword:'short1'}); j=await r.json(); ok(r.status===400&&j.code==='weak_password','too short is refused'); r=await rp({token:tk,newPassword:'Reset Pass 77',confirmPassword:'Reset Pass 78'}); ok(r.status===400&&(await r.json()).code==='mismatch','mismatch is refused');
 r=await rp({token:'A'.repeat(43),newPassword:'Reset Pass 77',confirmPassword:'Reset Pass 77'}); ok(r.status===400&&(await r.json()).code==='invalid_token','a wrong token is refused'); r=await rp({token:tk}); ok(r.status===400,'missing fields are refused');
 ok(sql(`SELECT COUNT(*) FROM password_resets WHERE user_id=${u.bId}`)==='1','refused tries do not use up the link');
 const c4=srv2.messages.length; const [r1,r2]=await Promise.all([rp({token:tk,newPassword:'Reset Pass 77',confirmPassword:'Reset Pass 77'}),rp({token:tk,newPassword:'Other Pass 88',confirmPassword:'Other Pass 88'})]); const st=[r1.status,r2.status].sort(); ok(st[0]===200&&st[1]===400,'two requests with the same link at once: exactly one wins',st);
 const winner=r1.status===200?'Reset Pass 77':'Other Pass 88';
 const lg=(pw)=>fetch(BASE+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json','x-forwarded-for':ipn()},body:JSON.stringify({email:u.m.b,password:pw})});
 ok((await lg(winner)).status===200&&(await lg('pass1234')).status===401,'the new password signs in, the old does not');
 ok(sql(`SELECT COUNT(*) FROM password_resets WHERE user_id=${u.bId}`)==='0','the link is gone');
 r=await rp({token:tk,newPassword:'Third Pass 99',confirmPassword:'Third Pass 99'}); ok(r.status===400,'the same link cannot be used again');
 r=await fetch(BASE+'/api/auth/me',{headers:{cookie:sessionBefore}}); j=await r.json(); ok(j.user===null,'a session signed before the reset is ended');
 r=await fetch(BASE+'/api/buyer-profile',{headers:{cookie:sessionBefore}}); ok(r.status===401,'and refused by the API too',r.status);
 const lr=await lg(winner); const newCookie=/token=([^;]+)/.exec(lr.headers.getSetCookie().join(';'))[1]; r=await fetch(BASE+'/api/auth/me',{headers:{cookie:'token='+newCookie}}); j=await r.json(); ok(j.user&&j.user.id===u.bId,'a new sign-in works');
 ok(await waitMail(srv2,c4+1),'a "password changed" notice is e-mailed'); const dn=smtp.decode(srv2.messages[srv2.messages.length-1].raw); ok(/Пароль изменён|password was changed/i.test(dn.subject),'with the right subject',dn.subject);
 // expiry
 const cnt5=srv2.messages.length; await sql(`UPDATE rate_limits SET hits=0`); await fp(u.m.b); await waitMail(srv2,cnt5+1); const tk2=/reset-password\?token=([A-Za-z0-9_-]{43})/.exec(smtp.decode(srv2.messages[srv2.messages.length-1].raw).text)[1];
 sql(`UPDATE password_resets SET expires_at=${Date.now()-1000} WHERE user_id=${u.bId}`); r=await rp({token:tk2,newPassword:'Late Pass 11',confirmPassword:'Late Pass 11'}); ok(r.status===400&&(await r.json()).code==='invalid_token','an expired link is refused');
 console.log('\n== who is never e-mailed');
 sql("UPDATE rate_limits SET hits=0"); const ph=`phone-1380000${u.st%10000}@noemail.invalid`; const h=bcrypt.hashSync('pass1234',10); sql(`INSERT INTO users (name,email,password_hash,role,country) VALUES ('Ph Buyer','${ph}','${h}','buyer','')`);
 const sus=`em-sus-${u.st}@test.invalid`; sql(`INSERT INTO users (name,email,password_hash,role,country,status) VALUES ('Sus Buyer','${sus}','${h}','buyer','','suspended')`);
 const c6=srv2.messages.length; await fp(ph); await fp(sus); await sleep(1000); ok(srv2.messages.length===c6,'a placeholder address and a suspended account get nothing');
 console.log('\n== change password');
 const cur='token='+newCookie; const cp=(c,body)=>fetch(BASE+'/api/auth/change-password',{method:'POST',headers:{'Content-Type':'application/json',cookie:c},body:JSON.stringify(body)});
 const other=await lg(winner); const otherCookie='token='+/token=([^;]+)/.exec(other.headers.getSetCookie().join(';'))[1];
 await sleep(1100); const c7=srv2.messages.length; r=await cp(cur,{currentPassword:winner,newPassword:'Changed Pass 55',confirmPassword:'Changed Pass 55'}); ok(r.status===200,'a change works'); const fresh=/token=([^;]+)/.exec(r.headers.getSetCookie().join(';')); ok(!!fresh,'and this device gets a fresh session cookie');
 r=await fetch(BASE+'/api/auth/me',{headers:{cookie:'token='+fresh[1]}}); ok((await r.json()).user,'which works'); r=await fetch(BASE+'/api/auth/me',{headers:{cookie:otherCookie}}); ok((await r.json()).user===null,'another signed-in device is signed out');
 ok(await waitMail(srv2,c7+1),'and a notice is e-mailed');
 console.log('\n== notifications');
 const lgRu=await fetch(BASE+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json','x-forwarded-for':ipn(),referer:BASE+'/ru/login'},body:JSON.stringify({email:u.m.b,password:'Changed Pass 55'})}); ok(lgRu.status===200,'sign in from the Russian page'); await sleep(300);
 ok(sql(`SELECT preferred_locale FROM users WHERE id=${u.bId}`)==='ru','the language is remembered');
 let bT=/token=([^;]+)/.exec(lgRu.headers.getSetCookie().join(';'))[1];
 const mails=()=>srv2.messages.map(x=>({to:x.to.join(),...smtp.decode(x.raw)}));
 const waitFor=async(re,ms=6000)=>{ const t=Date.now(); while(Date.now()-t<ms){ const f=mails().find(x=>re.test(x.subject)&&x.to.includes(u.m.b)); if(f) return f; await sleep(150);} return null; };
 // points
 r=await fetch(BASE+`/api/admin/wallet/wallets/${u.bId}`,{method:'POST',headers:H(u.aT),body:JSON.stringify({action:'adjust',amount:150,note:'Welcome gift',key:'k'+crypto.randomBytes(8).toString('hex')})}); ok(r.status===200,'admin adds 150 points'); let f=await waitFor(/Вам начислено баллов: 150/); ok(!!f,'the buyer is e-mailed in Russian',mails().map(x=>x.subject).slice(-3)); ok(f&&/Welcome gift/.test(f.text)&&/150/.test(f.text),'with the reason and the balance');
 const k2='k'+crypto.randomBytes(8).toString('hex'); const nBefore=srv2.messages.length; await fetch(BASE+`/api/admin/wallet/wallets/${u.bId}`,{method:'POST',headers:H(u.aT),body:JSON.stringify({action:'adjust',amount:-20,note:'Correction',key:k2})}); await sleep(900); ok(srv2.messages.length===nBefore,'taking points away sends no e-mail');
 const kk='k'+crypto.randomBytes(8).toString('hex'); const bulk=()=>fetch(BASE+'/api/admin/wallet/bulk-adjust',{method:'POST',headers:H(u.aT),body:JSON.stringify({userIds:[u.bId],amount:40,note:'Thank you bonus',key:kk})});
 r=await bulk(); ok(r.status===200,'bulk give 40'); ok(!!(await waitFor(/Вам начислено баллов: 40/)),'bulk recipients are e-mailed'); const nb=srv2.messages.length; r=await bulk(); await sleep(900); ok(srv2.messages.length===nb,'repeating the same bulk request e-mails no one twice');
 // topup
 r=await fetch(BASE+'/api/wallet/topups',{method:'POST',headers:H(bT),body:JSON.stringify({points:500,reference:'ref1',note:'',proof:PNG,key:'t'+crypto.randomBytes(8).toString('hex')})}); j=await r.json(); ok(r.status<300,'buyer asks for a top-up',[r.status,j]); const tid=j.id;
 r=await fetch(BASE+`/api/admin/wallet/topups/${tid}`,{method:'PATCH',headers:H(u.aT),body:JSON.stringify({action:'approve',points:500,note:''})}); ok(r.status===200,'admin approves'); ok(!!(await waitFor(/Ваше пополнение подтверждено/)),'e-mail: top-up approved (Russian)');
 r=await fetch(BASE+'/api/wallet/topups',{method:'POST',headers:H(bT),body:JSON.stringify({points:300,reference:'ref2',note:'',proof:PNG,key:'t'+crypto.randomBytes(8).toString('hex')})}); const tid2=(await r.json()).id; await fetch(BASE+`/api/admin/wallet/topups/${tid2}`,{method:'PATCH',headers:H(u.aT),body:JSON.stringify({action:'reject',note:'Amount does not match'})}); f=await waitFor(/Ваше пополнение не подтверждено/); ok(!!f&&/Amount does not match/.test(f.text),'e-mail: top-up not approved, with the note');
 // withdrawal
 const wk='w'+crypto.randomBytes(8).toString('hex'); r=await fetch(BASE+'/api/wallet/withdrawals',{method:'POST',headers:H(bT),body:JSON.stringify({points:200,method:'bank',accountName:'A B',bankName:'Bank',bankBranch:'',bankAccount:'123456789',note:'',password:'Changed Pass 55',key:wk})}); j=await r.json(); ok(r.status<300,'buyer asks for a withdrawal',[r.status,j]); const wid=j.id;
 await fetch(BASE+`/api/admin/wallet/withdrawals/${wid}`,{method:'PATCH',headers:H(u.aT),body:JSON.stringify({action:'paid',reference:'TRX-42',note:''})}); f=await waitFor(/Ваш вывод выплачен/); ok(!!f&&/TRX-42/.test(f.text)&&/200/.test(f.text),'e-mail: withdrawal paid (reference and points)');
 const wk2='w'+crypto.randomBytes(8).toString('hex'); r=await fetch(BASE+'/api/wallet/withdrawals',{method:'POST',headers:H(bT),body:JSON.stringify({points:100,method:'bank',accountName:'A B',bankName:'Bank',bankBranch:'',bankAccount:'123456789',note:'',password:'Changed Pass 55',key:wk2})}); const wid2=(await r.json()).id; await fetch(BASE+`/api/admin/wallet/withdrawals/${wid2}`,{method:'PATCH',headers:H(u.aT),body:JSON.stringify({action:'reject',note:'Bank details unclear'})}); f=await waitFor(/Ваш вывод не выплачен/); ok(!!f&&/Bank details unclear/.test(f.text),'e-mail: withdrawal not paid');
 // documents
 await fetch(BASE+'/api/buyer-profile/documents/passportFront',{method:'PUT',headers:H(bT),body:JSON.stringify({value:PNG})}); await fetch(BASE+'/api/buyer-profile/documents/visaPage',{method:'PUT',headers:H(bT),body:JSON.stringify({value:PNG})});
 r=await fetch(BASE+`/api/admin/buyer-profiles/${u.bId}/documents/passportFront`,{method:'PATCH',headers:H(u.aT),body:JSON.stringify({status:'rejected',note:'Photo is blurry'})}); ok(r.status===200,'admin rejects the passport photo'); f=await waitFor(/Пожалуйста, загрузите документ заново/); ok(!!f&&/Разворот паспорта/.test(f.subject+f.text)&&/Photo is blurry/.test(f.text),'e-mail names the document in Russian and gives the reason',f&&f.subject);
 const nd=srv2.messages.length; await fetch(BASE+`/api/admin/buyer-profiles/${u.bId}/documents/passportFront`,{method:'PATCH',headers:H(u.aT),body:JSON.stringify({status:'verified',note:''})}); await sleep(900); ok(srv2.messages.length===nd,'verifying sends no e-mail');
 r=await fetch(BASE+'/api/admin/buyer-profiles/bulk-review',{method:'POST',headers:H(u.aT),body:JSON.stringify({userIds:[u.bId],action:'reject',documentKey:'visaPage',note:'Expired visa'})}); ok(r.status===200,'bulk reject the visa page'); f=await waitFor(/Пожалуйста, загрузите документ заново: Страница визы|Страница визы/); ok(!!f&&/Expired visa/.test(f.text),'bulk rejection e-mails the buyer too');
 // registration
 const ex=sql("SELECT id FROM exhibitions ORDER BY id LIMIT 1"); try{ sql(`INSERT INTO expo_registrations (exhibition_id,user_id,status) VALUES (${ex},${u.bId},'pending')`); }catch(e){ console.log('  (registration fixture needs more columns)'); }
 const regId=sql(`SELECT id FROM expo_registrations WHERE user_id=${u.bId} ORDER BY id DESC LIMIT 1`);
 if(regId){ r=await fetch(BASE+`/api/admin/expo-registrations/${regId}`,{method:'PATCH',headers:H(u.aT),body:JSON.stringify({status:'approved'})}); ok(r.status===200,'admin approves a registration'); f=await waitFor(/подтверждена/); ok(!!f,'e-mail: registration approved (Russian)',mails().map(x=>x.subject).slice(-3));
   const n2=srv2.messages.length; await fetch(BASE+`/api/admin/expo-registrations/${regId}`,{method:'PATCH',headers:H(u.aT),body:JSON.stringify({status:'approved'})}); await sleep(900); ok(srv2.messages.length===n2,'approving again does not e-mail again');
   await fetch(BASE+`/api/admin/expo-registrations/${regId}`,{method:'PATCH',headers:H(u.aT),body:JSON.stringify({status:'rejected'})}); f=await waitFor(/О вашей регистрации/); ok(!!f,'e-mail: registration not approved'); sql(`DELETE FROM expo_registrations WHERE id=${regId}`); }
 // mail off: nothing sent
 await put({...settings,enabled:false}); await sleep(100); const noff=srv2.messages.length; await fetch(BASE+`/api/admin/wallet/wallets/${u.bId}`,{method:'POST',headers:H(u.aT),body:JSON.stringify({action:'adjust',amount:5,note:'off test',key:'k'+crypto.randomBytes(8).toString('hex')})}); await sleep(1500); ok(srv2.messages.length===noff,'with e-mail switched off nothing is sent (cache lag allowed up to 20s is fine; checked after save)');
 r=await fetch(BASE+'/api/auth/forgot-password'); j=await r.json(); ok(j.enabled===false,'and "Forgot password?" disappears');
 await put(settings);
 console.log('\n== screens');
 const br=await require('./helpers/browser.js').launch(); const mk=async(t,vp={width:1360,height:1000})=>{const c=await br.newContext({viewport:vp}); if(t) await c.addCookies([{name:'token',value:t,url:BASE}]); return c;};
 let c=await mk(null); let p=await c.newPage(); await p.goto(BASE+'/en/login',{waitUntil:'networkidle'}); await sleep(500); const fl=p.getByRole('link',{name:'Forgot password?'}); ok(await fl.count()===1,'login page: "Forgot password?" is a link when e-mail is on'); await fl.click(); await p.waitForURL(/forgot-password/); ok(/Forgot your password\?/.test(await p.locator('h1').innerText()),'it opens the forgot page');
 await p.getByLabel('E-mail address').fill(u.m.b); const cs=srv2.messages.length; await p.getByRole('button',{name:'Send me the link'}).click(); await p.locator('main [role=status]').waitFor(); const stx=await p.locator('main [role=status]').innerText(); ok(/Check your e-mail/.test(stx)&&stx.includes(u.m.b),'the page says to check e-mail',stx); await p.screenshot({path:SHOTS+'/em_forgot.png'}); let vio=await AXE(p); ok(vio.length===0,'forgot page axe 0',vio);
 ok(await waitMail(srv2,cs+1),'and the mail goes out'); let resetMail=null; for(let i=0;i<60&&!resetMail;i++){ resetMail=mails().slice(cs).find(x=>/Reset your password/.test(x.subject)&&x.to.includes(u.m.b)); if(!resetMail) await sleep(150); } const tkUI=/reset-password\?token=([A-Za-z0-9_-]{43})/.exec(resetMail.text); 
 await p.goto(BASE+'/en/reset-password?token='+(tkUI?tkUI[1]:'x'),{waitUntil:'networkidle'}); await sleep(500); const pn=p.getByLabel('New password',{exact:true}), pc=p.getByLabel('Confirm new password');
 await pn.fill('abc'); await pc.fill('abc'); await p.getByRole('button',{name:'Save new password'}).click(); ok(/at least 8/.test(await p.locator('main [role=alert]').innerText()),'reset page: too short is explained'); await pn.fill('Ui Reset Pass 5'); await pc.fill('Ui Reset Pass 6'); await p.getByRole('button',{name:'Save new password'}).click(); ok(/not the same/.test(await p.locator('main [role=alert]').innerText()),'mismatch is explained');
 await p.getByRole('button',{name:'Show'}).first().click(); ok(await pn.getAttribute('type')==='text','Show reveals it'); await p.screenshot({path:SHOTS+'/em_reset.png'}); vio=await AXE(p); ok(vio.length===0,'reset page axe 0',vio);
 await pn.fill('Ui Reset Pass 5'); await pc.fill('Ui Reset Pass 5'); await p.getByRole('button',{name:'Save new password'}).click(); await p.locator('main [role=status]').waitFor(); ok(/password has been changed/.test(await p.locator('main [role=status]').innerText()),'success is shown'); ok((await lg('Ui Reset Pass 5')).status===200,'the new password works');
 await p.goto(BASE+'/en/reset-password?token='+tkUI[1],{waitUntil:'networkidle'}); await sleep(500); ok(/cannot be used/.test(await p.locator('main [role=alert]').innerText()),'opening the used link again says it cannot be used'); await p.screenshot({path:SHOTS+'/em_reset_used.png'}); vio=await AXE(p); ok(vio.length===0,'invalid-link state axe 0',vio);
 await p.goto(BASE+'/en/reset-password',{waitUntil:'networkidle'}); await sleep(400); ok(/cannot be used/.test(await p.locator('main [role=alert]').innerText()),'no token at all: same message');
 for(const [loc,h] of [['ru','Забыли пароль?'],['zh','忘记密码？']]){ await p.goto(`${BASE}/${loc}/forgot-password`,{waitUntil:'networkidle'}); await sleep(300); const tx=await p.locator('body').innerText(); ok(tx.includes(h)&&!/authRecovery\./.test(tx),loc+': forgot page translated'); vio=await AXE(p); ok(vio.length===0,loc+': axe 0',vio); }
 const meta=await (await fetch(BASE+'/en/reset-password')).text(); ok(/noindex/.test(meta),'the reset page asks search engines not to index it');
 await c.close();
 // admin page
 c=await mk(u.aT); p=await c.newPage(); await p.goto(BASE+'/en/admin/email',{waitUntil:'networkidle'}); await p.getByRole('heading',{name:'Sending settings'}).waitFor(); ok(await p.getByLabel('Mail server (SMTP host)').inputValue()==='127.0.0.1','admin page shows the saved server'); ok(await p.getByLabel('Password',{exact:true}).getAttribute('placeholder')===('Saved — leave empty to keep it'),'password box says it is saved (never shows it)');
 await p.getByRole('button',{name:/Send a test e-mail to/}).click(); await p.locator('main [role=status]').filter({hasText:'Test e-mail sent'}).waitFor({timeout:10000}); ok(true,'the test button reports success');
 await p.getByLabel('Port',{exact:true}).fill('abc'); await p.getByRole('button',{name:'Save'}).click(); await sleep(500); await p.getByLabel('Mail server (SMTP host)').fill('bad host!'); await p.getByRole('button',{name:'Save'}).click(); await p.locator('main [role=alert]').waitFor(); ok(/mail server name is not valid/.test(await p.locator('main [role=alert]').innerText()),'an invalid value is explained in words');
 await p.reload({waitUntil:'networkidle'}); await p.getByRole('heading',{name:'Recent e-mails'}).waitFor(); ok((await p.locator('table').innerText()).includes('Test e-mail'),'the recent e-mails table lists sends'); await p.screenshot({path:SHOTS+'/em_admin.png',fullPage:true}); vio=await AXE(p); ok(vio.length===0,'admin e-mail page axe 0',vio);
 for(const [loc,h] of [['ru','Настройки отправки'],['zh','发送设置']]){ await p.goto(`${BASE}/${loc}/admin/email`,{waitUntil:'networkidle'}); await sleep(500); const tx=await p.locator('body').innerText(); ok(tx.includes(h)&&!/adminEmail\./.test(tx),loc+': admin e-mail page translated'); }
 await p.goto(BASE+'/en/admin',{waitUntil:'networkidle'}); ok(await p.locator('a[href*="/admin/email"]').count()>=1,'Email is on the admin home and menu'); await c.close();
 c=await mk(u.bT,{width:375,height:800}); p=await c.newPage(); for(const pth of ['/en/forgot-password','/en/reset-password?token=x']){ await p.goto(BASE+pth,{waitUntil:'networkidle'}); const wd=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,vw:innerWidth})); ok(wd.sw<=wd.vw+1,'375px no overflow '+pth,wd);} await c.close();
 await br.close(); await srv2.close();
 sql(`DELETE FROM users WHERE email IN ('${ph}','${sus}')`); sql("DELETE FROM mail_settings"); sql("UPDATE rate_limits SET hits=0");
 done();
})();
