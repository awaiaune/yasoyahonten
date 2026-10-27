// Contract and client state tests only; all network requests are local substitutes.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {checkoutRoute,productionCheckoutEnabled} from '../worker/src/checkout-contract.js';
import {productionSquareRequest} from '../worker/src/production-policy.js';
import {fixture,baseEnv,contact} from './production-fixture.mjs';
import {PurchaseCoordinator} from '../worker/src/index.js';
const source=await readFile(new URL('../js/checkout-v1.js',import.meta.url),'utf8');
async function client(options={}){
 const values=options.values||new Map(),elements=new Map();let init,submit;
 const state={tokens:0,payments:0,cleared:0,saved:null,pending:false,lost:false,notFound:false,enabled:true,requests:[],...options};
 const el=id=>{if(!elements.has(id))elements.set(id,{value:'offline',textContent:'',hidden:false,disabled:false,reportValidity:()=>true,addEventListener:(event,fn)=>{if(event==='submit')submit=fn;else elements.get(id)[event]=fn;}});return elements.get(id);};
 const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const context={crypto,URL,AbortSignal,Date,console:{error(){}},localStorage:storage,location:{href:'https://shop.invalid/checkout.html',replace(url){this.href=url;}},document:{getElementById:el,addEventListener:(name,fn)=>{if(name==='DOMContentLoaded')init=fn;}},window:{YASOYA_STORE_CONFIG:{workerBaseUrl:'https://api.invalid',squareApplicationId:'offline',squareLocationId:'offline'},YasoyaCart:{read:()=>[{id:'lemonbalm-10g',quantity:1}],clear:()=>state.cleared++},Square:{payments:()=>({card:async()=>({attach:async()=>{},tokenize:async()=>{state.tokens++;if(state.gate)await state.gate;return {status:'OK',token:'offline-card-never-persist'};}})})}},fetch:async(url,options)=>{
  state.requests.push({url,cache:options.cache});
  if(url.endsWith('/checkout-capabilities'))return Response.json({contractVersion:state.version??1,supportedContracts:[1],checkoutEnabled:state.enabled});
  if(url.endsWith('/quote'))return Response.json({total:1330,subtotal:980,shipping:350,items:[]});
  if(url.endsWith('/payments/status'))return state.saved&&!state.notFound?Response.json(state.saved,{status:state.saved.ok?200:202}):Response.json({error:{message:'not started'}},{status:404});
  if(url.endsWith('/payments')){state.payments++;const body=JSON.parse(options.body);assert.equal(body.contractVersion,1);assert.equal(JSON.parse(values.get('yasoya_checkout_attempt_meta_v1')).state,'submitted');state.saved=state.pending?{ok:false,phase:'unknown'}:{ok:true,paymentId:'offline-payment',orderReference:'offline-order'};if(state.lost)throw TypeError('offline disconnect');return Response.json(state.saved,{status:state.pending?202:200});}
  throw Error('unexpected request');
 }};
 vm.runInNewContext(source,context);await init();return {state,values,el,context,click:()=>submit?.({preventDefault(){},currentTarget:el('paymentForm')}),check:()=>el('checkPaymentStatus').click?.()};
}
test('v1 routes preserve request identity while unknown major versions fail before side effects',async()=>{
 const req=new Request('https://api.invalid/api/v1/payments',{method:'POST',body:'{"attemptId":"offline"}'}),r=checkoutRoute(req);assert.equal(r.originalPath,'/api/v1/payments');assert.equal(new URL(r.request.url).pathname,'/api/payments');assert.equal(await r.request.text(),'{"attemptId":"offline"}');assert.throws(()=>checkoutRoute(new Request('https://api.invalid/api/v2/payments')),{status:426});assert.equal(productionCheckoutEnabled({}),false);assert.equal(productionCheckoutEnabled({PRODUCTION_CHECKOUT_ENABLED:'wrong'}),false);
});
test('v1 double tap sends one token and one request and clears state only for confirmed success',async()=>{
 const c=await client();let release;c.state.gate=new Promise(r=>release=r);const a=c.click(),b=c.click();await new Promise(r=>setImmediate(r));assert.equal(c.state.tokens,1);release();await Promise.all([a,b]);assert.equal(c.state.payments,1);assert.equal(c.state.cleared,1);assert.equal(c.values.size,0);assert(c.state.requests.every(r=>r.cache==='no-store'));
});
test('v1 HTTP 202 and repeated checks keep the same order without another card token',async()=>{
 const c=await client({pending:true});await c.click();const id=c.values.get('yasoya_checkout_attempt_v1');await c.click();await c.check();assert.equal(c.state.tokens,1);assert.equal(c.state.payments,1);assert.equal(c.state.cleared,0);assert.equal(c.values.get('yasoya_checkout_attempt_v1'),id);assert(c.el('paymentButton').disabled);
 c.state.saved={ok:true,paymentId:'offline-paid',orderReference:'offline-order'};await c.check();assert.equal(c.state.cleared,1);assert.equal(c.values.size,0);
});
test('v1 lost response and reload recover the same attempt, never persisting a card token',async()=>{
 const c=await client({lost:true});await c.click();assert.equal(c.state.cleared,0);assert(!JSON.stringify([...c.values]).includes('offline-card-never-persist'));const next=await client({values:c.values,saved:c.state.saved});assert.equal(next.state.cleared,1);assert.equal(next.state.tokens,0);
});
test('submitted 404 and legacy attempt metadata remain uncertain; neither creates a replacement charge',async()=>{
 const c=await client({lost:true,notFound:true});await c.click();await c.click();await c.check();assert.equal(c.state.payments,1);assert.equal(c.state.tokens,1);assert(c.values.get('yasoya_checkout_attempt_v1'));
 const legacy=await client({values:new Map([['yasoya_checkout_attempt_v1',crypto.randomUUID()]])});assert.equal(legacy.state.tokens,0);assert(legacy.el('paymentButton').disabled);assert.match(legacy.el('paymentStatus').textContent,/再決済せず/);
});
test('maintenance and incompatible API prevent card initialization; existing paid orders can still complete',async()=>{
 const paused=await client({enabled:false});assert(paused.el('paymentButton').disabled);assert.match(paused.el('paymentStatus').textContent,/一時停止/);assert.equal(paused.state.tokens,0);
 const mismatch=await client({version:2});assert(mismatch.el('paymentButton').disabled);assert.equal(mismatch.state.tokens,0);
 const values=new Map([['yasoya_checkout_attempt_v1',crypto.randomUUID()]]),paid=await client({values,enabled:false,saved:{ok:true,paymentId:'offline',orderReference:'offline'}});assert.equal(paid.state.cleared,1);assert.equal(paid.state.tokens,0);
});
test('initial cutover pause blocks only new payments and advertises no-store capabilities',async t=>{
 const f=await fixture(t,{PRODUCTION_PURCHASE_PROTOCOL:'durable-v1',PRODUCTION_CHECKOUT_ENABLED:'0'});
 const cap=await f.request('/api/v1/checkout-capabilities');assert.equal(cap.headers.get('Cache-Control'),'no-store');assert.equal((await cap.json()).checkoutEnabled,false);
 for(const path of ['/api/payments','/api/v1/payments']){const r=await f.request(path,'POST',{attemptId:crypto.randomUUID(),sourceId:'offline-card',items:[{id:'lemonbalm-10g',quantity:1}],contact});assert.equal(r.status,503);assert.equal((await r.json()).error.code,'CHECKOUT_DISABLED');}
 assert.equal(f.fake.payments.size,0);assert.throws(()=>productionSquareRequest({...baseEnv,PRODUCTION_CHECKOUT_ENABLED:'0'},'https://connect.squareup.com/v2/payments','POST'),{code:'CHECKOUT_DISABLED'});
});
test('v1 and stable-ID legacy alias share one DO journal; cached unversioned or unknown-major clients never charge',async t=>{
 const f=await fixture(t,{PRODUCTION_PURCHASE_PROTOCOL:'durable-v1'}),body={contractVersion:1,attemptId:crypto.randomUUID(),sourceId:'offline-card',items:[{id:'lemonbalm-10g',quantity:1}],contact};
 const first=await f.api('/api/v1/payments','POST',body);assert.equal(first.ok,true);assert.equal((await f.api('/api/payments','POST',body)).paymentId,first.paymentId);assert.equal(f.fake.payments.size,1);
 assert.equal((await f.request('/api/v2/payments','POST',body)).status,426);assert.equal((await f.request('/api/payments','POST',{sourceId:'offline-card',items:body.items,contact})).status,409);assert.equal(f.fake.payments.size,1);
});
test('v1 pending remains HTTP 202, legacy alias remains non-2xx, and unsupported body version never reaches Square',async t=>{
 const f=await fixture(t,{PRODUCTION_PURCHASE_PROTOCOL:'durable-v1'}),body={attemptId:crypto.randomUUID(),contractVersion:1,sourceId:'offline',items:[{id:'lemonbalm-10g',quantity:1}],contact};f.fake.loseAfter='/v2/payments';f.fake.lookupFails=true;
 const r=await f.request('/api/v1/payments','POST',body);assert.equal(r.status,202);assert.equal((await r.json()).ok,false);assert.equal((await f.request('/api/payments','POST',body)).status,409);assert.equal(f.fake.payments.size,1);
 assert.equal((await f.request('/api/v1/payments','POST',{...body,contractVersion:2})).status,426);assert.equal(f.fake.payments.size,1);
});
test('maintenance permits existing paid journal recovery while refusing any new submit',async()=>{
 const values=new Map(),storage={get:async k=>values.get(k),put:async(k,v)=>{if(typeof k==='string')values.set(k,v);else for(const [a,b]of Object.entries(k))values.set(a,b);},list:async({prefix})=>new Map([...values].filter(([k])=>k.startsWith(prefix))),getAlarm:async()=>null,setAlarm:async()=>{},deleteAlarm:async()=>{}};
 const id=crypto.randomUUID(),record={id,phase:'paid',inventory:'pending',projection:'retry_required',nextDue:0,createdAt:new Date().toISOString(),payment:{id:'offline-payment'},paymentKey:'existing-key',inventoryOperation:{key:'existing-stock'},orderReference:'offline-order',quote:{total:1330,items:[{id:'lemonbalm-10g',quantity:1}]},contact:{}};values.set('attempt:'+id,record);let charge=0,decrement=0,project=0;
 const c=new PurchaseCoordinator({storage},{...baseEnv,PRODUCTION_CHECKOUT_ENABLED:'0'});Object.assign(c.ledger.services,{charge:async()=>charge++,decrement:async()=>decrement++,project:async()=>project++,email:async()=>false});
 const status=await c.fetch(new Request('https://purchase.internal/status',{method:'POST',body:JSON.stringify({attemptId:id})}));assert.equal((await status.json()).ok,true);assert.equal(charge,0);assert.equal(decrement,1);assert.equal(project,1);
 const blocked=await c.fetch(new Request('https://purchase.internal/pay',{method:'POST',body:'{}'}));assert.equal(blocked.status,503);assert.equal(charge,0);assert.equal(values.get('attempt:'+id).paymentKey,'existing-key');
});
test('release inventory retains v1 and legacy assets, fixed purchase identity and no automatic migration',async()=>{
 const {releaseInventory}=await import('../production/release-review.mjs');const manifest=await releaseInventory();assert.equal(manifest.contract,1);assert.equal(manifest.purchaseClass,'PurchaseCoordinator');assert.equal(manifest.purchaseObjectName,'yasoya-honten-global-purchase-lock');assert.equal(manifest.purchaseStateFormatChanged,false);assert.equal(manifest.automaticMigration,false);assert(manifest.sourceHashes['js/checkout.js']);assert(manifest.sourceHashes['js/checkout-v1.js']);assert(manifest.sourceHashes['validation/safety.js']);
 const config=JSON.parse(await readFile(new URL('../production/checkout-cutover.example.jsonc',import.meta.url),'utf8'));assert.equal(config.vars.PRODUCTION_CHECKOUT_ENABLED,'0');assert.equal(config.vars.MANAGEMENT_ENABLED,'0');assert.equal(config.r2_buckets,undefined);assert.equal(config.d1_databases[0].migrations_dir,undefined);
});
test('rolling release review retains published checkout filenames, v1 contracts and fixed DO identity',async()=>{
 const {releaseInventory,reviewAgainstBaseline}=await import('../production/release-review.mjs');const baseline=await releaseInventory();assert.equal(reviewAgainstBaseline(baseline,structuredClone(baseline)),true);
 const changed=structuredClone(baseline);changed.sourceHashes['js/checkout-v1.js']='different';assert.throws(()=>reviewAgainstBaseline(baseline,changed));
 const next=structuredClone(baseline);next.sourceHashes['js/checkout-v1-next.js']='new-asset';assert.equal(reviewAgainstBaseline(baseline,next),true);
 assert.throws(()=>reviewAgainstBaseline(baseline,{...baseline,supportedContracts:[]}));assert.throws(()=>reviewAgainstBaseline(baseline,{...baseline,purchaseClass:'Replacement'}));
});
