const fs=require('fs'); const { BASE, sql, ok, done, mkUsers, login, PNG } = require('./helpers/common.js'); const SHOTS=require('./helpers/common.js').SHOTS;
const sharp=require('sharp');
const { chromium } = require('playwright');
const axeSrc=require('./helpers/browser.js').axeSource;
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const PDF='data:application/pdf;base64,'+Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF').toString('base64');
(async()=>{
 const u=await mkUsers('shr'); const H=(t)=>({'Content-Type':'application/json',cookie:'token='+t});
 const put=(t,d,v)=>fetch(BASE+'/api/buyer-profile/documents/'+d,{method:'PUT',headers:H(t),body:JSON.stringify({value:v})});
 // a big noisy phone-like photo with an EXIF rotation
 const raw=Buffer.alloc(3000*2000*3); for(let i=0;i<raw.length;i++) raw[i]=(Math.random()*256)|0;
 const bigJpg=await sharp(raw,{raw:{width:3000,height:2000,channels:3}}).jpeg({quality:92}).withMetadata({orientation:6}).toBuffer();
 console.log('input photo MB',(bigJpg.length/1e6).toFixed(1));
 console.log('\n== shrinking on upload');
 let r=await put(u.bT,'passportFront','data:image/jpeg;base64,'+bigJpg.toString('base64')); ok(r.status===200,'a big photo uploads',r.status);
 r=await fetch(BASE+'/api/buyer-profile/documents/passportFront',{headers:{cookie:'token='+u.bT}}); const buf=Buffer.from(await r.arrayBuffer()); const meta=await sharp(buf).metadata();
 ok(/image\/jpeg/.test(r.headers.get('content-type')),'served as JPEG'); ok(Math.max(meta.width,meta.height)<=1600,'longest side at most 1600 px',[meta.width,meta.height]);
 ok(meta.width<meta.height,'turned upright (EXIF rotation applied: 3000x2000 became portrait)',[meta.width,meta.height]); ok(!meta.exif,'camera data (EXIF/GPS) removed');
 ok(buf.length<bigJpg.length/2,'much smaller than the original',[(buf.length/1e6).toFixed(2)+' MB']);
 const stored=Number(sql(`SELECT LENGTH(doc_passport_front) FROM buyer_profiles WHERE user_id=${u.bId}`)); ok(stored<bigJpg.length*0.7,'and the database holds the small one',stored);
 // small png stays as is
 r=await put(u.bT,'visaPage',PNG); ok(r.status===200,'a tiny PNG uploads'); r=await fetch(BASE+'/api/buyer-profile/documents/visaPage',{headers:{cookie:'token='+u.bT}}); ok(/image\/png/.test(r.headers.get('content-type')),'and is left as PNG when shrinking would not help');
 // transparent png flatten
 const tp=await sharp({create:{width:2400,height:1800,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).png().toBuffer();
 r=await put(u.bT,'businessCard','data:image/png;base64,'+tp.toString('base64')); ok(r.status===200,'a large transparent PNG uploads'); r=await fetch(BASE+'/api/buyer-profile/documents/businessCard',{headers:{cookie:'token='+u.bT}}); const tb=Buffer.from(await r.arrayBuffer()); const px=await sharp(tb).raw().toBuffer({resolveWithObject:true}); ok(px.data[0]>240&&px.data[1]>240&&px.data[2]>240,'transparent areas turn white, not black',Array.from(px.data.slice(0,3)));
 console.log('\n== bad files');
 r=await put(u.bT,'buyerPhoto','data:image/jpeg;base64,'+Buffer.from('this is not a picture at all, just text').toString('base64')); let j=await r.json(); ok(r.status===400&&j.code==='invalid_file','a fake picture is refused with a clear message',[r.status,j]);
 r=await put(u.bT,'buyerPhoto','data:application/pdf;base64,'+Buffer.from('<html><script>alert(1)</script></html>').toString('base64')); j=await r.json(); ok(r.status===400&&j.code==='invalid_file','HTML pretending to be a PDF is refused',[r.status,j]);
 ok(Number(sql(`SELECT COUNT(*) FROM buyer_profiles WHERE user_id=${u.bId} AND (doc_buyer_photo IS NOT NULL AND doc_buyer_photo<>'')`))===0,'nothing was stored for the refused files');
 console.log('\n== PDF');
 r=await put(u.bT,'businessLicense',PDF); ok(r.status===200,'a PDF uploads');
 r=await fetch(BASE+'/api/buyer-profile/documents/businessLicense',{headers:{cookie:'token='+u.bT}}); ok(r.status===200&&/application\/pdf/.test(r.headers.get('content-type'))&&r.headers.get('x-content-type-options')==='nosniff','the buyer can open their PDF (served as a PDF, no sniffing)',[r.status,r.headers.get('content-type')]);
 r=await fetch(BASE+`/api/admin/buyer-profiles/${u.bId}/documents/businessLicense`,{headers:{cookie:'token='+u.aT}}); ok(r.status===200&&/application\/pdf/.test(r.headers.get('content-type')),'the admin can open it');
 r=await fetch(BASE+`/api/admin/buyer-profiles/${u.bId}/documents/businessLicense?thumb=1`,{headers:{cookie:'token='+u.aT}}); ok(r.status===204,'a thumbnail request for a PDF answers "no picture" (204)',r.status);
 r=await fetch(BASE+`/api/admin/buyer-profiles/${u.bId}/documents/passportFront?thumb=1`,{headers:{cookie:'token='+u.aT}}); const tb2=Buffer.from(await r.arrayBuffer()); const tm=await sharp(tb2).metadata(); ok(r.status===200&&Math.max(tm.width,tm.height)<=240&&tb2.length<20000,'the admin list thumbnail is small',[tm.width,tm.height,tb2.length]);
 r=await fetch(BASE+`/api/admin/buyer-profiles/${u.bId}/documents/passportFront`,{headers:{cookie:'token='+u.bT}}); ok(r.status===401,'a buyer cannot use the admin document route');
 r=await fetch(BASE+'/api/buyer-profile/documents/passportFront'); ok(r.status===401,'signed-out gets 401');
 console.log('\n== old big files: the shrink button');
 const rawBig='data:image/jpeg;base64,'+(await sharp(raw,{raw:{width:3000,height:2000,channels:3}}).jpeg({quality:90}).toBuffer()).toString('base64');
 sql(`UPDATE buyer_profiles SET doc_business_card=NULL WHERE user_id=${u.bId}`);
  { const c=await require('./helpers/common.js').connect(); await c.query("UPDATE buyer_profiles SET doc_buyer_photo=?, doc_buyer_photo_status='rejected', doc_buyer_photo_note='blurry' WHERE user_id=?",[rawBig,u.bId]); await c.end(); }
 let len=Number(sql(`SELECT COALESCE(LENGTH(doc_buyer_photo),0) FROM buyer_profiles WHERE user_id=${u.bId}`));
 ok(len>5000000,'an old big photo is in the database',len);
 let st=await (await fetch(BASE+'/api/admin/buyer-form/storage',{headers:H(u.aT)})).json(); ok(st.largeFiles>=1&&st.files>=1,'storage numbers report it',st);
 r=await fetch(BASE+'/api/admin/buyer-form/storage',{headers:H(u.bT)}); ok(r.status===401,'buyers cannot read storage numbers'); r=await fetch(BASE+'/api/admin/buyer-form/storage',{method:'POST',headers:H(u.bT),body:'{}'}); ok(r.status===401,'buyers cannot run the shrink');
 let cursor, total={shrunk:0,saved:0}, loops=0; do { const rr=await (await fetch(BASE+'/api/admin/buyer-form/storage',{method:'POST',headers:H(u.aT),body:JSON.stringify({cursor})})).json(); total.shrunk+=rr.shrunk; total.saved+=rr.savedBytes; cursor=rr.cursor; loops++; if(rr.done) break; } while(loops<500);
 ok(total.shrunk>=1,'the run shrank old photos',total); const after=Number(sql(`SELECT LENGTH(doc_buyer_photo) FROM buyer_profiles WHERE user_id=${u.bId}`)); ok(after<len*0.5,'the old photo is now small',[len,after]);
 ok(sql(`SELECT doc_buyer_photo_status,doc_buyer_photo_note FROM buyer_profiles WHERE user_id=${u.bId}`)==='rejected\tblurry','its review status and note were not touched');
 st=await (await fetch(BASE+'/api/admin/buyer-form/storage',{headers:H(u.aT)})).json(); ok(st.largeFiles===0||st.largeBytes<len,'nothing large left over from this buyer',st);
 console.log('\n== screens');
 const br=await require('./helpers/browser.js').launch(); const mk=async(t,vp={width:1360,height:1000})=>{const c=await br.newContext({viewport:vp}); await c.addCookies([{name:'token',value:t,url:BASE}]); return c;};
 let c=await mk(u.bT,{width:375,height:800}); let p=await c.newPage(); await p.goto(BASE+'/en/dashboard/buyer/profile',{waitUntil:'networkidle'}); await sleep(600);
 const pdfTile=p.getByRole('button',{name:/Tap to enlarge Business License/}); ok((await pdfTile.innerText()).includes('PDF file')&&(await pdfTile.innerText()).includes('Open'),'buyer profile: a PDF shows a "PDF file" tile, not a broken picture',await pdfTile.innerText());
 await pdfTile.scrollIntoViewIfNeeded(); await p.screenshot({path:SHOTS+'/shr_profile.png'});
 await pdfTile.click(); await p.getByRole('dialog').waitFor(); const openLink=p.getByRole('dialog').getByRole('link',{name:'Open the file'}); await openLink.waitFor({timeout:15000}).catch(()=>{}); ok(await openLink.count()===1&&/businessLicense/.test(await openLink.getAttribute('href')),'the viewer offers "Open the file"');
 const [pop]=await Promise.all([c.waitForEvent('page'),openLink.click()]); await pop.waitForURL(/businessLicense/,{timeout:8000}).catch(()=>{}); ok(/businessLicense/.test(pop.url())||pop.url()===''||pop.url()==='about:blank','it opens in a new tab (the PDF itself may be handed to the browser as a download)',pop.url()); await pop.close().catch(()=>{});
 ok(await p.getByRole('button',{name:/Tap to enlarge Passport Front Page/}).locator('img').count()===1,'a photo still shows as a picture');
 let vio=await (async()=>{await p.evaluate(axeSrc); return p.evaluate(async()=>(await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(x=>x.id+':'+x.nodes.length));})(); ok(vio.length===0,'axe 0 on the profile with a PDF tile',vio); await c.close();
 c=await mk(u.aT); p=await c.newPage(); await p.goto(BASE+'/en/admin/buyer-profiles',{waitUntil:'networkidle'}); await p.getByPlaceholder(/Search by registration no/).fill(u.m.b); await sleep(1200);
 const rowImgs=await p.locator('tbody tr').first().locator('img').evaluateAll(a=>a.map(i=>i.getAttribute('src'))); ok(rowImgs.length>=1&&rowImgs.every(s=>/thumb=1/.test(s)),'the list uses small thumbnails',rowImgs);
 await p.locator('tbody tr').first().locator('td').last().scrollIntoViewIfNeeded(); for(let i=0;i<8;i++){ await p.locator('tbody tr').first().locator('img').last().scrollIntoViewIfNeeded().catch(()=>{}); await sleep(300);} ok((await p.locator('tbody tr').first().innerText()).includes('PDF file'),'the list shows a PDF tile for the PDF'); await p.screenshot({path:SHOTS+'/shr_list.png'});
 await p.goto(BASE+'/en/admin/buyer-form',{waitUntil:'networkidle'}); await p.getByText('Photo storage').waitFor(); ok((await p.locator('main, body').first().innerText()).includes('documents are stored'),'Buyer form settings has a Photo storage card'); await p.screenshot({path:SHOTS+'/shr_storage.png',fullPage:true});
 vio=await (async()=>{await p.evaluate(axeSrc); return p.evaluate(async()=>(await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(x=>x.id+':'+x.nodes.length));})(); ok(vio.length===0,'axe 0 on Buyer form settings',vio); await c.close();
 for(const loc of ['ru','zh']){ c=await mk(u.aT); p=await c.newPage(); await p.goto(`${BASE}/${loc}/admin/buyer-form`,{waitUntil:'networkidle'}); const tx=await p.locator('body').innerText(); ok(!/adminBuyerForm\.storage|viewer\./.test(tx)&&(loc==='ru'?tx.includes('Хранение фото'):tx.includes('照片存储')),loc+': storage card translated'); await c.close(); }
 await br.close(); done();
})();
