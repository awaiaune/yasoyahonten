import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {request} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Miniflare} from 'miniflare';
import {managementAccess,localOrigin,seedLocalOrders} from './management-local.mjs';
import {createManagementRuntime,createManagementServer} from './management-server.mjs';
const environment={CODESPACES:'true',CODESPACE_NAME:'yasoya-local-example',GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:'app.github.dev'};
const forwarded='https://yasoya-local-example-8000.app.github.dev';
const host=new URL(forwarded).host;

test('management forwarding allows exactly the current Codespace and loopback; forwarded headers grant no access',()=>{
 const plain=managementAccess();assert.equal(plain.requestUrl({host:'127.0.0.1:8000'},'/admin/'),localOrigin+'/admin/');
 assert.throws(()=>plain.requestUrl({host},'/admin/'));
 const p=managementAccess(environment);assert.deepEqual(p.origins,[localOrigin,'http://localhost:8000','http://[::1]:8000',forwarded]);
 for(const h of [host,'127.0.0.1:8000','localhost:8000','[::1]:8000','localhost','127.0.0.1','[::1]'])assert.equal(p.requestUrl({host:h,origin:forwarded},'/admin/'),forwarded+'/admin/');
 for(const h of ['evil.example',host+'.evil.example','other-8000.app.github.dev',host.replace('-8000.','-8001.'),'127.0.0.1:9000']){
  assert.throws(()=>p.requestUrl({host:h,origin:forwarded,'x-forwarded-host':host},'/admin/'));
 }
 for(const origin of ['null','https://evil.example',forwarded+'/',localOrigin+'.evil.example'])assert.throws(()=>p.requestUrl({host,origin},'/api/admin/products'));
 for(const target of ['https://evil.example/','//evil.example/','/\\evil.example/'])assert.throws(()=>p.requestUrl({host},target));
 assert.equal(p.requestUrl({host,'x-forwarded-host':'evil.example',forwarded:'host=evil.example'},'/'),forwarded+'/');
});
test('invalid Codespaces metadata fails closed instead of accepting arbitrary forwarding domains',()=>{
 for(const patch of [{CODESPACE_NAME:''},{CODESPACE_NAME:'foo.evil'},{CODESPACE_NAME:'foo/../bar'},{CODESPACE_NAME:'a'.repeat(59)},
  {GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:undefined},{GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:'evil.example'},
  {GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:'app.github.dev.evil.example'}])assert.throws(()=>managementAccess({...environment,...patch}));
 assert.deepEqual(managementAccess({...environment,CODESPACES:undefined}).origins,[localOrigin,'http://localhost:8000','http://[::1]:8000']);
});

async function httpClient(t,runtime){
 const server=createManagementServer(runtime);server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 return (path,method='GET',body,extra={},auth=true)=>new Promise((resolve,reject)=>{
  const req=request({hostname:'127.0.0.1',port:server.address().port,path,method,headers:{Host:host,Origin:forwarded,...(auth?{Authorization:'Bearer local-development-only'}:{}),...(body?{'Content-Type':'application/json'}:{}),...extra}},res=>{
   const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{const text=Buffer.concat(chunks).toString();resolve({status:res.statusCode,headers:res.headers,text,json:()=>JSON.parse(text)});});
  });req.on('error',reject);req.end(body?JSON.stringify(body):undefined);
 });
}

