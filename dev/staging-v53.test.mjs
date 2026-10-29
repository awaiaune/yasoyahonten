import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {chromium} from 'playwright-core';
import {ManagementSquare} from './management-square.mjs';
import {jwt,jwk,baseEnv,contact} from './production-fixture.mjs';
import {assertStaging} from '../staging/safety.js';
import {sameVariants} from '../worker/src/management/site-publication.js';
const env={RUNTIME_TIER:'staging',STAGING_WORKER_NAME:'yasoya-v53-staging',SITE_URL:'https://staging.awaiaune.com',ALLOWED_ORIGINS:'https://staging.awaiaune.com',SQUARE_ENVIRONMENT:'sandbox',SQUARE_LOCATION_ID:'STAGINGLOCATION',SQUARE_SANDBOX_APPLICATION_ID:'sandbox-sq0idb-offline',STAGING_DATABASE_ID:'55555555-5555-4555-8555-555555555555',STAGING_INSTANCE_ID:'66666666-6666-4666-8666-666666666666',SQUARE_SANDBOX_ACCESS_TOKEN:'offline-staging-only',VALIDATION_ADMIN_TOKEN:'offline-staging-admin-only',STAGING_ADMIN_EMAIL:baseEnv.PRODUCTION_ADMIN_EMAIL,ACCESS_TEAM_DOMAIN:baseEnv.PRODUCTION_ACCESS_TEAM_DOMAIN,ACCESS_AUDIENCE:baseEnv.PRODUCTION_ACCESS_AUDIENCE,SQUARE_ACCESS_MODE:'READ_WRITE',VALIDATION_CHECKOUT_ENABLED:'0',VALIDATION_MAIL_ENABLED:'0',VALIDATION_CRON_ENABLED:'0',MANAGEMENT_ENABLED:'1',MANAGEMENT_CHECKOUT_PAUSED:'0',MANAGEMENT_STOCK_WRITES:'single-writer'};
test('staging refuses production resources and generic secrets',()=>{
 for(const patch of [{SQUARE_ENVIRONMENT:'production'},{STAGING_DATABASE_ID:'442fa9fd-25d3-4c01-bcc3-04be7b420cf5'},{SQUARE_LOCATION_ID:'LQ693S4H2NBZ8'},{SQUARE_ACCESS_TOKEN:'forbidden'},{ADMIN_TOKEN:'forbidden'},{SITE_URL:'https://yasoyahonten.awaiaune.com'}])assert.throws(()=>assertStaging({...env,ORDERS_DB:{},PURCHASE_COORDINATOR:{},...patch}));
});
test('legacy variant field order and default fields do not count as commercial edits',()=>{assert(sameVariants({variants:[{id:'old',price:980,name:'通常'}]},{variants:[{active:true,maxQuantity:10,name:'通常',id:'old',price:980,amount:''}]}));});
for(const checkout of ['0','1'])test('checkout='+checkout+': existing locked/mismatched v53 products can edit, publish, stop and resume without forced Square writes',{timeout:45000},async t=>{
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
 assert.equal((await api('/api/admin/products/'+name+'/site','POST',{operationId:crypto.randomUUID(),expectedVersion:2,status:'published'})).siteOnly,true);
 const home=await req('/');assert.match(home.headers.get('X-Robots-Tag'),/noindex/);assert((await home.text()).includes('/products/v53-test.html'));
 const shop=await (await req('/products.html')).text();assert(shop.includes('v33-scene'));assert(shop.includes('v53 新商品'));assert(shop.includes('shop-refinement-v53.css'));assert(!shop.includes('products/lemonbalm.html'));
 const detail=await (await req('/products/v53-test.html')).text();assert(detail.includes('v30-gallery'));assert(detail.includes('&lt;script&gt;unsafe'));assert(detail.includes('data-add-to-cart'));assert(detail.includes('/api/media/'+image.id));assert.equal((await req('/api/media/'+image.id)).status,200);assert(!detail.includes('<script>unsafe'));
 const inventory=(await api('/api/admin/inventory')).inventory[0];await api('/api/admin/inventory/'+inventory.id,'POST',{operationId:crypto.randomUUID(),kind:'count',quantity:3,reason:'Sandbox試験',expectedQuantity:inventory.quantity,observedAt:inventory.observedAt});assert.equal((await api('/api/admin/inventory')).inventory[0].quantity,3);
 const pay=await req('/api/v1/payments','POST',{contractVersion:1,attemptId:crypto.randomUUID(),sourceId:'offline-card',contact:{...contact,email:env.STAGING_ADMIN_EMAIL},items:[{id:'v53-test-10g',quantity:1}]});assert.equal(pay.status,checkout==='1'?200:503);if(checkout==='1'){assert.equal((await pay.json()).ok,true);assert.equal((await api('/api/admin/inventory')).inventory[0].quantity,2);}
 // Regression: two registered products survive a blocked Square job. Presentation
 // changes publish without any Square calls; commercial edits keep their guards.
 const second='second-herb';await api('/api/admin/products/'+second,'PUT',{operationId:crypto.randomUUID(),expectedVersion:0,slug:second,name:'別の商品',description:'保持する説明',images:[image.id],variants:[{id:second+'-10g',name:'通常',price:750,amount:'10g',maxQuantity:10,active:true}]});
 await api('/api/admin/products/'+second+'/site','POST',{operationId:crypto.randomUUID(),expectedVersion:1});
 assert((await (await req('/products/'+second+'.html')).text()).includes('購入準備中'));
 let p=(await api('/api/admin/products/'+name)).product;
 const legacy={...p.draft,variants:p.draft.variants.map(v=>({price:v.price,name:v.name,id:v.id,amount:v.amount,active:v.active,maxQuantity:v.maxQuantity}))};
 await db.prepare('UPDATE mg_revisions SET data_json=? WHERE product_id=? AND revision=?').bind(JSON.stringify(legacy),name,p.draft_revision).run();
 square.failBefore='/v2/catalog/batch-upsert';
 const blocked=await api('/api/admin/products/'+name+'/publish','POST',{operationId:crypto.randomUUID(),expectedVersion:p.version});assert.equal(blocked.state,'retry');
 p=(await api('/api/admin/products/'+name)).product;assert.equal(p.blockingJobs[0].id,blocked.id);assert.match(p.blockingJobs[0].error,/Square/);
 const lockCount=(await db.prepare('SELECT COUNT(*) AS n FROM mg_locks').first()).n;
 const edited={...p.draft,name:'変更済みの名前',description:'新しい説明 <安全>',alt:'変更画像説明',images:[]};
 const callCount=square.calls.length;
 const saved=await api('/api/admin/products/'+name,'PUT',{...edited,slug:p.slug,expectedVersion:p.version,operationId:crypto.randomUUID()});
 const published=await api('/api/admin/products/'+name+'/site','POST',{expectedVersion:saved.version,operationId:crypto.randomUUID()});assert.equal(published.siteOnly,true);assert.equal(square.calls.length,callCount,'presentation publication must not contact Square');
 const updated=await (await req('/products/'+name+'.html')).text();assert(updated.includes('変更済みの名前'));assert(updated.includes('新しい説明 &lt;安全&gt;'));assert(!updated.includes('/api/media/'+image.id));
 assert((await (await req('/products.html')).text()).includes('変更済みの名前'));assert((await (await req('/')).text()).includes('変更済みの名前'));
 assert((await (await req('/products/'+second+'.html')).text()).includes('別の商品'));
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM mg_products').first()).n,2);
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM mg_images').first()).n,1,'removing a draft image never deletes its stored asset');
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM mg_locks').first()).n,lockCount,'site publication must not release Square locks');
 p=(await api('/api/admin/products/'+name)).product;
 const priceDraft=await api('/api/admin/products/'+name,'PUT',{...p.draft,name:'価格確認中の商品',variants:p.draft.variants.map(v=>({...v,price:1200})),slug:p.slug,expectedVersion:p.version,operationId:crypto.randomUUID()});
 const partialInput={expectedVersion:priceDraft.version,operationId:crypto.randomUUID()};
 const partial=await api('/api/admin/products/'+name+'/site','POST',partialInput);assert.equal(partial.warnings.length,1);
 const revisionCount=(await db.prepare('SELECT COUNT(*) AS n FROM mg_revisions WHERE product_id=?').bind(name).first()).n;
 assert.deepEqual(await api('/api/admin/products/'+name+'/site','POST',partialInput),partial);
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM mg_revisions WHERE product_id=?').bind(name).first()).n,revisionCount,'publication replay does not create another revision');
 let visible=(await api('/api/catalog')).products.find(p=>p.id===name);assert.equal(visible.name,'価格確認中の商品');assert.equal(visible.variants[0].price,980);
 assert.equal((await api('/api/admin/products/'+name)).product.draft.variants[0].price,1200,'unsynchronized draft is retained separately');
 p=(await api('/api/admin/products/'+name)).product;
 const reverted=await api('/api/admin/products/'+name,'PUT',{...p.draft,name:'変更済みの名前',variants:p.draft.variants.map(v=>({...v,price:980})),slug:p.slug,expectedVersion:p.version,operationId:crypto.randomUUID()});
 await api('/api/admin/products/'+name+'/site','POST',{expectedVersion:reverted.version,operationId:crypto.randomUUID()});
 square.failBefore=null;assert.equal((await api('/api/admin/jobs/'+blocked.id+'/retry','POST',{})).state,'done');
 assert((await (await req('/products/'+name+'.html')).text()).includes('変更済みの名前'),'late Square completion must not restore old site content');
 p=(await api('/api/admin/products/'+name)).product;
 const changedPrice=await api('/api/admin/products/'+name,'PUT',{...p.draft,variants:p.draft.variants.map(v=>({...v,price:1200})),slug:p.slug,expectedVersion:p.version,operationId:crypto.randomUUID()});
 const mismatch=await api('/api/admin/products/'+name+'/site','POST',{expectedVersion:changedPrice.version,operationId:crypto.randomUUID()});assert.equal(mismatch.warnings.length,1);
 assert.equal((await api('/api/catalog')).products.find(p=>p.id===name).variants[0].price,980,'unsynchronized price is never published');
 assert((await api('/api/admin/products/'+name)).product.siteWarnings.length);
 p=(await api('/api/admin/products/'+name)).product;
 await api('/api/admin/products/'+name+'/site','POST',{expectedVersion:p.version,status:'stopped',operationId:crypto.randomUUID()});
 assert(!(await (await req('/products.html')).text()).includes('/products/'+name+'.html'));assert(!(await (await req('/')).text()).includes('/products/'+name+'.html'));
 const stopped=await (await req('/products/'+name+'.html')).text();assert.match(stopped,/disabled data-site-disabled="true"/);
 assert.equal((await req('/api/quote','POST',{items:[{id:'v53-test-10g',quantity:1}]})).status,400);
 p=(await api('/api/admin/products/'+name)).product;
 await api('/api/admin/products/'+name+'/site','POST',{expectedVersion:p.version,status:'published',operationId:crypto.randomUUID()});
 assert((await (await req('/products.html')).text()).includes('/products/'+name+'.html'));
 // Lost response, then review: reconciliation reads Square and projects locally,
 // without replaying a Catalog write or changing the site's published snapshot.
 p=(await api('/api/admin/products/'+name)).product;square.loseAfter='/v2/catalog/batch-upsert';
 const uncertain=await api('/api/admin/products/'+name+'/publish','POST',{expectedVersion:p.version,operationId:crypto.randomUUID()});assert.equal(uncertain.state,'retry');
 await db.prepare("UPDATE mg_jobs SET state='review' WHERE id=?").bind(uncertain.id).run();
 const beforeReconcile=square.calls.length;
 assert.equal((await api('/api/admin/jobs/'+uncertain.id+'/reconcile','POST',{})).state,'done');
 assert(square.calls.slice(beforeReconcile).every(path=>path.startsWith('/v2/catalog/object/')),'reconciliation must never write to Square');
 assert.equal((await api('/api/catalog')).products.find(p=>p.id===name).variants[0].price,980);
 // A leftover lock from an already completed/proven job is safely releasable.
 await db.prepare('INSERT INTO mg_locks VALUES(?,?)').bind('v53-test-10g',uncertain.id).run();
 const beforeRelease=square.calls.length;
 assert.equal((await api('/api/admin/jobs/'+uncertain.id+'/reconcile','POST',{})).lockCount,0);
 assert.equal(square.calls.length,beforeRelease);
 // An unresolved mismatch must retain its lock rather than force synchronization.
 p=(await api('/api/admin/products/'+name)).product;square.failBefore='/v2/catalog/batch-upsert';
 const unresolved=await api('/api/admin/products/'+name+'/publish','POST',{expectedVersion:p.version,operationId:crypto.randomUUID()});
 await db.prepare("UPDATE mg_jobs SET state='review' WHERE id=?").bind(unresolved.id).run();
 const variant=(await db.prepare('SELECT variation_id FROM mg_mappings WHERE variant_id=?').bind('v53-test-10g').first()).variation_id;
 square.objects.get(variant).item_variation_data.price_money.amount=1400;
 const beforeMismatch=square.calls.length;
 assert.equal((await req('/api/admin/jobs/'+unresolved.id+'/reconcile','POST',{})).status,409);
 assert(square.calls.slice(beforeMismatch).every(path=>path.startsWith('/v2/catalog/object/')));
 assert.equal((await api('/api/admin/jobs')).jobs.find(j=>j.id===unresolved.id).lockCount,1);
 square.failBefore=null;
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM mg_products').first()).n,2);
 const config=await (await req('/js/store-config.js')).text();assert(!config.includes('production'));assert(config.includes('sandbox-sq0idb-'));
 
 if(checkout==='0'){
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-background-networking']});t.after(()=>browser.close());
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,serviceWorkers:'block'});
  await context.route('**/*',async route=>{const r=route.request();if(new URL(r.url()).origin!==env.SITE_URL)return route.abort();const body=r.postDataBuffer();const response=await mf.dispatchFetch(r.url(),{method:r.method(),headers:{...r.headers(),'Cf-Access-Jwt-Assertion':token},...(body?{body}:{})});return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});});
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  const idle=()=>page.waitForFunction(()=>!document.querySelector('#app [aria-busy="true"]'));
  await page.goto(env.SITE_URL+'/admin/');await page.getByLabel('管理トークン',{exact:true}).fill(env.VALIDATION_ADMIN_TOKEN);await page.getByRole('button',{name:'管理画面を開く'}).click();await page.locator('#app').waitFor({state:'visible'});await idle();
  await page.getByRole('navigation').getByRole('button',{name:'商品',exact:true}).click();await idle();
  await page.getByRole('button',{name:'変更済みの名前を編集',exact:true}).click();
  assert((await page.locator('#editorSyncStatus').textContent()).includes('要確認'));
  await page.getByLabel('商品名',{exact:true}).fill('保留中でも実機相当の編集');
  await page.getByLabel('表示順',{exact:true}).fill('7');
  const beforeBrowser=square.calls.length;
  await page.getByRole('button',{name:'下書き保存',exact:true}).click();await idle();
  await page.getByRole('button',{name:'サイトへ公開（Square変更なし）',exact:true}).click();await idle();
  assert((await page.locator('#editorMessage').textContent()).includes('前回公開値を維持'));
  assert.equal(square.calls.length,beforeBrowser);
  assert((await (await req('/products/'+name+'.html')).text()).includes('保留中でも実機相当の編集'));
  await page.getByText('販売状態・連携設定',{exact:true}).click();
  await page.locator('#stopProduct').click();await idle();
  assert(!(await (await req('/products.html')).text()).includes('/products/'+name+'.html'));
  assert.match(await (await req('/products/'+name+'.html')).text(),/disabled data-site-disabled="true"/);
  await page.getByRole('button',{name:'サイトへ公開（Square変更なし）',exact:true}).click();await idle();
  assert((await (await req('/products.html')).text()).includes('/products/'+name+'.html'));
  await page.locator('#closeEditor').click();
  await page.getByRole('button',{name:'＋ 商品登録',exact:true}).click();await page.getByLabel('商品名',{exact:true}).fill('ブラウザ追加商品');await page.getByLabel('URL識別子',{exact:true}).fill('browser-v53');await page.locator('[name=vname]').fill('通常');
  await page.locator('#imageFiles').setInputFiles({name:'staging.jpg',mimeType:'image/jpeg',buffer:await readFile(new URL('../images/lemonbalm.jpg',import.meta.url))});await idle();
  await page.getByRole('button',{name:'下書き保存',exact:true}).click();await idle();await page.getByRole('button',{name:'サイトへ公開（Square変更なし）',exact:true}).click();await idle();
  // Edit an already published product through the actual admin form, preserving
  // the other registered products and the uploaded image.
  await page.getByLabel('商品名',{exact:true}).fill('ブラウザ編集済み商品');
  await page.getByRole('button',{name:'下書き保存',exact:true}).click();await idle();
  await page.getByRole('button',{name:'サイトへ公開（Square変更なし）',exact:true}).click();await idle();
  await page.goto(env.SITE_URL+'/products/browser-v53.html');await page.locator('.v30-top h1').waitFor();assert.equal(await page.locator('.v30-top h1').innerText(),'ブラウザ編集済み商品');
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM mg_products').first()).n,3);
  await page.goto(env.SITE_URL+'/products.html');assert(await page.locator('.v35-all-card').filter({hasText:'ブラウザ編集済み商品'}).count());assert.deepEqual(errors,[]);
 }
assert(!calls.includes('connect.squareup.com'));assert.equal((await api('/api/admin/orders')).orders.length,checkout==='1'?1:0);
});
