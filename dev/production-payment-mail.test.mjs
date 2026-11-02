import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {ManagementSquare} from './management-square.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)).replace(/\/$/,'');
const {build}=createRequire(root+'/dev/package.json')('esbuild');
const bundle=await build({entryPoints:[root+'/production/storefront-worker.js'],bundle:true,write:false,format:'esm',platform:'browser'});
const {default:app,PurchaseCoordinator}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',keys.publicKey),kid:'offline-mail-test',alg:'RS256',use:'sig'};
async function jwt(env){const now=Math.floor(Date.now()/1000),enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),s=enc({alg:'RS256',kid:jwk.kid})+'.'+enc({iss:'https://'+env.PRODUCTION_ACCESS_TEAM_DOMAIN,aud:[env.PRODUCTION_ACCESS_AUDIENCE],email:env.PRODUCTION_ADMIN_EMAIL,iat:now-1,exp:now+3600});return s+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(s))).toString('base64url');}
const config=JSON.parse(await readFile(root+'/production/release/ready.jsonc','utf8'));
const products=JSON.parse(await readFile(root+'/production/existing-products.json','utf8')).products;
const source=await readFile(root+'/worker/src/index.js','utf8');
const contact={givenName:'試験',familyName:'購入者',email:'buyer@example.invalid',phone:'09012345678',addressLines:['架空テスト1'],city:'テスト市',state:'東京都',postalCode:'1000001',countryCode:'JP'};
class Storage{
 data=new Map();alarm=null;
 async get(k){return structuredClone(this.data.get(k));}
 async put(k,v){if(typeof k==='object')for(const [key,value]of Object.entries(k))this.data.set(key,structuredClone(value));else this.data.set(k,structuredClone(v));}
 async list({prefix='',limit=128,startAfter=''}={}){return new Map([...this.data].filter(([k])=>k.startsWith(prefix)&&k>startAfter).sort(([a],[b])=>a<b?-1:1).slice(0,limit).map(([k,v])=>[k,structuredClone(v)]));}
 async delete(k){if(Array.isArray(k)){for(const x of k)this.data.delete(x);}else this.data.delete(k);}
 async getAlarm(){return this.alarm;}
 async setAlarm(v){this.alarm=Number(v);}
 async deleteAlarm(){this.alarm=null;}
}
async function fixture(t){
 const native=new DatabaseSync(':memory:');
 native.exec(source.match(/prepare\(`(CREATE TABLE IF NOT EXISTS orders[\s\S]*?)`\)/)[1]);
 native.exec(`INSERT INTO orders(order_reference,payment_id,created_at,status,subtotal,shipping,total,items_json,contact_json,inventory_adjusted) VALUES('old-1','old-pay-1','2026-01-01','shipped',980,350,1330,'[]','{}',1),('old-2','old-pay-2','2026-01-01','shipped',980,350,1330,'[]','{}',1)`);
 const db={failOrders:0,prepare(sql){let args=[];const q={bind(...a){args=a;return q;},async first(key){const row=native.prepare(sql).get(...args);return key?row?.[key]:row||null;},async all(){return {results:native.prepare(sql).all(...args)};},async run(){if(db.failOrders&&/INSERT (?:OR IGNORE )?INTO orders/i.test(sql)){db.failOrders--;throw Error('Simulated D1 projection failure');}const r=native.prepare(sql).run(...args);return {success:true,meta:{changes:Number(r.changes)}};}};return q;},async batch(items){native.exec('BEGIN');try{const r=[];for(const q of items)r.push(await q.run());native.exec('COMMIT');return r;}catch(e){native.exec('ROLLBACK');throw e;}}};
 const env={...config.vars,ORDERS_DB:db,SQUARE_ACCESS_TOKEN:'offline-square-only',RESEND_API_KEY:'offline-resend-only',RESEND_FROM_EMAIL:'sender@example.invalid',ORDER_NOTIFICATION_EMAIL:'owner@example.invalid',REPLY_TO_EMAIL:'reply@example.invalid',ADMIN_TOKEN:'offline-admin',PRODUCTION_ADMIN_EMAIL:'owner@example.invalid'};
 const fake=new ManagementSquare();fake.locationId=env.SQUARE_LOCATION_ID;
 const waits=[],storage=new Storage(),mails=[];let mailFails=false;const mailControl={recipient:null,mode:null},receipts=new Map();
 native.exec((readFileSyncMigration));
 for(const p of products){
  const data={name:p.name,description:'既存説明',images:[],alt:p.name,sortOrder:0,variants:[{id:p.variantId,name:'通常',price:980,amount:p.amount,maxQuantity:10,active:!p.retired}]};
  native.prepare('INSERT INTO mg_products VALUES(?,?,?,?,?,?,?,?,?)').run(p.id,p.slug,0,p.retired?'archived':'published',2,1,p.retired?null:1,'local','local');
  native.prepare('INSERT INTO mg_revisions VALUES(?,?,?,?)').run(p.id,1,JSON.stringify(data),'local');
  native.prepare('INSERT INTO mg_variants VALUES(?,?)').run(p.variantId,p.id);
  native.prepare('INSERT INTO mg_mappings VALUES(?,?,?,?,?,?,?,?,?,?)').run(p.variantId,'production',env.SQUARE_LOCATION_ID,p.itemId,p.variationId,1,1,p.sku,env.PRODUCTION_INSTANCE_ID,'2026-11-02T00:00:00Z');
  const v={id:p.variationId,type:'ITEM_VARIATION',version:1,present_at_all_locations:true,item_variation_data:{item_id:p.itemId,sku:p.sku,name:'通常',price_money:{amount:980,currency:'JPY'},track_inventory:true,sellable:true}};
  fake.objects.set(p.variationId,v);fake.objects.set(p.itemId,{id:p.itemId,type:'ITEM',version:1,present_at_all_locations:true,item_data:{name:p.name,description:'既存説明',variations:[v]}});fake.counts.set(p.variationId,5);
 }
 const ctx={storage,waitUntil(p){waits.push(p);}};const coordinator=new PurchaseCoordinator(ctx,env);
 env.PURCHASE_COORDINATOR={idFromName(name){assert.equal(name,'yasoya-honten-global-purchase-lock');return name;},get(){return {fetch:(input,init)=>coordinator.fetch(input instanceof Request?input:new Request(input,init))};}};
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async(input,options)=>{const req=input instanceof Request?input:new Request(input,options);const u=new URL(req.url);if(u.origin==='https://'+env.PRODUCTION_ACCESS_TEAM_DOMAIN)return Response.json({keys:[jwk]});if(u.origin==='https://connect.squareup.com')return fake.fetch(new Request('https://connect.squareupsandbox.com'+u.pathname+u.search,req));if(u.origin==='https://api.resend.com'){
 const key=req.headers.get('Idempotency-Key'),raw=await req.text(),body=JSON.parse(raw);mails.push({key,body,raw});const previous=receipts.get(key);if(previous){assert.equal(previous.raw,raw);return Response.json({id:previous.id});}
 const fail=mailFails||key.startsWith(mailControl.recipient+'-');if(fail&&mailControl.mode!=='lost')return Response.json({name:mailControl.mode==='concurrent'?'concurrent_idempotent_requests':'error',message:'provider private detail'}, {status:mailControl.mode==='reject'?422:mailControl.mode==='concurrent'?409:503});
 const r={id:'offline-mail-'+receipts.size,raw};receipts.set(key,r);if(fail&&mailControl.mode==='lost')throw Error('Unknown acceptance');return Response.json({id:r.id});}throw Error('External transport forbidden in audit');};
 t.after(async()=>{await Promise.allSettled(waits);globalThis.fetch=originalFetch;native.close();});
 const token=await jwt(env);
 const call=(path,body,authorized=true)=>app.fetch(new Request((path.startsWith('/api/admin/')?env.PRODUCTION_ADMIN_ORIGIN:env.SITE_URL)+path,{method:body?'POST':'GET',headers:{Origin:path.startsWith('/api/admin/')?env.PRODUCTION_ADMIN_ORIGIN:env.SITE_URL,'Content-Type':'application/json',...(authorized?{Authorization:'Bearer '+env.ADMIN_TOKEN,'Cf-Access-Jwt-Assertion':token}:{})},...(body?{body:JSON.stringify(body)}:{})}),env,ctx);
 return {env,native,db,fake,mails,coordinator,storage,waits,call,mailControl,receipts,failMail(){mailFails=true;},async drain(){await Promise.allSettled(waits);}};
}
const readFileSyncMigration=await readFile(root+'/production/release/additive.sql','utf8');
const body=()=>({attemptId:crypto.randomUUID(),contractVersion:1,sourceId:'offline-card-only',items:[{id:'yomogi-10g',quantity:1}],contact});
const advance=f=>{f.coordinator.ledger.services.now=()=>Date.now()+360000;};
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
