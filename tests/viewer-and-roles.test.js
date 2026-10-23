const fs=require('fs'); const { BASE, sql, ok, done, mkUsers, login, PNG } = require('./helpers/common.js'); const SHOTS=require('./helpers/common.js').SHOTS;
const bcrypt = require('bcryptjs');
const { chromium } = require('playwright');
const axeSrc=require('./helpers/browser.js').axeSource;
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const loginRaw=(email,password)=>fetch(BASE+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json','x-forwarded-for':'10.8.'+Math.floor(Math.random()*250)+'.'+Math.floor(Math.random()*250)},body:JSON.stringify({email,password})});
const AXE=async(p)=>{ await p.evaluate(axeSrc); return p.evaluate(async()=>(await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(x=>x.id+':'+x.nodes.length)); };
(async()=>{
 const u=await mkUsers('acc'); const st=u.st, h=bcrypt.hashSync('pass1234',10);
 const ex=`acc-x-${st}@test.invalid`, pa=`acc-p-${st}@test.invalid`;
 sql(`INSERT INTO users (name,email,password_hash,role,country) VALUES ('acc Exhibitor','${ex}','${h}','exhibitor',''),('acc Partner','${pa}','${h}','partner','')`);
 const xT=await login(ex), pT=await login(pa);
 const br=await require('./helpers/browser.js').launch();
 const mk=async(t,vp={width:1360,height:1000})=>{const c=await br.newContext({viewport:vp}); await c.addCookies([{name:'token',value:t,url:BASE}]); return c;};

 console.log('\n== buyer profile: photos are clickable');
 for (const d of ['passportFront','visaPage']) await fetch(BASE+'/api/buyer-profile/documents/'+d,{method:'PUT',headers:{'Content-Type':'application/json',cookie:'token='+u.bT},body:JSON.stringify({value:PNG})});
 let c=await mk(u.bT,{width:375,height:800}); let p=await c.newPage();
 await p.goto(BASE+'/en/dashboard/buyer/profile',{waitUntil:'networkidle'});
 const thumb=p.getByRole('button',{name:/Tap to enlarge Passport Front Page/});
 ok(await thumb.count()===1,'the passport photo is a button (keyboard + tap)');
 ok(await p.getByRole('button',{name:/Tap to enlarge/}).count()===2,'every uploaded document has one, and only those (2 uploaded)');
 await thumb.scrollIntoViewIfNeeded(); await p.screenshot({path:SHOTS+'/acc_profile_phone.png'});
 await thumb.click(); const dlg=p.getByRole('dialog');
 await dlg.waitFor({timeout:5000}); ok(/Passport Front Page/.test(await dlg.innerText()),'tapping opens the large view with the document name');
 ok(await dlg.locator('img').count()===1&&await dlg.getByRole('button',{name:'Zoom in'}).count()===1&&await dlg.getByRole('button',{name:'Close'}).count()===1,'big picture + zoom buttons + close');
 ok(/Pending|Verified|Rejected/i.test(await dlg.innerText()),'review status is shown');
 ok(await p.evaluate(()=>document.activeElement?.getAttribute('aria-label'))==='Close','keyboard focus lands on Close');
 const tf0=await dlg.locator('img').evaluate(e=>e.style.transform); await dlg.getByRole('button',{name:'Zoom in'}).click(); const tf1=await dlg.locator('img').evaluate(e=>e.style.transform); ok(tf0!==tf1&&/scale\(1\.5\)/.test(tf1),'zoom in works',[tf0,tf1]);
 await p.screenshot({path:SHOTS+'/acc_viewer_phone.png'});
 await p.keyboard.press('Escape'); await sleep(200); ok(await p.getByRole('dialog').count()===0,'Escape closes it');
 ok(await p.evaluate(()=>document.activeElement?.getAttribute('aria-label')||'')!=='','focus goes back to the photo button');
 await thumb.click(); await p.getByRole('dialog').getByRole('button',{name:'Close'}).click(); await sleep(200); ok(await p.getByRole('dialog').count()===0,'Close button closes it');
 await c.close();

 console.log('\n== every Choose File button is green');
 c=await mk(u.bT); p=await c.newPage(); await p.goto(BASE+'/en/dashboard/buyer/profile',{waitUntil:'networkidle'});
 const fi=p.locator('input[type=file]').first();
 const cs=await fi.evaluate(e=>{const s=getComputedStyle(e,'::file-selector-button'); return {bg:s.backgroundImage,color:s.color,weight:s.fontWeight,radius:s.borderRadius};});
 ok(/linear-gradient/.test(cs.bg),'file button has the Save gradient',cs); ok(cs.color==='rgb(255, 255, 255)'&&Number(cs.weight)>=700,'white bold text',cs);
 const saveBg=await p.locator('button:has-text("Save")').first().evaluate(e=>getComputedStyle(e).backgroundImage).catch(()=>null);
 if(saveBg) ok(saveBg===cs.bg,'same colours as the Save button',[saveBg,cs.bg]);
 await p.locator('input[type=file]').first().scrollIntoViewIfNeeded(); await p.screenshot({path:SHOTS+'/acc_file_desktop.png'});
 await c.close();

 console.log('\n== change password for every role');
 for (const [role,T,email,path,card] of [['exhibitor',xT,ex,'/en/dashboard/exhibitor','Change password'],['partner',pT,pa,'/en/dashboard/partner','Change password']]) {
   c=await mk(T); p=await c.newPage(); await p.goto(BASE+path,{waitUntil:'networkidle'});
   const link=p.locator('main a[href*="/dashboard/account"], section a[href*="/dashboard/account"]').first();
   ok(await link.count()===1,role+': dashboard has a "Change password" card');
   ok(await p.getByRole('link',{name:/Account & password/}).count()>=1,role+': and a menu entry');
   await link.click(); await p.waitForURL(/dashboard\/account/); await p.waitForSelector('#change-password');
   ok(/My account/.test(await p.locator('h1').innerText()),role+': opens My account'); ok((await p.locator('body').innerText()).includes(email),role+': shows the account email');
   const card=p.locator('#change-password');
   await card.getByLabel('Current password').fill('pass1234'); await card.getByLabel('New password',{exact:true}).fill('Role New Pass 1'); await card.getByLabel('Confirm new password').fill('Role New Pass 1');
   await card.getByRole('button',{name:'Change password'}).click(); await card.getByRole('status').filter({hasText:'password has been changed'}).waitFor({timeout:8000});
   ok((await loginRaw(email,'Role New Pass 1')).status===200&&(await loginRaw(email,'pass1234')).status===401,role+': the new password works, the old one does not');
   await c.close();
 }
 // buyer menu entry + page
 c=await mk(u.bT); p=await c.newPage(); await p.goto(BASE+'/en/dashboard/account',{waitUntil:'networkidle'}); await p.waitForSelector('#change-password'); ok(true,'buyer: /dashboard/account works too'); await c.close();
 // admin
 c=await mk(u.aT); p=await c.newPage(); await p.goto(BASE+'/en/admin',{waitUntil:'networkidle'});
 ok(await p.locator('a[href*="/admin/account"]').count()>=1,'admin: "My account" is on the admin home and menu');
 await p.goto(BASE+'/en/admin/account',{waitUntil:'networkidle'}); await p.waitForSelector('#change-password');
 const ac=p.locator('#change-password'); await ac.getByLabel('Current password').fill('pass1234'); await ac.getByLabel('New password',{exact:true}).fill('Admin New Pass 1'); await ac.getByLabel('Confirm new password').fill('Admin New Pass 1');
 await ac.getByRole('button',{name:'Change password'}).click(); await ac.getByRole('status').filter({hasText:'password has been changed'}).waitFor({timeout:8000});
 const relog=await loginRaw(u.m.a,'Admin New Pass 1'); ok(relog.status===200,'admin: password changed from the admin panel'); u.aT=/token=([^;]+)/.exec(relog.headers.getSetCookie().join(';'))[1];
 await c.close();
 // non-admin cannot see the admin page content
 c=await mk(u.bT); p=await c.newPage(); await p.goto(BASE+'/en/admin/account',{waitUntil:'networkidle'}); ok(await p.locator('#change-password').count()===0,'a buyer opening /admin/account sees no form'); await c.close();

 console.log('\n== admin panel highlights');
 sql(`INSERT IGNORE INTO buyer_profiles (user_id) VALUES (${u.bId})`);
 c=await mk(u.aT); p=await c.newPage(); await p.goto(BASE+'/en/admin/exhibitions',{waitUntil:'networkidle'});
 await p.waitForSelector('main li, main article, main h3',{timeout:15000}).catch(()=>{}); await sleep(1500); const edit=p.getByRole('button',{name:'Edit'}).first(); const eb=await edit.evaluate(e=>getComputedStyle(e).backgroundImage); ok(/linear-gradient/.test(eb),'exhibitions: Edit is green',eb);
 const reg=p.locator('main').getByRole('link',{name:'Registrations',exact:true}).first(); const rb=await reg.evaluate(e=>getComputedStyle(e).backgroundColor); ok(rb!=='rgba(0, 0, 0, 0)','exhibitions: Registrations is tinted',rb);
 const del=p.getByRole('button',{name:'Delete'}).first(); ok(!/linear-gradient/.test(await del.evaluate(e=>getComputedStyle(e).backgroundImage)),'Delete stays red outline, not green');
 let vio=await AXE(p); ok(vio.length===0,'exhibitions list axe 0',vio);
 await p.goto(BASE+'/en/admin/buyer-profiles',{waitUntil:'networkidle'}); await p.getByPlaceholder(/Search/).first().fill(u.m.b); await sleep(600);
 await p.getByRole('button',{name:'Edit'}).first().click(); await p.locator('p',{hasText:/^Documents$/i}).first().waitFor({timeout:8000});
 ok(await p.getByRole('button',{name:/Enlarge: Passport Front Page/}).count()===1,'admin panel: photo has an Enlarge button');
 await p.getByRole('button',{name:/Enlarge: Passport Front Page/}).click(); await p.getByRole('dialog').waitFor({timeout:5000}); ok(true,'admin: opens the shared viewer'); await p.keyboard.press('Escape');
 await p.screenshot({path:SHOTS+'/acc_admin_panel.png'});
 await c.close();

 console.log('\n== languages + axe on new pages');
 for (const loc of ['en','ru','zh']) {
   for (const [T,path] of [[xT,'/dashboard/account'],[xT,'/dashboard/exhibitor'],[pT,'/dashboard/partner'],[u.aT,'/admin/account'],[u.bT,'/dashboard/buyer/profile']]) {
     c=await mk(T); p=await c.newPage(); await p.goto(`${BASE}/${loc}${path}`,{waitUntil:'networkidle'}); await sleep(400);
     const txt=await p.locator('body').innerText(); const raw=/\b(accountPassword|adminCommon|buyerProfile|adminHome)\.[a-zA-Z]+/.test(txt);
     vio=await AXE(p); ok(!raw&&vio.length===0,`${loc} ${path}: translated, axe 0`,[raw,vio]); await c.close();
   }
 }
 c=await mk(u.bT); p=await c.newPage(); await p.goto(BASE+'/ru/dashboard/buyer/profile',{waitUntil:'networkidle'}); await p.getByRole('button',{name:/Нажмите, чтобы увеличить/}).first().click(); await p.getByRole('dialog').waitFor(); vio=await AXE(p); ok(vio.length===0,'ru: open viewer axe 0',vio); await c.close();
 c=await mk(u.bT); p=await c.newPage(); await p.goto(BASE+'/zh/dashboard/buyer/profile',{waitUntil:'networkidle'}); await p.getByRole('button',{name:/点击放大/}).first().click(); await p.getByRole('dialog').waitFor(); ok((await p.getByRole('dialog').innerText()).includes('重置'),'zh: viewer translated'); await c.close();

 console.log('\n== phone');
 for (const [T,path] of [[xT,'/dashboard/account'],[xT,'/dashboard/exhibitor'],[pT,'/dashboard/partner'],[u.aT,'/admin/account'],[u.aT,'/admin/exhibitions'],[u.bT,'/dashboard/buyer/profile']]) {
   c=await mk(T,{width:375,height:800}); p=await c.newPage(); await p.goto(BASE+'/en'+path,{waitUntil:'networkidle'}); const wd=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,vw:innerWidth})); ok(wd.sw<=wd.vw+1,'375px no overflow '+path,wd); await c.close(); }
 await br.close();
 sql(`DELETE FROM users WHERE email IN ('${ex}','${pa}')`);
 done();
})();