test('Codespaces HTTP supports admin login, product save, stock write, fixture detail and shipping without external calls',async t=>{
 const runtime=await createManagementRuntime({environment,seed:true,seedOrders:true});t.after(()=>runtime.mf.dispose());
 const call=await httpClient(t,runtime);
 const admin=await call('/admin/');assert.equal(admin.status,200);assert.match(admin.text,/実際のメールは送信されません/);assert.match(admin.headers['content-security-policy'],/connect-src 'self';/);
 assert.match((await call('/js/store-config.js')).text,/workerBaseUrl:location.origin/);
 for(const path of ['/dev/management-local.mjs','/.git/config','/validation/manifest.local.json'])assert.equal((await call(path)).status,404);
 assert.equal((await call('/api/admin/orders','GET',undefined,{},false)).status,401);
 const products=(await call('/api/admin/products')).json().products;assert.equal(products.length,3);
 const original=products[0];const detail=(await call('/api/admin/products/'+original.id)).json().product;
 const edit=await call('/api/admin/products/'+original.id,'PUT',{...detail.draft,slug:detail.slug,name:detail.draft.name+'（ローカル編集）',expectedVersion:detail.version,operationId:crypto.randomUUID()});assert.equal(edit.status,200,edit.text);
 const stock=(await call('/api/admin/inventory')).json().inventory;assert(stock.every(v=>v.quantity===5));
 const row=stock[0];const adjusted=await call('/api/admin/inventory/'+row.id,'POST',{operationId:crypto.randomUUID(),kind:'receipt',quantity:1,reason:'ローカルUI確認',expectedQuantity:row.quantity,observedAt:row.observedAt});assert.equal(adjusted.status,200,adjusted.text);
 assert.equal((await call('/api/admin/inventory')).json().inventory.find(v=>v.id===row.id).quantity,6);
 const pending=(await call('/api/admin/orders?status=pending')).json().orders;assert.equal(pending.length,1);assert.equal(pending[0].total,1330);assert.match(pending[0].contact.email,/@example.invalid$/);
 assert.equal((await call('/api/admin/orders?status=shipped')).json().orders.length,1);
 const ref=pending[0].order_reference;
 const order=(await call('/api/admin/orders/'+ref)).json().order;assert.match(order.items[0].name,/架空注文/);
 let fakeMail=0;runtime.options.serviceBindings.LOCAL_RESEND=async()=>{fakeMail++;return Response.json({id:'offline-mail-not-sent'});};await runtime.mf.setOptions(runtime.options);runtime.db=await runtime.mf.getD1Database('ORDERS_DB');
 const ship=await call('/api/admin/orders/'+ref+'/ship','POST',{shippingMethod:'クリックポスト',trackingNumber:'LOCAL-ONLY'});assert.equal(ship.status,200,ship.text);assert.equal(fakeMail,1);
 assert.equal((await call('/api/admin/orders/'+ref+'/ship','POST',{shippingMethod:'クリックポスト'})).status,409);assert.equal(fakeMail,1);
 assert.equal((await call('/api/admin/orders?status=shipped')).json().orders.length,2);
 await seedLocalOrders(runtime);assert.equal((await call('/api/admin/orders?status=pending')).json().orders.length,0);assert.equal((await call('/api/admin/orders?status=shipped')).json().orders.length,2);
 assert.equal(runtime.square.payments.size,0);assert(!runtime.square.calls.some(p=>p.startsWith('/v2/payments')));
 for(const headers of [{Host:'evil.example','X-Forwarded-Host':host},{Origin:'https://evil.example'},{Origin:'null'}])assert.equal((await call('/api/admin/orders/'+ref+'/ship','POST',{shippingMethod:'テスト'},headers)).status,403);
 assert.equal((await call('/api/admin/orders','GET',undefined,{Host:'localhost:8000'})).status,200);
});

test('local fixtures and manual changes persist across restart; reseeding never resets products, orders or stock',async()=>{
 const state=await mkdtemp(join(tmpdir(),'yasoya-management-local-'));let r;
 try{
  r=await createManagementRuntime({state,seed:true,seedOrders:true});
  assert.equal((await r.db.prepare('SELECT COUNT(*) AS n FROM orders').first()).n,2);
  await r.db.prepare("UPDATE orders SET status='shipped',tracking_number='KEEP-ME' WHERE order_reference='LOCAL-DEMO-PENDING-001'").run();
  await r.db.prepare("INSERT INTO orders SELECT 'USER-LOCAL-ORDER','user-local-payment',created_at,status,subtotal,shipping,total,items_json,contact_json,inventory_adjusted,shipping_method,tracking_number,shipped_at FROM orders LIMIT 1").run();
  const id=[...r.square.counts.keys()][0];r.square.counts.set(id,2);await r.square.persist();
  const before=await r.db.prepare('SELECT * FROM orders ORDER BY order_reference').all();
  await r.mf.dispose();r=null;
  r=await createManagementRuntime({state,seed:true,seedOrders:true});
  assert.deepEqual((await r.db.prepare('SELECT * FROM orders ORDER BY order_reference').all()).results,before.results);
  assert.equal(r.square.counts.get(id),2);assert.equal((await r.db.prepare('SELECT COUNT(*) AS n FROM mg_products').first()).n,3);assert.equal(r.square.payments.size,0);
 }finally{if(r)await r.mf.dispose();await rm(state,{recursive:true,force:true});}
});

