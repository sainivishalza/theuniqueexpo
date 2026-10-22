const fs=require('fs'); const { BASE, sql, ok, done, mkUsers } = require('./helpers/common.js'); const SHOTS=require('./helpers/common.js').SHOTS;
const { chromium } = require('playwright');
const bcrypt = require('bcryptjs');
const axeSrc=require('./helpers/browser.js').axeSource;
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const u=await mkUsers('wv'); const HA={cookie:'token='+u.aT,'Content-Type':'application/json'};
 await fetch(BASE+'/api/admin/buyer-profiles',{headers:HA});
 let r=await fetch(BASE+`/api/admin/wallet/wallets/${u.bId}`,{method:'POST',headers:HA,body:JSON.stringify({action:'adjust',amount:1250,note:'Test balance',key:'wv'+u.st+'aaaa'})}); ok(r.status===200,'gave the test buyer 1,250 points');
 const br=await require('./helpers/browser.js').launch();
 const mk=async(t,vp)=>{const c=await br.newContext({viewport:vp}); await c.addCookies([{name:'token',value:t,url:BASE}]); return c;};
 console.log('\n== on a phone (375px)');
 let c=await mk(u.bT,{width:375,height:800}); let p=await c.newPage(); await p.goto(BASE+'/en/dashboard/buyer',{waitUntil:'networkidle'}); await p.waitForSelector('header a[aria-label^="My wallet"]');
 const chip=p.locator('header a[aria-label^="My wallet"]').first(); ok(await chip.getAttribute('aria-label')==='My wallet: 1,250 points'&&/1,250/.test(await chip.innerText()),'the top bar shows a wallet pill with 1,250',await chip.innerText());
 ok(await chip.isVisible(),'and it is visible'); const bb=await chip.boundingBox(); ok(bb&&bb.x>=0&&bb.x+bb.width<=375,'inside the screen width',bb);
 const card=p.locator('#home-wallet-title').locator('xpath=ancestor::section[1]'); ok(await card.isVisible()&&/1,250/.test(await card.innerText())&&/≈ ¥1,250/.test(await card.innerText()),'the home page has the big wallet card: 1,250 points ≈ ¥1,250',(await card.innerText()).replace(/\n/g,' | '));
 const hrefs=await card.locator('a').evaluateAll(a=>a.map(x=>x.getAttribute('href'))); ok(hrefs.length===4&&hrefs.some(h=>h.endsWith('/wallet/topup'))&&hrefs.some(h=>h.endsWith('/wallet/send'))&&hrefs.some(h=>h.endsWith('/wallet/withdraw'))&&hrefs.some(h=>/\/wallet$/.test(h)),'four buttons go to top-up, send, withdraw, history',hrefs);
 await p.screenshot({path:SHOTS+'/wallet_home_phone.png'});
 await p.getByRole('button',{name:'Open menu'}).click(); await p.waitForSelector('#app-shell-menu'); const menuItem=p.locator('#app-shell-menu a',{hasText:'Rewards Wallet'}); ok(/1,250/.test(await menuItem.innerText()),'the menu shows "Rewards Wallet" with the balance',(await menuItem.innerText()).replace(/\n/g,' ')); await p.keyboard.press('Escape');
 await chip.click(); await p.waitForURL('**/dashboard/buyer/wallet'); ok(true,'tapping the pill opens the wallet');
 let wd=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,vw:innerWidth})); ok(wd.sw<=wd.vw+1,'no sideways overflow on the wallet page',wd);
 await p.goto(BASE+'/en/dashboard/buyer',{waitUntil:'networkidle'}); wd=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,vw:innerWidth})); ok(wd.sw<=wd.vw+1,'no sideways overflow on the home page',wd);
 console.log('\n== the public website header while signed in');
 await p.goto(BASE+'/en',{waitUntil:'networkidle'}); await p.waitForSelector('#mobile-nav-menu, button[aria-label="Open menu"]'); await sleep(800);
 ok(await p.locator('nav a[aria-label^="My wallet"]:visible').count()===0,'phone: the site header bar does not carry the pill (it left no room for the menu button)');
 { const bx=await p.getByRole('button',{name:/Open menu/}).first().boundingBox(); ok(bx&&bx.x>=0&&bx.x+bx.width<=375,'phone: the menu button is fully on the screen',bx); }
 await p.getByRole('button',{name:/Open menu/}).first().click(); const row=p.locator('#mobile-nav-menu a',{hasText:'My wallet'}); ok(await row.isVisible()&&/1,250 points/.test(await row.innerText()),'phone: the menu has a gold "My wallet — 1,250 points" row',(await row.innerText()).replace(/\n/g,' '));
 wd=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,vw:innerWidth})); ok(wd.sw<=wd.vw+1,'no sideways overflow on the home page of the website',wd); await p.screenshot({path:SHOTS+'/wallet_site_phone.png'}); await c.close();
 c=await mk(u.bT,{width:1500,height:900}); p=await c.newPage(); await p.goto(BASE+'/en',{waitUntil:'networkidle'}); const dc=p.locator('nav a[aria-label^="My wallet"]:visible').first(); await dc.waitFor({timeout:10000}); ok(await dc.isVisible()&&/1,250/.test(await dc.innerText()),'laptop: the site header shows the pill'); await p.screenshot({path:SHOTS+'/wallet_site_laptop.png',clip:{x:0,y:0,width:1500,height:90}}); await c.close();
 console.log('\n== laptop dashboard');
 c=await mk(u.bT,{width:1360,height:1000}); p=await c.newPage(); await p.goto(BASE+'/en/dashboard/buyer',{waitUntil:'networkidle'}); await p.waitForSelector('#home-wallet-title');
 const side=p.locator('aside a',{hasText:'Rewards Wallet'}); ok(/1,250/.test(await side.first().innerText()),'the side menu shows the balance next to "Rewards Wallet"');
 await p.screenshot({path:SHOTS+'/wallet_home_laptop.png'});
 sql(`UPDATE wallets SET frozen=1 WHERE user_id=${u.bId}`); await p.reload({waitUntil:'networkidle'}); await p.waitForSelector('#home-wallet-title'); ok(/frozen/i.test(await p.locator('main').innerText()),'a frozen wallet says so on the card'); sql(`UPDATE wallets SET frozen=0 WHERE user_id=${u.bId}`);
 await c.close();
 console.log('\n== other people, other languages');
 const n=await mkUsers('wn'); c=await mk(n.bT,{width:375,height:800}); p=await c.newPage(); await p.goto(BASE+'/en/dashboard/buyer',{waitUntil:'networkidle'}); await p.waitForSelector('#home-wallet-title'); const t0=await p.locator('#home-wallet-title').locator('xpath=ancestor::section[1]').innerText(); ok(/\b0\b/.test(t0)&&/points/.test(t0),'a new buyer sees 0 points, not a blank',t0.replace(/\n/g,' | ')); ok(sql(`SELECT COUNT(*) FROM wallets WHERE user_id=${n.bId}`)==='0','just signing in and looking does NOT create a wallet row (so the buyer can still be deleted)'); await c.close();
 c=await mk(u.aT,{width:1500,height:900}); p=await c.newPage(); await p.goto(BASE+'/en',{waitUntil:'networkidle'}); await sleep(1500); ok(await p.locator('nav a[aria-label^="My wallet"]:visible').count()===0,'an admin does not get a wallet pill'); await c.close();
 sql(`UPDATE users SET role='exhibitor' WHERE id=${n.bId}`); const nt=(await (await fetch(BASE+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json','x-forwarded-for':'10.7.7.7'},body:JSON.stringify({email:n.m.b,password:'pass1234'})})).headers.getSetCookie().join(';').match(/token=([^;]+)/)||[])[1];
 c=await mk(nt,{width:1500,height:900}); p=await c.newPage(); await p.goto(BASE+'/en',{waitUntil:'networkidle'}); await sleep(1500); ok(await p.locator('nav a[aria-label^="My wallet"]:visible').count()===0,'an exhibitor does not get one either'); await p.goto(BASE+'/en/dashboard/exhibitor',{waitUntil:'networkidle'}); ok(await p.locator('#home-wallet-title').count()===0,'and no wallet card on their dashboard'); await c.close(); sql(`UPDATE users SET role='buyer' WHERE id=${n.bId}`);
 for(const [loc,title,pts] of [['ru','Мой кошелёк бонусов','баллов'],['zh','我的奖励积分钱包','积分']]){ c=await mk(u.bT,{width:1360,height:1000}); p=await c.newPage(); await p.goto(`${BASE}/${loc}/dashboard/buyer`,{waitUntil:'networkidle'}); await p.waitForSelector('#home-wallet-title'); const tx=await p.locator('#home-wallet-title').locator('xpath=ancestor::section[1]').innerText(); ok(tx.includes(title)&&tx.includes(pts)&&!/wallet\./.test(tx),loc+': wallet card translated',tx.replace(/\n/g,' | '));
   await p.evaluate(axeSrc); const v=await p.evaluate(async()=>(await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(x=>x.id+':'+x.nodes.length)); ok(v.length===0,loc+': dashboard axe 0 violations',v); await c.close(); }
 c=await mk(u.bT,{width:1360,height:1000}); p=await c.newPage(); await p.goto(BASE+'/en/dashboard/buyer',{waitUntil:'networkidle'}); await p.waitForSelector('#home-wallet-title'); await p.evaluate(axeSrc); let v=await p.evaluate(async()=>(await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(x=>x.id+':'+x.nodes.length)); ok(v.length===0,'en: dashboard axe 0 violations (gold card contrast included)',v);
 await p.goto(BASE+'/en',{waitUntil:'networkidle'}); await p.locator('nav a[aria-label^="My wallet"]:visible').first().waitFor(); await p.evaluate(axeSrc); v=await p.evaluate(async()=>(await window.axe.run(document.querySelector('nav'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(x=>x.id+':'+x.nodes.length)); ok(v.length===0,'en: site header axe 0 violations',v); await c.close();
  console.log('\n== the menu buttons stay on the screen (big balance, every language, phone widths)');
 sql(`UPDATE wallets SET balance=12345678 WHERE user_id=${u.bId}`);
 { const wide=[]; for (const loc of ['en','ru','zh']) for (const pth of ['','/dashboard/buyer','/exhibitions']) for (const w of [320,360,375,390,414,700]) {
     const cc=await mk(u.bT,{width:w,height:800},true); const pp=await cc.newPage(); await pp.goto(BASE+'/'+loc+pth,{waitUntil:'networkidle'}); await sleep(700);
     const r=await pp.evaluate(()=>{const out=[]; for(const sel of ['button[aria-label*="menu" i]','nav a[aria-label^="My wallet"]','header a[aria-label^="My wallet"]']) for(const x of document.querySelectorAll(sel)){ const b=x.getBoundingClientRect(); if(b.width>0) out.push([sel.slice(0,20),Math.round(b.left),Math.round(b.right)]); } return {vw:innerWidth,out}; });
     for(const o of r.out) if(o[2]>r.vw+0.5||o[1]<-0.5) wide.push(`${loc}${pth||'/'}@${w}:${o.join(',')}`); await cc.close(); }
   ok(wide.length===0,'menu button and wallet pill are fully on the screen at 320-700px in en/ru/zh',wide.slice(0,6)); }
 sql(`UPDATE wallets SET balance=1250 WHERE user_id=${u.bId}`); // put it back: the ledger must still add up for the other tests
 await br.close();
 done();
})();
