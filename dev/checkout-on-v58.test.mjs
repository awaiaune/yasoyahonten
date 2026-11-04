// Production-shaped local SQLite/DO/Square/Resend substitutes only. No network.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture as base,body,advance,products} from './production-native-fixture.mjs';
import {productionSquareRequest} from '../worker/src/production-policy.js';
const flags={PRODUCTION_CHECKOUT_ENABLED:'1',PRODUCTION_MANAGED_CHECKOUT_ENABLED:'1',PRODUCTION_MANAGEMENT_CATALOG_ENABLED:'0',PRODUCTION_MANAGEMENT_INVENTORY_ENABLED:'1'};
const fixture=t=>base(t,{env:flags,stocks:{'lemonbalm-10g':1,'yomogi-10g':3}});
const count=f=>f.native.prepare('SELECT COUNT(*) n FROM orders').get().n;
const post=async(f,path,b)=>(await f.call(path,b));
test('requested ON/OFF flag combination exposes checkout without granting Catalog writes',async t=>{
 const f=await fixture(t);const c=await(await f.call('/api/v1/checkout-capabilities')).json();assert.equal(c.checkoutEnabled,true);
 for(const [k,v]of Object.entries(flags))assert.equal(f.env[k],v);
 for(const path of ['/v2/catalog/batch-upsert','/v2/catalog/images'])assert.throws(()=>productionSquareRequest(f.env,'https://connect.squareup.com'+path,'POST','management'),e=>e.code==='PRODUCTION_MANAGEMENT_DENIED');
 const p=products[1];const r=await post(f,'/api/admin/products/'+p.id+'/publish',{operationId:crypto.randomUUID(),expectedVersion:2});assert.equal(r.status,403);assert(!f.squareCalls.some(c=>c.method!=='GET'&&c.path.startsWith('/v2/catalog/')));
});
test('two existing published products retain Variation/SKU/price, stock 1/3, fee and free-shipping boundary',async t=>{
 const f=await fixture(t);for(const p of products.filter(p=>!p.retired)){
  const row=f.native.prepare('SELECT * FROM mg_mappings WHERE variant_id=?').get(p.variantId);assert.equal(row.variation_id,p.variationId);assert.equal(row.sku,p.sku);
  const r=await post(f,'/api/v1/quote',{items:[{id:p.variantId,quantity:1}]});assert.equal(r.status,200);const q=await r.json();assert.deepEqual([q.subtotal,q.shipping,q.total,q.currency],[980,350,1330,'JPY']);
 }
 // Replenish only the mock to exercise the existing 3,000-yen threshold.
 const v=products[1].variationId;f.fake.counts.set(v,10);
 for(const [qty,ship,total]of [[3,350,3290],[4,0,3920]]){const q=await(await post(f,'/api/v1/quote',{items:[{id:'yomogi-10g',quantity:qty}]})).json();assert.deepEqual([q.shipping,q.total],[ship,total]);}
});
test('one Yomogi order debits once, persists one order, and accepts both order emails',async t=>{
 const f=await fixture(t),b=body();const rr=await Promise.all([post(f,'/api/v1/payments',b),post(f,'/api/v1/payments',b)]);assert(rr.every(r=>r.status===200));const r=await rr[0].json();assert.equal(r.amount,1330);assert.equal(r.inventoryAdjusted,true);assert.equal(count(f),3);assert.equal(f.fake.payments.size,1);assert.equal(f.fake.counts.get(products[1].variationId),2);assert.equal(f.mails.length,2);
 const o=f.native.prepare('SELECT * FROM orders WHERE payment_id=?').get(r.paymentId);assert.deepEqual([o.subtotal,o.shipping,o.total,o.inventory_adjusted],[980,350,1330,1]);
 const m=(await(await f.call('/api/admin/orders/'+r.orderReference+'/mail-status')).json()).mail;assert.equal(m.admin.state,'accepted');assert.equal(m.customer.state,'accepted');
 assert(!f.squareCalls.some(c=>c.method==='POST'&&c.path.startsWith('/v2/catalog/')));
});
test('server ignores client prices and totals and rejects invalid quantities',async t=>{
 const f=await fixture(t);const b=body();Object.assign(b,{total:1,shipping:0});Object.assign(b.items[0],{price:1,lineTotal:1});const r=await post(f,'/api/v1/payments',b);assert.equal(r.status,200);assert.equal((await r.json()).amount,1330);
 const invalid=body();invalid.items[0].quantity=0;assert.equal((await post(f,'/api/v1/payments',invalid)).status,400);assert.equal(f.fake.payments.size,1);
});
test('insufficient stock and a concurrent last-unit sale stop before another charge',async t=>{
 const f=await fixture(t);let b=body();b.items=[{id:'yomogi-10g',quantity:4}];assert.equal((await post(f,'/api/v1/payments',b)).status,409);assert.equal(f.fake.payments.size,0);
 const first=body(),second=body();first.items=second.items=[{id:'lemonbalm-10g',quantity:1}];const rr=await Promise.all([post(f,'/api/v1/payments',first),post(f,'/api/v1/payments',second)]);assert.deepEqual(rr.map(r=>r.status).sort(),[200,409]);assert.equal(f.fake.payments.size,1);assert.equal(f.fake.counts.get(products[0].variationId),0);
});
for(const mutation of ['price','sku','variation','location','currency','tracking','parent'])test('catalog '+mutation+' mismatch refuses payment without overwriting Square',async t=>{
 const f=await fixture(t),p=products[1],v=f.fake.objects.get(p.variationId);
 if(mutation==='price')v.item_variation_data.price_money.amount=1000;
 if(mutation==='sku')v.item_variation_data.sku='WRONG';
 if(mutation==='variation')f.native.prepare('UPDATE mg_mappings SET variation_id=? WHERE variant_id=?').run('UNKNOWNVARIATION','yomogi-10g');
 if(mutation==='location')v.absent_at_location_ids=[f.env.SQUARE_LOCATION_ID];
 if(mutation==='currency')v.item_variation_data.price_money.currency='USD';
 if(mutation==='tracking')v.item_variation_data.track_inventory=false;
 if(mutation==='parent')v.item_variation_data.item_id='OTHERITEMID';
 const r=await post(f,'/api/v1/payments',body());assert([400,404,409,422,503].includes(r.status),'status='+r.status+' body='+await r.clone().text());assert.equal(f.fake.payments.size,0);assert.equal(count(f),2);assert(!f.squareCalls.some(c=>c.method==='POST'&&c.path.startsWith('/v2/catalog/')));
});
for(const state of ['stopped','archived','draft'])test(state+' existing product cannot be bought through an old cart',async t=>{
 const f=await fixture(t);f.native.prepare('UPDATE mg_products SET status=? WHERE id=?').run(state,products[1].id);if(state==='draft')f.native.prepare('UPDATE mg_products SET published_revision=NULL WHERE id=?').run(products[1].id);
 const r=await post(f,'/api/v1/payments',body());assert([400,409,503].includes(r.status));assert.equal(f.fake.payments.size,0);
});
test('retired goldenrod variations remain forbidden',async t=>{
 const f=await fixture(t);for(const p of products.filter(p=>p.retired)){const b=body();b.items=[{id:p.variantId,quantity:1}];assert([400,409].includes((await post(f,'/api/v1/payments',b)).status));}assert.equal(f.fake.payments.size,0);
});
for(const failure of ['payment','projection','inventory'])test(failure+' failure recovers existing order after OFF without recharging',async t=>{
 const f=await fixture(t);const b=body();if(failure==='payment'){f.fake.loseAfter='/v2/payments';f.fake.lookupFails=true;}if(failure==='projection')f.db.failOrders=1;if(failure==='inventory')f.fake.failBefore='/v2/inventory/changes/batch-create';
 const initial=await post(f,'/api/v1/payments',b);assert([200,202].includes(initial.status));assert.equal(f.fake.payments.size,1);
 f.env.PRODUCTION_CHECKOUT_ENABLED='0';f.fake.lookupFails=false;f.fake.failBefore=null;advance(f);
 for(let i=0;i<3;i++){const r=await(await post(f,'/api/v1/payments/status',{attemptId:b.attemptId})).json();assert.equal(r.ok,true);assert.equal(r.inventoryAdjusted,true);}
 assert.equal((await post(f,'/api/v1/payments',body())).status,503);assert.equal(count(f),3);assert.equal(f.fake.payments.size,1);assert.equal(f.fake.counts.get(products[1].variationId),2);
});
test('OFF, invalid and missing checkout flags cannot open admission',async t=>{
 const f=await fixture(t);for(const value of ['0','true','',undefined]){if(value===undefined)delete f.env.PRODUCTION_CHECKOUT_ENABLED;else f.env.PRODUCTION_CHECKOUT_ENABLED=value;assert.equal((await(await f.call('/api/v1/checkout-capabilities')).json()).checkoutEnabled,false);assert.equal((await post(f,'/api/v1/payments',body())).status,503);}assert.equal(count(f),2);assert.equal(f.fake.payments.size,0);
});
test('missing published record cannot fall back to the legacy active catalog',async t=>{
 const f=await fixture(t);f.native.prepare('DELETE FROM mg_products WHERE id=?').run(products[1].id);const r=await post(f,'/api/v1/payments',body());assert([400,409,503].includes(r.status));assert.equal(f.fake.payments.size,0);assert.equal(count(f),2);
});
test('missing mapping and disabled published variant both fail closed',async t=>{
 const f=await fixture(t);const before=f.native.prepare('SELECT * FROM mg_mappings WHERE variant_id=?').get('yomogi-10g');f.native.prepare('DELETE FROM mg_mappings WHERE variant_id=?').run('yomogi-10g');assert.equal((await post(f,'/api/v1/payments',body())).status,503);
 f.native.prepare('INSERT INTO mg_mappings VALUES(?,?,?,?,?,?,?,?,?,?)').run(...Object.values(before));const row=f.native.prepare('SELECT data_json FROM mg_revisions WHERE product_id=? AND revision=1').get(products[1].id);const draft=JSON.parse(row.data_json);draft.variants[0].active=false;f.native.prepare('UPDATE mg_revisions SET data_json=? WHERE product_id=? AND revision=1').run(JSON.stringify(draft),products[1].id);assert([400,409].includes((await post(f,'/api/v1/payments',body())).status));assert.equal(f.fake.payments.size,0);
});
test('an already accepted order recovers after its product is stopped and checkout OFF',async t=>{
 const f=await fixture(t);f.fake.failBefore='/v2/inventory/changes/batch-create';const b=body();assert.equal((await post(f,'/api/v1/payments',b)).status,200);assert.equal(f.fake.payments.size,1);
 f.native.prepare("UPDATE mg_products SET status='stopped' WHERE id=?").run(products[1].id);f.env.PRODUCTION_CHECKOUT_ENABLED='0';f.fake.failBefore=null;advance(f);
 const r=await(await post(f,'/api/v1/payments/status',{attemptId:b.attemptId})).json();assert.equal(r.ok,true);assert.equal(r.inventoryAdjusted,true);assert.equal(f.fake.counts.get(products[1].variationId),2);assert.equal(f.fake.payments.size,1);
 const old=f.native.prepare("SELECT status,inventory_adjusted FROM orders WHERE order_reference LIKE 'old-%'").all();assert.equal(old.length,2);assert(old.every(o=>o.status==='shipped'&&o.inventory_adjusted===1));
});
test('stock receipt remains allowed with Catalog OFF; subsequent version drift is read-validated and purchasable',async t=>{
 const f=await fixture(t),p=products[1];
 const r=await post(f,'/api/admin/inventory/yomogi-10g',{operationId:crypto.randomUUID(),kind:'receipt',quantity:1,expectedQuantity:3,observedAt:new Date().toISOString(),reason:'ローカル入庫試験'});assert.equal(r.status,200,await r.clone().text());assert.equal((await r.json()).state,'done');assert.equal(f.fake.counts.get(p.variationId),4);
 f.fake.objects.get(p.variationId).version=2;f.fake.objects.get(p.itemId).version=2;
 const paid=await post(f,'/api/v1/payments',body());assert.equal(paid.status,200);assert.equal((await paid.json()).ok,true);assert.equal(f.fake.counts.get(p.variationId),3);assert.equal(f.fake.payments.size,1);assert(!f.squareCalls.some(c=>c.method==='POST'&&c.path.startsWith('/v2/catalog/')));
});