test('management runtime still denies Square, Resend, Cloudflare and production Worker outbound fetches',async t=>{
 const r=await createManagementRuntime({environment});t.after(()=>r.mf.dispose());
 assert.equal(r.options.bindings.SQUARE_ACCESS_TOKEN,'fake-local-test-only');assert.equal(r.options.bindings.RESEND_API_KEY,'local-test-not-a-secret');
 assert.equal(r.options.bindings.SQUARE_SANDBOX_ACCESS_TOKEN,undefined);assert.equal(r.options.bindings.CLOUDFLARE_API_TOKEN,undefined);
 const probe=new Miniflare({modules:true,script:'export default {fetch(r){return fetch(new URL(r.url).searchParams.get("target"));}}',compatibilityDate:'2026-08-04',outboundService:r.options.outboundService});t.after(()=>probe.dispose());
 for(const target of ['https://connect.squareup.com/v2/payments','https://connect.squareupsandbox.com/v2/payments','https://api.resend.com/emails','https://api.cloudflare.com/client/v4/','https://yasoya-honten-payments.tatsurou3523.workers.dev/api/health']){
  const response=await probe.dispatchFetch('http://local/?target='+encodeURIComponent(target));assert.equal(response.status,503);assert.match(await response.text(),/outbound network denied/);
 }
});

test('photo transport diagnostics identify forwarding denial and dispatch failures without logging private data',async t=>{
 const logs=[];const original=console.info;console.info=(...args)=>logs.push(args.join(' '));t.after(()=>{console.info=original;});
 const runtime={access:managementAccess(environment),options:{},mf:{dispatchFetch:async()=>{throw Object.assign(new Error('PRIVATE-error-contents'),{cause:{code:'UND_ERR_REQ_CONTENT_LENGTH_MISMATCH'}});}}};
 const call=await httpClient(t,runtime);
 const headers={'Content-Type':'image/jpeg','X-Yasoya-Photo-Trace':'12345678-1234-1234-1234-123456789abc','X-Private-Test':'PRIVATE-header-value'};
 const failed=await call('/api/admin/images','POST','PRIVATE-body',headers);
 assert.equal(failed.status,500);assert.equal(failed.json().error.code,'LOCAL_UPLOAD_FAILED');assert.equal(failed.headers['x-yasoya-photo-stage'],'dispatch');
 assert(logs.some(line=>line.includes('UND_ERR_REQ_CONTENT_LENGTH_MISMATCH')));
 const denied=await call('/api/admin/images','POST','PRIVATE-body',{...headers,Origin:'https://private-origin.invalid'});
 assert.equal(denied.status,403);assert.equal(denied.json().error.code,'LOCAL_HOST_ORIGIN_DENIED');assert.equal(denied.headers['x-yasoya-photo-stage'],'access');
 const tooBig=await call('/api/admin/images','POST','x'.repeat(8*1024*1024),headers);
 assert.equal(tooBig.status,413);assert.equal(tooBig.json().error.code,'LOCAL_BODY_TOO_LARGE');assert.equal(tooBig.headers['x-yasoya-photo-stage'],'body-read');
 const report=logs.join('\n');for(const value of ['PRIVATE-error-contents','PRIVATE-body','PRIVATE-header-value','private-origin.invalid','local-development-only'])assert(!report.includes(value));
});

test('Codespaces-style fixed-length and chunked binary image uploads persist and can be read back',async t=>{
 const {readFile}=await import('node:fs/promises');const bytes=await readFile(new URL('../images/lemonbalm.jpg',import.meta.url));
 const runtime=await createManagementRuntime({environment});t.after(()=>runtime.mf.dispose());assert.equal(runtime.options.cf,false);
 const server=createManagementServer(runtime);server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>server.close(r)));
 let id;
 for(const chunked of [false,true]){
  const response=await new Promise((resolve,reject)=>{
   const req=request({hostname:'127.0.0.1',port:server.address().port,path:'/api/admin/images',method:'POST',headers:{Host:'localhost:8000',Origin:forwarded,Authorization:'Bearer local-development-only','Content-Type':'image/jpeg',...(chunked?{'Transfer-Encoding':'chunked'}:{'Content-Length':bytes.length})}},res=>{const parts=[];res.on('data',c=>parts.push(c));res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(Buffer.concat(parts))}));});req.on('error',reject);req.end(bytes);
  });
  assert.equal(response.status,200);assert.match(response.body.id,/^[a-f0-9]{64}$/);if(id)assert.equal(response.body.id,id);id=response.body.id;
 }
 const saved=await runtime.mf.dispatchFetch('http://127.0.0.1:8000/api/admin/images/'+id,{headers:{Authorization:'Bearer local-development-only'}});assert.equal(saved.status,200);assert((await saved.arrayBuffer()).byteLength>0);
 assert.equal((await runtime.db.prepare('SELECT COUNT(*) AS n FROM mg_images').first()).n,1);
});


