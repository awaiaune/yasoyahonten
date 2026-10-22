import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {runtimeOptions,root} from './server.mjs';
import {ManagementSquare} from './management-square.mjs';
import worker,{PurchaseCoordinator} from '../worker/src/index.js';
import {managementConfig,checkManagementConfig} from '../validation/prepare-management.mjs';
import {legacyProducts} from '../validation/legacy-products.mjs';
import {inspectImage,stripImageMetadata} from '../worker/src/management/images.js';
const bundle=await build({entryPoints:[root+'/worker/src/index.js'],bundle:true,write:false,format:'esm',platform:'browser'});
const sql=(await Promise.all(['0001_management.sql','0002_management_supervision.sql'].map(file=>readFile(root+'/worker/migrations/'+file,'utf8')))).join('\n').replace(/^--.*$/mg,'').split(';').filter(s=>s.trim());
const contact={givenName:'試験',familyName:'購入者',email:'test@example.invalid',phone:'09012345678',addressLines:['テスト1'],city:'テスト市',state:'東京都',postalCode:'1000001',countryCode:'JP'};
async function fixture(t){
 const fake=new ManagementSquare(),o=runtimeOptions(bundle.outputFiles[0].text);Object.assign(o.bindings,{MANAGEMENT_ENABLED:'1',MANAGEMENT_CHECKOUT_PAUSED:'0',SQUARE_ACCESS_MODE:'READ_WRITE',VALIDATION_CHECKOUT_ENABLED:'1',VALIDATION_MAIL_ENABLED:'1',VALIDATION_CRON_ENABLED:'1',MANAGEMENT_STOCK_WRITES:'single-writer',LOCAL_TEST_MODE:'1',SQUARE_LOCATION_ID:'LOCALMGMTLOCATION',SQUARE_ACCESS_TOKEN:'fake-local-test-only'});o.r2Buckets={PRODUCT_IMAGES:'management-images'};
 o.serviceBindings={LOCAL_SQUARE:r=>fake.fetch(r),ASSETS:async r=>{const path=new URL(r.url).pathname;try{return new Response(await readFile(root+(path==='/'?'/index.html':path)),{headers:{'Content-Type':'text/html'}});}catch{return new Response('missing',{status:404});}}};
 let outbound=0;o.outboundService=()=>{outbound++;throw Error('External network forbidden');};const mf=new Miniflare(o);t.after(()=>mf.dispose());const db=await mf.getD1Database('ORDERS_DB');for(const s of sql)await db.prepare(s).run();
 const request=(path,method='GET',body,auth=true)=>mf.dispatchFetch('http://127.0.0.1:8000'+path,{method,headers:{Origin:'http://127.0.0.1:8000',...(auth?{Authorization:'Bearer local-development-only'}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 async function api(path,method='GET',body){const r=await request(path,method,body);const data=await r.json();assert(r.ok,JSON.stringify(data));return data;}
 async function add(name='new-herb',price=1250){const id=crypto.randomUUID(),variant=name+'-10g';const data={slug:name,expectedVersion:0,operationId:crypto.randomUUID(),name:'試験ハーブ '+name,description:'説明 <script>alert(1)</script>',alt:'写真',sortOrder:0,images:[],variants:[{id:variant,name:'試験 '+name+' 10g',price,amount:'10g',maxQuantity:10,active:true}]};await api('/api/admin/products/'+id,'PUT',data);return {id,variant,data};}
 async function publish(p){return api('/api/admin/products/'+p.id+'/publish','POST',{expectedVersion:1,operationId:crypto.randomUUID()});}
 async function stock(p,n=5){const r=(await api('/api/admin/inventory')).inventory.find(v=>v.id===p.variant);return api('/api/admin/inventory/'+p.variant,'POST',{operationId:crypto.randomUUID(),kind:'count',quantity:n,reason:'テスト棚卸し',expectedQuantity:r.quantity,observedAt:r.observedAt});}
 const pay=(p,id=crypto.randomUUID())=>request('/api/payments','POST',{attemptId:id,sourceId:'local-fake-card',contact,items:[{id:p.variant,quantity:1,price:1}]});
 return {fake,mf,db,request,api,add,publish,stock,pay,env:{...o.bindings,ORDERS_DB:db,LOCAL_SQUARE:{fetch:(r,options)=>fake.fetch(typeof r==='string'?new Request(r,options):r)}},outbound:()=>outbound};
}
test('management end-to-end: draft, publish, SSR/SEO, stock, server price, Sandbox purchase and preserved order',async t=>{
 const f=await fixture(t),p=await f.add();assert.equal((await f.api('/api/catalog')).products.length,0);assert.equal((await f.publish(p)).state,'done');assert.equal((await f.stock(p)).state,'done');
 const publicData=await f.api('/api/catalog');assert.equal(publicData.products[0].variants[0].price,1250);
 const html=await (await f.request('/products/new-herb.html')).text();assert(html.includes('試験ハーブ'));assert(html.includes('&lt;script&gt;'));assert(!html.includes('<script>alert(1)</script>'));assert(html.includes('"price":1250'));assert(html.includes('href="http://127.0.0.1:8000/products/new-herb.html"'));
 const home=await (await f.request('/')).text();assert(home.includes('/products/new-herb.html'));
 const paid=await (await f.pay(p)).json();assert.equal(paid.ok,true);assert.equal(paid.amount,1600);assert.equal(f.fake.payments.size,1);
 assert.equal((await f.api('/api/admin/inventory')).inventory[0].quantity,4);const orders=await f.api('/api/admin/orders');assert.equal(orders.orders.length,1);assert.equal(orders.orders[0].status,'pending');assert.equal(orders.orders[0].total,1600);assert.equal(f.outbound(),0);
});
test('draft updates are idempotent; stale edits and duplicate publication cannot overwrite',async t=>{
 const f=await fixture(t),p=await f.add();await f.api('/api/admin/products/'+p.id,'PUT',p.data);assert.equal((await f.api('/api/admin/products')).products[0].version,1);
 const op={operationId:crypto.randomUUID(),expectedVersion:1};const r=await f.api('/api/admin/products/'+p.id+'/publish','POST',op);assert.equal(r.state,'done');await f.api('/api/admin/products/'+p.id+'/publish','POST',op);assert.equal(f.fake.calls.filter(p=>p==='/v2/catalog/batch-upsert').length,1);
 assert.equal((await f.request('/api/admin/products/'+p.id,'PUT',{...p.data,operationId:crypto.randomUUID()})).status,409);
 const simultaneous=await Promise.all([f.request('/api/admin/products/'+p.id+'/publish','POST',{expectedVersion:2,operationId:crypto.randomUUID()}),f.request('/api/admin/products/'+p.id+'/publish','POST',{expectedVersion:2,operationId:crypto.randomUUID()})]);assert.deepEqual(simultaneous.map(r=>r.status).sort(),[200,409]);
});
test('lost Catalog response recovers same body/key without duplicate items or exposing draft',async t=>{
 const f=await fixture(t),p=await f.add();f.fake.loseAfter='/v2/catalog/batch-upsert';const j=await f.publish(p);assert.equal(j.state,'retry');assert.equal((await f.api('/api/catalog')).products.length,0);const size=f.fake.objects.size;
 assert.equal((await f.api('/api/admin/jobs/'+j.id+'/retry','POST',{})).state,'done');assert.equal(f.fake.objects.size,size);assert.equal((await f.api('/api/catalog')).products.length,1);
});
test('successful Square sync survives D1 publication failure; retries only projection',async t=>{
 const f=await fixture(t),p=await f.add();await f.db.prepare("CREATE TRIGGER fail_publish BEFORE UPDATE OF published_revision ON mg_products BEGIN SELECT RAISE(FAIL,'test D1 failure'); END").run();const j=await f.publish(p);assert.equal(j.state,'retry');assert.equal((await f.api('/api/catalog')).products.length,0);const calls=f.fake.calls.length;
 await f.db.prepare('DROP TRIGGER fail_publish').run();assert.equal((await f.api('/api/admin/jobs/'+j.id+'/retry','POST',{})).state,'done');assert.equal(f.fake.calls.length,calls);
});
test('Square version conflict holds affected product, keeps old published price, permits other purchases',async t=>{
 const f=await fixture(t),p=await f.add(),q=await f.add('other-herb');await f.publish(p);await f.publish(q);await f.stock(p);await f.stock(q);
 const current=(await f.api('/api/admin/products/'+p.id)).product;await f.api('/api/admin/products/'+p.id,'PUT',{...p.data,expectedVersion:current.version,operationId:crypto.randomUUID(),variants:[{...p.data.variants[0],price:2000}]});
 const mapping=await f.db.prepare('SELECT * FROM mg_mappings WHERE variant_id=?').bind(p.variant).first();f.fake.objects.get(mapping.item_id).version++;
 const j=await f.api('/api/admin/products/'+p.id+'/publish','POST',{expectedVersion:current.version+1,operationId:crypto.randomUUID()});assert.equal(j.state,'review');assert.equal((await f.api('/api/catalog')).products.find(v=>v.id===p.id).variants[0].price,1250);
 assert.equal((await f.pay(p)).status,409);assert.equal((await (await f.pay(q)).json()).ok,true);assert.equal(f.fake.payments.size,1);assert.equal((await f.request('/api/admin/jobs/'+j.id+'/retry','POST',{})).status,409);
});
test('inventory lost response is held, same operation restores once, and stale/external stock is rejected',async t=>{
 const f=await fixture(t),p=await f.add();await f.publish(p);await f.stock(p);const row=(await f.api('/api/admin/inventory')).inventory[0];
 f.fake.loseAfter='/v2/inventory/changes/batch-create';const input={operationId:crypto.randomUUID(),kind:'receipt',quantity:2,reason:'入庫',expectedQuantity:row.quantity,observedAt:row.observedAt};const j=await f.api('/api/admin/inventory/'+p.variant,'POST',input);assert.equal(j.state,'retry');assert.equal((await f.api('/api/admin/inventory')).inventory[0].held,true);assert.equal((await f.pay(p)).status,409);
 assert.equal((await f.api('/api/admin/jobs/'+j.id+'/retry','POST',{})).state,'done');await f.api('/api/admin/inventory/'+p.variant,'POST',input);assert.equal((await f.api('/api/admin/inventory')).inventory[0].quantity,7);
 assert.equal((await f.request('/api/admin/inventory/'+p.variant,'POST',{...input,operationId:crypto.randomUUID()})).status,409);
});
test('last item concurrent purchase and admin stock write cannot overdraw or double charge',async t=>{
 const f=await fixture(t),p=await f.add();await f.publish(p);await f.stock(p,1);const row=(await f.api('/api/admin/inventory')).inventory[0];const rs=await Promise.all([f.pay(p),f.pay(p),f.request('/api/admin/inventory/'+p.variant,'POST',{operationId:crypto.randomUUID(),kind:'count',quantity:1,reason:'同時棚卸し',expectedQuantity:1,observedAt:row.observedAt})]);
 assert.equal(f.fake.payments.size,1);assert.equal((await f.api('/api/admin/inventory')).inventory[0].quantity,0);assert(rs.some(r=>r.status!==200));
});
test('images validate binary type/limits, remain private in draft, and serve only after publication',async t=>{
 const f=await fixture(t);const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7n0AAAAASUVORK5CYII=','base64');assert.equal(inspectImage(bytes,'image/png').width,1);
 assert.throws(()=>inspectImage(Buffer.from('<svg onload="bad()"></svg>'),'image/png'));assert.throws(()=>inspectImage(new Uint8Array(9*1024*1024),'image/jpeg'));
 const r=await f.mf.dispatchFetch('http://127.0.0.1:8000/api/admin/images',{method:'POST',headers:{Authorization:'Bearer local-development-only','Content-Type':'image/png'},body:bytes});assert.equal(r.status,200);const image=await r.json();assert.equal((await f.request('/api/media/'+image.id)).status,404);
 const p=await f.add();await f.api('/api/admin/products/'+p.id,'PUT',{...p.data,expectedVersion:1,operationId:crypto.randomUUID(),images:[image.id]});await f.api('/api/admin/products/'+p.id+'/publish','POST',{expectedVersion:2,operationId:crypto.randomUUID()});const publicImage=await f.request('/api/media/'+image.id);assert.equal(publicImage.status,200);assert.equal(publicImage.headers.get('X-Content-Type-Options'),'nosniff');assert.deepEqual(Buffer.from(await publicImage.arrayBuffer()),bytes);
});
test('unauthorized admin and production configuration cannot reach sync; migration preserves existing orders',async t=>{
 const f=await fixture(t);assert.equal((await f.request('/api/admin/products','GET',undefined,false)).status,401);assert.equal(f.fake.calls.length,0);
 await f.db.prepare('CREATE TABLE orders (order_reference TEXT PRIMARY KEY,items_json TEXT,total INTEGER)').run();await f.db.prepare("INSERT INTO orders VALUES('legacy','[]',980)").run();for(const s of sql)await f.db.prepare(s).run();assert.equal((await f.db.prepare("SELECT total FROM orders WHERE order_reference='legacy'").first()).total,980);
 const o=runtimeOptions(bundle.outputFiles[0].text);Object.assign(o.bindings,{MANAGEMENT_ENABLED:'1',SQUARE_ENVIRONMENT:'production'});let called=0;o.outboundService=()=>{called++;throw Error();};const mf=new Miniflare(o);t.after(()=>mf.dispose());assert.equal((await mf.dispatchFetch('http://127.0.0.1:8000/api/admin/products')).status,503);assert.equal(called,0);
});

test('review reconciliation is read-only and releases locks only on exact Square match',async t=>{
 const f=await fixture(t),p=await f.add();await f.publish(p);const map=await f.db.prepare('SELECT * FROM mg_mappings WHERE variant_id=?').bind(p.variant).first();f.fake.objects.get(map.item_id).version++;
 const j=await f.api('/api/admin/products/'+p.id+'/publish','POST',{expectedVersion:2,operationId:crypto.randomUUID()});assert.equal(j.state,'review');const writes=f.fake.calls.filter(p=>p==='/v2/catalog/batch-upsert').length;
 assert.equal((await f.api('/api/admin/jobs/'+j.id+'/reconcile','POST',{})).state,'done');assert.equal(f.fake.calls.filter(p=>p==='/v2/catalog/batch-upsert').length,writes);assert.equal((await f.api('/api/admin/inventory')).inventory[0].held,false);
});
test('Square image upload lost response reuses the same image key and publishes after recovery',async t=>{
 const f=await fixture(t),p=await f.add();const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7n0AAAAASUVORK5CYII=','base64');
 const image=await (await f.mf.dispatchFetch('http://127.0.0.1:8000/api/admin/images',{method:'POST',headers:{Authorization:'Bearer local-development-only','Content-Type':'image/png'},body:bytes})).json();
 await f.api('/api/admin/products/'+p.id,'PUT',{...p.data,images:[image.id],expectedVersion:1,operationId:crypto.randomUUID()});f.fake.loseAfter='/v2/catalog/images';const j=await f.api('/api/admin/products/'+p.id+'/publish','POST',{expectedVersion:2,operationId:crypto.randomUUID()});assert.equal(j.state,'retry');assert.equal((await f.api('/api/catalog')).products.length,0);
 assert.equal((await f.api('/api/admin/jobs/'+j.id+'/retry','POST',{})).state,'done');assert.equal([...f.fake.objects.values()].filter(o=>o.type==='IMAGE').length,1);const item=[...f.fake.objects.values()].find(o=>o.type==='ITEM');assert.equal(item.item_data.image_ids.length,1);
});
test('unpublished edits preserve public text, price, order and URL; stopped/archived products cannot sell',async t=>{
 const f=await fixture(t),p=await f.add();await f.publish(p);await f.stock(p);await f.api('/api/admin/products/'+p.id,'PUT',{...p.data,name:'未公開の変更',sortOrder:99,expectedVersion:2,operationId:crypto.randomUUID()});
 const old=(await f.api('/api/catalog')).products[0];assert.notEqual(old.name,'未公開の変更');assert.equal(old.sortOrder,0);
 assert.equal((await f.request('/api/admin/products/'+p.id,'PUT',{...p.data,slug:'changed-url',expectedVersion:3,operationId:crypto.randomUUID()})).status,409);
 await f.api('/api/admin/products/'+p.id+'/state','POST',{expectedVersion:3,status:'stopped',operationId:crypto.randomUUID()});assert.equal((await f.pay(p)).status,400);assert.equal((await f.api('/api/catalog')).products[0].status,'stopped');assert.equal(f.fake.payments.size,0);
 const current=(await f.api('/api/admin/products/'+p.id)).product;await f.api('/api/admin/products/'+p.id+'/state','POST',{expectedVersion:current.version,status:'archived',operationId:crypto.randomUUID()});assert.equal((await f.request('/products/new-herb.html')).status,404);
});

test('restart and Alarm recover durable management job with no browser request or duplicate creation',async t=>{
 const f=await fixture(t),p=await f.add();f.fake.loseAfter='/v2/catalog/batch-upsert';const j=await f.publish(p);assert.equal(j.state,'retry');await f.db.prepare('UPDATE mg_jobs SET next_due=0 WHERE id=?').bind(j.id).run();
 const map=new Map();let alarm=null;const storage={get:async k=>map.get(k),put:async(k,v)=>{if(typeof k==='string')map.set(k,v);else for(const [key,value] of Object.entries(k))map.set(key,value);},list:async({prefix='',startAfter='',limit=128}={})=>new Map([...map].filter(([k])=>k.startsWith(prefix)&&k>startAfter).sort(([a],[b])=>a.localeCompare(b)).slice(0,limit)),getAlarm:async()=>alarm,setAlarm:async n=>alarm=n,deleteAlarm:async()=>alarm=null};
 const ctx={storage,waitUntil:()=>{}};await new PurchaseCoordinator(ctx,f.env).alarm();await new PurchaseCoordinator(ctx,f.env).alarm();assert.equal((await f.api('/api/admin/jobs')).jobs[0].state,'done');assert.equal([...f.fake.objects.values()].filter(o=>o.type==='ITEM').length,1);
});
test('unknown payment holds only its variant and prevents admin stock edits without stopping another product',async t=>{
 const f=await fixture(t),p=await f.add(),q=await f.add('healthy-herb');await f.publish(p);await f.publish(q);await f.stock(p);await f.stock(q);
 f.fake.loseAfter='/v2/payments';f.fake.lookupFails=true;const paid=await (await f.pay(p)).json();assert.equal(paid.phase,'unknown');const inventory=(await f.api('/api/admin/inventory')).inventory;assert.equal(inventory.find(v=>v.id===p.variant).held,true);assert.equal(inventory.find(v=>v.id===q.variant).held,false);
 const row=inventory.find(v=>v.id===p.variant);assert.equal((await f.request('/api/admin/inventory/'+p.variant,'POST',{operationId:crypto.randomUUID(),kind:'count',quantity:9,reason:'保留の上書き禁止',expectedQuantity:row.quantity,observedAt:row.observedAt})).status,409);assert.equal((await (await f.pay(q)).json()).ok,true);assert.equal(f.fake.payments.size,2);
});
test('external Square catalog price changes reject purchase before charging',async t=>{
 const f=await fixture(t),p=await f.add();await f.publish(p);await f.stock(p);const m=await f.db.prepare('SELECT * FROM mg_mappings WHERE variant_id=?').bind(p.variant).first();f.fake.objects.get(m.variation_id).item_variation_data.price_money.amount=999;
 assert.equal((await f.pay(p)).status,409);assert.equal(f.fake.payments.size,0);
});
test('response-result D1 failure replays original Catalog idempotency key, not a new item',async t=>{
 const f=await fixture(t),p=await f.add();await f.db.prepare("CREATE TRIGGER fail_result BEFORE UPDATE OF result_json ON mg_jobs BEGIN SELECT RAISE(FAIL,'test result write failure'); END").run();const j=await f.publish(p);assert.equal(j.state,'retry');const size=f.fake.objects.size;
 await f.db.prepare('DROP TRIGGER fail_result').run();assert.equal((await f.api('/api/admin/jobs/'+j.id+'/retry','POST',{})).state,'done');assert.equal(f.fake.objects.size,size);
});
test('uploaded JPEG metadata is stripped; legacy three-product importer preserves IDs, names and amounts',async()=>{
 const jpg=new Uint8Array(await readFile(root+'/images/lemonbalm.jpg'));const info=inspectImage(jpg,'image/jpeg');const stripped=stripImageMetadata(jpg,'image/jpeg');assert.equal(inspectImage(stripped,'image/jpeg').width,info.width);
 const payload=new TextEncoder().encode('Exif\0\0private GPS');const segment=new Uint8Array(payload.length+4);segment[0]=255;segment[1]=225;new DataView(segment.buffer).setUint16(2,payload.length+2);segment.set(payload,4);const withExif=new Uint8Array(jpg.length+segment.length);withExif.set(jpg.slice(0,2));withExif.set(segment,2);withExif.set(jpg.slice(2),2+segment.length);assert(!new TextDecoder().decode(stripImageMetadata(withExif,'image/jpeg')).includes('private GPS'));
 const products=await legacyProducts();assert.equal(products.length,3);assert(products.every(p=>p.variants.length===1&&p.variants[0].price===980&&p.variants[0].amount==='10g'));assert(!products.some(p=>JSON.stringify(p).includes('goldenrod-leaf-stem-20g')));
});
test('management deployment overlay requires dedicated images, Access host and disabled stock writes',async()=>{
 const m={workerName:'yasoya-payments-validation',accountId:'a'.repeat(32),workerOrigin:'https://validation.awaiaune.com',databaseName:'yasoya-validation-orders',databaseId:'11111111-1111-4111-8111-111111111111',instanceId:'22222222-2222-4222-8222-222222222222',squareApplicationId:'sandbox-sq0idb-offline',squareLocationId:'TESTLOCATION001',variations:{'lemonbalm-10g':'TESTVARIATION001','yomogi-10g':'TESTVARIATION002','goldenrod-leaf-10g':'TESTVARIATION003'},notificationEmail:'test@example.invalid',resendFrom:'validation@example.invalid',accessTeamDomain:'test.cloudflareaccess.com',accessAudience:'b'.repeat(64)};
 const c=managementConfig(m);assert.doesNotThrow(()=>checkManagementConfig(c,m));assert.deepEqual(c.triggers,{crons:[]});assert.throws(()=>checkManagementConfig({...c,triggers:{crons:['* * * * *']}},m));assert.throws(()=>checkManagementConfig({...c,r2_buckets:[{binding:'PRODUCT_IMAGES',bucket_name:'production-images'}]},m));assert.throws(()=>checkManagementConfig({...c,vars:{...c.vars,MANAGEMENT_STOCK_WRITES:'single-writer'}},m));assert.throws(()=>managementConfig({...m,workerOrigin:'https://yasoya-payments-validation.test.workers.dev'}));
});

test('admin imports existing three products and photos as drafts without Square writes, preserves IDs on repeat',async t=>{
 const f=await fixture(t);const result=await f.api('/api/admin/products/import','POST',{operationId:crypto.randomUUID()});assert.equal(result.products.length,3);let products=(await f.api('/api/admin/products')).products;assert(products.every(p=>p.status==='draft'&&p.draft.images.length===1));assert.deepEqual(products.map(p=>p.draft.variants[0].id).sort(),['goldenrod-leaf-10g','lemonbalm-10g','yomogi-10g']);assert.equal(f.fake.calls.length,0);
 await f.api('/api/admin/products/import','POST',{operationId:crypto.randomUUID()});products=(await f.api('/api/admin/products')).products;assert.equal(products.length,3);assert(products.every(p=>p.version===1));assert.equal((await f.api('/api/catalog')).products.length,0);assert.equal((await f.api('/api/admin/audit')).events.length,3);
});

test('manual checkout pause prevents new charges while status recovery stays available',async t=>{
 const f=await fixture(t),p=await f.add();await f.publish(p);await f.stock(p);f.fake.loseAfter='/v2/payments';f.fake.lookupFails=true;const order=await (await f.pay(p)).json();assert.equal(order.phase,'unknown');
 const env={...f.env,PURCHASE_COORDINATOR:await f.mf.getDurableObjectNamespace('PURCHASE_COORDINATOR'),MANAGEMENT_CHECKOUT_PAUSED:'1',VALIDATION_CHECKOUT_ENABLED:'0'};
 const r=await worker.fetch(new Request('http://127.0.0.1:8000/api/payments',{method:'POST',headers:{Origin:'http://127.0.0.1:8000','Content-Type':'application/json'},body:JSON.stringify({attemptId:crypto.randomUUID()})}),env,{});assert.equal(r.status,503);assert.equal(f.fake.payments.size,1);
 f.fake.lookupFails=false;const status=await worker.fetch(new Request('http://127.0.0.1:8000/api/payments/status',{method:'POST',headers:{Origin:'http://127.0.0.1:8000','Content-Type':'application/json'},body:JSON.stringify({attemptId:order.attemptId})}),env,{});const checked=await status.json();assert.equal(checked.attemptId,order.attemptId);assert.notEqual(status.status,503);await f.api('/api/admin/payment-attempts/'+order.attemptId+'/recover','POST',{});assert.equal(f.fake.payments.size,1);assert.equal((await f.api('/api/admin/inventory')).inventory[0].quantity,4);
});
test('durable purchase snapshot preserves variation and price if management is disabled before recovery',async t=>{
 const f=await fixture(t),p=await f.add();await f.publish(p);await f.stock(p);const map=new Map();let alarm;
 const storage={get:async k=>map.get(k),put:async(k,v)=>{if(typeof k==='string')map.set(k,v);else for(const [key,value] of Object.entries(k))map.set(key,value);},list:async({prefix='',startAfter='',limit=128}={})=>new Map([...map].filter(([k])=>k.startsWith(prefix)&&k>startAfter).sort(([a],[b])=>a.localeCompare(b)).slice(0,limit)),getAlarm:async()=>alarm,setAlarm:async n=>alarm=n,deleteAlarm:async()=>alarm=null};
 const env={...f.env},coordinator=new PurchaseCoordinator({storage,waitUntil:()=>{}},env),attemptId=crypto.randomUUID();f.fake.loseAfter='/v2/payments';f.fake.lookupFails=true;
 const first=await coordinator.fetch(new Request('https://internal/pay',{method:'POST',body:JSON.stringify({attemptId,sourceId:'local-card',contact,items:[{id:p.variant,quantity:1}]})}));assert.equal((await first.json()).phase,'unknown');
 env.MANAGEMENT_ENABLED='0';f.fake.lookupFails=false;const recovered=await coordinator.fetch(new Request('https://internal/recover',{method:'POST',body:JSON.stringify({attemptId})}));const done=await recovered.json();assert.equal(done.ok,true);assert.equal(done.amount,1600);assert.equal(f.fake.payments.size,1);assert.equal([...f.fake.counts.values()][0],4);
});
