// Real Chromium/checkout DOM; SDK, recipient check and payment API are mocks.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
const origin='https://staging.awaiaune.com',approved='test@example.invalid';
for(const initial of [approved,'other@example.invalid'])test('staging recipient preflight before 3DS: '+(initial===approved?'approved':'refused then corrected'),{timeout:30000},async t=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-background-networking']});t.after(()=>browser.close());
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});let payments=0,checks=0;
 await context.addInitScript(()=>localStorage.setItem('yasoya_honten_cart_v1',JSON.stringify([{id:'herb-10g',name:'試験',price:980,quantity:1}])));
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.origin==='https://sandbox.web.squarecdn.com')return route.fulfill({contentType:'application/javascript',body:`window.tokenCalls=0;window.Square={payments:()=>({card:async()=>({attach:async s=>{document.querySelector(s).append(document.createElement('iframe'));},tokenize:async()=>{window.activationAtTokenize=navigator.userActivation.isActive;window.tokenCalls++;return {status:'OK',token:'offline-not-a-real-card'};}})})};`});
  if(u.origin!==origin)return route.abort();
  if(u.pathname==='/js/store-config.js')return route.fulfill({contentType:'application/javascript',body:'window.YASOYA_STORE_CONFIG='+JSON.stringify({environment:'sandbox',stagingEmailPreflight:true,workerBaseUrl:origin,squareApplicationId:'sandbox-sq0idb-offline',squareLocationId:'SANDBOXLOCATION'})});
  if(u.pathname==='/api/v1/checkout-capabilities')return route.fulfill({json:{contractVersion:1,supportedContracts:[1],checkoutEnabled:true}});
  if(u.pathname==='/api/v1/quote')return route.fulfill({json:{subtotal:980,shipping:350,total:1330,items:[{id:'herb-10g',name:'試験',quantity:1,lineTotal:980}]}});
  if(u.pathname==='/api/v1/checkout-preflight'){checks++;const body=route.request().postDataJSON();return body.email===approved?route.fulfill({json:{ok:true,recipientAllowed:true}}):route.fulfill({status:400,json:{error:{code:'STAGING_RECIPIENT_NOT_ALLOWED',message:'許可メールを確認してください。'}}});}
  if(u.pathname==='/api/v1/payments/status')return route.fulfill({status:404,json:{error:{message:'not found'}}});
  if(u.pathname==='/api/v1/payment-diagnostics')return route.fulfill({json:{ok:true}});
  if(u.pathname==='/api/v1/payments'){payments++;assert.equal(route.request().postDataJSON().contact.email,approved);return route.fulfill({status:202,json:{ok:false,phase:'unknown'}});}
  try{const path=u.pathname==='/'?'/checkout.html':u.pathname;return route.fulfill({body:await readFile(new URL('../staging/.generated/site'+path,import.meta.url)),contentType:path.endsWith('.js')?'application/javascript; charset=utf-8':path.endsWith('.css')?'text/css':'text/html; charset=utf-8'});}catch{return route.fulfill({status:404});}
 });
 const page=await context.newPage();page.setDefaultTimeout(8000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/checkout.html');if(await page.locator('#checkoutNoticeClose').count())await page.locator('#checkoutNoticeClose').click();
 await page.waitForFunction(()=>document.getElementById('cardInitializationStatus').dataset.state==='ready');
 await page.evaluate(email=>{for(const [id,value] of Object.entries({givenName:'試験',familyName:'購入者',email,phone:'09012345678',address1:'架空1',city:'試験市',state:'東京都',postalCode:'1000001'}))document.getElementById(id).value=value;},initial);
 await page.locator('#paymentButton').click();await page.waitForFunction(()=>!document.getElementById('paymentButton').disabled);
 assert.equal(await page.evaluate(()=>window.tokenCalls),0);assert.equal(payments,0);assert.equal(checks,1);assert.equal(await page.evaluate(()=>localStorage.getItem('yasoya_checkout_attempt_v1')),null);
 if(initial!==approved){assert.match(await page.locator('#paymentStatus').textContent(),/HTTP 400/);await page.locator('#email').fill(approved);await page.locator('#email').press('Tab');}
 await page.waitForFunction(()=>document.getElementById('paymentButton').textContent==='PAY NOW');await page.locator('#paymentButton').click();
 await page.waitForFunction(()=>document.querySelector('#paymentStatus').textContent.includes('決済結果は未確定'));
 assert.equal(await page.evaluate(()=>window.activationAtTokenize),true);assert.equal(await page.evaluate(()=>window.tokenCalls),1);assert.equal(payments,1);assert.deepEqual(errors,[]);
 const attempt=await page.evaluate(()=>localStorage.getItem('yasoya_checkout_attempt_v1'));await page.reload();await page.waitForFunction(()=>document.getElementById('paymentStatus').textContent.includes('再決済せず'));
 assert.equal(payments,1);assert.equal(await page.evaluate(()=>localStorage.getItem('yasoya_checkout_attempt_v1')),attempt);
});