test('proxy host forms stay tied to the exact Codespace Origin, with safe rejection reasons',()=>{
 const p=managementAccess(environment),plain=managementAccess();
 for(const h of ['localhost','127.0.0.1','[::1]']){
  assert.equal(p.requestUrl({host:h,origin:forwarded},'/api/admin/images'),forwarded+'/api/admin/images');
  for(const origin of [undefined,localOrigin,'null','https://other-8000.app.github.dev'])assert.throws(()=>p.requestUrl({host:h,...(origin===undefined?{}:{origin})},'/api/admin/images'));
  assert.throws(()=>plain.requestUrl({host:h,origin:forwarded},'/api/admin/images'));
 }
 for(const origin of [forwarded,forwarded+':443',forwarded.toUpperCase()])assert.equal(p.canonicalOrigin(origin),forwarded);
 const cases=[
  [{origin:forwarded},'HOST_MISSING'],
  [{host:'other-8000.app.github.dev',origin:forwarded},'HOST_NOT_ALLOWED'],
  [{host:'localhost:8001',origin:forwarded},'HOST_NOT_ALLOWED'],
  [{host,origin:'null'},'ORIGIN_NULL'],
  [{host,origin:forwarded+'/'},'ORIGIN_MALFORMED'],
  [{host,origin:'https://private.example'},'ORIGIN_NOT_ALLOWED'],
  [{host:'localhost',origin:localOrigin},'HOST_ORIGIN_PAIR_NOT_ALLOWED'],
  [{host,origin:localOrigin},'HOST_ORIGIN_PAIR_NOT_ALLOWED']
 ];
 for(const [headers,reason] of cases){let e;try{p.requestUrl({...headers,'x-forwarded-host':host,'x-forwarded-proto':'https'},'/api/admin/images');}catch(error){e=error;}assert(e);assert.equal(e.localAccess.reason,reason);assert(!JSON.stringify(e.localAccess).includes('private.example'));}
 for(const origin of ['https://user:pass@'+host,forwarded+'?secret=test',forwarded+'#fragment','http://127.1:8000'])assert.throws(()=>p.requestUrl({host,origin},'/api/admin/images'));
});

test('forwarded binary upload authenticates, normalizes equivalent Origins and diagnoses denials without trusting proxy headers',async t=>{
 const {readFile}=await import('node:fs/promises');const bytes=await readFile(new URL('../images/yomogi.jpg',import.meta.url));
 const runtime=await createManagementRuntime({environment});t.after(()=>runtime.mf.dispose());
 const server=createManagementServer(runtime);server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>server.close(r)));
 const upload=(headers)=>new Promise((resolve,reject)=>{const r=request({hostname:'127.0.0.1',port:server.address().port,path:'/api/admin/images',method:'POST',headers:{Host:'localhost',Origin:forwarded,Authorization:'Bearer local-development-only','Content-Type':'image/jpeg',...headers}},res=>{const parts=[];res.on('data',c=>parts.push(c));res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(Buffer.concat(parts))}));});r.on('error',reject);r.end(bytes);});
 let id;
 for(const headers of [{},{Origin:forwarded+':443'},{Host:'[::1]'},{Host:host.toUpperCase()+':443'}]){const r=await upload(headers);assert.equal(r.status,200);if(id)assert.equal(r.body.id,id);id=r.body.id;}
 assert.equal((await upload({Authorization:'Bearer wrong-local-token'})).status,401);
 for(const headers of [{Host:'other-8000.app.github.dev','X-Forwarded-Host':host},{Origin:'https://private-origin.invalid'},{Origin:'null'},{Host:'localhost:9000'}]){
  const r=await upload(headers);assert.equal(r.status,403);assert.equal(r.body.error.code,'LOCAL_HOST_ORIGIN_DENIED');assert(r.body.error.reason);assert(!JSON.stringify(r.body).includes('private-origin.invalid'));
 }
 const row=await runtime.db.prepare('SELECT COUNT(*) AS n FROM mg_images').first();assert.equal(row.n,1);assert.equal(runtime.square.payments.size,0);
});

test('redacted Origin classification distinguishes wrong scheme, port, Codespace and absent configuration without changing authorization',()=>{
 const p=managementAccess(environment);assert.equal(p.mode,'codespaces');
 assert.equal(p.requestUrl({host:'localhost:8000',origin:forwarded},'/api/admin/images'),forwarded+'/api/admin/images');
 assert.deepEqual(p.classify({host:'localhost:8000',origin:forwarded}),{configurationMode:'codespaces',originMatch:'expected',hostClass:'loopback-port',originClass:'codespace'});
 for(const origin of ['https://other-8000.app.github.dev','https://yasoya-local-example-8001.app.github.dev','http://yasoya-local-example-8000.app.github.dev','https://yasoya-local-example-8000.app.github.dev.evil.example'])assert.throws(()=>p.requestUrl({host:'localhost:8000',origin,'x-forwarded-host':host},'/api/admin/images'));
 const local=managementAccess({});assert.equal(local.mode,'loopback');assert.throws(()=>local.requestUrl({host:'localhost:8000',origin:forwarded},'/api/admin/images'),e=>e.localAccess.originMatch==='not-configured');
});

