// Pure local durable-storage/provider simulations. No real network or credentials.
import test from 'node:test';
import assert from 'node:assert/strict';
import {PurchaseLedger} from '../worker/src/purchase-ledger.js';
import {MAIL_RETRY_WINDOW_MS} from '../worker/src/order-mail-outbox.js';
class Storage {
 values=new Map(); alarmTime=null; fail=null;
 async get(k){return structuredClone(this.values.get(k));}
 async put(k,v){const entries=typeof k==='string'?[[k,v]]:Object.entries(k);if(this.fail?.(entries))throw Error('simulated crash');for(const [a,b]of entries)this.values.set(a,structuredClone(b));}
 async list({prefix='',limit=128,startAfter=''}={}){return new Map([...this.values].filter(([k])=>k.startsWith(prefix)&&k>startAfter).sort(([a],[b])=>a<b?-1:1).slice(0,limit).map(([k,v])=>[k,structuredClone(v)]));}
 async getAlarm(){return this.alarmTime;} async setAlarm(n){this.alarmTime=n;} async deleteAlarm(){this.alarmTime=null;}
}
function fixture(){
 const storage=new Storage(),requests=[],accepted=new Map(),orders=new Map();let now=1000000,charges=0,debits=0;
 const behavior={admin:'ok',customer:'ok'},payload={admin:'admin-body-v1',customer:'customer-body-v1'};
 const services={now:()=>now,location:'test-location',reference:()=>crypto.randomUUID(),
  validate:()=>({quote:{total:1330,currency:'JPY',items:[{id:'yomogi-10g'}]},contact:{email:'buyer@example.invalid'}}),stock:async()=>{},
  charge:async r=>{charges++;return{id:'payment-'+charges,status:'COMPLETED',reference_id:r.orderReference,amount_money:{amount:1330,currency:'JPY'},location_id:'test-location'};},
  lookup:async()=>{throw Error('must not reconcile payment when only email is pending');},
  decrement:async()=>{debits++;},project:async r=>{orders.set(r.id,r.payment.id);},
  mail:{prepare:r=>Object.fromEntries(['admin','customer'].map(kind=>[kind,{key:kind+'-'+r.payment.id,body:payload[kind]}])),send:async task=>{
    const kind=task.key.startsWith('admin-')?'admin':'customer';requests.push({key:task.key,body:task.body});
    const previous=accepted.get(task.key);if(previous){assert.equal(previous.body,task.body);return{id:previous.id};}
    if(behavior[kind]==='503')throw Object.assign(Error('private provider detail'),{code:'resend_unavailable'});
    if(behavior[kind]==='timeout')throw Error('private timeout');
    if(behavior[kind]==='reject')throw Object.assign(Error('private credential'),{code:'resend_request_rejected',permanent:true});
    if(behavior[kind]==='no-id')return{};
    const receipt={id:'email-'+accepted.size,body:task.body};accepted.set(task.key,receipt);
    if(behavior[kind]==='lost')throw Error('response lost after acceptance');
    return{id:receipt.id};
  }}
 };
 const make=()=>new PurchaseLedger(storage,services),ledger=make();
 const b={attemptId:crypto.randomUUID(),sourceId:'not-a-real-card'};
 return{storage,services,ledger,make,b,behavior,payload,requests,accepted,orders,advance(ms=60000){now+=ms;},count:()=>({charges,debits,orders:orders.size}),async state(){return ledger.mailStatus((await ledger.read(b.attemptId)).orderReference);},async alarm(){storage.alarmTime=null;await ledger.alarm();await ledger.mailAlarm();}};
}
test('two independent emails are persisted after order projection and only provider acceptance is marked',async()=>{
 const f=fixture();f.services.mail.send=async task=>{assert.equal(f.orders.size,1);const saved=await f.storage.get('order-mail:'+f.b.attemptId);assert.equal(saved.tasks[task.key.startsWith('admin')?'admin':'customer'].state,'unknown');return{id:task.key};};
 const r=await f.ledger.submit(f.b);assert.equal(r.ok,true);const state=await f.state();assert.equal(state.admin.state,'accepted');assert.equal(state.customer.state,'accepted');assert(!JSON.stringify(state).includes('delivered'));assert.deepEqual(f.count(),{charges:1,debits:1,orders:1});
});
for(const recipient of ['admin','customer'])test(recipient+' failure retries only that recipient after business completion and restart',async()=>{
 const f=fixture();f.behavior[recipient]='503';assert.equal((await f.ledger.submit(f.b)).ok,true);
 let state=await f.state();assert.equal(state[recipient].state,'unknown');assert.equal(state[recipient==='admin'?'customer':'admin'].state,'accepted');
 f.behavior[recipient]='ok';f.advance();const restart=f.make();await restart.alarm();await restart.mailAlarm();
 state=await f.state();assert.equal(state.admin.state,'accepted');assert.equal(state.customer.state,'accepted');assert.equal(f.requests.length,3);assert.deepEqual(f.count(),{charges:1,debits:1,orders:1});
});
for(const mode of ['503','timeout','lost','no-id'])test('Resend '+mode+' keeps durable unknown state and fixed key/body',async()=>{
 const f=fixture();f.behavior.admin=mode;await f.ledger.submit(f.b);assert.equal((await f.state()).admin.state,'unknown');
 f.payload.admin='changed after deploy';f.behavior.admin='ok';f.advance();await f.alarm();
 const req=f.requests.filter(r=>r.key.startsWith('admin'));assert.equal(req.length,2);assert.deepEqual(req[0],req[1]);assert.equal((await f.state()).admin.state,'accepted');assert.equal(f.accepted.size,2);assert.deepEqual(f.count(),{charges:1,debits:1,orders:1});
});
test('crash after provider acceptance before durable state save safely reconciles original request',async()=>{
 const f=fixture();let crash=true;
 f.storage.fail=entries=>{const r=entries.find(([k])=>k.startsWith('order-mail:'))?.[1];return crash&&r?.tasks.admin?.state==='accepted';};
 await f.ledger.submit(f.b);assert.equal(f.accepted.size,1);assert.equal((await f.state()).admin.state,'unknown');
 crash=false;f.advance();const restarted=f.make();await restarted.alarm();await restarted.mailAlarm();
 assert.equal((await f.state()).admin.state,'accepted');assert.equal((await f.state()).customer.state,'accepted');assert.equal(f.accepted.size,2);assert.deepEqual(f.requests[0],f.requests[1]);assert.deepEqual(f.count(),{charges:1,debits:1,orders:1});
});
test('outbox save failure after order save keeps purchase successful and is repaired by alarm index',async()=>{
 const f=fixture();f.storage.fail=entries=>entries.some(([k])=>k.startsWith('order-mail:'));const r=await f.ledger.submit(f.b);assert(r.ok);assert.equal(f.requests.length,0);assert.equal(await f.storage.get('mail-create:'+f.b.attemptId),true);assert(f.storage.alarmTime);
 f.storage.fail=null;f.advance();await f.alarm();assert.equal((await f.state()).customer.state,'accepted');assert.deepEqual(f.count(),{charges:1,debits:1,orders:1});
});
test('repeated status and duplicate submit never duplicate charge, stock, order or accepted mail',async()=>{
 const f=fixture();await f.ledger.submit(f.b);for(let i=0;i<10;i++){await f.ledger.recover(f.b.attemptId,true);await f.ledger.submit(f.b);}
 assert.equal(f.requests.length,2);assert.deepEqual(f.count(),{charges:1,debits:1,orders:1});
});
test('retry deadline stops automatic send, including force status, without replacing the key',async()=>{
 const f=fixture();f.behavior.admin='lost';await f.ledger.submit(f.b);const count=f.requests.length;f.advance(MAIL_RETRY_WINDOW_MS);await f.alarm();
 assert.equal((await f.state()).admin.state,'manual_review');assert.equal((await f.state()).admin.reason,'idempotency_window_expired');await f.ledger.recover(f.b.attemptId,true);assert.equal(f.requests.length,count);assert.equal(f.accepted.size,2);
});
test('permanent provider rejection is visible, is not blindly retried and leaks no provider message',async()=>{
 const f=fixture();f.behavior.admin='reject';await f.ledger.submit(f.b);const state=await f.state();assert.equal(state.admin.state,'manual_review');assert.equal(state.admin.reason,'resend_request_rejected');assert(!JSON.stringify(state).includes('private'));f.advance();await f.alarm();assert.equal(f.requests.length,2);
});
test('old attempted/queued emails are review-only and existing journal fields and unrelated DO data survive',async()=>{
 const f=fixture();await f.storage.put('sku-index-v2',true);const old={id:f.b.attemptId,phase:'paid',projection:'stored',inventory:'applied',orderReference:'old-order',payment:{id:'old-payment'},quote:{total:1330,items:[{id:'yomogi-10g'}]},emailAttempted:true,emailQueued:true,customField:'preserve'};
 await f.storage.put('attempt:'+old.id,old);await f.storage.put('unrelated:keep',{keep:true});await f.ledger.initialize();await f.ledger.mailAlarm();
 assert.equal((await f.ledger.mailStatus('old-order')).admin.reason,'legacy_delivery_unknown');assert.equal(f.requests.length,0);assert.equal((await f.ledger.read(old.id)).customField,'preserve');assert.deepEqual(await f.storage.get('unrelated:keep'),{keep:true});
});
test('old saved order with no send attempt is additively upgraded; D1-only order is unrecorded',async()=>{
 const f=fixture();await f.storage.put('attempt:'+f.b.attemptId,{id:f.b.attemptId,phase:'paid',projection:'stored',inventory:'applied',orderReference:'old-unsent',payment:{id:'old-pay'},quote:{items:[{id:'yomogi-10g'}]}});await f.ledger.mailAlarm();assert.equal((await f.ledger.mailStatus('old-unsent')).customer.state,'accepted');assert.equal((await f.ledger.mailStatus('D1-only')).admin.state,'unrecorded');assert.deepEqual(f.count(),{charges:0,debits:0,orders:0});
});
test('configuration repair before first submission freezes payload once and requires no order rewrite',async()=>{
 const f=fixture();const prepare=f.services.mail.prepare;f.services.mail.prepare=()=>{throw Error('missing configuration');};await f.ledger.submit(f.b);assert.equal((await f.state()).admin.reason,'mail_configuration_required');assert.equal(f.requests.length,0);
 f.services.mail.prepare=prepare;f.advance(300000);await f.alarm();assert.equal((await f.state()).admin.state,'accepted');assert.equal(f.requests.length,2);assert.deepEqual(f.count(),{charges:1,debits:1,orders:1});
});
test('mail scheduling preserves another subsystem earlier alarm, and completed mail cannot erase it',async()=>{
 const f=fixture();f.behavior.customer='503';await f.ledger.submit(f.b);await f.storage.setAlarm(1000001);await f.ledger.mailAlarm();assert.equal(f.storage.alarmTime,1000001);
 f.behavior.customer='ok';f.advance();await f.ledger.mailAlarm();assert.equal(f.requests.length,3);assert(f.storage.alarmTime);assert.equal((await f.state()).customer.state,'accepted');
});
test('outbox marker prevents the legacy sender from resending on rollback',async()=>{
 const f=fixture();await f.ledger.submit(f.b);const r=await f.ledger.read(f.b.attemptId);assert.equal(r.emailAttempted,true);assert.equal(r.orderMailVersion,1);assert.equal(r.emailQueued,undefined);
});
test('mail diagnostics expose neither recipient address, frozen body nor provider credentials',async()=>{
 const f=fixture();await f.ledger.submit(f.b);const state=JSON.stringify(await f.state());for(const text of ['@','body-v1','payment-','Authorization','Bearer'])assert(!state.includes(text));
});
test('mail scheduler scans every page and a failing order cannot starve the other orders',async()=>{
 const f=fixture();await f.storage.put('order-mail-index-v1',true);await f.storage.put('sku-index-v2',true);
 for(let i=0;i<130;i++){
  const id=String(i).padStart(3,'0'),record={id,orderReference:'order-'+id,phase:'paid',inventory:'applied',projection:'stored',payment:{id:'pay-'+id},quote:{items:[{id:'yomogi-10g'}]}};
  await f.storage.put('attempt:'+id,record);await f.ledger.mail.ensure(record);
 }
 f.storage.fail=entries=>entries.some(([k])=>k==='order-mail:000');
 for(let i=0;i<130;i++){f.advance();await f.ledger.mailAlarm();}
 assert.equal(f.accepted.size,258);assert.equal((await f.ledger.mailStatus('order-129')).customer.state,'accepted');assert.deepEqual(f.count(),{charges:0,debits:0,orders:0});
});
test('stock recovery alarm and mail alarm retain independent durable deadlines',async()=>{
 const f=fixture();f.behavior.admin='503';await f.ledger.submit(f.b);
 const unknown={id:'another',phase:'unknown',inventory:'pending',projection:'pending',quote:{items:[{id:'another-sku'}]},nextDue:1000001,createdAt:new Date(1000000).toISOString(),recoveryAttempts:0};
 await f.ledger.write(unknown);f.advance();await f.ledger.alarm();await f.ledger.mailAlarm();assert(f.storage.alarmTime);assert.equal((await f.ledger.read('another')).phase,'unknown');assert.equal((await f.state()).admin.state,'unknown');
 f.behavior.admin='ok';f.advance();await f.alarm();assert.equal((await f.state()).admin.state,'accepted');assert(f.storage.alarmTime);assert.deepEqual(f.count(),{charges:1,debits:1,orders:1});
});
