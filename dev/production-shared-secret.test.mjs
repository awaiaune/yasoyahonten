import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Square} from '../worker/src/management/square.js';
import {fixture} from './production-fixture.mjs';
import {CATALOG} from '../worker/src/catalog.js';

// All values and Square responses here are local fakes; no environment credentials.
const shared='offline-shared-square-credential';
const grants={PRODUCTION_MANAGEMENT_READ_ENABLED:'1',PRODUCTION_MANAGEMENT_DRAFT_ENABLED:'1',PRODUCTION_CHECKOUT_ENABLED:'0',SQUARE_ACCESS_TOKEN:shared};
const backend=await build({entryPoints:[new URL('../production/storefront-worker.js',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'browser'});
const backendScript=backend.outputFiles[0].text;
async function seed(f){
 const v=CATALOG['lemonbalm-10g'];
 await f.api('/api/admin/products/lemonbalm','PUT',{operationId:crypto.randomUUID(),expectedVersion:0,slug:'lemonbalm',name:v.name,description:'既存説明',sortOrder:0,images:[],variants:[{id:'lemonbalm-10g',name:v.name,price:980,amount:'10g',maxQuantity:10,active:true}]});
 return {operationId:crypto.randomUUID(),expectedVersion:1,mappings:[{variantId:'lemonbalm-10g',variationId:v.squareVariationId}]};
}
test('Production reuses existing secret, prefers an optional dedicated secret, and never borrows Sandbox credentials',()=>{
 assert.equal(new Square({RUNTIME_TIER:'production',SQUARE_ACCESS_TOKEN:shared,SQUARE_SANDBOX_ACCESS_TOKEN:'offline-sandbox'}).token(),shared);
 assert.equal(new Square({RUNTIME_TIER:'production',SQUARE_ACCESS_TOKEN:shared,PRODUCTION_MANAGEMENT_SQUARE_TOKEN:'offline-dedicated'}).token(),'offline-dedicated');
 assert.equal(new Square({RUNTIME_TIER:'production',SQUARE_SANDBOX_ACCESS_TOKEN:'offline-sandbox'}).token(),undefined);
 assert.equal(new Square({RUNTIME_TIER:'staging',SQUARE_ACCESS_TOKEN:shared,SQUARE_SANDBOX_ACCESS_TOKEN:'offline-sandbox'}).token(),'offline-sandbox');
});
test('authenticated admin can link existing products with the shared secret only in upstream Authorization',async t=>{
 let checked=0;
 const f=await fixture(t,grants,true,{backendScript,squareResponse:async request=>{
  assert.equal(request.headers.get('Authorization')==='Bearer '+shared,true);
  assert.equal(request.url.includes(shared),false);
  assert.equal((await request.clone().text()).includes(shared),false);
  checked++;
 }});
 const result=await f.request('/api/admin/products/lemonbalm/link','POST',await seed(f));
 assert.equal(result.status,200);
 assert.equal((await result.text()).includes(shared),false);
 assert(checked>0);
 assert(f.calls.every(c=>c.method==='GET'));
 const config=await f.ui.dispatchFetch('https://admin.awaiaune.com/js/store-config.js',{headers:{'Cf-Access-Jwt-Assertion':f.token}});
 assert.equal(config.status,200);
 const text=await config.text();assert.equal(text.includes(shared),false);assert.equal(text.includes('SQUARE_ACCESS_TOKEN'),false);
});
for(const status of [401,403])test('upstream '+status+' is reported safely without exposing echoed credentials or retrying',async t=>{
 let count=0;
 const f=await fixture(t,grants,true,{backendScript,squareResponse:async()=>{count++;return Response.json({errors:[{code:status===403?'INSUFFICIENT_SCOPES':'UNAUTHORIZED',detail:'unsafe upstream echo '+shared}]},{status});}});
 const response=await f.request('/api/admin/products/lemonbalm/link','POST',await seed(f));
 assert.equal(response.status,422);
 const text=await response.text();assert.equal(text.includes(shared),false);assert.equal(text.includes('unsafe upstream echo'),false);
 assert.equal(count,1);
 assert.equal((await f.db.prepare('SELECT COUNT(*) AS n FROM mg_mappings').first()).n,0);
});
test('shared credential does not permit public API writes or bypass Access and admin authentication',async t=>{
 const f=await fixture(t,grants,true,{backendScript});
 const body=await seed(f),path='/api/admin/products/lemonbalm/link';
 for(const headers of [{'Cf-Access-Jwt-Assertion':''},{'Cf-Access-Jwt-Assertion':'unsigned'},{Authorization:'Bearer offline-wrong-admin'}]){
  const response=await f.request(path,'POST',body,headers);assert([401,403].includes(response.status));
 }
 const publicRequest=await f.mf.dispatchFetch(f.env.SITE_URL+path,{method:'POST',headers:{Origin:f.env.SITE_URL,Authorization:'Bearer '+f.env.ADMIN_TOKEN,'Cf-Access-Jwt-Assertion':f.token,'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal(publicRequest.status,403);
 assert.equal(f.calls.length,0);
 assert.equal((await f.db.prepare('SELECT COUNT(*) AS n FROM mg_mappings').first()).n,0);
});
