const SHOTS=require('./helpers/common.js').SHOTS;
const { chromium } = require('playwright');
const { execSync } = require('node:child_process');
const bcrypt = require('bcryptjs');
const { BASE, sql } = require('./helpers/common.js');
let n=0,f=0; const ok=(c,l,x)=>{n++; if(c) console.log('  ok  ',l); else {f++; console.log('  FAIL',l,x===undefined?'':JSON.stringify(x));}};
(async()=>{
 const e=`sv-${Date.now()}@test.invalid`; sql(`INSERT INTO users (name,email,password_hash,role,country) VALUES ('SV Admin','${e}','${bcrypt.hashSync('pass1234',10)}','admin','')`);
 const t=/token=([^;]+)/.exec((await fetch(BASE+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:e,password:'pass1234'})})).headers.getSetCookie().join(';'))[1];
 const b=await require('./helpers/browser.js').launch();
 for (const [label,vp,loc] of [['laptop',{width:1360,height:700},'en'],['phone',{width:375,height:700},'en'],['russian',{width:1360,height:700},'ru'],['chinese',{width:1360,height:700},'zh']]) {
  console.log('\n== '+label);
  const c=await b.newContext({viewport:vp}); await c.addCookies([{name:'token',value:t,url:BASE}]); const p=await c.newPage();
  await p.goto(`${BASE}/${loc}/admin/buyer-profiles`,{waitUntil:'networkidle'}); await p.waitForSelector('tbody tr');
  await p.locator('tbody tr button').filter({hasText:/Edit|Изменить|Редакт|编辑|Править/}).first().evaluate((el)=>el.click());
  await p.waitForSelector('#ebp-purchaseIntention');
  const save=p.locator('div.fixed.inset-0 div.border-t').getByRole('button').first();
  const box=await save.boundingBox(); ok(box && box.y>=0 && box.y+box.height<=vp.height,'Save button is in view without scrolling',box);
  // scroll the form to the bottom and to the top: still in view
  await p.evaluate(()=>{const el=document.querySelector('div.overflow-y-auto.flex-1'); el.scrollTop=el.scrollHeight;});
  const b2=await save.boundingBox(); ok(b2 && b2.y+b2.height<=vp.height,'Save button still in view at the bottom of the form',b2);
  await p.evaluate(()=>{const el=document.querySelector('div.overflow-y-auto.flex-1'); el.scrollTop=0;});
  const b3=await save.boundingBox(); ok(b3 && b3.y+b3.height<=vp.height,'Save button still in view at the top of the form',b3);
  if(label==='laptop'){
    const field=p.locator('#ebp-purchaseIntention'); const val='Save test '+Date.now(); await field.fill(val);
    ok(!(await p.getByRole('status').filter({hasText:'Saved.'}).count()),'no "Saved." before saving');
    await save.click(); await p.getByRole('status').filter({hasText:'Saved.'}).waitFor({timeout:10000}); ok(true,'"Saved." appears after saving');
    ok(sql(`SELECT COUNT(*) FROM buyer_profiles WHERE purchase_intention='${val}'`)==='1','the change is stored in the database');
    await field.fill(val+' x'); ok(!(await p.getByRole('status').filter({hasText:'Saved.'}).count()),'"Saved." goes away on the next edit');
    // a failed save shows its error inside the panel
    await p.route('**/api/admin/buyer-profiles/*',(r)=>r.request().method()==='PATCH'?r.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:'Test failure message'})}):r.continue());
    await save.click(); await p.getByRole('alert').filter({hasText:'Test failure message'}).waitFor({timeout:10000}); ok(await p.getByRole('alert').filter({hasText:'Test failure message'}).isVisible(),'a failed save shows its error in the panel');
    await p.screenshot({path:SHOTS+'/save_panel.png'});
  }
  await c.close();
 }
 await b.close(); console.log(`\n${n-f}/${n} ok`); process.exit(f?1:0);
})();
