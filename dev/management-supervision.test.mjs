// Fault injection: local D1/DO and fake Square/mail only. No network or credentials.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createManagementRuntime} from './management-server.mjs';
import {Management} from '../worker/src/management/service.js';
import worker,{PurchaseCoordinator} from '../worker/src/index.js';
import sandboxWorker from '../validation/sandbox-worker.js';
function memory(){const map=new Map();return {fail:false,alarm:null,events:[],get:async k=>map.get(k),put:async(k,v)=>{if(typeof k==='string')map.set(k,v);else for(const [name,value]of Object.entries(k))map.set(name,value);},list:async({prefix='',startAfter='',limit=128}={})=>new Map([...map].filter(([k])=>k.startsWith(prefix)&&k>startAfter).sort(([a],[b])=>a.localeCompare(b)).slice(0,limit)),async getAlarm(){if(this.fail)throw Error('offline alarm');return this.alarm;},async setAlarm(at){if(this.fail)throw Error('offline alarm');this.events.push('alarm');this.alarm=at;},async deleteAlarm(){this.alarm=null;}};}
async function fixture(t){
 const r=await createManagementRuntime();t.after(()=>r.mf.dispose());const storage=memory(),calls=[],receipts=new Map();let clock=Date.now(),loseMail=false;
 const services={now:()=>clock,notify:async(payload,key)=>{calls.push({payload:structuredClone(payload),key});const body=JSON.stringify(payload);if(receipts.has(key))assert.equal(receipts.get(key),body);else receipts.set(key,body);if(loseMail){loseMail=false;throw Error('offline mail acknowledgment lost');}return true;}};
 const env={...r.options.bindings,ORDERS_DB:r.db,LOCAL_SQUARE:{fetch:(req,opts)=>r.square.fetch(typeof req==='string'?new Request(req,opts):req)},LOCAL_RESEND:{fetch:async()=>Response.json({id:'offline-only'})}};
 const manager=()=>new Management(env,storage,services),m=manager();
 const add=async(name='monitor-herb')=>{const id=crypto.randomUUID();await m.save(id,{operationId:crypto.randomUUID(),expectedVersion:0,slug:name,name:'架空ハーブ',description:'説明',alt:'写真',sortOrder:0,images:[],variants:[{id:name+'-10g',name:'架空ハーブ 10g',price:980,maxQuantity:10,active:true,amount:'10g'}]},'test-admin');return id;};
 const publish=id=>m.publish(id,{expectedVersion:1,operationId:crypto.randomUUID()},'test-admin');
 const due=()=>r.db.prepare('UPDATE mg_jobs SET next_due=0').run();
 return {r,m,manager,storage,services,env,calls,receipts,add,publish,due,advance:n=>clock+=n,loseMail:()=>loseMail=true};
}
test('stop immediately after job commit leaves an already-reserved Alarm; restart recovers the same ID once',async t=>{
 const f=await fixture(t),id=await f.add(),batch=f.m.s.batch.bind(f.m.s);let stopped=false;
 f.m.s.batch=async rows=>{const out=await batch(rows);if(rows.some(([sql])=>sql.startsWith('INSERT INTO mg_jobs'))){assert(f.storage.alarm);stopped=true;throw Error('simulated process stop');}return out;};
 await assert.rejects(()=>f.publish(id));assert(stopped);assert.equal(f.r.square.calls.length,0);const j=await f.r.db.prepare('SELECT * FROM mg_jobs').first();assert.equal(j.state,'queued');
 await f.due();await f.manager().recover();await f.manager().recover();assert.equal((await f.m.job(j.id)).state,'done');assert.equal(f.r.square.receipts.size,1);
});
test('Alarm failure persists queued jobs without external effects; independent scheduled watchdog recovers without a browser',async t=>{
 const f=await fixture(t),id=await f.add();f.storage.fail=true;const j=await f.publish(id);assert.equal(j.state,'queued');assert.equal(f.r.square.calls.length,0);assert.equal((await f.m.supervision.status()).alarmState,'failed');
 f.storage.fail=false;const coordinator=new PurchaseCoordinator({storage:f.storage,waitUntil:()=>{}},f.env);let ticks=0;
 const env={...f.env,PURCHASE_COORDINATOR:{idFromName:name=>{assert.equal(name,'yasoya-honten-global-purchase-lock');return name;},get:()=>({fetch:(url,options)=>{ticks++;return coordinator.fetch(new Request(url,options));}})}};
 await Promise.all([worker.scheduled({},env,{}),worker.scheduled({},env,{})]);assert.equal(ticks,2);assert.equal((await f.m.job(j.id)).state,'done');assert.equal(f.r.square.receipts.size,1);
});
test('Alarm failure after commit never permits the first external write; later startup inspection repairs the reservation',async t=>{
 const f=await fixture(t),id=await f.add(),batch=f.m.s.batch.bind(f.m.s);f.m.s.batch=async rows=>{const value=await batch(rows);if(rows.some(([s])=>s.startsWith('INSERT INTO mg_jobs')))f.storage.fail=true;return value;};
 const j=await f.publish(id);assert.equal(j.state,'queued');assert.equal(f.r.square.calls.length,0);f.storage.fail=false;
 await f.manager().supervision.tick({run:false});assert(f.storage.alarm);assert.equal(f.r.square.calls.length,0);await f.due();await f.manager().recover();assert.equal((await f.m.job(j.id)).state,'done');
});
test('lost Catalog response replays the exact stored body/key, preserving one Item and one mapping',async t=>{
 const f=await fixture(t),id=await f.add();f.r.square.loseAfter='/v2/catalog/batch-upsert';const j=await f.publish(id);assert.equal(j.state,'retry');const before=await f.r.db.prepare('SELECT body_json FROM mg_jobs WHERE id=?').bind(j.id).first();await f.due();await f.manager().recover();
 assert.equal((await f.m.job(j.id)).state,'done');assert.equal((await f.r.db.prepare('SELECT body_json FROM mg_jobs WHERE id=?').bind(j.id).first()).body_json,before.body_json);assert.equal(f.r.square.receipts.size,1);assert.equal((await f.r.db.prepare('SELECT COUNT(*) AS n FROM mg_mappings').first()).n,1);
});
test('Square success followed by publication DB failure retries only the durable projection',async t=>{
 const f=await fixture(t),id=await f.add();await f.r.db.prepare("CREATE TRIGGER offline_projection_failure BEFORE UPDATE OF published_revision ON mg_products BEGIN SELECT RAISE(FAIL,'offline failure'); END").run();const j=await f.publish(id);assert.equal(j.state,'retry');const calls=f.r.square.calls.length;
 await f.r.db.prepare('DROP TRIGGER offline_projection_failure').run();await f.due();await f.manager().recover();assert.equal((await f.m.job(j.id)).state,'done');assert.equal(f.r.square.calls.length,calls);
});
test('expired unknown job becomes review, retains locks and never sends a new Catalog request',async t=>{
 const f=await fixture(t),id=await f.add();f.storage.fail=true;const j=await f.publish(id);f.storage.fail=false;await f.r.db.prepare("UPDATE mg_jobs SET state='running',created_at=? WHERE id=?").bind(new Date(Date.now()-3700000).toISOString(),j.id).run();
 await f.manager().recover();assert.equal((await f.m.job(j.id)).state,'review');assert.equal(f.r.square.calls.length,0);assert.equal(f.receipts.size,1);assert.equal(f.calls[0].payload.event,'review');assert.equal((await f.r.db.prepare('SELECT COUNT(*) AS n FROM mg_locks').first()).n,1);
 await f.manager().recover();assert.equal(f.calls.length,1);assert(f.calls[0].key.startsWith('management-sync-'));
});
test('stalled jobs are detected; notification acknowledgment loss retries the same immutable payload and key',async t=>{
 const f=await fixture(t),id=await f.add();f.r.square.failBefore='/v2/catalog/batch-upsert';const j=await f.publish(id);await f.r.db.prepare('UPDATE mg_jobs SET created_at=? WHERE id=?').bind(new Date(Date.now()-960000).toISOString(),j.id).run();f.loseMail();await f.manager().recover();assert.equal(f.calls.length,1);assert.equal(f.calls[0].payload.event,'stalled');
 f.advance(60000);await f.manager().recover();assert.equal(f.calls.length,2);assert.deepEqual(f.calls[1],f.calls[0]);assert.equal(f.receipts.size,1);assert.equal((await f.m.job(j.id)).notificationState,'sent');
});
test('notification DB acknowledgment failure cannot create duplicate delivered mail across restarts',async t=>{
 const f=await fixture(t),id=await f.add();f.storage.fail=true;const j=await f.publish(id);f.storage.fail=false;await f.r.db.prepare("UPDATE mg_jobs SET state='review' WHERE id=?").bind(j.id).run();
 await f.r.db.prepare("CREATE TRIGGER offline_notice_failure BEFORE UPDATE OF sent_at ON mg_job_notifications BEGIN SELECT RAISE(FAIL,'offline failure'); END").run();await f.manager().recover();assert.equal(f.receipts.size,1);
 await f.r.db.prepare('DROP TRIGGER offline_notice_failure').run();f.advance(60000);await f.manager().recover();assert.equal(f.receipts.size,1);assert.equal(f.calls.length,2);assert.equal((await f.m.job(j.id)).notificationState,'sent');
});
test('unknown mail acknowledgment expires conservatively without changing key; missing mail config is visible and recoverable',async t=>{
 const f=await fixture(t),id=await f.add();f.storage.fail=true;const j=await f.publish(id);f.storage.fail=false;await f.r.db.prepare("UPDATE mg_jobs SET state='review' WHERE id=?").bind(j.id).run();const notify=f.services.notify;delete f.services.notify;
 await f.manager().recover();assert.equal((await f.m.job(j.id)).notificationState,'blocked');assert.equal(f.receipts.size,0);f.services.notify=notify;f.advance(300001);f.loseMail();await f.manager().recover();assert.equal(f.receipts.size,1);f.advance(3600001);await f.manager().recover();assert.equal((await f.m.job(j.id)).notificationState,'expired');assert.equal(f.calls.length,1);
});
test('startup scan detects review and long unfinished jobs without sending; short healthy jobs do not notify',async t=>{
 const f=await fixture(t),id=await f.add();f.storage.fail=true;const j=await f.publish(id);f.storage.fail=false;await f.manager().supervision.tick({run:false});assert.equal((await f.r.db.prepare('SELECT COUNT(*) AS n FROM mg_job_notifications').first()).n,0);
 await f.r.db.prepare("UPDATE mg_jobs SET state='review' WHERE id=?").bind(j.id).run();await f.manager().supervision.tick({run:false});assert.equal(f.calls.length,0);assert.equal((await f.r.db.prepare('SELECT COUNT(*) AS n FROM mg_job_notifications').first()).n,1);
});
test('scheduled entry fails closed for production or missing validation markers and has no HTTP backdoor',async t=>{
 const f=await fixture(t);let calls=0;const env={...f.env,SQUARE_ENVIRONMENT:'production',PURCHASE_COORDINATOR:{idFromName(){calls++;}}};await assert.rejects(()=>worker.scheduled({},env,{}));await assert.rejects(()=>sandboxWorker.scheduled({},env,{}));assert.equal(calls,0);
 await worker.scheduled({},{MANAGEMENT_ENABLED:'0'},{});assert.equal(f.r.square.calls.length,0);
 const r=await f.r.mf.dispatchFetch('http://127.0.0.1:8000/api/admin/management-monitor',{method:'POST'});assert.notEqual(r.status,200);
});

