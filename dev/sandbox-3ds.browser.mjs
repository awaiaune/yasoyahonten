// Offline Sandbox SDK/issuer substitutes. Chromium enforces the actual site CSP.
// No Square credentials, card numbers, real issuer traffic, or payment requests.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
const root=new URL('../',import.meta.url),origin='https://staging.awaiaune.com';
const square='https://pci-connect.squareupsandbox.com',issuer='https://bank-acs.example.test';
const policy=(await readFile(new URL('staging/worker.js',root),'utf8')).match(/h.set\('Content-Security-Policy',"([^"]+)"\)/)[1];
const productionPolicy=(await readFile(new URL('production/storefront-worker.js',root),'utf8')).match(/const csp="([^"]+)"/)[1];
const sandboxAssets=new URL('staging/.generated/site/',root);
async function setup(t,mode,{production=false}={}){
 const site=production?'https://yasoyahonten.awaiaune.com':origin;
 const pci=production?'https://pci-connect.squareup.com':square;
 const sdkHost=production?'https://web.squarecdn.com':'https://sandbox.web.squarecdn.com';
 const assets=production?new URL('production/.generated/v53/',root):sandboxAssets;
 const browser=await chromium.launch({executablePath:process.env.YASOYA_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-background-networking']});t.after(()=>browser.close());
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 await context.addInitScript(({site,mode})=>{
  if(location.origin!==site)return;
  if(location.pathname==='/checkout.html')localStorage.setItem('yasoya_honten_cart_v1',JSON.stringify([{id:'offline-herb',name:'試験商品',price:980,quantity:1}]));
  window.offlineViolations=[];
  document.addEventListener('securitypolicyviolation',e=>window.offlineViolations.push({directive:e.effectiveDirective,disposition:e.disposition}));
  if(['issuer-denied','timeout'].includes(mode)){const timer=window.setTimeout;window.setTimeout=(fn,ms,...args)=>timer(fn,ms===300000?1500:ms,...args);}
 },{site,mode});
 const calls=[],unexpected=[],errors=[];
 const sdk=`window.Square={payments:(app,location)=>({card:async()=>{let cardFrame,authFrame;return {
 attach:async selector=>{cardFrame=document.createElement('iframe');cardFrame.title='Offline Sandbox card';cardFrame.src=${JSON.stringify(pci+'/card')};document.querySelector(selector).append(cardFrame);await new Promise(r=>cardFrame.onload=r);},
 destroy:async()=>{window.offlineDestroyed=true;authFrame?.remove();cardFrame?.remove();},
 tokenize:async details=>{window.offlineVerification={amount:details.amount,currencyCode:details.currencyCode};window.offlineTokenizing=true;
  if(${JSON.stringify(mode)}==='spoofed')throw Object.assign(Error('PRIVATE_SDK_AUTH_DATA'),{code:'CARD_AUTH_CSP_BLOCKED'});
  if(${JSON.stringify(mode)}==='browser-blocked'){await fetch(${JSON.stringify(pci+'/auth-dispatch')});throw Error('PRIVATE_BROWSER_DETAIL');}
  if(${JSON.stringify(mode)}==='timeout')return new Promise(()=>{});
  return new Promise(resolve=>{
   const done=e=>{if(e.data?.type!=='offline-auth-ok')return;if(![${JSON.stringify(pci)},${JSON.stringify(issuer)}].includes(e.origin))return;window.removeEventListener('message',done);resolve({status:'OK',token:'offline-sandbox-3ds-token'});};window.addEventListener('message',done);
   if(['direct','late'].includes(${JSON.stringify(mode)})){authFrame=document.createElement('iframe');authFrame.title='Direct Sandbox issuer';authFrame.src=${JSON.stringify(issuer+'/challenge?authentication=PRIVATE_AUTH_DATA')};document.body.append(authFrame);if(${JSON.stringify(mode)}==='late')setTimeout(()=>{window.offlineLateResolved=true;resolve({status:'OK',token:'offline-late-token'});},250);}
   else cardFrame.contentWindow.postMessage({type:'offline-auth-start'},${JSON.stringify(pci)});
  });
 }
 };}})};`;
 const squareFrame=`<script>window.addEventListener('message',e=>{if(e.origin===${JSON.stringify(site)}&&e.data?.type==='offline-auth-start'){const frame=document.createElement('iframe');frame.title='Sandbox issuer challenge';frame.src=${JSON.stringify(issuer+'/challenge')};document.body.append(frame);}else if(e.origin===${JSON.stringify(issuer)}&&e.data?.type==='offline-auth-ok')parent.postMessage(e.data,${JSON.stringify(site)});});</script>`;
 const bank=`<meta charset="utf-8"><button id="approve">Sandbox本人認証を完了</button><script>document.getElementById('approve').onclick=()=>parent.postMessage({type:'offline-auth-ok'},'*');</script>`;
 await context.route('**/*',async route=>{
  const request=route.request(),u=new URL(request.url());
  if(u.origin===sdkHost)return route.fulfill({contentType:'application/javascript',body:sdk});
  if(u.origin===pci){
   if(u.pathname==='/auth-dispatch')return route.abort('blockedbyclient');
   return route.fulfill({contentType:'text/html',body:squareFrame,headers:{'Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; frame-src "+issuer}});
  }
  if(u.origin===issuer)return route.fulfill({contentType:'text/html',body:bank,headers:mode==='issuer-denied'?{'X-Frame-Options':'DENY'}:{}});
  if(u.origin!==site){if(!['fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname))unexpected.push(u.origin);return route.abort();}
  if(u.pathname.startsWith('/api/')){
   calls.push({path:u.pathname,method:request.method()});
   if(u.pathname==='/api/v1/checkout-capabilities')return route.fulfill({json:{contractVersion:1,supportedContracts:[1],checkoutEnabled:true}});
   if(u.pathname==='/api/v1/quote')return route.fulfill({json:{items:[{id:'offline-herb',name:'試験商品',quantity:1,lineTotal:980}],subtotal:980,shipping:350,total:1330}});
   if(u.pathname==='/api/inventory')return route.fulfill({json:{inventory:[{id:'offline-herb',availableQuantity:3}]}});
   if(u.pathname==='/api/v1/payments'){assert.equal(JSON.parse(request.postData()).sourceId,'offline-sandbox-3ds-token');return route.fulfill({status:202,json:{ok:false,phase:'unknown'}});}
   if(u.pathname==='/api/v1/payments/status')return route.fulfill({status:404,json:{error:{message:'未送信'}}});
   return route.fulfill({status:404,json:{}});
  }
  if(u.pathname==='/js/store-config.js')return route.fulfill({contentType:'application/javascript',body:'window.YASOYA_STORE_CONFIG='+JSON.stringify({environment:production?'production':'sandbox',managedStorefront:production,workerBaseUrl:site,squareApplicationId:production?'sq0idp-offline':'sandbox-sq0idb-offline',squareLocationId:production?'LQ693S4H2NBZ8':'OFFLINE_SANDBOX',currency:'JPY'})});
  try{const p=u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname;return route.fulfill({body:await readFile(new URL('.'+p,assets)),headers:{'Content-Type':p.endsWith('.html')?'text/html':p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':'image/jpeg',...(p.endsWith('.html')?{'Content-Security-Policy':production?productionPolicy:policy}:{})}});}catch{return route.fulfill({status:404,body:'missing local asset'});}
 });
 const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(site+'/checkout.html');await page.waitForFunction(()=>document.getElementById('cardInitializationStatus')?.dataset.state==='ready');
 for(const [id,value]of Object.entries({familyName:'試験',givenName:'購入者',email:'buyer@example.invalid',phone:'09012345678',postalCode:'1000001',city:'試験市',address1:'架空住所1'}))await page.locator('#'+id).fill(value);
 const state=page.locator('#state');if(await state.evaluate(e=>e.tagName==='SELECT'))await state.selectOption({label:'東京都'});else await state.fill('東京都');
 return {page,calls,unexpected,errors};
}
function paymentCount(f){return f.calls.filter(c=>c.path==='/api/v1/payments').length;}
for(const production of [false,true])test(`${production?'Production-shaped':'Sandbox'} direct issuer frame is blocked by existing CSP before payment API`,{timeout:30000},async t=>{
 const f=await setup(t,'direct',{production});await f.page.locator('#paymentButton').click();
 await f.page.waitForFunction(()=>document.getElementById('paymentStatus')?.textContent.includes('CARD_AUTH_CSP_BLOCKED'));
 const text=await f.page.locator('#paymentStatus').innerText();assert.match(text,/frame-src/);assert.match(text,/送信していません/);assert(!text.includes('PRIVATE_'));assert(!text.includes('bank-acs'));
 assert.equal(paymentCount(f),0);assert(await f.page.locator('#paymentButton').isDisabled());
 assert.equal(await f.page.evaluate(()=>JSON.parse(localStorage.getItem('yasoya_checkout_attempt_meta_v1')).state),'prepared');
 assert.deepEqual(f.errors,[]);assert.deepEqual(f.unexpected,[]);
});
for(const reportOnly of [false,true])test(`Sandbox nested issuer authentication completes before one payment request${reportOnly?' and report-only events do not abort it':''}`,{timeout:30000},async t=>{
 const f=await setup(t,'nested');await f.page.locator('#paymentButton').click();
 const approve=f.page.frameLocator('#card-container iframe').frameLocator('iframe').getByRole('button',{name:'Sandbox本人認証を完了'});await approve.waitFor({state:'visible'});
 assert.equal(paymentCount(f),0);assert.deepEqual(await f.page.evaluate(()=>window.offlineVerification),{amount:'1330',currencyCode:'JPY'});
 if(reportOnly)await f.page.evaluate(()=>document.dispatchEvent(new SecurityPolicyViolationEvent('securitypolicyviolation',{effectiveDirective:'frame-src',disposition:'report',blockedURI:'https://example.test/PRIVATE_AUTH'})));
 await approve.click();await f.page.waitForFunction(()=>document.getElementById('paymentStatus')?.textContent.includes('処理状況'));
 assert.equal(paymentCount(f),1);assert.equal(await f.page.evaluate(()=>JSON.parse(localStorage.getItem('yasoya_checkout_attempt_meta_v1')).state),'submitted');
 assert.deepEqual(f.errors,[]);assert.deepEqual(f.unexpected,[]);
});
for(const mode of ['browser-blocked','issuer-denied','timeout','spoofed'])test(`Sandbox ${mode} remains unconfirmed without falsely blaming site CSP or sending a payment`,{timeout:30000},async t=>{
 const f=await setup(t,mode);await f.page.locator('#paymentButton').click();
 await f.page.waitForFunction(()=>/CARD_AUTH_(?:UNCONFIRMED|TIMEOUT)/.test(document.getElementById('paymentStatus')?.textContent));
 const text=await f.page.locator('#paymentStatus').innerText();assert.match(text,/未確認|確認できません/);assert(!text.includes('CARD_AUTH_CSP_BLOCKED'));assert(!text.includes('PRIVATE_'));
 assert.equal(paymentCount(f),0);assert(await f.page.locator('#paymentButton').isDisabled());assert.deepEqual(f.errors,[]);assert.deepEqual(f.unexpected,[]);
});
test('a late token after enforced CSP cancellation never submits a payment or replaces the attempt', {timeout:30000},async t=>{
 const f=await setup(t,'late');await f.page.locator('#paymentButton').click();
 await f.page.waitForFunction(()=>document.getElementById('paymentStatus')?.textContent.includes('CARD_AUTH_CSP_BLOCKED'));
 const id=await f.page.evaluate(()=>localStorage.getItem('yasoya_checkout_attempt_v1'));
 await f.page.waitForFunction(()=>window.offlineLateResolved===true);
 assert.equal(paymentCount(f),0);assert.equal(await f.page.evaluate(()=>localStorage.getItem('yasoya_checkout_attempt_v1')),id);
 assert.equal(await f.page.evaluate(()=>JSON.parse(localStorage.getItem('yasoya_checkout_attempt_meta_v1')).state),'prepared');assert.deepEqual(f.errors,[]);
});
