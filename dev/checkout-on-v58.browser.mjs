// Real product renderer + actual cart/checkout/receipt JS + isolated Worker/DO/D1.
// Production SDK/PCI, Square and Resend are local substitutes. No live requests.
import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';import {build} from 'esbuild';import {chromium} from 'playwright-core';
import {fixture,baseEnv,instance} from './production-fixture.mjs';
const root=new URL('../',import.meta.url),ready=JSON.parse(await readFile(new URL('production/release/ready.jsonc',root),'utf8'));
const products=JSON.parse(await readFile(new URL('production/existing-products.json',root),'utf8')).products;
const code=(await build({entryPoints:[new URL('production/storefront-worker.js',root).pathname],bundle:true,write:false,format:'esm',platform:'browser'})).outputFiles[0].text;
const sdk=`window.Square={payments:(app,location)=>{window.offlineSdkArgs=[app,location];return {card:async()=>({attach:async selector=>{const iframe=document.createElement('iframe');iframe.src='https://pci-connect.squareup.com/offline';iframe.title='Offline card form';document.querySelector(selector).append(iframe);await new Promise(resolve=>iframe.onload=resolve);},tokenize:async()=>{await window.offlineTokenized();return {status:'OK',token:'offline-not-a-real-card-token'};}})};}};`;
async function setup(t,off=false,unified='1'){
 const f=await fixture(t,{...ready.vars,PRODUCTION_UNIFIED_PUBLISH_ENABLED:unified,PRODUCTION_STOREFRONT_PUBLISH_ENABLED:'1',PRODUCTION_CATALOG_CUTOVER_APPROVAL:unified==='0'?'0':ready.vars.PRODUCTION_CATALOG_CUTOVER_APPROVAL,PRODUCTION_INSTANCE_ID:instance,PRODUCTION_ACCESS_TEAM_DOMAIN:baseEnv.PRODUCTION_ACCESS_TEAM_DOMAIN,PRODUCTION_ACCESS_AUDIENCE:baseEnv.PRODUCTION_ACCESS_AUDIENCE,PRODUCTION_CHECKOUT_ENABLED:off?'0':'1',PRODUCTION_MANAGED_CHECKOUT_ENABLED:off&&unified==='0'?'0':'1',PRODUCTION_MANAGEMENT_CATALOG_ENABLED:'0',PRODUCTION_MANAGEMENT_INVENTORY_ENABLED:'1'},true,{backendScript:code,assetsDir:new URL('production/.generated/v53',root).pathname});
 f.fake.objects.clear();f.fake.counts.clear();
 for(const p of products){
  const data={name:p.name,description:'ローカル試験',images:[],alt:p.name,sortOrder:0,variants:[{id:p.variantId,name:'通常',price:980,amount:p.amount,maxQuantity:10,active:!p.retired}]};
  await f.db.prepare('INSERT INTO mg_products VALUES(?,?,?,?,?,?,?,?,?)').bind(p.id,p.slug,0,p.retired?'archived':'published',2,1,p.retired?null:1,'local','local').run();
  await f.db.prepare('INSERT INTO mg_revisions VALUES(?,?,?,?)').bind(p.id,1,JSON.stringify(data),'local').run();
  await f.db.prepare('INSERT INTO mg_variants VALUES(?,?)').bind(p.variantId,p.id).run();
  await f.db.prepare('INSERT INTO mg_mappings VALUES(?,?,?,?,?,?,?,?,?,?)').bind(p.variantId,'production',f.env.SQUARE_LOCATION_ID,p.itemId,p.variationId,1,1,p.sku,instance,'2026-11-04T00:00:00Z').run();
  const v={id:p.variationId,type:'ITEM_VARIATION',version:1,present_at_all_locations:true,item_variation_data:{item_id:p.itemId,name:'通常',sku:p.sku,price_money:{amount:980,currency:'JPY'},track_inventory:true,sellable:true}};
  f.fake.objects.set(v.id,v);f.fake.objects.set(p.itemId,{type:'ITEM',id:p.itemId,version:1,present_at_all_locations:true,item_data:{name:p.name,description:'ローカル試験',variations:[v]}});f.fake.counts.set(v.id,p.variantId==='lemonbalm-10g'?1:3);
 }
 const browser=await chromium.launch({executablePath:process.env.YASOYA_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-background-networking']});t.after(()=>browser.close());
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});let tokens=0,payments=0,status=0;const errors=[],unexpected=[];
 await context.exposeBinding('offlineTokenized',()=>tokens++);
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());
  if(u.origin==='https://web.squarecdn.com')return route.fulfill({contentType:'application/javascript',body:sdk});
  if(u.origin==='https://pci-connect.squareup.com')return route.fulfill({contentType:'text/html',body:'<label>Card number<input></label><label>Expiry<input></label><label>CVV<input></label>'});
  if(u.origin!==f.env.SITE_URL){if(!['fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname))unexpected.push(u.origin);return route.abort();}
  if(u.pathname==='/api/v1/payments')payments++;
  if(u.pathname==='/api/v1/payments/status')status++;
  const data=req.postDataBuffer();const r=await f.mf.dispatchFetch(req.url(),{method:req.method(),headers:req.headers(),...(data?{body:data}:{})});
  return route.fulfill({status:r.status,headers:Object.fromEntries(r.headers),body:Buffer.from(await r.arrayBuffer())});
 });
 const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 return{...f,page,context,errors,unexpected,count:()=>({tokens,payments,status})};
}
async function fill(p){for(const [id,value]of Object.entries({familyName:'試験',givenName:'購入者',email:'buyer@example.invalid',phone:'09012345678',postalCode:'1000001',state:'東京都',city:'試験市',address1:'架空住所1'}))await p.locator('#'+id).fill(value);}
async function verifyOn(t,unified='1'){
 const f=await setup(t,false,unified);if(unified==='0')assert.deepEqual(['PRODUCTION_UNIFIED_PUBLISH_ENABLED','PRODUCTION_STOREFRONT_PUBLISH_ENABLED','PRODUCTION_CHECKOUT_ENABLED','PRODUCTION_MANAGED_CHECKOUT_ENABLED','PRODUCTION_MANAGEMENT_CATALOG_ENABLED','PRODUCTION_MANAGEMENT_INVENTORY_ENABLED'].map(k=>f.env[k]),['0','1','1','1','0','1']);await f.page.goto(f.env.SITE_URL+'/products/yomogi.html');const add=f.page.locator('[data-add-to-cart][data-product-id="yomogi-10g"]');await add.waitFor();assert(await add.isEnabled());await add.click();
 await f.page.locator('#cartCheckout:not([aria-disabled="true"])').waitFor({state:'visible'});await f.page.locator('#cartCheckout').click();await f.page.waitForURL('**/checkout.html');
 await f.page.waitForFunction(()=>document.getElementById('cardInitializationStatus')?.dataset.state==='ready');assert.deepEqual(await f.page.evaluate(()=>window.offlineSdkArgs),[f.env.SQUARE_PRODUCTION_APPLICATION_ID,'LQ693S4H2NBZ8']);
 await f.page.frameLocator('#card-container iframe').getByLabel('Card number',{exact:true}).fill('offline-test');await fill(f.page);assert.match(await f.page.locator('#checkoutTotal').innerText(),/1,330/);
 await f.page.locator('#paymentButton').click();await f.page.waitForURL('**/thanks.html?*');await f.page.waitForFunction(()=>document.getElementById('thankYouHeading')?.textContent==='Thank you.');
 assert.deepEqual(f.count(),{tokens:1,payments:1,status:1});assert.equal(f.fake.payments.size,1);assert.equal(f.fake.counts.get(products[1].variationId),2);assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM orders').first()).n,2);
 const row=await f.db.prepare("SELECT * FROM orders WHERE order_reference!='existing-order'").first();assert.deepEqual([row.total,row.inventory_adjusted],[1330,1]);assert.equal(f.mails.length,2);
 const receipt=await f.page.evaluate(()=>sessionStorage.getItem('yasoya_verified_checkout_v1'));assert(receipt);assert(!receipt.includes('offline-not-a-real-card-token'));assert.equal(await f.page.evaluate(()=>localStorage.getItem('yasoya_checkout_attempt_v1')),null);
 await f.page.reload();await f.page.waitForFunction(()=>document.getElementById('thankYouHeading')?.textContent==='Thank you.');assert.equal(f.count().payments,1);assert.equal(f.count().tokens,1);assert.equal(f.fake.counts.get(products[1].variationId),2);assert.equal(f.mails.length,2);
 assert(!f.calls.some(c=>c.method==='POST'&&c.path.startsWith('/v2/catalog/')));assert.deepEqual(f.errors,[]);assert.deepEqual(f.unexpected,[]);
}
async function verifyOff(t,unified='1'){
 const f=await setup(t,true,unified);if(unified==='0')assert.deepEqual(['PRODUCTION_UNIFIED_PUBLISH_ENABLED','PRODUCTION_STOREFRONT_PUBLISH_ENABLED','PRODUCTION_CHECKOUT_ENABLED','PRODUCTION_MANAGED_CHECKOUT_ENABLED','PRODUCTION_MANAGEMENT_CATALOG_ENABLED','PRODUCTION_MANAGEMENT_INVENTORY_ENABLED'].map(k=>f.env[k]),['0','1','0','0','0','1']);await f.page.goto(f.env.SITE_URL+'/products/yomogi.html');assert(await f.page.locator('[data-add-to-cart]').isDisabled());await f.page.goto(f.env.SITE_URL+'/thanks.html?payment=fake&order=fake');await f.page.waitForFunction(()=>document.getElementById('orderVerificationMessage')?.textContent.includes('この画面を開いただけでは'));assert.equal(await f.page.locator('#thankYouHeading').innerText(),'Order status.');assert.deepEqual(f.count(),{tokens:0,payments:0,status:0});assert.equal(f.fake.payments.size,0);
 }
