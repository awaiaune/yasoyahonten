import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {request} from 'node:http';
import {Miniflare} from 'miniflare';
import {createRuntime,createLocalServer,runtimeOptions} from './server.mjs';
test('site isolation, original Worker, local D1 and Durable Object',async t=>{
    const mf=await createRuntime();const server=createLocalServer(mf);server.listen(8000,'127.0.0.1');await once(server,'listening');
    const base=`http://127.0.0.1:${server.address().port}`;
    t.after(async()=>{await new Promise(resolve=>server.close(resolve));await mf.dispose();});
    for(const route of ['/','/products.html','/products/lemonbalm.html','/products/yomogi.html','/products/goldenrod.html','/checkout.html','/admin/']){
        const r=await fetch(base+route);assert.equal(r.status,200);const html=await r.text();
        assert.match(html,/<head[^>]*><script src="\/js\/store-config.js"><\/script>/i);
        assert.doesNotMatch(html,/<script[^>]*src=["']https:\/\/(web|sandbox)\.squarecdn\.com/i);
        assert.match(r.headers.get('content-security-policy'),/connect-src 'self';/);
        assert.match(r.headers.get('content-security-policy'),/script-src 'self' 'unsafe-inline';/);
    }
    const config=await(await fetch(base+'/js/store-config.js')).text();assert.doesNotMatch(config,/production|workers\.dev|sq0idp/);assert.match(config,/workerBaseUrl:location.origin/);
    for(const route of ['/worker/wrangler.jsonc','/.git/config','/dev/package.json','/images/../../worker/package.json'])assert.equal((await fetch(base+route)).status,404);
    const badHostStatus=await new Promise((resolve,reject)=>{const r=request(base,{headers:{Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);});r.on('error',reject);r.end();});
    assert.equal(badHostStatus,403);
    assert.equal((await fetch(base+'/api/health',{headers:{Origin:'https://evil.example'}})).status,403);
    const health=await(await fetch(base+'/api/health')).json();assert.equal(health.environment,'sandbox');assert.equal(health.emailConfigured,false);
    assert.equal((await fetch(base+'/api/admin/orders')).status,401);
    const orders=await fetch(base+'/api/admin/orders',{headers:{Authorization:'Bearer local-development-only'}});assert.equal(orders.status,200);assert.deepEqual(await orders.json(),{orders:[]});
    const pay=await fetch(base+'/api/payments',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:'{}'});assert.equal(pay.status,400);assert.match(await pay.text(),/決済トークン/);
    const inv=await fetch(base+'/api/inventory',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({ids:['lemonbalm-10g']})});assert.equal(inv.status,500);
});
test('outbound denial includes production, sandbox and loopback',async t=>{
    const options=runtimeOptions(`export default {async fetch(r){return fetch(new URL(r.url).searchParams.get('target'));}}`);delete options.durableObjects;
    const mf=new Miniflare(options);t.after(()=>mf.dispose());
    for(const target of ['https://connect.squareup.com/v2/payments','https://connect.squareupsandbox.com/v2/payments','https://api.resend.com/emails','https://yasoya-honten-payments.tatsurou3523.workers.dev/api/health','https://api.cloudflare.com/client/v4/','http://127.0.0.1:8787/api/health']){
        const r=await mf.dispatchFetch('http://local/?target='+encodeURIComponent(target));assert.equal(r.status,503);assert.match(await r.text(),/outbound network denied/);
    }
    assert.equal(options.bindings.SQUARE_ACCESS_TOKEN,undefined);assert.equal(options.bindings.RESEND_API_KEY,undefined);
});