test('stored successful Square results project after the replay window without a new external request or a stale alert',async t=>{
 const f=await fixture(t),id=await f.add();await f.r.db.prepare("CREATE TRIGGER offline_late_projection BEFORE UPDATE OF published_revision ON mg_products BEGIN SELECT RAISE(FAIL,'offline failure'); END").run();const j=await f.publish(id);const calls=f.r.square.calls.length;
 await f.r.db.prepare('DROP TRIGGER offline_late_projection').run();await f.r.db.prepare('UPDATE mg_jobs SET created_at=?,next_due=0 WHERE id=?').bind(new Date(Date.now()-7200000).toISOString(),j.id).run();await f.manager().recover();
 assert.equal((await f.m.job(j.id)).state,'done');assert.equal(f.r.square.calls.length,calls);assert.equal(f.calls.length,0);assert.equal((await f.m.job(j.id)).notificationState,'cancelled');
});
test('existing mail transport delivers a distinct admin-only management notice once across duplicate watchdog and Alarm events',async t=>{
 const f=await fixture(t),id=await f.add();f.storage.fail=true;const j=await f.publish(id);f.storage.fail=false;await f.r.db.prepare("UPDATE mg_jobs SET state='review' WHERE id=?").bind(j.id).run();const messages=[];
 const env={...f.env,LOCAL_RESEND:{fetch:async(url,opts)=>{assert.equal(url,'https://api.resend.com/emails');messages.push({key:opts.headers['Idempotency-Key'],body:JSON.parse(opts.body)});return Response.json({id:'offline-management-notice'});}}};
 const coordinator=new PurchaseCoordinator({storage:f.storage,waitUntil:()=>{}},env);
 await Promise.all([coordinator.fetch(new Request('https://internal/management-monitor',{method:'POST',body:'{}'})),coordinator.alarm()]);
 assert.equal(messages.length,1);assert.equal(messages[0].key,'management-sync-'+j.id);assert.deepEqual(messages[0].body.to,[env.ORDER_NOTIFICATION_EMAIL]);assert.equal(messages[0].body.cc,undefined);assert.equal(messages[0].body.bcc,undefined);assert.match(messages[0].body.subject,/管理同期/);assert(!messages[0].body.text.includes('test-admin'));assert.equal((await f.m.job(j.id)).notificationState,'sent');
});

