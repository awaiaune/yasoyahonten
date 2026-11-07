// Chromium mobile checks using packaged assets and offline API substitutes.
// No external site, SDK, customer, payment or mail requests are made.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
const assets=new URL('../production/.generated/v53/',import.meta.url),site='https://yasoyahonten.awaiaune.com';
for(const width of [360,390])test('live V56 transaction layout and retired cart at '+width+'px',async t=>{
 const browser=await chromium.launch({executablePath:process.env.YASOYA_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-background-networking']});t.after(()=>browser.close());
 const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 await context.addInitScript(()=>{localStorage.setItem('yasoya_honten_cart_v1',JSON.stringify([{id:'goldenrod-leaf-10g',name:'販売終了',price:980,quantity:1},{id:'yomogi-10g',name:'ヨモギ',price:980,quantity:1}]));});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.name+':'+e.message));
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());if(u.origin!==site)return route.fulfill({status:200,body:''});
  if(u.pathname==='/js/store-config.js')return route.fulfill({contentType:'text/javascript',body:'window.YASOYA_RETIRED_VARIANT_IDS=["goldenrod-leaf-10g","goldenrod-leaf-stem-20g"];window.YASOYA_STORE_CONFIG={environment:"production",workerBaseUrl:location.origin,currency:"JPY"};'});
  // Full authenticated SDK/checkout interactions are covered in the paired
  // production-auth / checkout-on suites. This test isolates retained layout.
  if(u.pathname==='/js/checkout-v1.js')return route.fulfill({contentType:'text/javascript',body:''});
  if(u.pathname.startsWith('/api/'))return route.fulfill({status:503,contentType:'application/json',body:'{}'});
  try{const base=u.searchParams.has('liveReference')?new URL('../production/site/',import.meta.url):assets;const body=await readFile(new URL(u.pathname.slice(1),base));return route.fulfill({body,contentType:u.pathname.endsWith('.css')?'text/css':u.pathname.endsWith('.js')?'text/javascript':u.pathname.endsWith('.html')?'text/html':undefined});}catch{return route.fulfill({status:404,body:''});}
 });
 const selectors=['#paymentButton','#checkPaymentStatus','#refreshCheckout'];
 await page.goto(site+'/checkout.html?liveReference=1');await page.waitForFunction(()=>!!window.YasoyaCart);
 const baseline=new Map();for(const selector of selectors)baseline.set(selector,await page.locator(selector).boundingBox());
 await page.goto(site+'/checkout.html');await page.waitForFunction(()=>!!window.YasoyaCart);
 assert.equal(await page.locator('body.v56-transaction').count(),1);assert.equal(await page.locator('#checkoutNotice').count(),0);
 for(const selector of selectors){
  const box=await page.locator(selector).boundingBox();assert(box&&box.height>0,selector);assert.deepEqual(box,baseline.get(selector),'preserve existing live geometry: '+selector);assert(box.x>=-1&&box.x+box.width<=width+1,selector);
  if(selector==='#paymentButton')assert(box.height>=58,'retain existing large PAY NOW target');
 }
 assert.deepEqual(await page.evaluate(()=>window.YasoyaCart.read().map(i=>i.id)),['yomogi-10g']);
 assert(await page.evaluate(()=>{try{window.YasoyaCart.add({id:'goldenrod-leaf-stem-20g',name:'販売終了',price:980,quantity:1});return false;}catch{return true;}}));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 await mkdir(new URL('.state/live-design/',import.meta.url),{recursive:true});await page.screenshot({path:new URL('.state/live-design/checkout-'+width+'.png',import.meta.url).pathname,fullPage:true});
 await page.goto(site+'/thanks.html');await page.waitForFunction(()=>document.querySelector('#orderVerificationMessage').textContent!=='注文状況を確認しています…');
 assert.equal(await page.locator('body.v56-thanks').count(),1);assert.notEqual(await page.locator('#thankYouHeading').innerText(),'THANK YOU');
 const link=await page.locator('.v56-thanks-return').boundingBox();assert(link&&link.height>0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);assert.deepEqual(errors,[]);
 await page.screenshot({path:new URL('.state/live-design/thanks-'+width+'.png',import.meta.url).pathname,fullPage:true});
});
