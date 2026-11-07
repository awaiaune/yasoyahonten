// Real Worker/DO/SQLite, local Square and Resend substitutes only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {PaymentTrace,TRACE_RETENTION_MS} from '../worker/src/payment-trace.js';
import {fixture,body,advance} from './production-native-fixture.mjs';
class Storage{
 data=new Map();alarm=null;
 async get(k){return structuredClone(this.data.get(k));}
 async put(k,v){this.data.set(k,structuredClone(v));}
 async list({prefix='',limit=128}={}){return new Map([...this.data].filter(([k])=>k.startsWith(prefix)).sort().slice(0,limit));}
 async delete(k){this.data.delete(k);}
 async getAlarm(){return this.alarm;}
 async setAlarm(at){this.alarm=at;}
}
const flags={PRODUCTION_UNIFIED_PUBLISH_ENABLED:'0',PRODUCTION_STOREFRONT_PUBLISH_ENABLED:'1',PRODUCTION_CHECKOUT_ENABLED:'1',PRODUCTION_MANAGED_CHECKOUT_ENABLED:'1',PRODUCTION_MANAGEMENT_CATALOG_ENABLED:'0',PRODUCTION_MANAGEMENT_INVENTORY_ENABLED:'1'};
test('trace sanitizer excludes every private field and browser cannot forge server evidence',async()=>{
 const s=new Storage(),t=new PaymentTrace(s),id=crypto.randomUUID();
 await t.append(id,[{stage:'sdk_start',activation:true,sequence:1,token:'PRIVATE',contact:{email:'PRIVATE'},url:'PRIVATE',requestId:'PRIVATE'},{stage:'square_response',httpStatus:200},{stage:'csp_blocked',directive:'frame-src',sequence:2,blockedURI:'PRIVATE'}],'browser');
 await t.append(id,[{stage:'square_response',httpStatus:402,requestId:'safe-request-01',codes:['CARD_DECLINED_VERIFICATION_REQUIRED','PRIVATE'],body:'PRIVATE',headers:'PRIVATE'}]);
 const r=(await t.list())[0];assert.equal(r.events.length,3);assert(!JSON.stringify(r).includes('PRIVATE'));assert.equal(r.events[0].activation,true);
 assert.deepEqual(r.events[2].codes,['CARD_DECLINED_VERIFICATION_REQUIRED']);assert.equal(r.events[2].source,'server');assert.equal(r.events[2].requestId,'safe-request-01');
});
test('diagnostics expire without extending TTL, read is pure, cleanup keeps earlier recovery alarm',async()=>{
 let now=1000;const s=new Storage(),t=new PaymentTrace(s,()=>now),id=crypto.randomUUID();
 await t.append(id,[{stage:'sdk_start',sequence:1}],'browser');const expiry=s.data.get('payment-trace:'+id).expiresAt;
 now+=1000;await t.append(id,[{stage:'sdk_ok',sequence:2}],'browser');assert.equal(s.data.get('payment-trace:'+id).expiresAt,expiry);
 s.alarm=now+100;await t.prune();assert.equal(s.alarm,now+100);
 now=expiry;const before=structuredClone(s.data);assert.deepEqual(await t.list(),[]);assert.deepEqual(s.data,before);
 await t.prune();assert.equal(s.data.size,0);assert.equal(expiry,1000+TRACE_RETENTION_MS);
});
test('diagnostics bound cardinality and client volume without touching order or lock records',async()=>{
 const s=new Storage(),t=new PaymentTrace(s),id=crypto.randomUUID();s.data.set('sku-holds',{unchanged:['held']});s.data.set('attempt:legacy',{untouched:true});
 for(let i=1;i<=35;i++)await t.append(id,[{stage:'sdk_start',sequence:i}],'browser');
 assert.equal((await t.list())[0].events.length,24);
 for(let i=0;i<205;i++)await t.append(crypto.randomUUID(),[{stage:'square_send'}]);
 assert.equal((await t.list()).length,200);assert.deepEqual(s.data.get('sku-holds'),{unchanged:['held']});assert.deepEqual(s.data.get('attempt:legacy'),{untouched:true});
});
test('full payment journal links Square receipt, paid, stock, order and each mail state to same attempt',async t=>{
 const f=await fixture(t,{env:flags}),b=body(),original=f.fake.fetch.bind(f.fake);
 f.fake.fetch=async req=>{const r=await original(req);if(new URL(req.url).pathname==='/v2/payments'&&req.method==='POST'){const h=new Headers(r.headers);h.set('x-request-id','safe-square-request');return new Response(r.body,{status:r.status,headers:h});}return r;};
 const submitted=await (await f.call('/api/v1/payments',b)).json();assert.equal(submitted.ok,true);
 const history=await (await f.call('/api/admin/payment-attempts?include_failed=1&include_diagnostics=1')).json();
 const trace=history.diagnostics.find(r=>r.attemptId===b.attemptId);assert(trace);const stages=trace.events.map(e=>e.stage);
 for(const expected of ['square_send','square_response','payment_paid','inventory_applied','order_stored','mail_state'])assert(stages.includes(expected),expected);
 assert.equal(trace.events.find(e=>e.stage==='square_response').requestId,'safe-square-request');
 assert(trace.events.some(e=>e.stage==='mail_state'&&e.admin==='accepted'&&e.customer==='accepted'));
 const safe=JSON.stringify(trace);for(const forbidden of ['offline-card-only','buyer@example','offline-square','contact','sourceId','body'])assert(!safe.includes(forbidden));
 const counts={square:f.fake.payments.size,mail:f.mails.length,orders:f.native.prepare('SELECT COUNT(*) n FROM orders').get().n};
 const denied=await f.call('/api/admin/payment-attempts?include_failed=1&include_diagnostics=1',undefined,false);assert([401,403].includes(denied.status));
 await f.call('/api/v1/payments/status',{attemptId:b.attemptId,contractVersion:1});
 assert.deepEqual({square:f.fake.payments.size,mail:f.mails.length,orders:f.native.prepare('SELECT COUNT(*) n FROM orders').get().n},counts);
});
test('browser trace ingestion works with checkout OFF but cannot submit charge or update locks',async t=>{
 const f=await fixture(t,{env:{...flags,PRODUCTION_CHECKOUT_ENABLED:'0'}}),id=crypto.randomUUID();
 const before=structuredClone(f.storage.data);
 const r=await f.call('/api/v1/payment-diagnostics',{attemptId:id,clientRelease:'checkout-auth-activation-20261105',events:[{stage:'pay_click',activation:true,sequence:1},{stage:'square_send',requestId:'forged'}]},false);
 assert.equal(r.status,200);assert.equal(f.fake.payments.size,0);assert.equal(await f.coordinator.ledger.read(id),undefined);
 assert.equal((await f.coordinator.traces.list())[0].events.length,1);
 for(const [key,val]of before)assert.deepEqual(f.storage.data.get(key),val);
 const bad=await f.call('/api/v1/payment-diagnostics',{attemptId:id,events:[]},false);assert.equal(bad.status,400);
});
test('diagnostic storage failure cannot turn a confirmed payment into failure or duplicate charge',async t=>{
 const f=await fixture(t,{env:flags}),put=f.storage.put.bind(f.storage),b=body();
 f.storage.put=async(k,v)=>{if(typeof k==='string'&&k.startsWith('payment-trace:'))throw Error('diagnostic storage failure');return put(k,v);};
 const result=await (await f.call('/api/v1/payments',b)).json();assert.equal(result.ok,true);
 await f.call('/api/v1/payments/status',{attemptId:b.attemptId,contractVersion:1});assert.equal(f.fake.payments.size,1);assert.equal(f.mails.length,2);
});
test('mail retry with purchase OFF appends acceptance without any further charge or stock adjustment',async t=>{
 const f=await fixture(t,{env:flags}),b=body();f.mailControl.recipient='customer';f.mailControl.mode='lost';
 const paid=await (await f.call('/api/v1/payments',b)).json();assert.equal(paid.ok,true);const calls=f.squareCalls.filter(c=>c.method==='POST').length;
 f.env.PRODUCTION_CHECKOUT_ENABLED='0';f.mailControl.recipient=null;advance(f);await f.coordinator.ledger.mailAlarm();
 const trace=(await f.coordinator.traces.list()).find(r=>r.attemptId===b.attemptId);
 assert(trace.events.some(e=>e.stage==='mail_state'&&e.customer==='accepted'));assert.equal(f.squareCalls.filter(c=>c.method==='POST').length,calls);assert.equal(f.fake.payments.size,1);assert.equal(f.receipts.size,2);
});

