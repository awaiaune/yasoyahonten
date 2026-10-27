import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {productionPolicy,productionSquareRequest,adaptProductionPurchase,adaptProductionPurchaseResponse} from '../worker/src/production-policy.js';
import {externalPolicy,assertSquareRequest} from '../worker/src/external-policy.js';
import {assertProductionAdmin} from '../production/access.js';
import {fixture,baseEnv,jwt,jwk,contact} from './production-fixture.mjs';
import {CATALOG} from '../worker/src/catalog.js';
const read={PRODUCTION_MANAGEMENT_READ_ENABLED:'1'},draft={...read,PRODUCTION_MANAGEMENT_DRAFT_ENABLED:'1'};
const inventory={...draft,PRODUCTION_MANAGEMENT_SCHEMA_READY:'1',PRODUCTION_MANAGEMENT_INVENTORY_ENABLED:'1',PRODUCTION_INVENTORY_WRITER_APPROVAL:'shared-purchase-do-single-writer-v1',MANAGEMENT_STOCK_WRITES:'single-writer'};
const catalog={...draft,PRODUCTION_MANAGEMENT_SCHEMA_READY:'1',PRODUCTION_MANAGEMENT_CATALOG_ENABLED:'1',PRODUCTION_CATALOG_CUTOVER_APPROVAL:'verified-storefront-and-pricing-v1'};
const fetcher=async()=>Response.json({keys:[jwk]});
const pending={attemptId:crypto.randomUUID(),phase:'unknown',ok:false};
test('production grants default off independently of existing checkout and order mail',()=>{
 assert.deepEqual(productionPolicy(baseEnv),{read:false,draft:false,images:false,catalog:false,inventory:false});assert.equal(externalPolicy(baseEnv).checkout,true);assert.equal(externalPolicy(baseEnv).mail,true);
 assert.equal(productionPolicy({...baseEnv,...draft}).images,false);assert.equal(productionPolicy({...baseEnv,...inventory}).catalog,false);
 for(const patch of [{PRODUCTION_MANAGEMENT_READ_ENABLED:true},{PRODUCTION_MANAGEMENT_DRAFT_ENABLED:'1'},{PRODUCTION_MANAGEMENT_CATALOG_ENABLED:'1',...read},{PRODUCTION_MANAGEMENT_INVENTORY_ENABLED:'1',...read},{SQUARE_LOCATION_ID:'unknown'},{SQUARE_ENVIRONMENT:'sandbox'},{LOCAL_SQUARE:{}},{SQUARE_SANDBOX_ACCESS_TOKEN:'offline'}])assert.throws(()=>productionPolicy({...baseEnv,...patch}));
});
test('management scope denies payments, read-only refuses writes and Sandbox still refuses Production',()=>{
 for(const p of ['/v2/catalog/batch-upsert','/v2/catalog/images','/v2/inventory/changes/batch-create','/v2/payments'])assert.throws(()=>productionSquareRequest(baseEnv,'https://connect.squareup.com'+p,'POST','management'));
 assert.doesNotThrow(()=>productionSquareRequest({...baseEnv,...catalog},'https://connect.squareup.com/v2/catalog/batch-upsert','POST','management'));
 assert.throws(()=>productionSquareRequest({...baseEnv,...catalog},'https://connect.squareup.com/v2/payments','POST','management'));
 assert.throws(()=>productionSquareRequest(baseEnv,'https://connect.squareupsandbox.com/v2/locations'));
 assert.throws(()=>assertSquareRequest({RUNTIME_TIER:'sandbox-validation',SQUARE_ENVIRONMENT:'sandbox',SQUARE_ACCESS_MODE:'READ_ONLY',VALIDATION_CHECKOUT_ENABLED:'0',VALIDATION_MAIL_ENABLED:'0',VALIDATION_CRON_ENABLED:'0'},'https://connect.squareup.com/v2/locations'));
});
test('legacy purchase without stable ID is rejected before payment; stable header and body adapters preserve identity',()=>{
 const req=new Request('https://payments.internal/api/payments'),env={...baseEnv,PRODUCTION_PURCHASE_PROTOCOL:'durable-v1'},id=crypto.randomUUID();
 assert.throws(()=>adaptProductionPurchase(req,{sourceId:'offline'},env),{code:'PURCHASE_CLIENT_UPGRADE_REQUIRED',status:409});
 assert.equal(adaptProductionPurchase(req,{attemptId:id},env).attemptId,id);
 assert.equal(adaptProductionPurchase(new Request(req,{headers:{'Idempotency-Key':id}}),{},env).attemptId,id);
 assert.throws(()=>adaptProductionPurchase(new Request(req,{headers:{'Idempotency-Key':id}}),{attemptId:crypto.randomUUID()},env),{code:'PURCHASE_ID_CONFLICT'});
 assert.throws(()=>adaptProductionPurchase(req,{attemptId:id},baseEnv),{code:'PURCHASE_COMPATIBILITY_UNVERIFIED'});
 const r=adaptProductionPurchaseResponse(pending,202);assert.equal(r.status,409);assert.equal(r.body.attemptId,pending.attemptId);assert.equal(r.body.error.code,'PURCHASE_PENDING');assert.equal(adaptProductionPurchaseResponse({ok:true},200).status,200);assert.equal(adaptProductionPurchaseResponse({status:'declined',ok:false},200,'/api/payments/status').status,200);
});
test('production Access verifies signed owner JWT, audience, expiry and exact Origin',async()=>{
 const req=async(patch={},headers={})=>new Request(baseEnv.PRODUCTION_ADMIN_ORIGIN+'/api/admin/products',{method:'POST',headers:{Origin:baseEnv.PRODUCTION_ADMIN_ORIGIN,'Cf-Access-Jwt-Assertion':await jwt(patch),...headers}});
 await assertProductionAdmin(await req(),baseEnv,{fetcher});
 for(const p of [{email:'other@example.invalid'},{aud:['b'.repeat(64)]},{exp:1}])await assert.rejects(()=>req(p).then(r=>assertProductionAdmin(r,baseEnv,{fetcher})),{status:401});
 await assert.rejects(()=>req({}, {Origin:'https://evil.invalid'}).then(r=>assertProductionAdmin(r,baseEnv,{fetcher})),{status:401});
});
test('production migrations preserve legacy orders and reject repeat/schema collision',async t=>{
 const f=await fixture(t);const row=await f.db.prepare("SELECT status,total FROM orders WHERE order_reference='existing-order'").first();assert.deepEqual(row,{status:'shipped',total:1330});
 const sql=await readFile(new URL('../worker/migrations-production/0001_management.sql',import.meta.url),'utf8');assert(!/\b(?:ALTER|DROP|DELETE|UPDATE)\s/i.test(sql));assert(!/\b(?:INSERT|REPLACE)\s/i.test(sql));
 const schema=await f.db.prepare("SELECT sql FROM sqlite_master WHERE name='mg_mappings'").first();assert(schema.sql.includes("environment='production'"));assert(schema.sql.includes('sku TEXT NOT NULL UNIQUE'));
 await assert.rejects(()=>f.db.prepare('CREATE TABLE mg_products(id TEXT)').run());
});
test('production legacy request sends no Square request; default admin access cannot write',async t=>{
 const f=await fixture(t);const r=await f.request('/api/payments','POST',{sourceId:'offline',items:[{id:'lemonbalm-10g',quantity:1}],contact});assert.equal(r.status,409);assert.equal((await r.json()).error.code,'PURCHASE_CLIENT_UPGRADE_REQUIRED');assert.equal(f.calls.length,0);
 assert.equal((await f.request('/api/admin/products')).status,403);assert.equal(f.fake.payments.size,0);
});
test('modern production-shaped purchase replay charges once and preserves existing shipped order and notification path',async t=>{
 const f=await fixture(t,{PRODUCTION_PURCHASE_PROTOCOL:'durable-v1'}),body={attemptId:crypto.randomUUID(),sourceId:'offline-card',items:[{id:'lemonbalm-10g',quantity:1}],contact};
 const results=await Promise.all([f.api('/api/payments','POST',body),f.api('/api/payments','POST',body)]);assert(results.every(r=>r.ok));assert.equal(f.fake.payments.size,1);assert.equal(f.fake.counts.get(CATALOG['lemonbalm-10g'].squareVariationId),0);
 const old=await f.db.prepare("SELECT status,total FROM orders WHERE order_reference='existing-order'").first();assert.deepEqual(old,{status:'shipped',total:1330});
 await f.mf.ready;assert.equal(f.mails.length,2);assert(f.calls.every(c=>!c.path.includes('catalog/batch-upsert')));
});
async function seedLink(f){const id='lemonbalm',v=CATALOG['lemonbalm-10g'];const body={operationId:crypto.randomUUID(),expectedVersion:0,slug:id,name:v.name,description:'既存説明',sortOrder:0,images:[],variants:[{id:'lemonbalm-10g',name:v.name,price:980,amount:'10g',maxQuantity:10,active:true}]};await f.api('/api/admin/products/'+id,'PUT',body);return {id,body,variationId:v.squareVariationId};}
test('production draft and verified linking preserve the actual SKU, never adopt hardcoded IDs as proof, and keep writes disabled',async t=>{
 const f=await fixture(t,draft),p=await seedLink(f);
 assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM mg_mappings').first()).n,0);
 await f.api('/api/admin/products/'+p.id+'/link','POST',{operationId:crypto.randomUUID(),expectedVersion:1,mappings:[{variantId:'lemonbalm-10g',variationId:p.variationId}]});
 const map=await f.db.prepare('SELECT * FROM mg_mappings').first();assert.equal(map.sku,'315102D');assert.equal(map.environment,'production');assert.equal(map.instance_id,baseEnv.PRODUCTION_INSTANCE_ID);
 const rows=(await f.api('/api/admin/inventory')).inventory;assert.equal(rows[0].quantity,1);assert.equal(rows[0].canWriteInventory,false);assert.equal(rows[0].source,'square-production');
 assert.equal((await f.request('/api/admin/products/'+p.id+'/publish','POST',{operationId:crypto.randomUUID(),expectedVersion:2})).status,403);assert(!f.calls.some(c=>c.path==='/v2/catalog/batch-upsert'));
});
test('production duplicate or mismatched SKU cannot persist a mapping',async t=>{
 const f=await fixture(t,draft),p=await seedLink(f);f.fake.objects.set('DUPLICATEVAR123',{id:'DUPLICATEVAR123',type:'ITEM_VARIATION',item_variation_data:{sku:'315102D'}});
 assert.equal((await f.request('/api/admin/products/'+p.id+'/link','POST',{operationId:crypto.randomUUID(),expectedVersion:1,mappings:[{variantId:'lemonbalm-10g',variationId:p.variationId}]})).status,409);assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM mg_mappings').first()).n,0);
});
test('production stock receipt and replay use the existing purchase namespace, preserve SKU and detect external stock changes',async t=>{
 const f=await fixture(t,inventory),p=await seedLink(f);await f.api('/api/admin/products/'+p.id+'/link','POST',{operationId:crypto.randomUUID(),expectedVersion:1,mappings:[{variantId:'lemonbalm-10g',variationId:p.variationId}]});
 const row=(await f.api('/api/admin/inventory')).inventory[0],input={operationId:crypto.randomUUID(),kind:'receipt',quantity:2,reason:'local test',expectedQuantity:1,observedAt:row.observedAt};
 assert.equal((await f.api('/api/admin/inventory/'+row.id,'POST',input)).state,'done');await f.api('/api/admin/inventory/'+row.id,'POST',input);assert.equal(f.fake.counts.get(p.variationId),3);
 assert.equal((await f.request('/api/admin/inventory/'+row.id,'POST',{...input,operationId:crypto.randomUUID()})).status,409);
 f.fake.objects.get(p.variationId).item_variation_data.sku='external-change';const fresh=(await f.api('/api/admin/inventory')).inventory[0];const j=await f.api('/api/admin/inventory/'+row.id,'POST',{...input,operationId:crypto.randomUUID(),expectedQuantity:3,observedAt:fresh.observedAt});assert.equal(j.state,'review');assert.equal(f.fake.counts.get(p.variationId),3);
});
test('read-only production schema preflight rejects conflicting management schema before applying any SQL',async t=>{
 const {reviewPreMigrationSchema}=await import('../production/schema-review.mjs');const f=await fixture(t,{},false);
 const reviewed=await reviewPreMigrationSchema(f.db);assert(reviewed.readyForReviewedAdditiveMigration);assert(reviewed.tables.includes('orders'));
 await f.db.prepare('CREATE TABLE mg_jobs(unexpected TEXT)').run();await assert.rejects(()=>reviewPreMigrationSchema(f.db));
});
test('production Catalog uses verified real-shaped SKU and fixed body after a lost response; existing price change remains blocked',async t=>{
 const f=await fixture(t,catalog),p=await seedLink(f);await f.api('/api/admin/products/'+p.id+'/link','POST',{operationId:crypto.randomUUID(),expectedVersion:1,mappings:[{variantId:'lemonbalm-10g',variationId:p.variationId}]});
 f.fake.loseAfter='/v2/catalog/batch-upsert';const input={operationId:crypto.randomUUID(),expectedVersion:2},j=await f.api('/api/admin/products/'+p.id+'/publish','POST',input);assert.equal(j.state,'retry');
 const before=await f.db.prepare('SELECT body_json FROM mg_jobs WHERE id=?').bind(j.id).first();assert(before.body_json.includes('315102D'));await f.api('/api/admin/jobs/'+j.id+'/retry','POST',{});assert.equal((await f.api('/api/admin/jobs')).jobs[0].state,'done');
 assert.equal((await f.db.prepare('SELECT body_json FROM mg_jobs WHERE id=?').bind(j.id).first()).body_json,before.body_json);assert.equal(f.fake.objects.get(p.variationId).item_variation_data.sku,'315102D');
 const saved=(await f.api('/api/admin/products/'+p.id)).product;await f.api('/api/admin/products/'+p.id,'PUT',{...p.body,variants:[{...p.body.variants[0],price:1200}],operationId:crypto.randomUUID(),expectedVersion:saved.version});
 assert.equal((await f.request('/api/admin/products/'+p.id+'/publish','POST',{operationId:crypto.randomUUID(),expectedVersion:saved.version+1})).status,409);
 assert.equal(f.fake.objects.get(p.variationId).item_variation_data.price_money.amount,980);
});
test('production markers and direct backend authentication fail closed without Square calls',async t=>{
 const f=await fixture(t,draft);assert.equal((await f.request('/api/admin/products','GET',undefined,{'Cf-Access-Jwt-Assertion':'unsigned'})).status,401);
 assert.equal((await f.request('/api/admin/products/offline','PUT',{}, {Origin:'https://evil.invalid'})).status,401);
 await f.db.prepare("UPDATE production_environment SET instance_id='wrong' WHERE id=1").run();assert.equal((await f.request('/api/admin/products')).status,503);assert.equal(f.calls.length,0);
});
test('production image grant is independent from draft and Catalog and public UI cannot bypass Access',async t=>{
 const f=await fixture(t,draft);const bytes=await readFile(new URL('../images/lemonbalm.jpg',import.meta.url));
 const r=await f.mf.dispatchFetch('https://payments.internal/api/admin/images',{method:'POST',headers:{Origin:baseEnv.PRODUCTION_ADMIN_ORIGIN,Authorization:'Bearer '+f.env.ADMIN_TOKEN,'Cf-Access-Jwt-Assertion':f.token,'Content-Type':'image/jpeg'},body:bytes});assert.equal(r.status,403);
 assert.equal((await f.db.prepare('SELECT COUNT(*) n FROM mg_images').first()).n,0);
 const response=await f.ui.dispatchFetch(baseEnv.PRODUCTION_ADMIN_ORIGIN+'/admin/');assert.equal(response.status,401);assert.equal(f.calls.length,0);
});
test('production paid order survives projection failure and status recovery without a second charge or inventory decrement',async t=>{
 const f=await fixture(t,{...read,PRODUCTION_PURCHASE_PROTOCOL:'durable-v1'});await f.db.prepare("CREATE TRIGGER offline_fail_order BEFORE INSERT ON orders BEGIN SELECT RAISE(FAIL,'offline projection failure'); END").run();
 const body={attemptId:crypto.randomUUID(),sourceId:'offline-only-card',items:[{id:'lemonbalm-10g',quantity:1}],contact};
 const first=await f.request('/api/payments','POST',body);assert.equal(first.status,409);assert.equal((await first.json()).error.code,'PURCHASE_PENDING');assert.equal(f.fake.payments.size,1);assert.equal(f.fake.counts.get(CATALOG['lemonbalm-10g'].squareVariationId),0);
 await f.db.prepare('DROP TRIGGER offline_fail_order').run();const waiting=await f.api('/api/payments/status','POST',{attemptId:body.attemptId});assert.equal(waiting.ok,false);const result=await f.api('/api/admin/payment-attempts/'+body.attemptId+'/recover','POST',{});assert.equal(result.ok,true);assert.equal(f.fake.payments.size,1);assert.equal(f.fake.counts.get(CATALOG['lemonbalm-10g'].squareVariationId),0);
 const rows=(await f.db.prepare("SELECT items_json FROM orders WHERE order_reference!='existing-order'").all()).results;assert.equal(rows.length,1);assert.equal(JSON.parse(rows[0].items_json)[0].squareVariationId,CATALOG['lemonbalm-10g'].squareVariationId);
});
test('malformed management-only settings do not disable the existing purchase or notification path',async t=>{
 const f=await fixture(t,{PRODUCTION_PURCHASE_PROTOCOL:'durable-v1',PRODUCTION_MANAGEMENT_CATALOG_ENABLED:'invalid'});
 assert.equal(externalPolicy(f.env).checkout,true);assert.equal(externalPolicy(f.env).mail,true);
 const result=await f.api('/api/payments','POST',{attemptId:crypto.randomUUID(),sourceId:'offline-card',items:[{id:'lemonbalm-10g',quantity:1}],contact});assert.equal(result.ok,true);assert.equal(f.fake.payments.size,1);
 assert.equal((await f.request('/api/admin/products')).status,503);
});