test('redacted Origin preflight identifies metadata, name, port, scheme and domain mismatches without leaking input',async()=>{
 const {checkManagementOrigin:check}=await import('./check-management-origin.mjs');
 const metadata={...environment};
 const good=check(metadata,forwarded+'/admin/?private=NEVER-LOG-THIS');assert.equal(good.allowed,true);assert.equal(good.originMatch,'expected');assert.equal(good.codespacesFlag,true);assert.equal(good.configurationMode,'codespaces');
 const cases=[['https://private-name-8000.app.github.dev/admin/','different-codespace'],[forwarded.replace('-8000.','-8001.'),'different-forwarded-port'],[forwarded+':8443','wrong-port'],[forwarded.replace('https:','http:'),'wrong-scheme'],['https://private-domain.invalid','different-domain']];
 for(const [url,match] of cases){const r=check(metadata,url);assert.equal(r.allowed,false);assert.equal(r.originMatch,match);assert.equal(r.reason,'ORIGIN_NOT_ALLOWED');}
 assert.equal(check({},forwarded).originMatch,'not-configured');assert.equal(check({CODESPACES:'true',CODESPACE_NAME:'private-name'},forwarded).reason,'INVALID_CODESPACES_METADATA');
 for(const input of ['not-a-url','https://private-user:private-password@'+host,'file:///private-file'])assert.equal(check(metadata,input).reason,'INVALID_INPUT_URL');
 for(const r of [good,...cases.map(([url])=>check(metadata,url))])for(const value of ['yasoya-local-example','private-name','private-domain','NEVER-LOG-THIS','https://'])assert(!JSON.stringify(r).includes(value));
});

test('Origin preflight CLI consumes a URL on stdin without echoing or persisting it',async()=>{
 const {spawn}=await import('node:child_process');const result=await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[new URL('./check-management-origin.mjs',import.meta.url).pathname],{env:{PATH:process.env.PATH,CODESPACES:'true',CODESPACE_NAME:'yasoya-local-example',GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:'app.github.dev'},stdio:['pipe','pipe','pipe']});
  let stdout='',stderr='';child.stdout.on('data',c=>stdout+=c);child.stderr.on('data',c=>stderr+=c);child.on('error',reject);child.on('close',code=>resolve({code,stdout,stderr}));child.stdin.end(forwarded+'/admin/?private=NEVER-LOG-THIS\n');
 });
 assert.equal(result.code,0);assert.equal(JSON.parse(result.stdout).allowed,true);for(const value of ['yasoya-local-example',forwarded,'NEVER-LOG-THIS'])assert(!(result.stdout+result.stderr).includes(value));
});

test('live Origin check sends only a fixed loopback GET, never follows redirects or logs returned data',async()=>{
 const {probeRunningManagementOrigin:probe}=await import('./check-management-origin.mjs');let calls=0;
 const result=await probe('https://private-url.invalid/admin/?private=NEVER-LOG-THIS',async(url,options)=>{
  calls++;assert.equal(url,'http://127.0.0.1:8000/api/health');assert.equal(options.method,'GET');assert.equal(options.redirect,'error');assert.equal(options.headers.Origin,'https://private-url.invalid');
  return Response.json({error:{reason:'ORIGIN_NOT_ALLOWED',private:'NEVER-LOG-THIS'}},{status:403});
 });
 assert.equal(calls,1);assert.equal(result.runningServerStatus,403);assert.equal(result.runningServerOriginAccepted,false);assert.equal(result.runningServerReason,'ORIGIN_NOT_ALLOWED');assert(!JSON.stringify(result).includes('private'));
 const ok=await probe(forwarded,async()=>Response.json({private:'NEVER-LOG-THIS'}));assert.equal(ok.runningServerOriginAccepted,true);
 assert.equal((await probe(forwarded,async()=>{throw Error('private failure');})).runningServerCheck,'unavailable');
 assert.equal((await probe('file:///private-file',async()=>{throw Error('must not fetch');})).runningServerCheck,'invalid-input');
});

