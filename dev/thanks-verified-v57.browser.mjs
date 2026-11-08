// Offline receipt verification in real Chromium. No external API or payment calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {chromium} from 'playwright-core';
const origin='https://yasoyahonten.awaiaune.com';
const assets=new URL('../production/.generated/v53/',import.meta.url);
const proof={attemptId:'c0ffee00-aaaa-4bbb-8ccc-123456789abc',paymentId:'offline-p-123',orderReference:'offline-order-456'};
const success={...proof,ok:true,status:'COMPLETED',orderState:'stored'};
const url=origin+'/thanks.html?payment='+encodeURIComponent(proof.paymentId)+'&order='+encodeURIComponent(proof.orderReference);
let browser;
test.before(async()=>{browser=await chromium.launch({
 executablePath:process.env.YASOYA_CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath()),
 headless:true,args:['--no-sandbox','--disable-background-networking']
});});
test.after(async()=>browser?.close());
async function setup(t,{receipt,results=[{status:200,data:success}]}={}){
 const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 t.after(()=>ctx.close());
 if(receipt){
  await ctx.addInitScript(value=>{sessionStorage.setItem('yasoya_verified_checkout_v1',JSON.stringify(value));},{
   ...proof,createdAt:Date.now(),...receipt
  });
 }
 const calls={status:0,pay:0,other:[]};
 await ctx.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());
  if(u.origin!==origin)return route.abort();
  if(u.pathname==='/api/v1/payments/status'){
   assert.equal(req.method(),'POST');
   assert.deepEqual(JSON.parse(req.postData()),{contractVersion:1,attemptId:proof.attemptId});
   const reply=results[Math.min(calls.status++,results.length-1)];
   return route.fulfill({status:reply.status,contentType:'application/json',body:JSON.stringify(reply.data)});
  }
  if(u.pathname==='/api/v1/payments'||u.pathname==='/api/payments'){calls.pay++;return route.abort();}
  if(u.pathname==='/js/store-config.js')return route.fulfill({contentType:'application/javascript',body:'window.YASOYA_STORE_CONFIG={environment:"production",managedStorefront:true,workerBaseUrl:location.origin};'});
  if(!/^\/(?:thanks\.html|favicon\.png|(?:css|js)\/[a-zA-Z0-9_.-]+)$/.test(u.pathname)){calls.other.push(u.pathname);return route.abort();}
  try {
   const body=await readFile(new URL('.'+u.pathname,assets));
   const type=u.pathname.endsWith('.html')?'text/html':u.pathname.endsWith('.css')?'text/css':u.pathname.endsWith('.js')?'application/javascript':'image/png';
   return route.fulfill({status:200,contentType:type,body});
  }catch{return route.fulfill({status:404,body:'Not found'});}
 });
 return {page:await ctx.newPage(),calls};
}
test('direct link with query parameters is never a confirmed purchase',async t=>{
 const {page,calls}=await setup(t);
 await page.goto(url);
 assert.equal(await page.locator('#thankYouHeading').innerText(),'Order status.');
 assert.match(await page.locator('#orderVerificationMessage').innerText(),/この画面を開いただけでは/);
 assert.equal(await page.locator('#retryOrderStatus').isVisible(),false);
 assert.equal(calls.status,0);assert.equal(calls.pay,0);
});
test('matching tab receipt and backend completed order yield Thank you without recharging',async t=>{
 const {page,calls}=await setup(t,{receipt:{}});
 await page.goto(url);
 await page.waitForFunction(()=>document.getElementById('thankYouHeading').textContent==='Thank you.');
 assert.match(await page.locator('#orderVerificationMessage').innerText(),/ご注文の受付を確認しました/);
 assert.equal(await page.locator('#verifiedOrderReference').innerText(),proof.orderReference);
 assert.equal(calls.status,1);assert.equal(calls.pay,0);
 await page.reload();
 await page.waitForFunction(()=>document.getElementById('thankYouHeading').textContent==='Thank you.');
 assert.equal(calls.status,2);assert.equal(calls.pay,0);
});
test('altered or expired browser proof never grants completed status',async t=>{
 const {page,calls}=await setup(t,{receipt:{paymentId:'tampered-payment',createdAt:Date.now()-25*3600_000}});
 await page.goto(url);
 assert.equal(await page.locator('#thankYouHeading').innerText(),'Order status.');
 assert.equal(calls.status,0);assert.equal(calls.pay,0);
});
test('pending or temporarily unavailable verification offers retry, never pay again',async t=>{
 const {page,calls}=await setup(t,{
  receipt:{},results:[{status:202,data:{...proof,ok:false,phase:'unknown'}},{status:200,data:success}]
 });
 await page.goto(url);
 await page.locator('#retryOrderStatus').waitFor({state:'visible'});
 assert.equal(await page.locator('#thankYouHeading').innerText(),'Order status.');
 await page.locator('#retryOrderStatus').click();
 await page.waitForFunction(()=>document.getElementById('thankYouHeading').textContent==='Thank you.');
 assert.equal(calls.status,2);assert.equal(calls.pay,0);
});
test('mismatched server completion response does not show success',async t=>{
 const {page,calls}=await setup(t,{receipt:{},results:[{status:200,data:{...success,orderReference:'another-order'}}]});
 await page.goto(url);
 await page.waitForFunction(()=>document.getElementById('orderVerificationMessage').textContent.includes('一致しません'));
 assert.equal(await page.locator('#thankYouHeading').innerText(),'Order status.');
 assert.equal(await page.locator('#verifiedOrderReferenceRow').isVisible(),false);
 assert.equal(calls.status,1);assert.equal(calls.pay,0);
});
