import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,body,advance,products} from './production-native-fixture.mjs';
test('OFF: yomogi quote is 980 + 350 = 1330 JPY; payment admission stays closed',async t=>{
 const f=await fixture(t);const quote=await f.call('/api/v1/quote',{items:body().items});assert.equal(quote.status,200);const q=await quote.json();assert.deepEqual([q.subtotal,q.shipping,q.total,q.currency],[980,350,1330,'JPY']);
 const r=await f.call('/api/v1/payments',body());assert.equal(r.status,503);assert.equal(f.fake.payments.size,0);assert.equal(f.native.prepare('SELECT COUNT(*) n FROM orders').get().n,2);
});
test('local-only ON: duplicate submit produces one 1330 payment, one order, two email requests and one stock decrease',async t=>{
 const f=await fixture(t);f.env.PRODUCTION_CHECKOUT_ENABLED='1';const b=body();const results=await Promise.all([f.call('/api/v1/payments',b),f.call('/api/v1/payments',b)]);assert(results.every(r=>r.status===200));const r=await results[0].json();assert.equal(r.amount,1330);assert.equal(r.inventoryAdjusted,true);await f.drain();
 assert.equal(f.fake.payments.size,1);assert.equal([...f.fake.payments.values()][0].amount_money.amount,1330);assert.equal(f.fake.counts.get(products[1].variationId),4);
 const o=f.native.prepare('SELECT * FROM orders WHERE payment_id=?').get(r.paymentId);assert.deepEqual([o.subtotal,o.shipping,o.total,o.inventory_adjusted],[980,350,1330,1]);assert.equal(f.native.prepare('SELECT COUNT(*) n FROM orders').get().n,3);assert.equal(f.mails.length,2);assert.equal(new Set(f.mails.map(m=>m.key)).size,2);
});
test('unknown payment result reconciles the same attempt after OFF without a second payment',async t=>{
 const f=await fixture(t);f.env.PRODUCTION_CHECKOUT_ENABLED='1';f.fake.loseAfter='/v2/payments';f.fake.lookupFails=true;const b=body();const first=await f.call('/api/v1/payments',b);assert.equal(first.status,202);assert.equal(f.fake.payments.size,1);
 f.env.PRODUCTION_CHECKOUT_ENABLED='0';f.fake.lookupFails=false;advance(f);const r=await (await f.call('/api/v1/payments/status',{attemptId:b.attemptId})).json();assert.equal(r.ok,true);assert.equal(r.inventoryAdjusted,true);assert.equal(f.fake.payments.size,1);assert.equal(f.fake.counts.get(products[1].variationId),4);
});
test('D1 projection failure recovers after OFF without charging or decreasing stock twice',async t=>{
 const f=await fixture(t);f.env.PRODUCTION_CHECKOUT_ENABLED='1';f.db.failOrders=1;const b=body();assert.equal((await f.call('/api/v1/payments',b)).status,202);assert.equal(f.fake.payments.size,1);assert.equal(f.fake.counts.get(products[1].variationId),4);
 f.env.PRODUCTION_CHECKOUT_ENABLED='0';advance(f);const r=await(await f.call('/api/v1/payments/status',{attemptId:b.attemptId})).json();assert.equal(r.ok,true);assert.equal(f.fake.payments.size,1);assert.equal(f.fake.counts.get(products[1].variationId),4);assert.equal(f.native.prepare('SELECT COUNT(*) n FROM orders').get().n,3);
});
test('inventory failure is visible and recovers after OFF using the same payment key',async t=>{
 const f=await fixture(t);f.env.PRODUCTION_CHECKOUT_ENABLED='1';f.fake.failBefore='/v2/inventory/changes/batch-create';const b=body();const initial=await(await f.call('/api/v1/payments',b)).json();assert.equal(initial.inventoryAdjusted,false);assert.equal(initial.recoveryRequired,true);assert.equal(f.fake.payments.size,1);assert.equal(f.fake.counts.get(products[1].variationId),5);
 f.fake.failBefore=null;f.env.PRODUCTION_CHECKOUT_ENABLED='0';advance(f);const r=await(await f.call('/api/v1/payments/status',{attemptId:b.attemptId})).json();assert.equal(r.inventoryAdjusted,true);assert.equal(f.fake.payments.size,1);assert.equal(f.fake.counts.get(products[1].variationId),4);
});
test('both retired goldenrod IDs and old URL are rejected before a payment',async t=>{
 const f=await fixture(t);f.env.PRODUCTION_CHECKOUT_ENABLED='1';for(const p of products.filter(p=>p.retired)){const r=await f.call('/api/v1/quote',{items:[{id:p.variantId,quantity:1}]});assert([400,409].includes(r.status));const b=body();b.items=[{id:p.variantId,quantity:1}];assert([400,409].includes((await f.call('/api/v1/payments',b)).status));}assert.equal((await f.call('/products/goldenrod.html')).status,410);assert.equal(f.fake.payments.size,0);
});
test('price and SKU mismatches stop before a charge and never overwrite the published price',async t=>{
 const f=await fixture(t);f.env.PRODUCTION_CHECKOUT_ENABLED='1';const v=f.fake.objects.get(products[1].variationId);
 v.item_variation_data.price_money.amount=1000;
 assert.equal((await f.call('/api/v1/quote',{items:body().items})).status,409);
 v.item_variation_data.price_money.amount=980;v.item_variation_data.sku='wrong-sku';
 assert.equal((await f.call('/api/v1/quote',{items:body().items})).status,409);
 assert.equal(f.fake.payments.size,0);assert.equal(f.native.prepare('SELECT COUNT(*) n FROM orders').get().n,2);
});
test('Production checkout OFF still retries both failed emails using DO Alarm only',async t=>{
 const f=await fixture(t);f.env.PRODUCTION_CHECKOUT_ENABLED='1';f.mailControl.recipient='admin';const b=body();const r=await(await f.call('/api/v1/payments',b)).json();assert.equal(r.ok,true);assert.equal(f.mails.length,2);
 const before={payments:f.fake.payments.size,stock:f.fake.counts.get(products[1].variationId),orders:f.native.prepare('SELECT COUNT(*) n FROM orders').get().n};
 f.mailControl.recipient=null;f.env.PRODUCTION_CHECKOUT_ENABLED='0';advance(f);await f.coordinator.alarm();
 assert.equal(f.mails.length,3);assert.deepEqual(f.mails[0],f.mails[2]);assert.equal(f.receipts.size,2);
 const status=await f.call('/api/admin/orders/'+r.orderReference+'/mail-status');assert.equal(status.status,200);const mail=(await status.json()).mail;assert.equal(mail.admin.state,'accepted');assert.equal(mail.customer.state,'accepted');
 assert.deepEqual({payments:f.fake.payments.size,stock:f.fake.counts.get(products[1].variationId),orders:f.native.prepare('SELECT COUNT(*) n FROM orders').get().n},before);
 assert([401,403].includes((await f.call('/api/admin/orders/'+r.orderReference+'/mail-status',null,false)).status));
 assert.equal((await f.call('/api/v1/payments',body())).status,503);
});
for(const mode of ['lost','reject','concurrent'])test('Production Resend '+mode+' preserves recipient isolation, receipt semantics and immutable payload',async t=>{
 const f=await fixture(t);f.env.PRODUCTION_CHECKOUT_ENABLED='1';f.mailControl.recipient='customer';f.mailControl.mode=mode;const b=body(),r=await(await f.call('/api/v1/payments',b)).json();assert(r.ok);
 let mail=(await(await f.call('/api/admin/orders/'+r.orderReference+'/mail-status')).json()).mail;
 assert.equal(mail.admin.state,'accepted');assert.equal(mail.customer.state,mode==='reject'?'manual_review':'unknown');
 f.env.RESEND_FROM_EMAIL='changed@example.invalid';f.env.REPLY_TO_EMAIL='changed@example.invalid';f.env.PRODUCTION_CHECKOUT_ENABLED='0';f.mailControl.recipient=null;advance(f);await f.coordinator.alarm();
 mail=(await(await f.call('/api/admin/orders/'+r.orderReference+'/mail-status')).json()).mail;
 assert.equal(mail.customer.state,mode==='reject'?'manual_review':'accepted');assert.equal(f.fake.payments.size,1);assert.equal(f.fake.counts.get(products[1].variationId),4);
 if(mode!=='reject')assert.deepEqual(f.mails[1],f.mails[2]);assert.equal(f.native.prepare('SELECT COUNT(*) n FROM orders').get().n,3);
});
