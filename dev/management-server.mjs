import {createServer} from 'node:http';
import {pathToFileURL} from 'node:url';
import {managementAccess,seedLocalOrders} from './management-local.mjs';
import {readFile,realpath,mkdir} from 'node:fs/promises';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {root,runtimeOptions,CSP} from './server.mjs';
import {ManagementSquare} from './management-square.mjs';
import {legacyProducts} from '../validation/legacy-products.mjs';
export async function createManagementRuntime({state=false,environment={},seed=false,seedOrders=false}={}) {
const access=managementAccess(environment);
if(state)await mkdir(state,{recursive:true});
const square=await new ManagementSquare(state ? state+'/square.json' : undefined).load();
const bundle=await build({entryPoints:[root+'/worker/src/index.js'],bundle:true,write:false,format:'esm',platform:'browser'});
const options=runtimeOptions(bundle.outputFiles[0].text,state);
// Do not fetch Cloudflare's Request.cf metadata during offline development.
options.cf=false;
Object.assign(options.bindings,{MANAGEMENT_ENABLED:'1',MANAGEMENT_STOCK_WRITES:'single-writer',LOCAL_TEST_MODE:'1',SQUARE_LOCATION_ID:'LOCALMGMTLOCATION',SQUARE_ACCESS_TOKEN:'fake-local-test-only',RESEND_API_KEY:'local-test-not-a-secret',RESEND_FROM_EMAIL:'sender@example.invalid',ORDER_NOTIFICATION_EMAIL:'test@example.invalid'});
options.bindings.ALLOWED_ORIGINS=access.origins.join(',');options.bindings.SITE_URL=access.siteOrigin;
options.r2Buckets={PRODUCT_IMAGES:'local-management-images'};options.r2Persist=state ? state+'/r2' : false;
const types={html:'text/html',js:'application/javascript',css:'text/css',jpg:'image/jpeg',png:'image/png',svg:'image/svg+xml',webp:'image/webp'};
options.serviceBindings={LOCAL_SQUARE:r=>square.fetch(r),LOCAL_RESEND:async()=>Response.json({id:'offline-mail-not-sent'}),ASSETS:async request=>{
 const url=new URL(request.url);let path=decodeURIComponent(url.pathname);if(path.endsWith('/'))path+='index.html';
 if(path==='/js/store-config.js')return new Response('window.YASOYA_STORE_CONFIG=Object.freeze({environment:"sandbox",squareApplicationId:"sandbox-local-only",squareLocationId:"LOCALMGMTLOCATION",workerBaseUrl:location.origin,currency:"JPY"});',{headers:{'Content-Type':'application/javascript'}});
 if(!/^\/(?:[\w-]+\.html|(?:admin|products)\/[\w-]+\.html|(?:js|css|images)\/[\w./-]+)$/.test(path)||path.split('/').some(p=>p.startsWith('.')))return new Response('Not found',{status:404});
 try{const file=await realpath(root+path);if(!file.startsWith(root+'/'))return new Response('Not found',{status:404});let bytes=await readFile(file);if(file.endsWith('.html'))bytes=bytes.toString().replace(/<script\b[^>]*src=["']https:\/\/(?:web|sandbox)\.squarecdn\.com[^"']*["'][^>]*>\s*<\/script>/gi,'');if(path==='/admin/index.html')bytes=bytes.toString().replace(/<body\b[^>]*>/i,'$&<p role="note" style="padding:12px;background:#fff4d6;color:#332b1f">ローカル検証専用：架空データを使用します。発送ボタンを押しても実際のメールは送信されません。</p>');return new Response(bytes,{headers:{'Content-Type':types[file.split('.').pop()]||'application/octet-stream'}});}catch{return new Response('Not found',{status:404});}
}};
const mf=new Miniflare(options);
try {
await mf.ready;const db=await mf.getD1Database('ORDERS_DB');
const schema=await readFile(root+'/worker/migrations/0001_management.sql','utf8');for(const statement of schema.replace(/^--.*$/mg,'').split(';').filter(s=>s.trim()))await db.prepare(statement).run();
if(seed){
 const count=await db.prepare('SELECT COUNT(*) AS n FROM mg_products').first();
 if(!count.n){
  const call=async(path,method,body,headers={})=>{const r=await mf.dispatchFetch('http://127.0.0.1:8000'+path,{method,headers:{Authorization:'Bearer local-development-only','Content-Type':'application/json',...headers},...(body?{body:headers['Content-Type']?body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok)throw Error(data.error?.message||'Local import failed');return data;};
  for(const product of await legacyProducts()){
   const bytes=await readFile(root+product.imagePath),image=await call('/api/admin/images','POST',bytes,{'Content-Type':product.imagePath.endsWith('.png')?'image/png':product.imagePath.endsWith('.webp')?'image/webp':'image/jpeg'});product.images=[image.id];
   await call('/api/admin/products/'+product.id,'PUT',{...product,expectedVersion:0,operationId:crypto.randomUUID()});
   const initial={idempotency_key:'offline-seed-'+product.id,batches:[{objects:[{type:'ITEM',id:'#'+product.id,present_at_location_ids:['LOCALMGMTLOCATION'],item_data:{name:product.name,description:product.description,variations:product.variants.map(v=>({type:'ITEM_VARIATION',id:'#'+v.id,item_variation_data:{name:v.name,sku:v.id,price_money:{amount:v.price,currency:'JPY'},track_inventory:true}}))}}]}]};
   const created=await (await square.fetch(new Request('https://connect.squareupsandbox.com/v2/catalog/batch-upsert',{method:'POST',body:JSON.stringify(initial)}))).json();
   await call('/api/admin/products/'+product.id+'/link','POST',{expectedVersion:1,operationId:crypto.randomUUID(),mappings:created.objects[0].item_data.variations.map(v=>({variantId:v.item_variation_data.sku,variationId:v.id}))});
   await call('/api/admin/products/'+product.id+'/publish','POST',{expectedVersion:2,operationId:crypto.randomUUID()});
   for(const v of product.variants){const r=(await call('/api/admin/inventory','GET')).inventory.find(r=>r.id===v.id);await call('/api/admin/inventory/'+v.id,'POST',{operationId:crypto.randomUUID(),kind:'count',quantity:5,reason:'ローカル初期データ',expectedQuantity:r.quantity,observedAt:r.observedAt});}
  }
  console.log('Three existing product definitions imported into local mocks only.');
 }else console.log('Local products already exist; no reset or reseed performed.');
}
const runtime={mf,db,square,options,access};
if(seedOrders)await seedLocalOrders(runtime);
return runtime;
} catch(error) { await mf.dispose();throw error; }
}

export function createManagementServer({mf,options,access}) {
return createServer(async(req,res)=>{
 const security={'content-security-policy':CSP.replace("img-src 'self' data:","img-src 'self' data: blob:"),'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
 const photo=req.method==='POST'&&req.url==='/api/admin/images';
 const supplied=req.headers['x-yasoya-photo-trace'];
 const trace=typeof supplied==='string'&&/^[a-f0-9-]{36}$/.test(supplied)?supplied:crypto.randomUUID();
 let stage='access',length=0,accessInfo={reason:'ALLOWED',...access.classify(req.headers)};
 // Deliberately exclude URL, Host/Origin, filenames, body, authorization and raw errors.
 const diagnostic=(result,error)=>{
  if(!photo)return;
  const codes=['UND_ERR_REQ_CONTENT_LENGTH_MISMATCH','UND_ERR_INVALID_ARG','ERR_HTTP_INVALID_HEADER_VALUE','ERR_INVALID_ARG_TYPE','ECONNRESET','EPIPE','UND_ERR_SOCKET','ERR_STREAM_PREMATURE_CLOSE','ERR_HTTP_HEADERS_SENT'];
  const code=[error?.code,error?.cause?.code].find(c=>codes.includes(c))||(error?'UNCLASSIFIED_EXCEPTION':'NONE');
  console.info('[local-photo]',JSON.stringify({trace,stage,result,...accessInfo,bytes:length,errorType:error?(['Error','TypeError','RangeError'].includes(error.name)?error.name:'OtherError'):'NONE',chunked:req.headers['transfer-encoding']==='chunked',hasContentLength:req.headers['content-length']!==undefined,code}));
 };
 const fail=(status,message,code)=>{diagnostic('rejected');res.writeHead(status,{...security,...(photo?{'content-type':'application/json','x-yasoya-photo-stage':stage}:{})});res.end(photo?JSON.stringify({error:{message,code,...(code==='LOCAL_HOST_ORIGIN_DENIED'?accessInfo:{})}}):message);};
 try {
  let url;try{url=access.requestUrl(req.headers,req.url);}catch(error){accessInfo=error.localAccess || {reason:'INVALID_TARGET',...access.classify(req.headers)};return fail(403,'ローカルの接続元が許可されていません。','LOCAL_HOST_ORIGIN_DENIED');}
  stage='body-read';const chunks=[];
  for await(const chunk of req){length+=chunk.length;if(length>8*1024*1024)return fail(413,'画像は8MB以下にしてください。','LOCAL_BODY_TOO_LARGE');chunks.push(chunk);}
  const requestHeaders={...req.headers};
  if(requestHeaders.origin!==undefined)requestHeaders.origin=access.canonicalOrigin(requestHeaders.origin);
  for(const key of Object.keys(requestHeaders))if(key==='host'||key==='forwarded'||key.startsWith('x-forwarded-'))delete requestHeaders[key];
  stage='dispatch';let r=await mf.dispatchFetch(url,{method:req.method,headers:requestHeaders,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
  if(r.status===404&&!new URL(url).pathname.startsWith('/api/'))r=await options.serviceBindings.ASSETS(new Request(url));
  stage='response-read';const body=req.method==='HEAD'?undefined:Buffer.from(await r.arrayBuffer());
  stage='response-write';res.writeHead(r.status,{...Object.fromEntries(r.headers),...security,...(photo?{'x-yasoya-photo-stage':stage}:{})});res.end(body);diagnostic(r.ok?'ok':'worker-rejected');
 }catch(error){diagnostic('exception',error);if(!res.headersSent)fail(500,photo?'ローカル画像処理でエラーが発生しました。診断情報を確認してください。':'Local error','LOCAL_UPLOAD_FAILED');else res.end();}
});
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const runtime=await createManagementRuntime({state:root+'/dev/.state/management',environment:{CODESPACES:process.env.CODESPACES,CODESPACE_NAME:process.env.CODESPACE_NAME,GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN},seed:process.argv.includes('--seed'),seedOrders:process.argv.includes('--seed-orders')});
 const server=createManagementServer(runtime);
 server.on('error',async()=>{console.error('Local port 8000 unavailable; no data reset performed.');await runtime.mf.dispose();process.exitCode=1;});
 server.listen(8000,'127.0.0.1',()=>console.log('Offline management: port 8000 /admin/ (local-development-only). Keep Codespaces port Private. No real payments or email.'));
 for(const signal of ['SIGTERM','SIGINT'])process.once(signal,async()=>{server.close();await runtime.mf.dispose();process.exit(0);});
}