test('page-Origin evidence distinguishes a rewritten Origin from a different browser URL using comparisons only',async()=>{
 const {createHash}=await import('node:crypto');const {managementOriginEvidence:evidence}=await import('./management-local.mjs');const access=managementAccess(environment),hash=s=>createHash('sha256').update(s).digest('hex');
 const headers={host:'localhost:8000',origin:forwarded,'x-yasoya-page-origin-sha256':hash(forwarded),'x-yasoya-api-same-origin':'1'};
 assert.deepEqual(evidence(access,headers),{hintState:'valid',pageMatchesExpected:true,pageMatchesReceivedOrigin:true,apiMatchesPage:true});
 const rewritten=evidence(access,{...headers,origin:'https://localhost:8000'});assert.equal(rewritten.pageMatchesExpected,true);assert.equal(rewritten.pageMatchesReceivedOrigin,false);assert.equal(access.classify({...headers,origin:'https://localhost:8000'}).originMatch,'loopback-wrong-scheme');
 const wrong='https://other-8000.app.github.dev',mismatch=evidence(access,{...headers,origin:wrong,'x-yasoya-page-origin-sha256':hash(wrong)});assert.equal(mismatch.pageMatchesExpected,false);assert.equal(mismatch.pageMatchesReceivedOrigin,true);
 assert.equal(evidence(access,{...headers,'x-yasoya-api-same-origin':'0'}).apiMatchesPage,false);
 for(const hint of [undefined,'private malformed hint',['a'.repeat(64)]]){const r=evidence(access,{...headers,'x-yasoya-page-origin-sha256':hint});assert.equal(r.pageMatchesExpected,null);assert.equal(r.pageMatchesReceivedOrigin,null);}
 const report=JSON.stringify([rewritten,mismatch,evidence(access,headers)]);for(const value of [forwarded,wrong,hash(forwarded),'localhost','https://'])assert(!report.includes(value));
});

test('forged page hints never authorize a rejected Origin or Host, and neither hints nor URLs enter server logs',async t=>{
 const {createHash}=await import('node:crypto');const hash=createHash('sha256').update(forwarded).digest('hex');const runtime=await createManagementRuntime({environment});t.after(()=>runtime.mf.dispose());const call=await httpClient(t,runtime);
 const original=console.info,logs=[];console.info=(...a)=>logs.push(a.join(' '));t.after(()=>{console.info=original;});
 const hints={'X-Yasoya-Page-Origin-SHA256':hash,'X-Yasoya-API-Same-Origin':'1'};
 const denied=await call('/api/admin/images','POST','private-image-not-decoded',{...hints,Origin:'https://localhost:8000'});assert.equal(denied.status,403);assert.equal(denied.json().error.originEvidence.pageMatchesExpected,true);assert.equal(denied.json().error.originEvidence.pageMatchesReceivedOrigin,false);
 assert.equal((await call('/api/admin/images','POST','private-image-not-decoded',{...hints,Host:'evil.example'})).status,403);
 assert.equal((await call('/api/admin/images','POST','private-image-not-decoded',hints,false)).status,401);
 const report=logs.join('\n')+denied.text;for(const value of [hash,forwarded,'https://localhost','private-image-not-decoded','local-development-only'])assert(!report.includes(value));
 assert.equal((await runtime.db.prepare('SELECT COUNT(*) AS n FROM mg_images').first()).n,0);assert.equal(runtime.square.payments.size,0);
});

test('HTTPS loopback photo normalization requires Codespaces metadata and verified CSRF, with exact scope and cross-site rejection',()=>{
 const p=managementAccess(environment),headers={host:'localhost:8000',origin:'https://localhost:8000','sec-fetch-site':'same-origin'},ctx={method:'POST',csrfValid:true};
 assert.equal(p.requestUrl(headers,'/api/admin/images',ctx),forwarded+'/api/admin/images');assert.equal(p.workerOrigin(headers,'/api/admin/images',ctx),forwarded);
 assert(!p.origins.includes('https://localhost:8000'));assert.equal(p.workerOrigin({...headers,'sec-fetch-site':undefined},'/api/admin/images',ctx),forwarded);
 for(const context of [{},{method:'POST',csrfValid:false},{method:'GET',csrfValid:true},{method:'OPTIONS',csrfValid:true}])assert.throws(()=>p.requestUrl(headers,'/api/admin/images',context));
 for(const patch of [{host:'localhost'},{host:'localhost:8001'},{host:'other-8000.app.github.dev'},{origin:'https://localhost:9000'},{origin:'https://other-8000.app.github.dev'},{origin:'null'},{'sec-fetch-site':'cross-site'}])assert.throws(()=>p.requestUrl({...headers,...patch},'/api/admin/images',ctx));
 for(const path of ['/api/admin/images?x=1','/api/admin/products','/api/admin/orders','/api/admin/inventory'])assert.throws(()=>p.requestUrl(headers,path,ctx));
 assert.throws(()=>managementAccess().requestUrl(headers,'/api/admin/images',ctx));
});

