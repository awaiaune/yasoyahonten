// Offline only: all transports are substitutes and no inherited Secrets are read.
import test from 'node:test';
import assert from 'node:assert/strict';
import {externalPolicy,assertSquareRequest,assertSquareWrite,assertCheckout,assertMail} from '../worker/src/external-policy.js';
import {Square} from '../worker/src/management/square.js';
import {Management} from '../worker/src/management/service.js';
import worker,{PurchaseCoordinator} from '../worker/src/index.js';
import {createManagementRuntime} from './management-server.mjs';
import {managementConfig,checkManagementConfig} from '../validation/prepare-management.mjs';
const ro={SQUARE_ACCESS_MODE:'READ_ONLY',VALIDATION_CHECKOUT_ENABLED:'0',VALIDATION_MAIL_ENABLED:'0',VALIDATION_CRON_ENABLED:'0',MANAGEMENT_STOCK_WRITES:'disabled'};
const remote={...ro,RUNTIME_TIER:'sandbox-validation',SQUARE_ENVIRONMENT:'sandbox'};
const origin='https://connect.squareupsandbox.com';
function memory(){const data=new Map();return {get:async k=>data.get(k),put:async(k,v)=>data.set(k,v),getAlarm:async()=>null,setAlarm:async()=>{},list:async()=>new Map(),deleteAlarm:async()=>{}};}
async function fixture(t){
 const r=await createManagementRuntime();t.after(()=>r.mf.dispose());let mails=0;
 const env={...r.options.bindings,ORDERS_DB:r.db,LOCAL_SQUARE:{fetch:(r0,o)=>r.square.fetch(typeof r0==='string'?new Request(r0,o):r0)},LOCAL_RESEND:{fetch:async()=>{mails++;return Response.json({id:'offline'});}}};
 const storage=memory(),manager=()=>new Management(env,storage,{notify:async()=>{mails++;return true;}}),m=manager();
 const id='offline-herb',variant='offline-herb-10g';const body={operationId:crypto.randomUUID(),expectedVersion:0,slug:id,name:'架空商品',description:'説明',alt:'写真',images:[],sortOrder:0,variants:[{id:variant,name:'架空商品 10g',price:980,amount:'10g',maxQuantity:10,active:true}]};
 await m.save(id,body,'test');return {r,env,storage,manager,m,id,variant,body,mails:()=>mails};
}
test('read-only policy refuses every Square mutation and unknown POST before transport',()=>{
 for(const path of ['/v2/catalog/batch-upsert','/v2/catalog/images','/v2/inventory/changes/batch-create','/v2/payments','/v2/refunds','/v2/catalog/object/TESTID123'])for(const method of ['POST','PUT','DELETE','PATCH'])assert.throws(()=>assertSquareRequest(remote,origin+path,method),{code:'SQUARE_READ_ONLY'});
 assert.throws(()=>assertSquareRequest(remote,'https://connect.squareup.com/v2/locations'),{code:'SQUARE_DESTINATION_DENIED'});
 for(const [path,method] of [['/v2/locations','GET'],['/v2/catalog/list?types=ITEM','GET'],['/v2/catalog/object/TESTID123','GET'],['/v2/inventory/counts/batch-retrieve','POST']])assert.doesNotThrow(()=>assertSquareRequest(remote,origin+path,method));
});
test('missing, malformed, contradictory and mismatched server settings fail closed',()=>{
 for(const patch of [{SQUARE_ACCESS_MODE:undefined},{SQUARE_ACCESS_MODE:'read_only'},{VALIDATION_MAIL_ENABLED:undefined},{VALIDATION_CRON_ENABLED:true},{VALIDATION_CHECKOUT_ENABLED:'1'},{VALIDATION_MAIL_ENABLED:'1'},{MANAGEMENT_STOCK_WRITES:'single-writer'},{SQUARE_ENVIRONMENT:'production'},{RUNTIME_TIER:'unknown'}])assert.throws(()=>externalPolicy({...remote,...patch}),{code:'EXTERNAL_POLICY_INVALID'});
 assert.throws(()=>externalPolicy({LOCAL_TEST_MODE:'1',SQUARE_ENVIRONMENT:'sandbox',LOCAL_SQUARE:{}}),{code:'EXTERNAL_POLICY_INVALID'});
 assert.throws(()=>assertCheckout(remote),{code:'CHECKOUT_DISABLED'});assert.throws(()=>assertMail(remote),{code:'MAIL_DISABLED'});assert.throws(()=>assertSquareWrite(remote),{code:'SQUARE_READ_ONLY'});
 assert.equal(externalPolicy({...remote,VALIDATION_CRON_ENABLED:'1'}).cron,true);
 const rw={...remote,SQUARE_ACCESS_MODE:'READ_WRITE'};assert.equal(externalPolicy(rw).checkout,false);assert.equal(externalPolicy(rw).mail,false);assert.doesNotThrow(()=>externalPolicy({...rw,VALIDATION_MAIL_ENABLED:'1'}));
});
test('Catalog, Inventory and image class methods never call their substitute transport in READ_ONLY',async t=>{
 const f=await fixture(t);Object.assign(f.env,ro);const s=new Square(f.env);const before=f.r.square.calls.length;
 for(const path of ['/v2/catalog/batch-upsert','/v2/inventory/changes/batch-create'])await assert.rejects(()=>s.request(path,'POST',{}),{code:'SQUARE_READ_ONLY'});
 await assert.rejects(()=>s.image('a'.repeat(64),new Uint8Array([1]),'image/jpeg'),{code:'SQUARE_READ_ONLY'});assert.equal(f.r.square.calls.length,before);
});
test('API entrance rejects publish, stock, retry and checkout; client fields cannot override mode',async t=>{
 const f=await fixture(t);Object.assign(f.env,ro);
 for(const call of [()=>f.m.publish(f.id,{operationId:crypto.randomUUID(),expectedVersion:1},'test'),()=>f.m.state(f.id,{status:'stopped'},'test'),()=>f.m.adjust(f.variant,{},'test'),()=>f.m.retry(crypto.randomUUID()),()=>f.m.reconcile(crypto.randomUUID())])await assert.rejects(call,{code:'SQUARE_READ_ONLY'});
 const resp=await worker.fetch(new Request('http://127.0.0.1:8000/api/payments',{method:'POST',headers:{Origin:'http://127.0.0.1:8000','Content-Type':'application/json'},body:JSON.stringify({SQUARE_ACCESS_MODE:'READ_WRITE'})}),f.env,{});assert.equal(resp.status,503);assert.equal((await resp.json()).error.code,'CHECKOUT_DISABLED');assert.equal(f.r.square.payments.size,0);
 const coordinator=new PurchaseCoordinator({storage:f.storage},f.env);const direct=await coordinator.fetch(new Request('https://purchase.internal/pay',{method:'POST',body:'{}'}));assert.equal(direct.status,503);assert.equal(f.r.square.calls.length,0);
});
test('pending durable body/key/mappings survive retry, startup, Alarm and enabled Cron unchanged in READ_ONLY',async t=>{
 const f=await fixture(t);f.r.square.loseAfter='/v2/catalog/batch-upsert';const j=await f.m.publish(f.id,{operationId:crypto.randomUUID(),expectedVersion:1},'test');assert.equal(j.state,'retry');
 const snapshot=async()=>Promise.all(['mg_jobs','mg_mappings','mg_locks','mg_image_mappings'].map(async table=>(await f.r.db.prepare('SELECT * FROM '+table).all()).results));const before=await snapshot(),calls=f.r.square.calls.length;
 Object.assign(f.env,ro,{VALIDATION_CRON_ENABLED:'1'});const restarted=f.manager();await restarted.run(j.id);await restarted.recover();await restarted.supervision.tick({run:false});await restarted.supervision.notify();
 const coordinator=new PurchaseCoordinator({storage:f.storage},f.env);let ledgerCalls=0;coordinator.ledger.alarm=async()=>{ledgerCalls++;};await coordinator.alarm();
 const scheduledEnv={...f.env,PURCHASE_COORDINATOR:{idFromName:()=> 'validation-only',get:()=>({fetch:(url,options)=>coordinator.fetch(new Request(url,options))})}};await worker.scheduled({},scheduledEnv,{});
 assert.equal(ledgerCalls,0);assert.equal(f.mails(),0);assert.equal(f.r.square.calls.length,calls);assert.deepEqual(await snapshot(),before);
 // Re-enable the same offline job only: no new operation ID/body or duplicate Item.
 Object.assign(f.env,{SQUARE_ACCESS_MODE:'READ_WRITE',MANAGEMENT_STOCK_WRITES:'single-writer',VALIDATION_CHECKOUT_ENABLED:'1',VALIDATION_MAIL_ENABLED:'1'});await f.manager().run(j.id);assert.equal((await f.m.job(j.id)).state,'done');assert.equal(f.r.square.receipts.size,1);
});
test('read-only existing purchase status returns held snapshot without invoking recovery or mutating journal',async t=>{
 const f=await fixture(t);Object.assign(f.env,ro);const id=crypto.randomUUID(),record={id,phase:'payment_unknown',paymentKey:'immutable',inventoryKey:'same-inventory-key'};await f.storage.put('attempt:'+id,record);const c=new PurchaseCoordinator({storage:f.storage},f.env);c.ledger.recover=()=>{throw Error('Must not recover');};for(const path of ['status','recover']){const r=await c.fetch(new Request('https://purchase.internal/'+path,{method:'POST',body:JSON.stringify({attemptId:id})}));assert.equal((await r.json()).reason,'READ_ONLY');}assert.deepEqual(await f.storage.get('attempt:'+id),record);
});
test('inventory exposes source, observation time and sync independently; read-only still permits local draft storage',async t=>{
 const f=await fixture(t);await f.m.publish(f.id,{operationId:crypto.randomUUID(),expectedVersion:1},'test');Object.assign(f.env,ro);const rows=await f.m.inventory();assert.equal(rows[0].source,'local-mock');assert.equal(rows[0].accessMode,'READ_ONLY');assert(rows[0].observedAt);assert.equal(rows[0].syncState,'synced');const p=await f.m.s.product(f.id);await f.m.save(f.id,{...f.body,expectedVersion:p.version,operationId:crypto.randomUUID(),name:'変更保存'},'test');assert.equal((await f.m.s.product(f.id)).draft.name,'変更保存');
});
test('existing seeded SKU is preserved in new Catalog body and verified response; ID/SKU mismatch stops',async t=>{
 const f=await fixture(t);await f.m.publish(f.id,{operationId:crypto.randomUUID(),expectedVersion:1},'test');const maps=await f.m.s.all('SELECT * FROM mg_mappings');const m=maps[0],item=f.r.square.objects.get(m.item_id),variation=f.r.square.objects.get(m.variation_id);const sku='yasoya-sandbox-v1:'+f.variant;variation.item_variation_data.sku=sku;item.item_data.variations[0].item_variation_data.sku=sku;
 const preserved=await f.m.square.preserveMappings(maps);assert.equal(preserved[0].sku,sku);const p=await f.m.s.product(f.id),body=f.m.square.catalogBody({id:f.id,data:p.draft},preserved,crypto.randomUUID());assert.equal(body.batches[0].objects[0].item_data.variations[0].item_variation_data.sku,sku);assert.equal((await f.m.square.publish(body,p.draft))[0].variation_id,m.variation_id);
 f.r.square.objects.get(m.variation_id).item_variation_data.item_id='WRONGITEM123';await assert.rejects(()=>f.m.square.preserveMappings(maps));assert.throws(()=>f.m.square.catalogBody({id:f.id,data:p.draft},maps,'key'));
 const remoteSquare=new Square({...remote,SQUARE_VARIATION_IDS:JSON.stringify({[f.variant]:m.variation_id}),SQUARE_EXISTING_LINKS:JSON.stringify({[f.variant]:{itemId:m.item_id,variationId:'WRONGVAR123',sku}})});assert.throws(()=>remoteSquare.expectedLink(f.variant));
});
test('all three existing Item/Variation/SKU links are enforced before resending legacy Catalog bodies',()=>{
 const ids=['lemonbalm-10g','yomogi-10g','goldenrod-leaf-10g'];const links=Object.fromEntries(ids.map((id,i)=>[id,{itemId:'TESTITEM000'+i,variationId:'TESTVAR000'+i,sku:'yasoya-sandbox-v1:'+id}]));
 const s=new Square({...remote,SQUARE_VARIATION_IDS:JSON.stringify(Object.fromEntries(ids.map(id=>[id,links[id].variationId]))),SQUARE_EXISTING_LINKS:JSON.stringify(links)});
 for(const id of ids){const ref=links[id],body={batches:[{objects:[{id:ref.itemId,item_data:{variations:[{id:ref.variationId,item_variation_data:{item_id:ref.itemId,sku:ref.sku}}]}}]}]};assert.doesNotThrow(()=>s.assertExistingBody(body));const before=JSON.stringify(body);body.batches[0].objects[0].item_data.variations[0].item_variation_data.sku=id;const legacy=JSON.stringify(body);assert.throws(()=>s.assertExistingBody(body));assert.equal(JSON.stringify(body),legacy);assert.notEqual(legacy,before);}
});
test('seed client defaults to read-only and refuses writes before its transport',async()=>{
 const {SandboxCatalogClient}=await import('../validation/seed-square.mjs');let calls=0;
 const client=new SandboxCatalogClient({environment:'sandbox',applicationId:'sandbox-sq0idb-offline',locationId:'TESTLOCATION123'},'offline-not-a-real-token',{transport:async()=>{calls++;throw Error('must not send');}});client.verified=true;
 for(const path of ['/v2/catalog/batch-upsert','/v2/inventory/changes/batch-create'])await assert.rejects(()=>client.request(path,'POST',{}),{code:'SQUARE_READ_ONLY'});assert.equal(calls,0);
});
test('payment and post-payment decrement transports reject even a direct recovery-service invocation; mail stays unsent',async t=>{
 const f=await fixture(t);Object.assign(f.env,ro);const c=new PurchaseCoordinator({storage:f.storage,waitUntil:()=>{throw Error('No email enqueue');}},f.env);
 const record={id:crypto.randomUUID(),quote:{currency:'JPY',total:1330,items:[{id:f.variant,name:'架空ハーブ',quantity:1,unitPrice:980,revision:1,squareVariationId:'TESTVARIATION001'}]},contact:{email:'test@example.invalid',givenName:'架空',familyName:'試験',addressLines:['架空'],city:'架空',state:'東京都',postalCode:'1000001',countryCode:'JP'},orderReference:'OFFLINE-ONLY',paymentKey:'fixed-key',payment:{id:'OFFLINEPAYMENT'},inventoryOperation:{key:'fixed-stock-key',occurredAt:new Date().toISOString()}};
 await assert.rejects(()=>c.ledger.services.charge(record,'offline-source'),{code:'SQUARE_READ_ONLY'});await assert.rejects(()=>c.ledger.services.decrement(record),{code:'SQUARE_READ_ONLY'});await assert.rejects(()=>c.ledger.services.notify(record),{code:'MAIL_DISABLED'});assert.equal(f.mails(),0);assert.equal(f.r.square.calls.length,0);
});
test('linking an existing product rejects Item/Variation/SKU mismatches without persisting a mapping, then accepts exact links',async t=>{
 const f=await fixture(t),p=await f.m.s.product(f.id);const created=await f.m.square.request('/v2/catalog/batch-upsert','POST',f.m.square.catalogBody({id:f.id,data:p.draft},[],crypto.randomUUID()));const item=created.objects[0],v=item.item_data.variations[0],sku='yasoya-sandbox-v1:'+f.variant;
 f.r.square.objects.get(v.id).item_variation_data.sku=sku;f.r.square.objects.get(item.id).item_data.variations[0].item_variation_data.sku=sku;
 const ref={itemId:item.id,variationId:v.id,sku},env={...f.env,...ro,RUNTIME_TIER:'sandbox-validation',SQUARE_VARIATION_IDS:JSON.stringify({[f.variant]:v.id}),SQUARE_EXISTING_LINKS:JSON.stringify({[f.variant]:ref})};delete env.LOCAL_TEST_MODE;delete env.LOCAL_SQUARE;delete env.LOCAL_RESEND;
 const m=new Management(env,f.storage);m.square.object=async id=>structuredClone(f.r.square.objects.get(id));
 for(const patch of [{itemId:'WRONGITEM123'},{variationId:'WRONGVAR123'},{sku:f.variant}]){env.SQUARE_EXISTING_LINKS=JSON.stringify({[f.variant]:{...ref,...patch}});await assert.rejects(()=>m.link(f.id,{operationId:crypto.randomUUID(),expectedVersion:1,mappings:[{variantId:f.variant,variationId:v.id}]},'test'));assert.equal((await m.s.all('SELECT * FROM mg_mappings')).length,0);}
 env.SQUARE_EXISTING_LINKS=JSON.stringify({[f.variant]:ref});await m.link(f.id,{operationId:crypto.randomUUID(),expectedVersion:1,mappings:[{variantId:f.variant,variationId:v.id}]},'test');const saved=await m.s.one('SELECT * FROM mg_mappings');assert.equal(saved.item_id,item.id);assert.equal(saved.variation_id,v.id);
});