test('V58 ON: actual product ADD TO CART -> cart -> Production-shaped card -> one payment -> verified THANK YOU',{timeout:45000},t=>verifyOn(t));
test('V58 OFF: actual product button disabled and thank-you direct link never grants success',{timeout:30000},t=>verifyOff(t));
test('unified publication OFF supports the full managed checkout and verified receipt without Catalog writes',{timeout:45000},t=>verifyOn(t,'0'));
test('actual 0/1/0/0/0/1 profile keeps product purchase disabled and thank-you neutral',{timeout:30000},t=>verifyOff(t,'0'));
for(const [httpStatus,code,label] of [[400,'CARD_DECLINED','要求を拒否'],[500,'INTERNAL_SERVER_ERROR','未確定']])test(`V59 mobile real checkout ${httpStatus}: status, reload and double tap never charge again`,{timeout:45000},async t=>{
 const f=await setup(t,false,'0'),fetch=f.fake.fetch.bind(f.fake);let posts=0;
 f.fake.fetch=async request=>{
  if(new URL(request.url).pathname==='/v2/payments'&&request.method==='POST'){posts++;return Response.json({errors:[{code,detail:'private provider detail'}]},{status:httpStatus});}
  return fetch(request);
 };
 await f.page.goto(f.env.SITE_URL+'/products/yomogi.html');await f.page.locator('[data-add-to-cart][data-product-id="yomogi-10g"]').click();
 await f.page.locator('#cartCheckout:not([aria-disabled="true"])').waitFor({state:'visible'});await f.page.locator('#cartCheckout').click();
 await f.page.waitForURL('**/checkout.html');await f.page.waitForFunction(()=>document.getElementById('cardInitializationStatus')?.dataset.state==='ready');
 await fill(f.page);await f.page.locator('#paymentButton').click();
 await f.page.waitForFunction(text=>document.getElementById('paymentStatus')?.textContent.includes(text),label);
 assert.match(await f.page.locator('#paymentStatus').innerText(),new RegExp('HTTP '+httpStatus+'／'+code));
 assert(await f.page.locator('#paymentButton').isDisabled());
 const id=await f.page.evaluate(()=>localStorage.getItem('yasoya_checkout_attempt_v1'));assert(id);
 await f.page.locator('#checkPaymentStatus').click();await f.page.reload();
 await f.page.waitForFunction(text=>document.getElementById('paymentStatus')?.textContent.includes(text),label);
 await f.page.locator('#checkPaymentStatus').click();
 assert.equal(await f.page.evaluate(()=>localStorage.getItem('yasoya_checkout_attempt_v1')),id);
 assert.equal(posts,1);assert.equal(f.count().payments,1);assert.equal(f.count().tokens,1);
 assert.equal(f.fake.payments.size,0);assert.equal(f.fake.counts.get(products[1].variationId),3);
 assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM orders').first()).n,1);assert.equal(f.mails.length,0);
 assert(!(await f.page.locator('body').innerText()).includes('private provider detail'));
 assert.deepEqual(f.errors,[]);assert.deepEqual(f.unexpected,[]);
});