test('authenticated process-local CSRF fixes only rewritten photo POSTs; forged hints, cross-site reads and other Origins stay rejected',async t=>{
 const {readFile}=await import('node:fs/promises');const bytes=await readFile(new URL('../images/lemonbalm.jpg',import.meta.url));
 const runtime=await createManagementRuntime({environment});t.after(()=>runtime.mf.dispose());
 const makeClient=async()=>{
  const server=createManagementServer(runtime);server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>server.close(r)));
  return (path,method='GET',headers={},body)=>new Promise((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port:server.address().port,path,method,headers:Object.fromEntries(Object.entries({Host:'localhost:8000',Origin:forwarded,Authorization:'Bearer local-development-only','Sec-Fetch-Site':'same-origin',...headers}).filter(([,v])=>v!==undefined))},res=>{const parts=[];res.on('data',c=>parts.push(c));res.on('end',()=>{const text=Buffer.concat(parts).toString();let body;try{body=JSON.parse(text);}catch{body={error:{message:text}};}resolve({status:res.statusCode,headers:res.headers,body});});});req.on('error',reject);req.end(body);});
 };
 const call=await makeClient();const csrf='/api/admin/local-csrf';
 for(const headers of [{Authorization:'Bearer wrong-token'},{Authorization:''}])assert.equal((await call(csrf,'GET',headers)).status,401);
 for(const headers of [{'Sec-Fetch-Site':'cross-site'},{'Sec-Fetch-Site':''},{Origin:'https://other-8000.app.github.dev'},{Origin:'https://localhost:8000'}])assert.equal((await call(csrf,'GET',headers)).status,403);
 assert.equal((await call(csrf,'POST')).status,405);
 const session=await call(csrf);assert.equal(session.status,200);assert(/^[a-f0-9]{64}$/.test(session.body.token));assert.equal(session.headers['access-control-allow-origin'],undefined);assert.equal(session.headers['cache-control'],'no-store');
 const withoutMetadata=await call(csrf,'GET',{'Sec-Fetch-Site':undefined});assert.equal(withoutMetadata.status,200);assert.equal((await call(csrf,'GET',{'Sec-Fetch-Site':undefined,Origin:'https://evil.example'})).status,403);
 const token=session.body.token;const original=console.info,logs=[];console.info=(...a)=>logs.push(a.join(' '));t.after(()=>{console.info=original;});
 const photoHeaders={Origin:'https://localhost:8000','Content-Type':'image/jpeg','X-Yasoya-Local-CSRF':token};
 for(const patch of [{'X-Yasoya-Local-CSRF':''},{'X-Yasoya-Local-CSRF':'a'.repeat(64)},{'Sec-Fetch-Site':'cross-site'},{'Sec-Fetch-Site':''},{Host:'localhost:9000'},{Origin:'https://other-8000.app.github.dev'},{Origin:'https://localhost:9000'}])assert.equal((await call('/api/admin/images','POST',{...photoHeaders,...patch},bytes)).status,403);
 assert.equal((await call('/api/admin/images','POST',{...photoHeaders,Authorization:'Bearer wrong-token'},bytes)).status,401);
 assert.equal((await call('/api/admin/images','POST',{...photoHeaders,'Sec-Fetch-Site':undefined},bytes)).status,200);
 let id;for(const origin of ['https://localhost:8000','https://127.0.0.1:8000','https://[::1]:8000']){const r=await call('/api/admin/images','POST',{...photoHeaders,Origin:origin},bytes);assert.equal(r.status,200);if(id)assert.equal(r.body.id,id);id=r.body.id;}
 const other=await makeClient();assert.equal((await other('/api/admin/images','POST',photoHeaders,bytes)).status,403);
 assert(!logs.join('\n').includes(token));assert.equal((await runtime.db.prepare('SELECT COUNT(*) AS n FROM mg_images').first()).n,1);assert.equal(runtime.square.payments.size,0);
});

