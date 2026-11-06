// Actual Production configuration shape; all external systems are local substitutes.
import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fixture as base,body,advance,products} from './production-native-fixture.mjs';
import {onConfig} from '../production/prepare-checkout-v58.mjs';
import {integratedPublication} from '../worker/src/management/integrated-policy.js';
import {Management} from '../worker/src/management/service.js';
import {inspectSalesCatalog} from '../worker/src/management/sales-version-proof.js';
export const off={PRODUCTION_UNIFIED_PUBLISH_ENABLED:'0',PRODUCTION_STOREFRONT_PUBLISH_ENABLED:'1',PRODUCTION_CHECKOUT_ENABLED:'0',PRODUCTION_MANAGED_CHECKOUT_ENABLED:'0',PRODUCTION_MANAGEMENT_CATALOG_ENABLED:'0',PRODUCTION_MANAGEMENT_INVENTORY_ENABLED:'1'};
const on={...off,PRODUCTION_CHECKOUT_ENABLED:'1',PRODUCTION_MANAGED_CHECKOUT_ENABLED:'1',PRODUCTION_CATALOG_CUTOVER_APPROVAL:'0'};
const fixture=(t,enabled=true)=>base(t,{env:enabled?on:off,stocks:{'lemonbalm-10g':1,'yomogi-10g':3}});
const read=async r=>({status:r.status,body:await r.json()});
const noCatalogWrites=f=>assert(!f.squareCalls.some(c=>c.path.startsWith('/v2/catalog/')&&c.method!=='GET'));
test('real OFF tuple prepares ON without enabling unified publish or granting Catalog approval',async()=>{
 const c=JSON.parse(await readFile(new URL('../production/release/ready.jsonc',import.meta.url),'utf8'));c.routes=[{pattern:'yasoyahonten.awaiaune.com',custom_domain:true}];Object.assign(c.vars,off,{PRODUCTION_CATALOG_CUTOVER_APPROVAL:'0'});const before=structuredClone(c),next=onConfig(c),expected=structuredClone(c);Object.assign(expected.vars,{PRODUCTION_CHECKOUT_ENABLED:'1',PRODUCTION_MANAGED_CHECKOUT_ENABLED:'1'});assert.deepEqual(next,expected);assert.deepEqual(c,before);assert.equal(integratedPublication(next.vars),false);
});
test('real OFF tuple rejects new payments through both aliases and leaves all data untouched',async t=>{
 const f=await fixture(t,false);assert.equal((await(await f.call('/api/v1/checkout-capabilities')).json()).checkoutEnabled,false);for(const p of ['/api/v1/payments','/api/payments'])assert.equal((await f.call(p,body())).status,503);assert.equal(f.fake.payments.size,0);assert.equal(f.fake.counts.get(products[1].variationId),3);assert.equal(f.native.prepare('SELECT COUNT(*) n FROM orders').get().n,2);noCatalogWrites(f);
});
test('unified OFF purchases an existing product exactly once with price, stock, D1 and independent emails',async t=>{
 const f=await fixture(t),b=body();assert.equal(integratedPublication(f.env),false);const rr=await Promise.all([f.call('/api/v1/payments',b),f.call('/api/payments',b)]);assert(rr.every(r=>r.status===200));const r=await rr[0].json();assert.equal(r.amount,1330);assert.equal(r.inventoryAdjusted,true);assert.equal(f.fake.payments.size,1);assert.equal(f.fake.counts.get(products[1].variationId),2);assert.equal(f.native.prepare('SELECT COUNT(*) n FROM orders').get().n,3);const mail=(await(await f.call('/api/admin/orders/'+r.orderReference+'/mail-status')).json()).mail;assert.equal(mail.admin.state,'accepted');assert.equal(mail.customer.state,'accepted');noCatalogWrites(f);assert.equal(f.env.PRODUCTION_CATALOG_CUTOVER_APPROVAL,'0');
});
for(const mutation of ['sku','parent','sellable','deleted','archived','location','location-price','duplicate-sku','instance','price','currency','tracking','name','item-deleted','location-tracking','version-rollback','snapshot','mapping-sku','mapping-location','mapping-environment','missing-mapping'])test('unified OFF refuses '+mutation+' mismatch before any charge',async t=>{
 const f=await fixture(t),p=products[1],v=f.fake.objects.get(p.variationId),item=f.fake.objects.get(p.itemId);
 if(mutation==='sku')v.item_variation_data.sku='WRONG';
 if(mutation==='parent')v.item_variation_data.item_id='WRONGITEM';
 if(mutation==='sellable')v.item_variation_data.sellable=false;
 if(mutation==='deleted')v.is_deleted=true;
 if(mutation==='archived')item.item_data.is_archived=true;
 if(mutation==='location'){v.present_at_all_locations=false;v.present_at_location_ids=[];}
 if(mutation==='location-price')v.item_variation_data.location_overrides=[{location_id:f.env.SQUARE_LOCATION_ID,price_money:{amount:1000,currency:'JPY'}}];
 if(mutation==='duplicate-sku')f.fake.objects.set('DUPLICATESKU',{type:'ITEM_VARIATION',id:'DUPLICATESKU',item_variation_data:{sku:p.sku}});
 if(mutation==='instance')f.native.prepare('UPDATE mg_mappings SET instance_id=? WHERE variant_id=?').run('wrong-instance',p.variantId);
 if(mutation==='price')v.item_variation_data.price_money.amount=1000;
 if(mutation==='currency')v.item_variation_data.price_money.currency='USD';
 if(mutation==='tracking')v.item_variation_data.track_inventory=false;
 if(mutation==='name')v.item_variation_data.name='別のVariation';
 if(mutation==='item-deleted')item.is_deleted=true;
 if(mutation==='location-tracking')v.item_variation_data.location_overrides=[{location_id:f.env.SQUARE_LOCATION_ID,track_inventory:false}];
 if(mutation==='version-rollback'){v.version=0;item.version=0;}
 if(mutation==='snapshot')item.item_data.variations=[{...v,version:2}];
 if(mutation==='mapping-sku')f.native.prepare('UPDATE mg_mappings SET sku=? WHERE variant_id=?').run('UNVERIFIED',p.variantId);
 if(mutation==='mapping-location')f.native.prepare('UPDATE mg_mappings SET location_id=? WHERE variant_id=?').run('WRONGLOCATION',p.variantId);
 if(mutation==='mapping-environment'){f.native.exec('PRAGMA ignore_check_constraints=ON');f.native.prepare('UPDATE mg_mappings SET environment=? WHERE variant_id=?').run('sandbox',p.variantId);f.native.exec('PRAGMA ignore_check_constraints=OFF');}
 if(mutation==='missing-mapping')f.native.prepare('DELETE FROM mg_mappings WHERE variant_id=?').run(p.variantId);
 const r=await read(await f.call('/api/v1/payments',body()));assert(r.status>=400,'unsafe admission status='+r.status);assert.equal(f.fake.payments.size,0);assert.equal(f.fake.counts.get(p.variationId),3);assert.equal(f.native.prepare('SELECT COUNT(*) n FROM orders').get().n,2);noCatalogWrites(f);
});
test('unified OFF revalidates a harmless version increase with fixed identity and no D1 adoption or Square write',async t=>{
 const f=await fixture(t),p=products[1];f.fake.objects.get(p.variationId).version=2;f.fake.objects.get(p.itemId).version=2;const before=f.native.prepare('SELECT total_changes() n').get().n;
 const q=await read(await f.call('/api/v1/quote',{items:body().items}));assert.equal(q.status,200);assert.equal(q.body.total,1330);assert.equal(f.native.prepare('SELECT total_changes() n').get().n,before);assert.equal(f.native.prepare('SELECT variation_version FROM mg_mappings WHERE variant_id=?').get(p.variantId).variation_version,1);noCatalogWrites(f);
});
for(const state of ['draft','stopped','archived','missing'])test('unified OFF cannot revive '+state+' through the static catalog',async t=>{
 const f=await fixture(t);if(state==='missing')f.native.prepare('DELETE FROM mg_products WHERE id=?').run(products[1].id);else f.native.prepare('UPDATE mg_products SET status=?,published_revision=? WHERE id=?').run(state,state==='draft'?null:1,products[1].id);const r=await f.call('/api/v1/payments',body());assert(r.status>=400);assert.equal(f.fake.payments.size,0);noCatalogWrites(f);
});
test('real profile tuple order is 0/1/0/0/0/1, diagnostic read is available without unified publication',async t=>{
 assert.deepEqual(Object.values(off),['0','1','0','0','0','1']);const f=await fixture(t,false),p=products[1];const before=f.native.prepare('SELECT COUNT(*) n FROM mg_jobs').get().n;
 const report=await read(await f.call('/api/admin/products/'+p.id+'/sync-check',{}));assert.equal(report.status,200);assert.equal(report.body.variants[0].checkout.ok,true);assert.equal(f.native.prepare('SELECT COUNT(*) n FROM mg_jobs').get().n,before);assert.equal(f.fake.payments.size,0);assert.equal(f.fake.counts.get(p.variationId),3);noCatalogWrites(f);
});
test('readonly diagnostic and failed Catalog publication never create a Square write grant',async t=>{
 const f=await fixture(t,false),p=products[1];const before=f.native.prepare('SELECT COUNT(*) n FROM mg_jobs').get().n;
 assert.equal((await f.call('/api/admin/products/'+p.id+'/publish',{operationId:crypto.randomUUID(),expectedVersion:2})).status,403);
 assert.equal((await f.call('/api/admin/products/'+p.id+'/sync-check',{},false)).status,401);
 assert.equal(f.native.prepare('SELECT COUNT(*) n FROM mg_jobs').get().n,before);assert.equal(f.env.PRODUCTION_UNIFIED_PUBLISH_ENABLED,'0');assert.equal(f.env.PRODUCTION_MANAGEMENT_CATALOG_ENABLED,'0');noCatalogWrites(f);
});
for(const failure of ['payment','projection','inventory','mail'])test('unified OFF '+failure+' failure recovers after reverting to exact production OFF tuple',async t=>{
 const f=await fixture(t),b=body();if(failure==='payment'){f.fake.loseAfter='/v2/payments';f.fake.lookupFails=true;}if(failure==='projection')f.db.failOrders=1;if(failure==='inventory')f.fake.failBefore='/v2/inventory/changes/batch-create';if(failure==='mail')f.mailControl.recipient='customer';
 await f.call('/api/v1/payments',b);assert.equal(f.fake.payments.size,1);Object.assign(f.env,off);f.fake.lookupFails=false;f.fake.failBefore=null;f.mailControl.recipient=null;advance(f);
 for(let i=0;i<2;i++){const r=await(await f.call('/api/v1/payments/status',{attemptId:b.attemptId})).json();assert(r.ok);assert(r.inventoryAdjusted);}
 await f.coordinator.alarm();assert.equal(f.fake.payments.size,1);assert.equal(f.fake.counts.get(products[1].variationId),2);assert.equal(f.native.prepare('SELECT COUNT(*) n FROM orders').get().n,3);assert.equal((await f.call('/api/v1/payments',body())).status,503);const row=await f.coordinator.ledger.read(b.attemptId);const mail=await f.coordinator.ledger.mailStatus(row.orderReference);assert.equal(mail.admin.state,'accepted');assert.equal(mail.customer.state,'accepted');noCatalogWrites(f);
});
test('unified OFF allows inventory receipt and later checkout without a Catalog job or version adoption',async t=>{
 const f=await fixture(t);const result=await read(await f.call('/api/admin/inventory/yomogi-10g',{operationId:crypto.randomUUID(),kind:'receipt',quantity:1,expectedQuantity:3,observedAt:new Date().toISOString(),reason:'ローカル再現'}));assert.equal(result.status,200);assert.equal(result.body.state,'done');assert.equal(f.fake.counts.get(products[1].variationId),4);
 f.fake.objects.get(products[1].variationId).version=2;f.fake.objects.get(products[1].itemId).version=2;const paid=await read(await f.call('/api/v1/payments',body()));assert.equal(paid.status,200);assert(paid.body.ok);assert.equal(f.fake.counts.get(products[1].variationId),3);assert.equal(f.fake.payments.size,1);noCatalogWrites(f);
});
test('unified OFF unknown purchase survives DO reconstruction under the exact OFF profile',async t=>{
 const f=await fixture(t),b=body();f.fake.loseAfter='/v2/payments';f.fake.lookupFails=true;assert.equal((await f.call('/api/v1/payments',b)).status,202);assert.equal(f.fake.payments.size,1);
 const env={...f.env,...off};delete env.MANAGED_CATALOG;f.fake.lookupFails=false;
 const restarted=new f.coordinator.constructor({storage:f.storage,waitUntil(){}},env);restarted.ledger.services.now=()=>Date.now()+360000;
 for(let i=0;i<2;i++){const r=await restarted.fetch(new Request('https://purchase.internal/status',{method:'POST',body:JSON.stringify({attemptId:b.attemptId})}));const result=await r.json();assert(result.ok);assert(result.inventoryAdjusted);}
 assert.equal(f.fake.payments.size,1);assert.equal(f.fake.counts.get(products[1].variationId),2);assert.equal(f.native.prepare('SELECT COUNT(*) n FROM orders').get().n,3);noCatalogWrites(f);
});

for(const permission of ['MANAGEMENT_ENABLED','PRODUCTION_MANAGEMENT_READ_ENABLED','PRODUCTION_MANAGEMENT_SCHEMA_READY'])test('read verification cannot bypass '+permission,async t=>{
 const f=await fixture(t),env={...f.env,[permission]:'0'},manager=new Management(env,f.storage),mapping=f.native.prepare('SELECT * FROM mg_mappings WHERE variant_id=?').get('yomogi-10g');const before=f.squareCalls.length;
 await assert.rejects(()=>inspectSalesCatalog(manager,mapping,f.fake.objects.get(products[1].variationId),{id:'yomogi-10g',name:'通常',unitPrice:980}),e=>e.status===403);assert.equal(f.squareCalls.length,before);assert.equal(f.fake.payments.size,0);
});