test('purchase Alarm still loads the managed catalog for legacy recovery and management monitoring runs even if the order Alarm fails',async t=>{
 const f=await fixture(t),coordinator=new PurchaseCoordinator({storage:f.storage,waitUntil:()=>{}},f.env);let orderCalls=0;
 coordinator.ledger.alarm=async()=>{orderCalls++;assert.deepEqual(f.env.MANAGED_CATALOG,{});throw Error('offline order alarm failure');};
 await assert.rejects(()=>coordinator.alarm());assert.equal(orderCalls,1);assert((await f.m.supervision.status()).lastScanAt);assert(f.storage.alarm);
});

test('reserved Alarm with a rolled-back job batch is harmless; restart and same-ID retry create no orphan locks or duplicates',async t=>{
 const f=await fixture(t),id=await f.add(),op=crypto.randomUUID();
 await f.r.db.prepare("CREATE TRIGGER offline_job_save_failure BEFORE INSERT ON mg_locks BEGIN SELECT RAISE(FAIL,'offline job batch failure'); END").run();
 await assert.rejects(()=>f.m.publish(id,{expectedVersion:1,operationId:op},'test-admin'));assert(f.storage.alarm);
 for(const table of ['mg_jobs','mg_locks','mg_job_notifications'])assert.equal((await f.r.db.prepare('SELECT COUNT(*) AS n FROM '+table).first()).n,0);
 assert.equal((await f.r.db.prepare("SELECT COUNT(*) AS n FROM mg_audit WHERE action='job_queued'").first()).n,0);
 assert.equal(f.r.square.calls.length,0);assert.equal((await f.m.s.product(id)).status,'draft');
 await f.storage.deleteAlarm();const restarted=new PurchaseCoordinator({storage:f.storage,waitUntil:()=>{}},f.env);await restarted.alarm();assert.equal(f.r.square.calls.length,0);assert.equal(f.calls.length,0);assert(f.storage.alarm);
 await f.r.db.prepare('DROP TRIGGER offline_job_save_failure').run();const manager=f.manager();assert.equal((await manager.publish(id,{expectedVersion:1,operationId:op},'test-admin')).state,'done');await manager.publish(id,{expectedVersion:1,operationId:op},'test-admin');
 assert.equal(f.r.square.receipts.size,1);assert.equal((await f.r.db.prepare('SELECT COUNT(*) AS n FROM mg_jobs').first()).n,1);assert.equal((await f.r.db.prepare('SELECT COUNT(*) AS n FROM mg_locks').first()).n,0);
});
test('stop between Alarm reservation and job persistence leaves only a safe empty Alarm after restart',async t=>{
 const f=await fixture(t),id=await f.add(),op=crypto.randomUUID(),batch=f.m.s.batch.bind(f.m.s);let interrupted=false;
 f.m.s.batch=async rows=>{if(rows.some(([sql])=>sql.startsWith('INSERT INTO mg_jobs'))){assert(f.storage.alarm);interrupted=true;throw Error('offline stop before persistence');}return batch(rows);};
 await assert.rejects(()=>f.m.publish(id,{expectedVersion:1,operationId:op},'test-admin'));assert(interrupted);
 assert.equal((await f.r.db.prepare('SELECT COUNT(*) AS n FROM mg_jobs').first()).n,0);assert.equal((await f.r.db.prepare('SELECT COUNT(*) AS n FROM mg_locks').first()).n,0);
 await f.storage.deleteAlarm();const restarted=new PurchaseCoordinator({storage:f.storage,waitUntil:()=>{}},f.env);await restarted.alarm();await restarted.alarm();assert.equal(f.r.square.calls.length,0);assert.equal(f.calls.length,0);
 const manager=f.manager();await manager.publish(id,{expectedVersion:1,operationId:op},'test-admin');await manager.publish(id,{expectedVersion:1,operationId:op},'test-admin');assert.equal(f.r.square.receipts.size,1);assert.equal((await f.r.db.prepare('SELECT COUNT(*) AS n FROM mg_mappings').first()).n,1);
});