const managementOnly={SQUARE_ACCESS_MODE:'SANDBOX_MANAGEMENT',VALIDATION_MANAGEMENT_WRITE_APPROVAL:'sandbox-management-single-writer-v1',MANAGEMENT_ENABLED:'1',MANAGEMENT_STOCK_WRITES:'single-writer',MANAGEMENT_CHECKOUT_PAUSED:'1',VALIDATION_CHECKOUT_ENABLED:'0',VALIDATION_MAIL_ENABLED:'0',VALIDATION_CRON_ENABLED:'0',SITE_URL:'https://validation.awaiaune.com',ALLOWED_ORIGINS:'https://validation.awaiaune.com'};
test('Sandbox management mode requires explicit server approval, private validation origin and all unrelated effects disabled',()=>{
 const env={...remote,...managementOnly};assert.equal(externalPolicy(env).managementOnly,true);
 for(const patch of [{VALIDATION_MANAGEMENT_WRITE_APPROVAL:undefined},{VALIDATION_MANAGEMENT_WRITE_APPROVAL:'true'},{MANAGEMENT_ENABLED:'0'},{MANAGEMENT_STOCK_WRITES:'disabled'},{MANAGEMENT_CHECKOUT_PAUSED:'0'},{VALIDATION_CHECKOUT_ENABLED:'1'},{VALIDATION_MAIL_ENABLED:'1'},{VALIDATION_CRON_ENABLED:'1'},{SITE_URL:'https://other.invalid'},{ALLOWED_ORIGINS:'*'},{SQUARE_ENVIRONMENT:'production'}])assert.throws(()=>externalPolicy({...env,...patch}),{code:'EXTERNAL_POLICY_INVALID'});
 assert.throws(()=>externalPolicy({...env,SQUARE_ACCESS_MODE:'READ_ONLY'}));
 for(const path of ['/v2/catalog/batch-upsert','/v2/catalog/images','/v2/inventory/changes/batch-create'])assert.doesNotThrow(()=>assertSquareRequest(env,origin+path,'POST'));
 for(const path of ['/v2/payments','/v2/refunds','/v2/orders','/v2/catalog/delete'])assert.throws(()=>assertSquareRequest(env,origin+path,'POST'),{code:'MANAGEMENT_WRITE_DENIED'});
 assert.throws(()=>assertSquareRequest(env,'https://connect.squareup.com/v2/catalog/batch-upsert','POST'),{code:'SQUARE_DESTINATION_DENIED'});
 assert.throws(()=>assertCheckout(env),{code:'CHECKOUT_DISABLED'});assert.throws(()=>assertMail(env),{code:'MAIL_DISABLED'});
});
test('management-only Catalog and stock lost responses recover with the same body/key and no duplicate Item or receipt',async t=>{
 const f=await fixture(t);Object.assign(f.env,managementOnly);f.r.square.loseAfter='/v2/catalog/batch-upsert';
 const input={operationId:crypto.randomUUID(),expectedVersion:1},j=await f.m.publish(f.id,input,'test');assert.equal(j.state,'retry');
 const before=await f.m.s.one('SELECT body_json FROM mg_jobs WHERE id=?',[j.id]);await f.manager().retry(j.id);assert.equal((await f.m.job(j.id)).state,'done');assert.equal((await f.m.s.one('SELECT body_json FROM mg_jobs WHERE id=?',[j.id])).body_json,before.body_json);
 await f.m.publish(f.id,input,'test');assert.equal([...f.r.square.objects.values()].filter(o=>o.type==='ITEM').length,1);
 let row=(await f.m.inventory())[0];f.r.square.loseAfter='/v2/inventory/changes/batch-create';const receipt={operationId:crypto.randomUUID(),kind:'receipt',quantity:3,reason:'試験入庫',expectedQuantity:row.quantity,observedAt:row.observedAt};
 const stock=await f.m.adjust(row.id,receipt,'test');assert.equal(stock.state,'retry');assert.equal(f.r.square.counts.get((await f.m.s.one('SELECT variation_id FROM mg_mappings')).variation_id),3);
 await f.manager().retry(stock.id);await f.m.adjust(row.id,receipt,'test');row=(await f.m.inventory())[0];assert.equal(row.quantity,3);assert.equal(row.accessMode,'SANDBOX_MANAGEMENT');
 assert.equal(f.r.square.receipts.size,2);assert.equal(f.r.square.payments.size,0);assert.equal(f.mails(),0);
});
test('management-only validates active Japanese yen Location before Catalog, inventory or image mutation',async t=>{
 const f=await fixture(t);Object.assign(f.env,managementOnly);
 for(const patch of [{country:'US'},{currency:'USD'},{status:'INACTIVE'},{id:'OTHERLOCATION123'}]){
  f.r.square.locationPatch=patch;
  await assert.rejects(()=>f.m.square.request('/v2/catalog/batch-upsert','POST',{}));
  await assert.rejects(()=>f.m.square.request('/v2/inventory/changes/batch-create','POST',{}));
  await assert.rejects(()=>f.m.square.image('b'.repeat(64),new Uint8Array([1]),'image/jpeg'));
 }
 assert(!f.r.square.calls.some(p=>['/v2/catalog/images','/v2/catalog/batch-upsert','/v2/inventory/changes/batch-create'].includes(p)));
 f.r.square.locationPatch={};
 await assert.rejects(()=>f.m.square.request('/v2/inventory/changes/batch-create','POST',{changes:[{type:'ADJUSTMENT',adjustment:{location_id:f.env.SQUARE_LOCATION_ID}}]}));
 await assert.rejects(()=>f.m.square.request('/v2/catalog/batch-upsert','POST',{batches:[{objects:[{type:'ITEM',id:'#wrong',present_at_all_locations:true}]}]}));
 assert.equal(f.r.square.receipts.size,0);
});
test('management-only Alarm recovers admin jobs but never resumes existing purchase journal, status, charge, decrement or mail',async t=>{
 const f=await fixture(t);Object.assign(f.env,managementOnly);f.r.square.loseAfter='/v2/catalog/batch-upsert';const job=await f.m.publish(f.id,{operationId:crypto.randomUUID(),expectedVersion:1},'test');assert.equal(job.state,'retry');
 await f.m.s.run('UPDATE mg_jobs SET next_due=0 WHERE id=?',[job.id]);
 const id=crypto.randomUUID(),record={id,phase:'payment_unknown',paymentKey:'fixed',inventoryOperation:{key:'fixed-stock'}};await f.storage.put('attempt:'+id,record);
 const coordinator=new PurchaseCoordinator({storage:f.storage},f.env);let ledgerCalls=0;coordinator.ledger.alarm=async()=>{ledgerCalls++;};await coordinator.alarm();assert.equal((await f.m.job(job.id)).state,'done');assert.equal(ledgerCalls,0);
 for(const path of ['status','recover']){const r=await coordinator.fetch(new Request('https://purchase.internal/'+path,{method:'POST',body:JSON.stringify({attemptId:id})}));assert.equal((await r.json()).reason,'SANDBOX_MANAGEMENT');}
 await assert.rejects(()=>coordinator.ledger.services.charge(record,'ignored'),{code:'CHECKOUT_DISABLED'});
 await assert.rejects(()=>coordinator.ledger.services.decrement(record),{code:'CHECKOUT_DISABLED'});
 await assert.rejects(()=>coordinator.ledger.services.notify(record),{code:'MAIL_DISABLED'});
 await assert.rejects(()=>coordinator.ledger.services.email(record),{code:'MAIL_DISABLED'});
 await worker.scheduled({},f.env,{});assert.deepEqual(await f.storage.get('attempt:'+id),record);assert.equal(f.r.square.payments.size,0);assert.equal(f.mails(),0);
});
test('management-only refuses duplicate external SKU and unmanaged variations instead of recreating or deleting objects',async t=>{
 const f=await fixture(t);Object.assign(f.env,managementOnly);f.r.square.objects.set('EXTERNALVAR123',{id:'EXTERNALVAR123',type:'ITEM_VARIATION',item_variation_data:{sku:f.variant}});
 const j=await f.m.publish(f.id,{operationId:crypto.randomUUID(),expectedVersion:1},'test');assert.equal(j.state,'review');assert.equal(f.r.square.receipts.size,0);
 // A different product continues despite the held SKU.
 const other='unaffected',data={...f.body,slug:other,operationId:crypto.randomUUID(),variants:[{...f.body.variants[0],id:other+'-10g'}]};await f.m.save(other,data,'test');assert.equal((await f.m.publish(other,{operationId:crypto.randomUUID(),expectedVersion:1},'test')).state,'done');
 const maps=await f.m.s.all('SELECT * FROM mg_mappings'),item=f.r.square.objects.get(maps[0].item_id);item.item_data.variations.push({id:'UNMANAGEDVAR123',type:'ITEM_VARIATION'});
 const before=f.r.square.receipts.size;await assert.rejects(()=>f.m.square.preserveMappings(maps));assert.equal(f.r.square.receipts.size,before);
});
test('management-only stock preflight detects changes after queueing, preserves external stock and puts only affected variant on review',async t=>{
 const f=await fixture(t);Object.assign(f.env,managementOnly);await f.m.publish(f.id,{operationId:crypto.randomUUID(),expectedVersion:1},'test');
 const row=(await f.m.inventory())[0],mapping=await f.m.s.one('SELECT * FROM mg_mappings');
 const original=f.m.schedule.bind(f.m);let calls=0;f.m.schedule=async()=>{calls++;if(calls===1){f.r.square.counts.set(mapping.variation_id,9);return false;}return original();};
 const job=await f.m.adjust(row.id,{operationId:crypto.randomUUID(),kind:'receipt',quantity:2,reason:'競合検証',expectedQuantity:row.quantity,observedAt:row.observedAt},'test');assert.equal(job.state,'queued');
 await f.manager().retry(job.id);assert.equal((await f.m.job(job.id)).state,'review');assert.equal(f.r.square.counts.get(mapping.variation_id),9);assert(!f.r.square.calls.includes('/v2/inventory/changes/batch-create'));
});
test('management-only successful Square result survives D1 publication failure without exposing draft or resending Catalog',async t=>{
 const f=await fixture(t);Object.assign(f.env,managementOnly);
 const batch=f.m.s.batch.bind(f.m.s);let fail=true;
 f.m.s.batch=async rows=>{if(fail&&rows.some(([sql])=>sql.startsWith('UPDATE mg_products SET published_revision'))){fail=false;throw Error('offline D1 publication failure');}return batch(rows);};
 const j=await f.m.publish(f.id,{operationId:crypto.randomUUID(),expectedVersion:1},'test');assert.equal(j.state,'retry');assert.equal((await f.m.s.publicProducts()).length,0);
 const saved=await f.m.s.one('SELECT body_json,result_json FROM mg_jobs WHERE id=?',[j.id]);assert(saved.result_json);const calls=f.r.square.calls.filter(p=>p==='/v2/catalog/batch-upsert').length;
 await f.manager().retry(j.id);assert.equal((await f.m.job(j.id)).state,'done');assert.equal((await f.m.s.publicProducts()).length,1);assert.equal(f.r.square.calls.filter(p=>p==='/v2/catalog/batch-upsert').length,calls);assert.equal((await f.m.s.one('SELECT body_json FROM mg_jobs WHERE id=?',[j.id])).body_json,saved.body_json);
});
test('management-only failed Alarm reservation retains queued job and later restart uses the original operation',async t=>{
 const f=await fixture(t);Object.assign(f.env,managementOnly);let broken=true;f.storage.setAlarm=async()=>{if(broken)throw Error('offline Alarm failure');};
 const input={operationId:crypto.randomUUID(),expectedVersion:1},j=await f.m.publish(f.id,input,'test');assert.equal(j.state,'queued');assert.equal(f.r.square.receipts.size,0);
 const saved=await f.m.s.one('SELECT id,payload_json,fingerprint FROM mg_jobs WHERE id=?',[j.id]);broken=false;await f.manager().recover();assert.equal((await f.m.job(j.id)).state,'done');assert.deepEqual(await f.m.s.one('SELECT id,payload_json,fingerprint FROM mg_jobs WHERE id=?',[j.id]),saved);assert.equal(f.r.square.receipts.size,1);
});
