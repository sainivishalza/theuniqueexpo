const fs=require('fs'); const { BASE, sql, ok, done, mkUsers, login, PNG } = require('./helpers/common.js'); const SHOTS=require('./helpers/common.js').SHOTS;
const { chromium } = require('playwright');
const axeSrc=require('./helpers/browser.js').axeSource;
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const AXE=async(p)=>{ await p.evaluate(axeSrc); return p.evaluate(async()=>(await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(x=>x.id+':'+x.nodes.length)); };
(async()=>{
 const u=await mkUsers('adt'); const u2=await mkUsers('adu'); const H=(t)=>({'Content-Type':'application/json',cookie:'token='+t});
 const put=(t,d)=>fetch(BASE+'/api/buyer-profile/documents/'+d,{method:'PUT',headers:H(t),body:JSON.stringify({value:PNG})});
 for(const d of ['passportFront','visaPage','businessCard']) await put(u.bT,d); for(const d of ['passportFront','visaPage']) await put(u2.bT,d);
 // make some pending
 sql(`UPDATE buyer_profiles SET doc_visa_page_status='pending', doc_business_card_status='pending' WHERE user_id IN (${u.bId},${u2.bId})`);
 const br=(userId,body,t=u.aT)=>fetch(BASE+'/api/admin/buyer-profiles/bulk-review',{method:'POST',headers:H(t),body:JSON.stringify({userIds:[userId].flat(),...body})});
 const st=(id,col)=>sql(`SELECT doc_${col}_status FROM buyer_profiles WHERE user_id=${id}`);
 console.log('\n== bulk review API');
 let r=await br([u.bId],{action:'verify'},u.bT); ok(r.status===401,'a buyer cannot use it');
 r=await fetch(BASE+'/api/admin/buyer-profiles/bulk-review',{method:'POST',body:'{}'}); ok(r.status===401,'signed-out cannot');
 r=await br([],{action:'verify'}); ok(r.status===400,'no buyers is refused'); r=await br([u.bId],{action:'nope'}); ok(r.status===400,'unknown action is refused');
 r=await fetch(BASE+'/api/admin/buyer-profiles/bulk-review',{method:'POST',headers:H(u.aT),body:JSON.stringify({userIds:Array.from({length:501},(_,i)=>i+1),action:'verify'})}); ok(r.status===400,'more than 500 buyers is refused');
 r=await br([u.bId],{action:'reject',documentKey:'passportFront'}); let j=await r.json(); ok(r.status===400&&j.code==='reason_required','a rejection needs a reason',[r.status,j]);
 r=await br([u.bId],{action:'reject',documentKey:'bogus',note:'blurry photo'}); ok(r.status===400,'an unknown document is refused');
 r=await br([u.bId],{action:'reject',documentKey:'passportFront',note:'The photo is blurry'}); j=await r.json(); ok(r.status===200&&j.changed===1,'reject one document for one buyer',j);
 ok(st(u.bId,'passport_front')==='rejected'&&sql(`SELECT doc_passport_front_note FROM buyer_profiles WHERE user_id=${u.bId}`)==='The photo is blurry','status and the reason are saved'); ok(st(u2.bId,'passport_front')==='verified','another buyer is untouched');
 ok(st(u.bId,'visa_page')==='pending','other documents of that buyer are untouched');
 r=await br([u.bId,u2.bId],{action:'reject',documentKey:'businessLicense',note:'Please upload it'}); j=await r.json(); ok(r.status===200&&j.changed===0,'rejecting a document nobody uploaded changes nothing',j);
 r=await br([u.bId,u2.bId],{action:'verify'}); j=await r.json(); ok(r.status===200&&j.changed===3,'verify all waiting for two buyers (visa x2, card x1)',j);
 ok(st(u.bId,'visa_page')==='verified'&&st(u2.bId,'visa_page')==='verified'&&st(u.bId,'business_card')==='verified','they are verified');
 ok(st(u.bId,'passport_front')==='rejected','a rejected document is not turned into verified by "verify all waiting"');
 ok(sql(`SELECT doc_business_license_status FROM buyer_profiles WHERE user_id=${u.bId}`)==='pending'&&sql(`SELECT COUNT(*) FROM buyer_profiles WHERE user_id=${u.bId} AND doc_business_license IS NOT NULL AND doc_business_license<>''`)==='0','a document that was never uploaded is not "verified" (nothing there)');
 r=await br([u.bId],{action:'verify'}); j=await r.json(); ok(j.changed===0,'running it again changes nothing');
 console.log('\n== needs attention');
 r=await fetch(BASE+'/api/admin/attention',{headers:H(u.bT)}); ok(r.status===401,'buyers cannot read it');
 sql(`UPDATE buyer_profiles SET doc_visa_page_status='pending' WHERE user_id=${u2.bId}`);
 let a=await (await fetch(BASE+'/api/admin/attention',{headers:H(u.aT)})).json(); ok(Object.keys(a).sort().join()==='documents,expenses,failedEmails,registrations,topups,tourRegistrations,twoStepOff,withdrawals','seven counts and the two-step reminder',a); ok(a.documents>=1,'documents waiting is counted',a);
 const before=a.documents; sql(`UPDATE buyer_profiles SET doc_visa_page_status='verified' WHERE user_id=${u2.bId}`); a=await (await fetch(BASE+'/api/admin/attention',{headers:H(u.aT)})).json(); ok(a.documents===before-1,'and goes down when one is verified',[before,a.documents]);
 console.log('\n== screens');
 const b=await require('./helpers/browser.js').launch(); const mk=async(t,vp={width:1360,height:1000})=>{const c=await b.newContext({viewport:vp}); await c.addCookies([{name:'token',value:t,url:BASE}]); return c;};
 sql(`UPDATE buyer_profiles SET doc_visa_page_status='pending' WHERE user_id=${u.bId}`); // something must be waiting for the link to appear
 let c=await mk(u.aT); let p=await c.newPage(); await p.goto(BASE+'/en/admin',{waitUntil:'networkidle'}); await p.getByRole('heading',{name:'Needs your attention'}).waitFor(); await sleep(800);
 const panelText=await p.locator('#attention-title').locator('..').innerText(); ok(/to review|waits? for|to check|to pay/.test(panelText)||/Nothing is waiting/.test(panelText),'the panel shows what waits or says all clear',panelText);
 const docLink=p.locator('#attention-title').locator('..').getByRole('link',{name:/buyer documents? to review/}); await docLink.waitFor({timeout:10000}).catch(()=>{}); ok(await docLink.count()===1,'a documents link is listed');
 await p.screenshot({path:SHOTS+'/adt_home.png'}); await docLink.click(); await p.waitForURL(/buyer-profiles/); await p.waitForSelector('tbody tr'); await sleep(500);
 ok(await p.locator('select[aria-label]').filter({has:p.locator('option[value="waiting_review"]')}).inputValue()==='waiting_review','the link opens Buyer Profiles with "Has a document to review" selected');
 let vio=await AXE(p); ok(vio.length===0,'axe 0 on filtered Buyer Profiles',vio);
 await p.goto(BASE+'/en/admin',{waitUntil:'networkidle'}); await sleep(800); vio=await AXE(p); ok(vio.length===0,'axe 0 on admin home',vio); await c.close();
 // selection + dialog
 sql(`UPDATE buyer_profiles SET doc_visa_page_status='pending', doc_business_card_status='pending' WHERE user_id=${u.bId}`);
 c=await mk(u.aT); p=await c.newPage(); await p.goto(BASE+'/en/admin/buyer-profiles',{waitUntil:'networkidle'}); await p.getByPlaceholder(/Search by registration no/).fill('adt-b-'+u.st); await sleep(900);
 await p.locator('tbody tr').first().locator('input[type=checkbox]').check(); await p.getByRole('button',{name:'Review documents'}).click(); const dlg=p.getByRole('dialog'); await dlg.waitFor();
 ok(/Review documents for 1 buyers/.test(await dlg.innerText()),'dialog opens for the selection'); ok(await dlg.getByRole('button',{name:'Verify documents'}).isEnabled(),'verify is ready');
 await dlg.getByLabel('Reject one document').check(); ok(await dlg.getByRole('button',{name:'Reject document'}).isDisabled(),'reject needs a reason first'); await dlg.getByLabel('Document',{exact:true}).selectOption('buyerPhoto'); await dlg.getByLabel('Reason the buyers will see').fill('x'); ok(await dlg.getByRole('button',{name:'Reject document'}).isDisabled(),'a one-letter reason is not enough');
 await p.screenshot({path:SHOTS+'/adt_dialog.png'}); vio=await AXE(p); ok(vio.length===0,'axe 0 with the dialog open',vio);
 await dlg.getByLabel('Verify all waiting documents').check(); await dlg.getByRole('button',{name:'Verify documents'}).click(); await dlg.getByRole('status').waitFor(); ok(/2 documents updated/.test(await dlg.innerText()),'it reports 2 documents updated',await dlg.innerText());
 ok(st(u.bId,'visa_page')==='verified'&&st(u.bId,'business_card')==='verified','the buyer\'s documents are verified in the database');
 await c.close();
 for(const [loc,h,btn] of [['ru','Требует вашего внимания','Проверить документы'],['zh','需要您处理','审核文档']]){ c=await mk(u.aT); p=await c.newPage(); await p.goto(`${BASE}/${loc}/admin`,{waitUntil:'networkidle'}); await sleep(700); const tx=await p.locator('body').innerText(); ok(tx.includes(h)&&!/adminHome\.attention/.test(tx),loc+': panel translated'); await p.goto(`${BASE}/${loc}/admin/buyer-profiles`,{waitUntil:'networkidle'}); await p.locator('tbody tr').first().locator('input[type=checkbox]').check(); ok(await p.getByRole('button',{name:btn}).count()===1,loc+': Review documents button translated'); await c.close(); }
 c=await mk(u.aT,{width:375,height:800}); p=await c.newPage(); await p.goto(BASE+'/en/admin',{waitUntil:'networkidle'}); await sleep(700); const wd=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,vw:innerWidth})); ok(wd.sw<=wd.vw+1,'375px: no sideways overflow on admin home',wd); await c.close();
 await b.close(); done();
})();
