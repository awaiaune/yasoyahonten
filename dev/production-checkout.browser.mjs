// All SDK, iframe and API responses are offline substitutes. No card/payment leaves this process.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
const origin='https://yasoyahonten.awaiaune.com',sdkOrigin='https://web.squarecdn.com';
const csp=(await readFile(new URL('../production/storefront-worker.js',import.meta.url),'utf8')).match(/const csp="([^"]+)"/)[1];
const sdk=mode=>`window.Square={payments:(app,location)=>{window.offlineArgs=[app,location];${mode==='payments-fail'?"throw Object.assign(Error('private SDK detail'),{code:422});":''}return {card:async()=>{${mode==='card-fail'?"throw Error('private SDK detail');":''}return {destroy:async()=>{window.offlineDestroyed=true;},attach:async selector=>{window.offlineAttach=selector;${mode==='attach-fail'?"throw Error('private SDK detail');":''}${mode==='timeout'||mode==='csp'?"if('"+mode+"'==='timeout')return new Promise(()=>{});":''}${mode==='empty'?"return;":''}const iframe=document.createElement('iframe');iframe.title='Production-shaped offline card';iframe.src='https://pci-connect.squareup.com/offline-card';document.querySelector(selector).append(iframe);${mode==='csp'?"return new Promise(()=>{});":"await new Promise(resolve=>iframe.onload=resolve);"}},tokenize:async()=>{throw Error('Test must not tokenize');}};}}}};const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='${sdkOrigin}/offline-card.css';sheet.onload=()=>window.offlineCssLoaded=true;document.head.append(sheet);`;
for(const [mode,expected] of [['ready',null],['sdk-blocked','CARD_SDK_LOAD_FAILED'],['payments-fail','決済クライアント初期化'],['card-fail','カードフォーム生成'],['attach-fail','カードフォーム表示'],['timeout','CARD_INIT_TIMEOUT'],['empty','CARD_FORM_EMPTY'],['csp','CARD_CSP_BLOCKED'],['config','CARD_PRODUCTION_CONFIG'],['quote-fail','HTTP 409']]){
 test('production checkout '+mode+' shows form or a bounded inline failure',{timeout:15000},async t=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-background-networking']});t.after(()=>browser.close());
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,serviceWorkers:'block'});
  await context.addInitScript(mode=>{if(location.origin!=='https://yasoyahonten.awaiaune.com')return;localStorage.setItem('yasoya_honten_cart_v1',JSON.stringify([{id:'offline-herb',name:'試験商品',quantity:1,price:980}]));const original=setTimeout;window.setTimeout=(fn,ms,...args)=>original(fn,ms===12000&&['timeout','csp'].includes(mode)?1000:ms,...args);},mode);
  let payments=0,sandboxRequests=0;const errors=[];
  await context.route('**/*',async route=>{
   const u=new URL(route.request().url());if(u.hostname==='connect.squareupsandbox.com'||u.hostname==='sandbox.web.squarecdn.com'){sandboxRequests++;return route.abort();}
   if(u.origin===sdkOrigin){if(u.pathname==='/v1/square.js')return mode==='sdk-blocked'?route.abort():route.fulfill({contentType:'application/javascript',body:sdk(mode)});return route.fulfill({contentType:'text/css',body:'iframe{min-height:110px}'});}
   if(u.hostname==='pci-connect.squareup.com')return route.fulfill({contentType:'text/html',body:'<meta charset="utf-8"><label>カード番号<input></label><label>有効期限<input></label><label>CVV<input></label>'});
   if(u.origin!==origin)return route.abort();
   if(u.pathname==='/js/store-config.js')return route.fulfill({contentType:'application/javascript',body:'window.YASOYA_STORE_CONFIG='+JSON.stringify({environment:'production',managedStorefront:true,workerBaseUrl:origin,squareApplicationId:mode==='config'?'sandbox-sq0idb-forbidden':'sq0idp-offline',squareLocationId:'LQ693S4H2NBZ8'})});
   if(u.pathname==='/api/v1/checkout-capabilities')return route.fulfill({json:{contractVersion:1,supportedContracts:[1],checkoutEnabled:true}});
   if(u.pathname==='/api/v1/quote')return mode==='quote-fail'?route.fulfill({status:409,json:{error:{message:'在庫確認が必要です。'}}}):route.fulfill({json:{items:[{id:'offline-herb',name:'試験商品',quantity:1,lineTotal:980}],subtotal:980,shipping:350,total:1330}});
   if(u.pathname==='/api/v1/payments'){payments++;return route.abort();}
   const path=u.pathname==='/'?'/checkout.html':u.pathname;
   try{const body=await readFile(new URL('../production/.generated/v53'+path,import.meta.url));return route.fulfill({body,headers:{'Content-Type':path.endsWith('.js')?'application/javascript':path.endsWith('.css')?'text/css':'text/html',...(path.endsWith('.html')?{'Content-Security-Policy':mode==='csp'?csp.replaceAll('https://*.squareup.com',''):csp}:{})}});}catch{return route.fulfill({status:404,body:'missing'});}
  });
  const page=await context.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/checkout.html');if(await page.locator('#checkoutNoticeClose').count())await page.locator('#checkoutNoticeClose').click();
  if(mode==='ready'){
   await page.waitForFunction(()=>document.getElementById('cardInitializationStatus').dataset.state==='ready');
   assert.deepEqual(await page.evaluate(()=>window.offlineArgs),['sq0idp-offline','LQ693S4H2NBZ8']);assert.equal(await page.evaluate(()=>window.offlineAttach),'#card-container');
   await page.frameLocator('#card-container iframe').getByLabel('カード番号',{exact:true}).waitFor({state:'visible'});assert(await page.locator('#paymentButton').isEnabled());await page.waitForFunction(()=>window.offlineCssLoaded===true);
  }else{
   await page.waitForFunction(()=>document.getElementById('cardInitializationStatus').dataset.state==='error');const text=await page.locator('#cardInitializationStatus').textContent();assert(text.includes(expected),text);assert(!text.includes('private SDK detail'));assert(await page.locator('#paymentButton').isDisabled());
  }
  assert.equal(payments,0);assert.equal(sandboxRequests,0);assert.deepEqual(errors,[]);
 });
}
