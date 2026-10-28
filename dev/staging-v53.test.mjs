import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {chromium} from 'playwright-core';
import {ManagementSquare} from './management-square.mjs';
import {jwt,jwk,baseEnv,contact} from './production-fixture.mjs';
import {assertStaging} from '../staging/safety.js';
const env={RUNTIME_TIER:'staging',STAGING_WORKER_NAME:'yasoya-v53-staging',SITE_URL:'https://staging.awaiaune.com',ALLOWED_ORIGINS:'https://staging.awaiaune.com',SQUARE_ENVIRONMENT:'sandbox',SQUARE_LOCATION_ID:'STAGINGLOCATION',SQUARE_SANDBOX_APPLICATION_ID:'sandbox-sq0idb-offline',STAGING_DATABASE_ID:'55555555-5555-4555-8555-555555555555',STAGING_INSTANCE_ID:'66666666-6666-4666-8666-666666666666',SQUARE_SANDBOX_ACCESS_TOKEN:'offline-staging-only',VALIDATION_ADMIN_TOKEN:'offline-staging-admin-only',STAGING_ADMIN_EMAIL:baseEnv.PRODUCTION_ADMIN_EMAIL,ACCESS_TEAM_DOMAIN:baseEnv.PRODUCTION_ACCESS_TEAM_DOMAIN,ACCESS_AUDIENCE:baseEnv.PRODUCTION_ACCESS_AUDIENCE,SQUARE_ACCESS_MODE:'READ_WRITE',VALIDATION_CHECKOUT_ENABLED:'0',VALIDATION_MAIL_ENABLED:'0',VALIDATION_CRON_ENABLED:'0',MANAGEMENT_ENABLED:'1',MANAGEMENT_CHECKOUT_PAUSED:'0',MANAGEMENT_STOCK_WRITES:'single-writer'};
test('staging refuses production resources and generic secrets',()=>{
 for(const patch of [{SQUARE_ENVIRONMENT:'production'},{STAGING_DATABASE_ID:'442fa9fd-25d3-4c01-bcc3-04be7b420cf5'},{SQUARE_LOCATION_ID:'LQ693S4H2NBZ8'},{SQUARE_ACCESS_TOKEN:'forbidden'},{ADMIN_TOKEN:'forbidden'},{SITE_URL:'https://yasoyahonten.awaiaune.com'}])assert.throws(()=>assertStaging({...env,ORDERS_DB:{},PURCHASE_COORDINATOR:{},...patch}));
});
for(const checkout of ['0','1'])test('checkout='+checkout+': Access-protected v53 admin publishes a new Sandbox product and SSR updates gallery/detail without Git changes',{timeout:45000},async t=>{
 const {outputFiles}=await build({entryPoints:[new URL('../staging/worker.js',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'browser'});
 const square=new ManagementSquare();square.locationId=env.SQUARE_LOCATION_ID;const calls=[];
 const mf=new Miniflare({cf:false,modules:true,script:outputFiles[0].text,compatibilityDate:'2026-08-04',bindings:{...env,VALIDATION_CHECKOUT_ENABLED:checkout},d1Databases:{ORDERS_DB:'staging-test-db'},r2Buckets:{PRODUCT_IMAGES:'staging-test-images'},durableObjects:{PURCHASE_COORDINATOR:{className:'StagingPurchaseCoordinator',useSQLite:true}},serviceBindings:{ASSETS:async req=>{const p=new URL(req.url).pathname;try{return new Response(await readFile(new URL('../staging/.generated/site'+(p.endsWith('/')?p+'index.html':p),import.meta.url)),{headers:{'Content-Type':p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.jpg')?'image/jpeg':'text/html'}});}catch{return new Response('missing',{status:404});}}},outboundService:async req=>{
  const u=new URL(req.url);calls.push(u.hostname);if(u.hostname===env.ACCESS_TEAM_DOMAIN)return Response.json({keys:[jwk]});assert.equal(u.hostname,'connect.squareupsandbox.com');return square.fetch(req);
 }});t.after(()=>mf.dispose());
 const db=await mf.getD1Database('ORDERS_DB');
 for(const file of ['0001_staging.sql','0002_management.sql','0003_supervision.sql'])for(const s of (await readFile(new URL('../staging/migrations/'+file,import.meta.url),'utf8')).replace(/^--.*$/mg,'').split(';').filter(s=>s.trim()))await db.prepare(s).run();
 await db.prepare('INSERT INTO staging_environment VALUES(1,?,?)').bind(env.STAGING_INSTANCE_ID,env.STAGING_DATABASE_ID).run();
 const token=await jwt(),headers={'Cf-Access-Jwt-Assertion':token,Authorization:'Bearer '+env.VALIDATION_ADMIN_TOKEN,Origin:env.SITE_URL,'Content-Type':'application/json'};
 const req=(path,method='GET',body)=>mf.dispatchFetch(env.SITE_URL+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})});
 const api=async(path,method,body)=>{const r=await req(path,method,body),d=await r.json();assert.equal(r.status,200,JSON.stringify(d));return d;};
 assert.equal((await mf.dispatchFetch(env.SITE_URL+'/')).status,401);
 const photo=await mf.dispatchFetch(env.SITE_URL+'/api/admin/images',{method:'POST',headers:{...headers,'Content-Type':'image/jpeg'},body:await readFile(new URL('../images/lemonbalm.jpg',import.meta.url))});assert.equal(photo.status,200);const image=await photo.json();
 const name='v53-test';await api('/api/admin/products/'+name,'PUT',{operationId:crypto.randomUUID(),expectedVersion:0,slug:name,name:'v53 新商品',description:'テスト説明 <script>unsafe</script>',sortOrder:0,images:[image.id],variants:[{id:'v53-test-10g',name:'通常',amount:'10g',price:980,maxQuantity:10,active:true}]});
 assert.equal((await api('/api/admin/products/'+name+'/publish','POST',{operationId:crypto.randomUUID(),expectedVersion:1})).state,'done');
 const home=await req('/');assert.match(home.headers.get('X-Robots-Tag'),/noindex/);assert((await home.text()).includes('/products/v53-test.html'));
 const shop=await (await req('/products.html')).text();assert(shop.includes('v33-scene'));assert(shop.includes('v53 新商品'));assert(shop.includes('shop-refinement-v53.css'));assert(!shop.includes('products/lemonbalm.html'));
 const detail=await (await req('/products/v53-test.html')).text();assert(detail.includes('v30-gallery'));assert(detail.includes('&lt;script&gt;unsafe'));assert(detail.includes('data-add-to-cart'));assert(detail.includes('/api/media/'+image.id));assert.equal((await req('/api/media/'+image.id)).status,200);assert(!detail.includes('<script>unsafe'));
 const inventory=(await api('/api/admin/inventory')).inventory[0];await api('/api/admin/inventory/'+inventory.id,'POST',{operationId:crypto.randomUUID(),kind:'count',quantity:3,reason:'Sandbox試験',expectedQuantity:inventory.quantity,observedAt:inventory.observedAt});assert.equal((await api('/api/admin/inventory')).inventory[0].quantity,3);
 const pay=await req('/api/v1/payments','POST',{contractVersion:1,attemptId:crypto.randomUUID(),sourceId:'offline-card',contact:{...contact,email:env.STAGING_ADMIN_EMAIL},items:[{id:'v53-test-10g',quantity:1}]});assert.equal(pay.status,checkout==='1'?200:503);if(checkout==='1'){assert.equal((await pay.json()).ok,true);assert.equal((await api('/api/admin/inventory')).inventory[0].quantity,2);}
 const config=await (await req('/js/store-config.js')).text();assert(!config.includes('production'));assert(config.includes('sandbox-sq0idb-'));
 
 if(checkout==='0'){
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-background-networking']});t.after(()=>browser.close());
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,serviceWorkers:'block'});
  await context.route('**/*',async route=>{const r=route.request();if(new URL(r.url()).origin!==env.SITE_URL)return route.abort();const body=r.postDataBuffer();const response=await mf.dispatchFetch(r.url(),{method:r.method(),headers:{...r.headers(),'Cf-Access-Jwt-Assertion':token},...(body?{body}:{})});return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  const idle=()=>page.waitForFunction(()=>!document.querySelector('#app [aria-busy="true"]'));
  await page.goto(env.SITE_URL+'/admin/');await page.getByLabel('管理トークン',{exact:true}).fill(env.VALIDATION_ADMIN_TOKEN);await page.getByRole('button',{name:'管理画面を開く'}).click();await page.locator('#app').waitFor({state:'visible'});await idle();
  await page.getByRole('navigation').getByRole('button',{name:'商品',exact:true}).click();await idle();
  await page.getByRole('button',{name:'＋ 商品登録',exact:true}).click();await page.getByLabel('商品名',{exact:true}).fill('ブラウザ追加商品');await page.getByLabel('URL識別子',{exact:true}).fill('browser-v53');await page.locator('[name=vname]').fill('通常');
  await page.locator('#imageFiles').setInputFiles({name:'staging.jpg',mimeType:'image/jpeg',buffer:await readFile(new URL('../images/lemonbalm.jpg',import.meta.url))});await idle();
  await page.getByRole('button',{name:'下書き保存',exact:true}).click();await idle();await page.getByRole('button',{name:'保存内容を公開',exact:true}).click();await idle();
  await page.goto(env.SITE_URL+'/products/browser-v53.html');await page.locator('.v30-top h1').waitFor();assert.equal(await page.locator('.v30-top h1').innerText(),'ブラウザ追加商品');
  await page.goto(env.SITE_URL+'/products.html');assert(await page.locator('.v35-all-card').filter({hasText:'ブラウザ追加商品'}).count());assert.deepEqual(errors,[]);
 }
assert(!calls.includes('connect.squareup.com'));assert.equal((await api('/api/admin/orders')).orders.length,checkout==='1'?1:0);
});
