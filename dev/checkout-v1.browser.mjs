// Actual checkout DOM + fake Square SDK + local production-shaped backend. No external network.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {fixture,baseEnv} from './production-fixture.mjs';
import {root} from './server.mjs';
async function browser(t,patch={}){
 const f=await fixture(t,{PRODUCTION_PURCHASE_PROTOCOL:'durable-v1',PRODUCTION_MANAGEMENT_READ_ENABLED:'1',...patch});
 const b=await chromium.launch({executablePath:process.env.YASOYA_CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath()),headless:true,args:['--no-sandbox','--disable-background-networking']});t.after(()=>b.close());
 const context=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});let tokens=0;await context.exposeBinding('offlineTokenized',()=>tokens++);
 await context.addInitScript(()=>{if(location.pathname==='/checkout.html'&&!localStorage.getItem('yasoya_honten_cart_v1'))localStorage.setItem('yasoya_honten_cart_v1',JSON.stringify([{id:'lemonbalm-10g',name:'架空試験商品',price:980,quantity:1}]));window.Square={payments:()=>({card:async()=>({attach:async()=>{},tokenize:async()=>{await window.offlineTokenized();return {status:'OK',token:'offline-browser-card'};}})})};});
 const errors=[];await context.route('**/*',async route=>{const r=route.request(),u=new URL(r.url());
  if(u.origin==='https://yasoya-honten-payments.tatsurou3523.workers.dev'){
   const data=r.postDataBuffer(),response=await f.mf.dispatchFetch(r.url(),{method:r.method(),headers:r.headers(),...(data?{body:data}:{})});return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
  }
  if(u.origin===baseEnv.SITE_URL){
   if(u.pathname==='/js/store-config.js')return route.fulfill({contentType:'application/javascript',body:'window.YASOYA_STORE_CONFIG='+JSON.stringify({environment:'production',workerBaseUrl:'https://yasoya-honten-payments.tatsurou3523.workers.dev',squareApplicationId:'offline',squareLocationId:baseEnv.SQUARE_LOCATION_ID})});
   const p=u.pathname==='/'?'/index.html':u.pathname;if(!/^\/(?:[a-z0-9-]+\.html|(?:js|css|images)\/[a-z0-9./_-]+)$/i.test(p)||p.includes('..'))return route.abort();
   try{return route.fulfill({contentType:p.endsWith('.html')?'text/html':p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':'image/jpeg',body:await readFile(root+p)});}catch{return route.fulfill({status:404,body:'missing offline asset'});}
  }
  if(u.hostname==='web.squarecdn.com')return route.fulfill({contentType:'application/javascript',body:'/* offline Square SDK substitute installed before page scripts */'});
  // Fonts and non-business static services are blocked too.
  return route.abort();
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(baseEnv.SITE_URL+'/checkout.html');await page.locator('#checkoutNoticeClose').click();
 return {...f,page,errors,tokens:()=>tokens};
}
async function fill(page){for(const [id,value] of Object.entries({familyName:'試験',givenName:'太郎',email:'buyer@example.invalid',phone:'09012345678',postalCode:'1000001',city:'テスト市',address1:'架空住所1'}))await page.locator('#'+id).fill(value);const state=page.locator('#state');if(await state.evaluate(e=>e.tagName==='SELECT'))await state.selectOption({label:'東京都'});else await state.fill('東京都');}
test('mobile checkout maintenance page disables payment and shows refresh without invoking Square',async t=>{
 const f=await browser(t,{PRODUCTION_CHECKOUT_ENABLED:'0'});await f.page.waitForFunction(()=>document.getElementById('paymentStatus').textContent.includes('一時停止'));assert(await f.page.locator('#paymentButton').isDisabled());assert(await f.page.locator('#refreshCheckout').isVisible());assert.equal(f.tokens(),0);assert.equal(f.fake.payments.size,0);assert.deepEqual(f.errors,[]);
});
test('mobile new checkout contract completes once on double submit and preserves actual page URLs',async t=>{
 const f=await browser(t);await f.page.locator('#paymentButton').waitFor({state:'visible'});await f.page.waitForFunction(()=>!document.getElementById('paymentButton').disabled);await fill(f.page);
 await f.page.evaluate(()=>{document.getElementById('paymentForm').requestSubmit();document.getElementById('paymentForm').requestSubmit();});await f.page.waitForURL('**/thanks.html?*');assert.equal(f.tokens(),1);assert.equal(f.fake.payments.size,1);assert.deepEqual(f.errors,[]);
});
test('mobile pending checkout survives reload and confirms the original order without tokenizing again',async t=>{
 const f=await browser(t);f.fake.loseAfter='/v2/payments';f.fake.lookupFails=true;await f.page.waitForFunction(()=>!document.getElementById('paymentButton').disabled);await fill(f.page);await f.page.locator('#paymentButton').click();await f.page.waitForFunction(()=>document.getElementById('paymentStatus').textContent.includes('処理状況'));
 const id=await f.page.evaluate(()=>localStorage.getItem('yasoya_checkout_attempt_v1'));assert(id);assert.equal(f.tokens(),1);await f.page.reload();await f.page.locator('#checkoutNoticeClose').click();await f.page.locator('#checkPaymentStatus').waitFor({state:'visible'});assert(await f.page.locator('#paymentButton').isDisabled());
 f.fake.lookupFails=false;await f.api('/api/admin/payment-attempts/'+id+'/recover','POST',{});await f.page.locator('#checkPaymentStatus').click();await f.page.waitForURL('**/thanks.html?*');assert.equal(f.tokens(),1);assert.equal(f.fake.payments.size,1);assert.deepEqual(f.errors,[]);
});
