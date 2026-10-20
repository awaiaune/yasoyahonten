import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { assertAccess } from '../validation/access.js';
import { assertSavedMapping } from '../validation/mapping.mjs';
import { productPlan } from '../validation/seed-square.mjs';
import { CATALOG } from '../worker/src/catalog.js';
import { SANDBOX_CATALOG, RETIRED_SANDBOX_ID } from '../validation/catalog.js';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { assertManifest, assertRuntime, assertConfig, assertDatabase, assertSquareDestination, assertTestEmail, environmentVars } from '../validation/safety.js';
import { makeConfig, storefrontConfig, renderHtml, renderCartScript, markerSql } from '../validation/prepare.mjs';
function manifest() {
    return {workerName:'yasoya-payments-validation',accountId:'a'.repeat(32),workerOrigin:'https://yasoya-payments-validation.test-account.workers.dev',databaseName:'yasoya-validation-orders',databaseId:'11111111-1111-4111-8111-111111111111',instanceId:'22222222-2222-4222-8222-222222222222',squareApplicationId:'sandbox-sq0idb-local-offline-test',squareLocationId:'TESTLOCATION001',variations:{'lemonbalm-10g':'TESTVARIATION001','yomogi-10g':'TESTVARIATION002','goldenrod-leaf-10g':'TESTVARIATION003'},notificationEmail:'test@example.invalid',resendFrom:'sender@example.invalid',accessTeamDomain:'test-team.cloudflareaccess.com',accessAudience:'b'.repeat(64)};
}
const accessKeys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const accessJwk={...await crypto.subtle.exportKey('jwk',accessKeys.publicKey),kid:'offline-test-key',alg:'RS256',use:'sig'};
async function accessToken(m=manifest(),patch={},headerPatch={}) {
    const now=Math.floor(Date.now()/1000),enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
    const input=enc({alg:'RS256',kid:accessJwk.kid,...headerPatch})+'.'+enc({iss:`https://${m.accessTeamDomain}`,aud:[m.accessAudience],email:m.notificationEmail,iat:now-1,exp:now+300,...patch});
    return input+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',accessKeys.privateKey,new TextEncoder().encode(input))).toString('base64url');
}
function runtime(m=manifest()) {
    return {...environmentVars(m),ORDERS_DB:{},PURCHASE_COORDINATOR:{},SQUARE_SANDBOX_ACCESS_TOKEN:'offline-placeholder-not-a-real-token',RESEND_VALIDATION_API_KEY:'offline-placeholder-not-a-real-key',VALIDATION_ADMIN_TOKEN:'offline-test-only-'.repeat(3)};
}
test('incomplete template and production identifiers are refused offline', async () => {
    const template=JSON.parse(await readFile(new URL('../validation/manifest.example.json',import.meta.url),'utf8'));
    assert.throws(()=>assertManifest(template));
    for (const patch of [
        {workerName:'yasoya-honten-payments'}, {databaseId:'442fa9fd-25d3-4c01-bcc3-04be7b420cf5'},
        {squareLocationId:'LQ693S4H2NBZ8'}, {squareApplicationId:'sq0idp-JYrGicMfKr-ILhZeLS9Xsw'},
        {workerOrigin:'https://yasoyahonten.awaiaune.com'}, {SQUARE_ACCESS_TOKEN:'forbidden-field'},
        {variations:{...manifest().variations,'lemonbalm-10g':'RRTIT6N4QLIYPUW633WDBG36'}}
    ]) assert.throws(()=>assertManifest({...manifest(),...patch}));
});
test('configuration refuses production routes, databases, external DOs and injected vars', () => {
    const m=manifest(); const c=makeConfig(m); assert.doesNotThrow(()=>assertConfig(c,m));
    for (const patch of [ {name:'yasoya-honten-payments'}, {routes:['yasoyahonten.awaiaune.com/*']},
        {env:{production:{}}}, {preview_urls:true}, {vars:{...c.vars,SQUARE_ENVIRONMENT:'production'}},
        {d1_databases:[{binding:'ORDERS_DB',database_name:'yasoya-orders',database_id:'442fa9fd-25d3-4c01-bcc3-04be7b420cf5'}]},
        {durable_objects:{bindings:[{name:'PURCHASE_COORDINATOR',class_name:'PurchaseCoordinator',script_name:'yasoya-honten-payments'}]}}
    ]) assert.throws(()=>assertConfig({...c,...patch},m));
});
test('runtime rejects environment drift, missing secrets and local test bindings', () => {
    assert.doesNotThrow(()=>assertRuntime(runtime()));
    for (const patch of [{SQUARE_ENVIRONMENT:'production'},{RUNTIME_TIER:''},{SITE_URL:'https://yasoyahonten.awaiaune.com'},{VALIDATION_ADMIN_TOKEN:'local-development-only'},{SQUARE_SANDBOX_ACCESS_TOKEN:''},{SQUARE_ACCESS_TOKEN:'generic-secret-forbidden'},{LOCAL_SQUARE:{}}]) assert.throws(()=>assertRuntime({...runtime(),...patch}));
});
test('Square egress permits only Sandbox and test mail permits only one recipient', () => {
    const env=runtime(); assert.doesNotThrow(()=>assertSquareDestination(env,'https://connect.squareupsandbox.com/v2/payments'));
    for (const url of ['https://connect.squareup.com/v2/payments','https://connect.squareupsandbox.com.evil.invalid/v2/payments','http://connect.squareupsandbox.com/v2/payments','https://user@connect.squareupsandbox.com/v2/payments']) assert.throws(()=>assertSquareDestination(env,url));
    const mail={from:'sender@example.invalid',to:['test@example.invalid']};assert.doesNotThrow(()=>assertTestEmail(env,mail));
    for (const patch of [{to:['customer@example.invalid']},{bcc:['other@example.invalid']},{to:['test@example.invalid','other@example.invalid']}]) assert.throws(()=>assertTestEmail(env,{...mail,...patch}));
});
test('D1 marker is checked read-only and never initialized automatically', async () => {
    let writes=0;const env=runtime();
    env.ORDERS_DB={prepare(sql){assert.match(sql,/^SELECT /);return {first:async()=>({instance_id:'wrong'}),run:async()=>{writes++;}};}};
    await assert.rejects(assertDatabase(env));assert.equal(writes,0);
    env.ORDERS_DB.prepare=()=>({first:async()=>({instance_id:manifest().instanceId})});await assertDatabase(env);
});
test('validation frontend uses Sandbox SDK and dedicated Worker without changing source', async () => {
    const original=await readFile(new URL('../checkout.html',import.meta.url),'utf8');const config=storefrontConfig(manifest());
    assert(!config.includes('production'));assert(!config.includes('yasoya-honten-payments.'));
    const html=renderHtml(original);assert(html.includes('https://sandbox.web.squarecdn.com/v1/square.js'));assert(!html.includes('src="https://web.squarecdn.com/v1/square.js"'));
    assert.match(html,/<head[^>]*><script src="\/js\/store-config.js">/i);
    assert.equal(await readFile(new URL('../checkout.html',import.meta.url),'utf8'),original);
    assert(!markerSql(manifest()).includes('DROP'));assert(!markerSql(manifest()).includes('DELETE'));
});
test('sandbox entry rejects invalid configuration before fetch, D1 or assets', async t => {
    const bundle=await build({entryPoints:[new URL('../validation/sandbox-worker.js',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'browser'});
    let outbound=0;const mf=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-08-04',outboundService:()=>{outbound++;throw new Error('No network allowed');}});t.after(()=>mf.dispose());
    const r=await mf.dispatchFetch('https://yasoya-payments-validation.test-account.workers.dev/api/health');assert.equal(r.status,503);assert.equal(outbound,0);
});

test('valid sandbox wrapper uses only isolated D1, mapped variants and test recipients', async t => {
    const m=manifest(); const bundle=await build({entryPoints:[new URL('../validation/sandbox-worker.js',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'browser'});
    const calls=[];let payment;const jwt=await accessToken(m);
    const env=runtime(m);delete env.ORDERS_DB;delete env.PURCHASE_COORDINATOR;
    const mf=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-08-04',bindings:env,
        d1Databases:{ORDERS_DB:'sandbox-safety-fresh-test-db'},durableObjects:{PURCHASE_COORDINATOR:{className:'SandboxPurchaseCoordinator',useSQLite:true}},
        serviceBindings:{ASSETS:()=>new Response('<html>test</html>',{headers:{'Content-Type':'text/html'}})},
        outboundService:async request=>{
            const u=new URL(request.url);
            if(u.origin===`https://${m.accessTeamDomain}`){assert.equal(u.pathname,'/cdn-cgi/access/certs');return Response.json({keys:[accessJwk]});}
            calls.push(u.origin+u.pathname);
            const body=await request.json();
            if(u.origin==='https://api.resend.com') { assertTestEmail(runtime(m),body);return Response.json({id:'offline-test-mail'}); }
            assert.equal(u.origin,'https://connect.squareupsandbox.com');
            if(u.pathname.endsWith('/counts/batch-retrieve')) {
                assert.equal(body.catalog_object_ids.length,1);assert(Object.values(m.variations).includes(body.catalog_object_ids[0]));
                return Response.json({counts:[{catalog_object_id:body.catalog_object_ids[0],location_id:m.squareLocationId,state:'IN_STOCK',quantity:'10'}]});
            }
            if(u.pathname==='/v2/payments') {
                payment={id:'offline-sandbox-payment',reference_id:body.reference_id,amount_money:body.amount_money,location_id:m.squareLocationId,status:'COMPLETED'};
                return Response.json({payment});
            }
            assert(u.pathname.endsWith('/changes/batch-create'));
            assert.equal(body.changes[0].adjustment.catalog_object_id,m.variations['lemonbalm-10g']);return Response.json({});
        }});t.after(()=>mf.dispose());
    const request=(route,options={})=>mf.dispatchFetch(m.workerOrigin+route,{...options,headers:{...options.headers,'Cf-Access-Jwt-Assertion':jwt}});
    assert.equal((await mf.dispatchFetch(m.workerOrigin+'/api/health')).status,401);
    assert.equal((await mf.dispatchFetch(m.workerOrigin+'/api/admin/orders',{headers:{Authorization:'Bearer '+env.VALIDATION_ADMIN_TOKEN}})).status,401);assert.equal(calls.length,0);
    assert.equal((await request('/api/health')).status,503);assert.equal(calls.length,0);
    const db=await mf.getD1Database('ORDERS_DB');await db.exec(markerSql(m).split('\n').filter(line=>!line.startsWith('--')).join('\n'));
    assert.equal((await request('/api/health')).status,200);
    assert.equal((await request('/api/admin/orders')).status,401);
    assert.equal((await request('/api/admin/orders',{headers:{Authorization:'Bearer wrong'}})).status,401);
    assert.equal((await request('/api/admin/orders',{headers:{Authorization:'Bearer '+env.VALIDATION_ADMIN_TOKEN}})).status,200);
    const page=await request('/');assert.equal(page.status,200);assert.match(page.headers.get('Content-Security-Policy'),/sandbox\.web\.squarecdn\.com/);
    const contact={givenName:'試験',familyName:'購入者',email:m.notificationEmail,phone:'09012345678',addressLines:['テスト1'],city:'テスト市',state:'東京都',postalCode:'1000001',countryCode:'JP'};
    const order={attemptId:crypto.randomUUID(),sourceId:'offline-test-source',items:[{id:'lemonbalm-10g',quantity:1}],contact};
    const options={method:'POST',headers:{Origin:m.workerOrigin,'Content-Type':'application/json'},body:JSON.stringify(order)};
    // Rejected before any payment, inventory request or new order persistence.
    for (const route of ['/api/quote','/api/inventory','/api/payments']) {
        const retired={...order,ids:[RETIRED_SANDBOX_ID],items:[{id:RETIRED_SANDBOX_ID,quantity:1}]};
        assert.equal((await request(route,{...options,body:JSON.stringify(retired)})).status,400);
    }
    assert.equal(calls.length,0);
    const leafQuote=await request('/api/quote',{...options,body:JSON.stringify({items:[{id:'goldenrod-leaf-10g',quantity:1}]})});
    assert.equal(leafQuote.status,200);
    const leafData=await leafQuote.json();
    assert.equal(leafData.items[0].name,'セイタカアワダチソウ 葉 10g');
    assert.equal(leafData.items[0].unitPrice,980);

    const paid=await request('/api/payments',options);assert.equal(paid.status,200);assert.equal((await paid.json()).ok,true);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM orders').first()).n,1);
    assert.equal((await request('/api/payments',{...options,body:JSON.stringify({...order,contact:{...contact,email:'unapproved@example.invalid'}})})).status,400);
    assert.equal((await mf.dispatchFetch('https://yasoyahonten.awaiaune.com/api/health')).status,403);
    assert(calls.every(c=>c.startsWith('https://connect.squareupsandbox.com/')||c.startsWith('https://api.resend.com/')));
});


test('Sandbox assortment is exactly three 980 JPY variants while production keeps four', () => {
    assert.deepEqual(Object.keys(SANDBOX_CATALOG),['lemonbalm-10g','yomogi-10g','goldenrod-leaf-10g']);
    assert.deepEqual(Object.values(SANDBOX_CATALOG).map(p=>p.name),['乾燥レモンバーム 10g','乾燥ヨモギ 10g','セイタカアワダチソウ 葉 10g']);
    assert(Object.values(SANDBOX_CATALOG).every(p=>p.price===980));
    assert.equal(Object.keys(CATALOG).length,4);assert.equal(CATALOG[RETIRED_SANDBOX_ID].active,true);
    assert.equal(CATALOG['goldenrod-leaf-10g'].name,'乾燥セイタカアワダチソウ 葉 10g');
});
test('manifest refuses old four-entry maps and missing Sandbox variations', () => {
    const m=manifest();
    assert.throws(()=>assertManifest({...m,variations:{...m.variations,[RETIRED_SANDBOX_ID]:'RETIREDVAR001'}}));
    const variations={...m.variations};delete variations['goldenrod-leaf-10g'];
    assert.throws(()=>assertManifest({...m,variations}));
});
test('every generated HTML page excludes retired offers, controls and inventory IDs', async () => {
    const root=new URL('../',import.meta.url);
    for (const dir of ['', 'products/', 'admin/']) {
        for(const file of (await readdir(new URL(dir,root))).filter(f=>f.endsWith('.html'))) {
            const source=new URL(dir+file,root),original=await readFile(source,'utf8');
            const html=renderHtml(original);
            assert(!html.includes(RETIRED_SANDBOX_ID));assert(!html.includes('20g'));assert(!html.includes('葉と茎'));
            if(dir+file==='products/goldenrod.html') {
                assert.equal((html.match(/name="goldenrodVariant"/g)||[]).length,1);
                const data=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
                assert.equal(data['@type'],'Product');assert.equal(data.sku,'goldenrod-leaf-10g');
                assert.equal(data.name,'セイタカアワダチソウ 葉 10g');assert.equal(data.offers.priceCurrency,'JPY');
                assert.equal(Number(data.offers.price),980);
            }
            assert.equal(await readFile(source,'utf8'),original);
        }
    }
});
test('generated Sandbox cart ignores old storage and refuses retired items', async () => {
    const original=await readFile(new URL('../js/cart.js',import.meta.url),'utf8');
    const retired={id:RETIRED_SANDBOX_ID,name:'retired',price:980,quantity:1};
    const storage=new Map([['yasoya_honten_cart_v1',JSON.stringify([retired])]]);
    const context={window:{dispatchEvent(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},CustomEvent:class{}};
    vm.runInNewContext(renderCartScript(original),context);
    const cart=context.window.YasoyaCart;assert.equal(cart.read().length,0);
    storage.set('yasoya_sandbox_cart_v2',JSON.stringify([retired]));assert.equal(cart.read().length,0);
    assert.throws(()=>cart.add(retired));
    cart.add({id:'goldenrod-leaf-10g',name:'セイタカアワダチソウ 葉 10g',price:980,quantity:1});
    assert.equal(cart.count(),1);assert.equal(cart.subtotal(),980);
    assert.equal(storage.get('yasoya_honten_cart_v1'),JSON.stringify([retired]));
});


test('Access and notification configuration fail closed for unknown hosts, missing audience or address lists',()=>{
    for(const patch of [{accessTeamDomain:''},{accessTeamDomain:'evil.invalid'},{accessAudience:''},{notificationEmail:'a@example.invalid,b@example.invalid'},{resendFrom:'a@example.invalid,b@example.invalid'}])assert.throws(()=>assertManifest({...manifest(),...patch}));
    assert.throws(()=>assertTestEmail(runtime(),{from:'sender@example.invalid',to:['test@example.invalid'],reply_to:'customer@example.invalid'}));
});
test('Access verifies signature, issuer, audience, owner and expiry using only configured JWKS',async()=>{
    const env=runtime(),m=manifest();let fetches=0;
    const fetcher=async(url,options)=>{fetches++;assert.equal(url,`https://${m.accessTeamDomain}/cdn-cgi/access/certs`);assert.equal(options.redirect,'manual');return Response.json({keys:[accessJwk]});};
    const req=jwt=>new Request(m.workerOrigin,{headers:jwt?{'Cf-Access-Jwt-Assertion':jwt}:{}});
    await assert.rejects(assertAccess(req(),env,{fetcher}));assert.equal(fetches,0);
    await assertAccess(req(await accessToken()),env,{fetcher});
    for(const patch of [{iss:'https://evil.invalid'},{aud:['wrong']},{email:'other@example.invalid'},{exp:0},{nbf:9999999999}])await assert.rejects(assertAccess(req(await accessToken(m,patch)),env,{fetcher}));
    await assert.rejects(assertAccess(req(await accessToken(m,{}, {alg:'none'})),env,{fetcher}));
    const jwt=await accessToken();const parts=jwt.split('.');const signature=Buffer.from(parts[2],'base64url');signature[0]^=1;parts[2]=signature.toString('base64url');
    await assert.rejects(assertAccess(req(parts.join('.')),env,{fetcher}));
    await assert.rejects(assertAccess(req(jwt),env,{fetcher:async()=>new Response(null,{status:302})}));
    await assert.rejects(assertAccess(req(jwt),env,{fetcher:async()=>{throw new Error('offline network failure');}}));
});
test('offline preparation requires saved mapping account, three IDs and source digest to match',async()=>{
    const m=manifest(),plan=await productPlan();
    const settings={environment:'sandbox',applicationId:m.squareApplicationId,locationId:m.squareLocationId};
    const mapping={schema:1,applicationId:m.squareApplicationId,locationId:m.squareLocationId,sourceDigest:createHash('sha256').update(JSON.stringify(plan)).digest('hex'),variations:{...m.variations},items:{goldenrod:'SANDBOXITEM001',lemonbalm:'SANDBOXITEM002',yomogi:'SANDBOXITEM003'}};
    assert.doesNotThrow(()=>assertSavedMapping(m,mapping,settings,plan));
    for(const patch of [{locationId:'OTHERLOCATION'},{sourceDigest:'old-source'},{variations:{...mapping.variations,'goldenrod-leaf-stem-20g':'RETIREDVAR001'}},{variations:{...mapping.variations,'lemonbalm-10g':'OTHERID001'}},{token:'forbidden'},{items:{}}])assert.throws(()=>assertSavedMapping(m,{...mapping,...patch},settings,plan));
    assert.throws(()=>assertSavedMapping(m,null,settings,plan));
});
