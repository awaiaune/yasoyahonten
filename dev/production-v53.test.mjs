import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {fixture,instance,contact} from './production-fixture.mjs';
import {reviewPreMigrationSchema} from '../production/schema-review.mjs';
const products=JSON.parse(await readFile(new URL('../production/existing-products.json',import.meta.url),'utf8')).products;
const {outputFiles}=await build({entryPoints:[new URL('../production/storefront-worker.js',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'browser'});
const patch={PRODUCTION_UNIFIED_PUBLISH_ENABLED:'1',PRODUCTION_STOREFRONT_ENABLED:'1',PRODUCTION_STOREFRONT_PUBLISH_ENABLED:'1',PRODUCTION_MANAGED_CHECKOUT_ENABLED:'1',STOREFRONT_RETIRE_GOLDENROD:'1',STOREFRONT_FEATURED_ENABLED:'1',PRODUCTION_PURCHASE_PROTOCOL:'durable-v1',PRODUCTION_MANAGEMENT_SCHEMA_READY:'1',PRODUCTION_MANAGEMENT_READ_ENABLED:'1',PRODUCTION_MANAGEMENT_DRAFT_ENABLED:'1',PRODUCTION_MANAGEMENT_IMAGES_ENABLED:'1',PRODUCTION_MANAGEMENT_CATALOG_ENABLED:'1',PRODUCTION_MANAGEMENT_INVENTORY_ENABLED:'1',PRODUCTION_CATALOG_CUTOVER_APPROVAL:'verified-storefront-and-pricing-v1',PRODUCTION_INVENTORY_WRITER_APPROVAL:'shared-purchase-do-single-writer-v1',MANAGEMENT_STOCK_WRITES:'single-writer',SQUARE_PRODUCTION_APPLICATION_ID:'sq0idp-offline-application'};
test('Production v53: two legacy orders survive additive migration and full lifecycle',{timeout:70000},async t=>{
 const f=await fixture(t,patch,false,{backendScript:outputFiles[0].text,assetsDir:new URL('../production/.generated/v53',import.meta.url).pathname});
 await f.db.prepare("INSERT INTO orders(order_reference,payment_id,created_at,status,subtotal,shipping,total,items_json,contact_json,inventory_adjusted) VALUES('existing-order-2','offline-payment-2','2026-01-02','shipped',980,350,1330,?, '{}',1)").bind(JSON.stringify([{id:'goldenrod-leaf-10g',quantity:1}])).run();
 await f.db.prepare("UPDATE orders SET inventory_adjusted=1 WHERE order_reference='existing-order'").run();
 const before=(await f.db.prepare('SELECT * FROM orders ORDER BY order_reference').all()).results;
 await t.test('known orders-only schema, two synthetic orders, additive migrations preserve every cell',async()=>{
  assert.deepEqual((await f.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB '_cf_*'").all()).results.map(r=>r.name),['orders']);assert.equal((await reviewPreMigrationSchema(f.db)).readyForReviewedAdditiveMigration,true);
  for(const file of ['0001_management.sql','0002_management_supervision.sql'])for(const sql of (await readFile(new URL('../worker/migrations-production/'+file,import.meta.url),'utf8')).replace(/^--.*$/mg,'').split(';').filter(s=>s.trim()))await f.db.prepare(sql).run();
  await f.db.prepare('INSERT INTO production_environment VALUES(1,?,?,?)').bind(instance,f.env.PRODUCTION_DATABASE_ID,f.env.SQUARE_LOCATION_ID).run();assert.deepEqual((await f.db.prepare('SELECT * FROM orders ORDER BY order_reference').all()).results,before);
 });
 const save=async(p,change={})=>f.api('/api/admin/products/'+p.id,'PUT',{...p.draft,...change,slug:p.slug,expectedVersion:p.version,operationId:crypto.randomUUID()});
 const get=async id=>(await f.api('/api/admin/products/'+id)).product;
 const release=async id=>f.api('/api/admin/products/'+id+'/release','POST',{expectedVersion:(await get(id)).version,operationId:crypto.randomUUID()});
 await t.test('link four pre-existing Items/Variations/SKUs by reads only; retire two without changing Square',async()=>{
  f.fake.version=10;
  for(const p of products){const v={id:p.variationId,type:'ITEM_VARIATION',version:10,present_at_all_locations:true,item_variation_data:{item_id:p.itemId,sku:p.sku,name:'通常',price_money:{amount:980,currency:'JPY'},track_inventory:true,sellable:true}};f.fake.objects.set(v.id,v);f.fake.objects.set(p.itemId,{type:'ITEM',id:p.itemId,version:10,present_at_all_locations:true,item_data:{name:p.name,description:'既存説明',image_ids:['EXISTINGIMAGE01'],variations:[v]}});f.fake.counts.set(v.id,5);
   await f.api('/api/admin/products/'+p.id,'PUT',{name:p.name,description:'既存説明',images:[],sortOrder:0,slug:p.slug,variants:[{id:p.variantId,name:'通常',price:980,amount:p.amount,maxQuantity:10,active:true}],expectedVersion:0,operationId:crypto.randomUUID()});
   if(p.id==='lemonbalm'){v.item_variation_data.sku='unexpected-existing-sku';assert.equal((await f.request('/api/admin/products/'+p.id+'/link','POST',{expectedVersion:1,mappings:[{variantId:p.variantId,variationId:p.variationId}],operationId:crypto.randomUUID()})).status,409);v.item_variation_data.sku=p.sku;}
   await f.api('/api/admin/products/'+p.id+'/link','POST',{expectedVersion:1,mappings:[{variantId:p.variantId,variationId:p.variationId}],operationId:crypto.randomUUID()});
   await f.api('/api/admin/products/'+p.id+'/site','POST',{expectedVersion:(await get(p.id)).version,status:p.retired?'archived':'published',operationId:crypto.randomUUID()});
  }
  assert.equal((await f.api('/api/admin/inventory')).inventory.length,2);
  assert.equal(f.calls.filter(c=>c.method!=='GET'&&!c.path.includes('counts/batch-retrieve')).length,0);assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM mg_mappings').first()).n,4);
 });
 await t.test('imported verified mapping buys without a fabricated sync job; retirement blocks legacy cart/URLs',async()=>{
  const diag=await f.api('/api/admin/products/lemonbalm/sync-check','POST',{});assert.equal(diag.environment,'production');assert.equal(diag.connection.ok,true);assert.equal(diag.variants[0].checks.environment,true);
  assert.equal((await f.api('/api/v1/quote','POST',{items:[{id:'lemonbalm-10g',quantity:1}]})).total,1330);
  assert.equal((await f.request('/api/v1/quote','POST',{items:[{id:'goldenrod-leaf-10g',quantity:1}]})).status,400);assert.equal((await f.request('/products/goldenrod.html')).status,410);assert.equal((await f.request('/products/goldenrod-leaf-stem.html')).status,410);
  assert.equal((await f.request('/api/admin/products/goldenrod-leaf/release','POST',{expectedVersion:(await get('goldenrod-leaf')).version,operationId:crypto.randomUUID()})).status,409);
 });
 await t.test('Production SDK/config only; public site has no Access gate while admin origin requires auth',async()=>{
  const config=await (await f.request('/js/store-config.js')).text();assert(config.includes('sq0idp-offline'));assert(!config.includes('sandbox'));assert(!config.includes(f.env.SQUARE_ACCESS_TOKEN));
  const checkout=await (await f.request('/checkout.html')).text();assert(checkout.includes('https://web.squarecdn.com/v1/square.js'));assert(!checkout.includes('sandbox.web.squarecdn.com'));assert(!checkout.includes('noindex'));assert.equal((await f.mf.dispatchFetch(f.env.SITE_URL+'/api/admin/products')).status,403);assert.equal((await f.mf.dispatchFetch(f.env.PRODUCTION_ADMIN_ORIGIN+'/api/admin/products')).status,401);
 });
 await t.test('draft save changes neither public copy nor Square; unified release updates same IDs and publishes atomically',async()=>{
  const p=await get('lemonbalm'),calls=f.calls.length;await save(p,{description:'新しい公開説明'});assert(!((await (await f.request('/products/lemonbalm.html')).text()).includes('新しい公開説明')));assert.equal(f.calls.length,calls);
  const job=await release('lemonbalm');assert.equal(job.state,'done',JSON.stringify(job));assert((await (await f.request('/products/lemonbalm.html')).text()).includes('新しい公開説明'));const m=await f.db.prepare('SELECT * FROM mg_mappings WHERE variant_id=?').bind('lemonbalm-10g').first();assert.equal(m.item_id,products[0].itemId);assert.equal(m.variation_id,products[0].variationId);assert.equal(m.sku,'315102D');assert.equal(f.fake.counts.get(m.variation_id),5);assert.deepEqual(f.fake.objects.get(m.item_id).item_data.image_ids,['EXISTINGIMAGE01']);assert((await (await f.request('/products/lemonbalm.html')).text()).includes('/images/lemonbalm.jpg'));
 });
 await t.test('top selection persists; stopped product is removed from settings and purchase',async()=>{
  await f.api('/api/admin/storefront/featured','POST',{productIds:['yomogi','lemonbalm'],expectedVersion:null,operationId:crypto.randomUUID()});let html=await (await f.request('/')).text();assert(html.indexOf('aria-label="乾燥ヨモギ')<html.indexOf('aria-label="乾燥レモンバーム'));const p=await get('yomogi');await f.api('/api/admin/products/yomogi/site','POST',{expectedVersion:p.version,status:'stopped',operationId:crypto.randomUUID()});assert.deepEqual((await f.api('/api/admin/storefront/featured')).productIds,['lemonbalm']);assert.equal((await f.request('/api/v1/quote','POST',{items:[{id:'yomogi-10g',quantity:1}]})).status,400);assert.equal((await release('yomogi')).state,'done');
 });
 await t.test('lost Square response and D1 publication failure resume the same Production job without duplicate writes',async()=>{
  let p=await get('lemonbalm');await save(p,{description:'応答消失の公開'});f.fake.loseAfter='/v2/catalog/batch-upsert';let j=await release('lemonbalm');assert.equal(j.state,'retry');let count=f.calls.filter(c=>c.path==='/v2/catalog/batch-upsert').length;let resumed=await release('lemonbalm');assert.equal(resumed.id,j.id);assert.equal(resumed.state,'done');assert.equal(f.calls.filter(c=>c.path==='/v2/catalog/batch-upsert').length,count);
  p=await get('lemonbalm');await save(p,{description:'D1保存の復旧'});await f.db.prepare("CREATE TRIGGER fail_publication BEFORE UPDATE OF published_revision ON mg_products WHEN NEW.id='lemonbalm' BEGIN SELECT RAISE(ABORT,'offline save fault'); END").run();j=await release('lemonbalm');assert.equal(j.state,'retry');assert.equal((await get('lemonbalm')).published_revision,p.published_revision);count=f.calls.filter(c=>c.path==='/v2/catalog/batch-upsert').length;await f.db.prepare('DROP TRIGGER fail_publication').run();resumed=await release('lemonbalm');assert.equal(resumed.id,j.id);assert.equal(resumed.state,'done');assert.equal(f.calls.filter(c=>c.path==='/v2/catalog/batch-upsert').length,count);
 });
 await t.test('new Production product uses the same two-action publication without replacing legacy IDs',async()=>{
  await f.api('/api/admin/products/new-prod-herb','PUT',{name:'追加商品',description:'追加説明',images:[],slug:'new-prod-herb',sortOrder:1,variants:[{id:'new-prod-herb-10g',name:'通常',price:750,amount:'10g',maxQuantity:10,active:true}],expectedVersion:0,operationId:crypto.randomUUID()});assert.equal((await release('new-prod-herb')).state,'done');const m=await f.db.prepare('SELECT * FROM mg_mappings WHERE variant_id=?').bind('new-prod-herb-10g').first();assert.equal(m.environment,'production');assert.equal(m.sku,'new-prod-herb-10g');assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM mg_mappings').first()).n,5);
 });
 await t.test('receipt/version advance survives purchase check; one order and one stock decrement under replay',async()=>{
  const row=(await f.api('/api/admin/inventory')).inventory.find(v=>v.id==='lemonbalm-10g');await f.api('/api/admin/inventory/'+row.id,'POST',{kind:'receipt',quantity:2,reason:'offline receipt',expectedQuantity:5,observedAt:row.observedAt,operationId:crypto.randomUUID()});const remote=f.fake.objects.get(products[0].variationId);remote.version++;assert.equal((await f.api('/api/v1/quote','POST',{items:[{id:row.id,quantity:1}]})).total,1330);
  const body={attemptId:crypto.randomUUID(),sourceId:'offline-card',contact,items:[{id:row.id,quantity:1}]};await f.api('/api/v1/payments','POST',body);await f.api('/api/v1/payments','POST',body);assert.equal(f.fake.payments.size,1);assert.equal(f.fake.counts.get(remote.id),6);assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM orders').first()).n,3);assert.deepEqual((await f.db.prepare("SELECT * FROM orders WHERE order_reference IN ('existing-order','existing-order-2') ORDER BY order_reference").all()).results,before);
 });
 await t.test('real price changes still block purchase and Sandbox secrets fail closed',async()=>{const v=f.fake.objects.get(products[0].variationId);v.item_variation_data.price_money.amount=1200;assert.equal((await f.request('/api/v1/quote','POST',{items:[{id:'lemonbalm-10g',quantity:1}]})).status,409);});
});

test('Production entrypoint refuses Sandbox credentials before any network operation',async t=>{
 const f=await fixture(t,{...patch,SQUARE_SANDBOX_ACCESS_TOKEN:'offline-invalid-sandbox-binding'},true,{backendScript:outputFiles[0].text,assetsDir:new URL('../production/.generated/v53',import.meta.url).pathname});assert.equal((await f.request('/js/store-config.js')).status,503);assert.equal(f.calls.length,0);assert.equal(f.fake.payments.size,0);
});

test('Production public rendering refuses a staging database identity',async t=>{
 const f=await fixture(t,{...patch,PRODUCTION_DATABASE_ID:'d16c9e56-076a-4470-8d78-4fcfbe32b4dd'},true,{backendScript:outputFiles[0].text,assetsDir:new URL('../production/.generated/v53',import.meta.url).pathname});assert.equal((await f.request('/')).status,503);assert.equal((await f.request('/js/store-config.js')).status,503);assert.equal(f.calls.length,0);
});
