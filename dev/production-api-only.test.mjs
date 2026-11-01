import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
import {fixture} from './production-fixture.mjs';

const {outputFiles,metafile}=await build({entryPoints:[new URL('../production/api-worker.js',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'browser',metafile:true});
const legacy='https://yasoya-honten-payments.offline.workers.dev';
test('initial backend deployment contains no public site assets or v53 renderer',async()=>{
 const bootstrap=JSON.parse(await readFile(new URL('../production/release/bootstrap.jsonc',import.meta.url),'utf8'));
 assert.equal(bootstrap.main,'../api-worker.js');assert.equal(bootstrap.assets,undefined);
 assert.equal(bootstrap.routes,undefined);assert.equal(bootstrap.vars.PRODUCTION_CHECKOUT_ENABLED,'0');
 assert.equal(bootstrap.vars.PRODUCTION_MANAGEMENT_CATALOG_ENABLED,'0');assert.equal(bootstrap.vars.PRODUCTION_MANAGEMENT_INVENTORY_ENABLED,'0');
 assert(Object.values(metafile.outputs).some(o=>o.exports.includes('PurchaseCoordinator')));
 assert(!Object.keys(metafile.inputs).some(p=>p.includes('v53-render')||p.includes('staging/site/')));
});
test('API-only rollout preserves legacy API status, blocks new payments, and serves no storefront',async t=>{
 const f=await fixture(t,{PRODUCTION_LEGACY_API_ORIGIN:legacy,PRODUCTION_CHECKOUT_ENABLED:'0',PRODUCTION_PURCHASE_PROTOCOL:'durable-v1'},true,{backendScript:outputFiles[0].text});
 const send=(path,body)=>f.mf.dispatchFetch(legacy+path,{method:body?'POST':'GET',headers:{Origin:f.env.SITE_URL,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 assert.equal((await send('/api/health')).status,200);
 const capabilities=await send('/api/v1/checkout-capabilities');assert.equal((await capabilities.json()).checkoutEnabled,false);
 assert.equal((await send('/api/v1/payments',{attemptId:crypto.randomUUID()})).status,503);
 const status=await send('/api/v1/payments/status',{attemptId:crypto.randomUUID()});assert(![403,503].includes(status.status));
 for(const path of ['/','/checkout.html','/js/checkout-v1.js','/admin/'])assert.equal((await send(path)).status,404);
 assert.equal((await f.mf.dispatchFetch(f.env.SITE_URL+'/')).status,403);
 assert.equal(f.fake.payments.size,0);
});
test('API-only rollout accepts protected service calls and rejects direct management access',async t=>{
 const f=await fixture(t,{PRODUCTION_LEGACY_API_ORIGIN:legacy,PRODUCTION_CHECKOUT_ENABLED:'0',PRODUCTION_MANAGEMENT_READ_ENABLED:'1'},true,{backendScript:outputFiles[0].text});
 assert.equal((await f.request('/api/admin/products')).status,200);
 const orders=await f.api('/api/admin/orders?status=shipped');assert.equal(orders.orders.length,1);
 assert.equal((await f.request('/api/admin/products','GET',undefined,{'Cf-Access-Jwt-Assertion':''})).status,401);
 const direct=await f.mf.dispatchFetch(legacy+'/api/admin/products',{headers:{Origin:f.env.PRODUCTION_ADMIN_ORIGIN,'Cf-Access-Jwt-Assertion':f.token,Authorization:'Bearer '+f.env.ADMIN_TOKEN}});
 assert.equal(direct.status,403);assert.equal(f.calls.length,0);
});