for(const mode of ['declined','timeout'])test(`trace ${mode} keeps diagnosis separate from permission to retry payment`,async t=>{
 const f=await fixture(t,{env:flags}),b=body(),original=f.fake.fetch.bind(f.fake);let posts=0;
 f.fake.fetch=async req=>{
  if(new URL(req.url).pathname==='/v2/payments'&&req.method==='POST'){
   posts++;
   if(mode==='timeout')throw new DOMException('PRIVATE_NETWORK','TimeoutError');
   return Response.json({errors:[{code:'CARD_DECLINED_VERIFICATION_REQUIRED',category:'PAYMENT_METHOD_ERROR',detail:'PRIVATE_PROVIDER'}]},{status:402,headers:{'x-request-id':'safe-decline-request'}});
  }return original(req);
 };
 const result=await (await f.call('/api/v1/payments',b)).json();assert.equal(result.retryAllowed,false);assert.equal(result.ok,false);
 const trace=(await f.coordinator.traces.list()).find(r=>r.attemptId===b.attemptId);
 assert(trace.events.some(e=>e.stage==='payment_unknown'));
 if(mode==='declined'){
  const event=trace.events.find(e=>e.stage==='square_response');assert.equal(event.httpStatus,402);assert.deepEqual(event.codes,['CARD_DECLINED_VERIFICATION_REQUIRED']);assert.equal(event.requestId,'safe-decline-request');
 }else assert(trace.events.some(e=>e.stage==='square_unknown'));
 assert(!JSON.stringify(trace).includes('PRIVATE_'));
 await f.call('/api/v1/payments/status',{attemptId:b.attemptId,contractVersion:1});assert.equal(posts,1);assert.equal(f.receipts.size,0);
});
test('browser diagnostics at capacity cannot evict server payment evidence',async()=>{
 const s=new Storage(),t=new PaymentTrace(s),id=crypto.randomUUID();await t.append(id,[{stage:'square_send'}]);
 for(let i=0;i<210;i++)await t.append(crypto.randomUUID(),[{stage:'pay_click',sequence:1}],'browser');
 assert.equal((await t.list()).length,200);assert(s.data.has('payment-trace:'+id));
});
