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
 const p=managementAccess(environment);assert.deepEqual(p.origins,[localOrigin,forwarded]);
 for(const h of [host,'127.0.0.1:8000','localhost:8000'])assert.equal(p.requestUrl({host:h,origin:forwarded},'/admin/'),forwarded+'/admin/');
 for(const h of ['evil.example',host+'.evil.example','other-8000.app.github.dev',host.replace('-8000.','-8001.'),'127.0.0.1:9000']){
  assert.throws(()=>p.requestUrl({host:h,origin:forwarded,'x-forwarded-host':host},'/admin/'));
 }
 for(const origin of ['null','https://evil.example',forwarded+'/',forwarded+':443',localOrigin+'.evil.example'])assert.throws(()=>p.requestUrl({host,origin},'/api/admin/products'));
 for(const target of ['https://evil.example/','//evil.example/','/\\evil.example/'])assert.throws(()=>p.requestUrl({host},target));
 assert.equal(p.requestUrl({host,'x-forwarded-host':'evil.example',forwarded:'host=evil.example'},'/'),forwarded+'/');
});
test('invalid Codespaces metadata fails closed instead of accepting arbitrary forwarding domains',()=>{
 for(const patch of [{CODESPACE_NAME:''},{CODESPACE_NAME:'foo.evil'},{CODESPACE_NAME:'foo/../bar'},{CODESPACE_NAME:'a'.repeat(59)},
  {GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:undefined},{GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:'evil.example'},
  {GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:'app.github.dev.evil.example'}])assert.throws(()=>managementAccess({...environment,...patch}));
 assert.deepEqual(managementAccess({...environment,CODESPACES:undefined}).origins,[localOrigin]);
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