test('rewritten product Origins require verified CSRF and exact save/publish paths, never stock or orders',()=>{
 const access=managementAccess(environment),headers={host:'localhost:8000',origin:'https://localhost:8000','sec-fetch-site':'same-origin'};
 for(const [path,method] of [['/api/admin/products/test-herb','PUT'],['/api/admin/products/test-herb/publish','POST']]){
  const ctx={method,csrfValid:true};assert.equal(access.workerOrigin(headers,path,ctx),forwarded);assert.equal(access.requestUrl(headers,path,ctx),forwarded+path);
  for(const patch of [{csrfValid:false},{method:'DELETE'},{method:'GET'}])assert.throws(()=>access.requestUrl(headers,path,{...ctx,...patch}));
  for(const patch of [{origin:'https://other-8000.app.github.dev'},{origin:'https://evil.example'},{origin:'null'},{host:'localhost:9000'},{host:'other-8000.app.github.dev'},{'sec-fetch-site':'cross-site'}])assert.throws(()=>access.requestUrl({...headers,...patch},path,ctx));
  assert.throws(()=>managementAccess().requestUrl(headers,path,ctx));
 }
 for(const [path,method] of [['/api/admin/orders/order-1','PUT'],['/api/admin/inventory/herb','POST'],['/api/admin/products/herb/state','POST'],['/api/admin/products/herb/link','POST'],['/api/admin/products/herb?x=1','PUT'],['/api/admin/products/herb/publish?x=1','POST'],['/api/admin/products/herb/publish/','POST']])assert.throws(()=>access.requestUrl(headers,path,{method,csrfValid:true}));
 assert(!access.origins.includes('https://localhost:8000'));
});

test('rewritten product HTTP requests keep access/auth/image/variant/version checks and persist only valid drafts',async t=>{
 const runtime=await createManagementRuntime({environment});t.after(()=>runtime.mf.dispose());const server=createManagementServer(runtime);server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>server.close(r)));
 const call=(path,method='GET',body,patch={})=>new Promise((resolve,reject)=>{
  const req=request({hostname:'127.0.0.1',port:server.address().port,path,method,headers:{Host:'localhost:8000',Origin:forwarded,Authorization:'Bearer local-development-only','Content-Type':'application/json','Sec-Fetch-Site':'same-origin',...patch}},res=>{const parts=[];res.on('data',c=>parts.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:JSON.parse(Buffer.concat(parts))}));});req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));
 });
 const token=(await call('/api/admin/local-csrf')).body.token;
 const headers={Origin:'https://localhost:8000','X-Yasoya-Local-CSRF':token};
 const payload={slug:'safe-herb',expectedVersion:0,operationId:crypto.randomUUID(),name:'架空ハーブ',description:'説明',alt:'写真',sortOrder:0,images:[],variants:[{id:'safe-herb-10g',name:'架空ハーブ 10g',price:980,amount:'10g',maxQuantity:10,active:true}]};
 for(const patch of [{'X-Yasoya-Local-CSRF':''},{Origin:'https://other-8000.app.github.dev'},{'Sec-Fetch-Site':'cross-site'}]){const r=await call('/api/admin/products/safe-herb','PUT',payload,{...headers,...patch});assert.equal(r.status,403);assert.equal(r.body.error.code,'LOCAL_HOST_ORIGIN_DENIED');assert.equal(r.headers['x-yasoya-product-stage'],'access');}
 assert.equal((await call('/api/admin/products/safe-herb','PUT',payload,{...headers,Authorization:'Bearer wrong'})).status,401);
 assert.equal((await call('/api/admin/products/safe-herb','PUT',{...payload,images:['a'.repeat(64)]},headers)).status,400);
 assert.equal((await call('/api/admin/products/safe-herb','PUT',{...payload,variants:[{...payload.variants[0],price:0}]},headers)).status,400);
 assert.equal((await runtime.db.prepare('SELECT COUNT(*) AS n FROM mg_products').first()).n,0);
 await runtime.db.prepare("CREATE TRIGGER reject_local_draft BEFORE INSERT ON mg_revisions BEGIN SELECT RAISE(FAIL,'offline draft write failure'); END").run();
 const failed=await call('/api/admin/products/safe-herb','PUT',payload,headers);assert.equal(failed.status,503);assert.equal(failed.headers['x-yasoya-product-stage'],'response-write');
 assert.equal((await runtime.db.prepare('SELECT COUNT(*) AS n FROM mg_products').first()).n,0);assert.equal((await runtime.db.prepare('SELECT COUNT(*) AS n FROM mg_commands').first()).n,0);
 await runtime.db.prepare('DROP TRIGGER reject_local_draft').run();
 const saved=await call('/api/admin/products/safe-herb','PUT',payload,headers);assert.equal(saved.status,200);assert.equal(saved.body.version,1);
 assert.equal((await call('/api/admin/products/safe-herb','PUT',payload,headers)).status,200);
 assert.equal((await call('/api/admin/products/safe-herb','PUT',{...payload,operationId:crypto.randomUUID()},headers)).status,409);
 assert.equal((await runtime.db.prepare('SELECT COUNT(*) AS n FROM mg_revisions').first()).n,1);
 assert.equal((await call('/api/admin/products/safe-herb/publish','POST',{operationId:crypto.randomUUID(),expectedVersion:1},headers)).status,200);
 assert.equal(runtime.square.payments.size,0);
});
