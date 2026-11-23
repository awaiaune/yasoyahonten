import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {generateKeyPairSync,createSign} from 'node:crypto';
const dep=process.env.UI_TEST_NODE_MODULES||'/workspace/scratch/0b689c1f2c59/yasoyahonten/dev/node_modules';
const require=createRequire(path.join(dep,'../package.json'));
const {Miniflare}=require(path.join(dep,'miniflare'));
const live=process.env.UI_LIVE_DIR||'/workspace/scratch/0b689c1f2c59/release-audit/live';
const candidate=process.env.UI_CANDIDATE_DIR||'/workspace/scratch/0b689c1f2c59/release-audit/candidate-verified';
const raw=await readFile(path.join(live,'yasoya-honten-payments/storefront-worker.js'),'utf8');
const updated=await readFile(path.join(candidate,'yasoya-honten-payments/storefront-worker.js'),'utf8');
const adminJs=await readFile(path.join(candidate,'public/js/admin-management.js'),'utf8');
const cover='a'.repeat(64),detail='b'.repeat(64),second='c'.repeat(64);
const products=[{id:'75d67267-88cd-4dc0-886b-a150de0e1116',slug:'lemonbalm10',name:'LEMON BALM',status:'published',description:'既存の商品説明',alt:'レモンバーム',images:[detail,cover,second],featuredImageId:cover,variants:[{id:'fixture-lemon-10g',name:'10g',amount:'10g',price:980,maxQuantity:10,active:true}],checkoutVariantIds:['fixture-lemon-10g']},{id:'d9b78bb2-74c7-4e3e-9586-4a488baff0f1',slug:'yomogi10',name:'YOMOGI',status:'published',description:'ヨモギ商品説明',alt:'ヨモギ',images:['d'.repeat(64),'e'.repeat(64)],featuredImageId:'e'.repeat(64),variants:[{id:'fixture-yomogi-10g',name:'10g',amount:'10g',price:980,maxQuantity:10,active:true}],checkoutVariantIds:['fixture-yomogi-10g']}];
const description='八草屋本店は、自然乾燥のハーブティーを届けるオンラインショップです。レモンバームティーやよもぎ茶など、植物それぞれの香りと個性を、一杯のお茶で楽しめます。';
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="800" height="1000" fill="#244932"/></svg>';
async function assets(req){
 const u=new URL(req.url);if(u.pathname.startsWith('/api/media/'))return new Response(svg,{headers:{'content-type':'image/svg+xml'}});
 if(u.pathname==='/js/store-config.js')return new Response('window.YASOYA_STORE_CONFIG={environment:"production",managedStorefront:true,workerBaseUrl:location.origin,currency:"JPY"};',{headers:{'content-type':'text/javascript'}});
 if(u.pathname==='/products.html'&&req.method==='HEAD')return Response.redirect(u.origin+'/products',301);
 let p=u.pathname==='/'?'/index.html':u.pathname==='/products'?'/products.html':u.pathname;
 if(p==='/products/lemonbalm.html')p='/products/lemonbalm10.html';
 if(p==='/admin/'||p==='/admin/index.html')return new Response('<html><head></head><body><section class="photo-section"><p class="hint">「メインにする」で一覧の写真を選べます。</p><details class="photo-arrangement"><summary>写真の順序・メイン画像を編集</summary></details></section></body></html>',{headers:{'content-type':'text/html'}});
 if(!/^\/(?:[a-z0-9.-]+|(?:css|js|images|products)\/[a-zA-Z0-9_.-]+)$/.test(p))return new Response('missing',{status:404});
 try{const data=await readFile(path.join(live,'public',p));const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};return new Response(req.method==='HEAD'?null:data,{headers:{'content-type':types[path.extname(p)]||'application/octet-stream'}});}catch{return new Response('missing',{status:404});}
}
async function fixture(t,source=updated,data=products){
 // Test-only entry point and Store stubs. Neither is included in uploaded candidates.
 const fixtureCode=`\nStore.prototype.publicProducts=async()=>${JSON.stringify(data)};Store.prototype.one=async()=>({id:'test',detail_json:JSON.stringify({productIds:${JSON.stringify(data.map(p=>p.id))}})});Store.prototype.products=async()=>[];Store.prototype.retiredProductIds=async()=>new Set();var ui_fixture_default={async fetch(request,env){const u=new URL(request.url);const e=typeof yasoyaUiAssets==='function'?yasoyaUiAssets(env):env;if(u.pathname==='/__test/draft')return Response.json(draft(await request.json()));if(u.pathname==='/api/inventory')return Response.json({inventory:${JSON.stringify(data.flatMap(p=>p.variants).map(v=>({id:v.id,availableQuantity:10})))}});return await renderV53(request,e)||await e.ASSETS.fetch(request);}};`;
 const script=source.replace('storefront_worker_default as default','ui_fixture_default as default')+fixtureCode;
 const mf=new Miniflare({modules:true,script,compatibilityDate:'2026-08-04',bindings:{PRODUCTION_CHECKOUT_ENABLED:'1',PRODUCTION_MANAGED_CHECKOUT_ENABLED:'1'},serviceBindings:{ASSETS:assets},outboundService:()=>{throw Error('External network is forbidden');}});t.after(()=>mf.dispose());return mf;
}
test('live candidate preserves gallery order, excludes top image, removes captions, and retains purchase block exactly',async t=>{
 const [before,after]=await Promise.all([fixture(t,raw),fixture(t)]);
 const a=await(await before.dispatchFetch('https://example.invalid/products/lemonbalm10.html')).text();const b=await(await after.dispatchFetch('https://example.invalid/products/lemonbalm10.html')).text();
 assert(a.includes('/api/media/'+cover));assert(!b.includes('/api/media/'+cover));assert(b.includes('/api/media/'+detail));assert(b.includes('/api/media/'+second));assert(!b.includes('v30-caption'));assert(!b.includes('v30-current'));
 assert.equal((b.match(/data-go="/g)||[]).length,2);
 const purchase=s=>s.slice(s.indexOf('class="v30-purchase"'),s.indexOf('class="v30-below"'));
 assert(purchase(a).length>100);assert.equal(purchase(a),purchase(b));assert(b.includes('fixture-lemon-10g'));assert(b.includes('レモンバームティー'));
});
test('no selection, selected-only gallery, and missing image retain valid HTML and HTML heading',async t=>{
 const noCover=structuredClone(products);delete noCover[0].featuredImageId;const mf=await fixture(t,updated,noCover);
 const html=await(await mf.dispatchFetch('https://example.invalid/products/lemonbalm10.html')).text();assert.equal((html.match(/data-go="/g)||[]).length,3);
 const only=structuredClone(products);only[0].images=[cover];const single=await fixture(t,updated,only);
 const empty=await(await single.dispatchFetch('https://example.invalid/products/lemonbalm10.html')).text();assert(!empty.includes('/api/media/'+cover));assert.equal((empty.match(/data-go="/g)||[]).length,0);
 const home=await(await single.dispatchFetch('https://example.invalid/')).text();assert(home.includes('<h2 class="v19-center-name">LEMON BALM</h2>'));
});
test('home has one visible SEO paragraph and existing canonical/title/JSON-LD; selection persists through draft validator',async t=>{
 const mf=await fixture(t);const home=await(await mf.dispatchFetch('https://example.invalid/')).text();assert.equal(home.split(description).length-1,1);assert.equal((home.match(/rel="canonical"/g)||[]).length,1);assert.equal((home.match(/application\/ld\+json/g)||[]).length,1);assert(home.includes('自然乾燥のハーブティー通販'));assert(home.includes('/products/lemonbalm10.html'));assert(home.includes('/products/yomogi10.html'));assert(!home.includes('class="v19-copy"'));assert(!home.includes('noindex'));
 const p=products[0],draftBody={...p,sortOrder:0};const saved=await(await mf.dispatchFetch('https://example.invalid/__test/draft',{method:'POST',body:JSON.stringify(draftBody)})).json();assert.equal(saved.featuredImageId,cover);assert.deepEqual(saved.images,p.images);
 const removed=await(await mf.dispatchFetch('https://example.invalid/__test/draft',{method:'POST',body:JSON.stringify({...draftBody,featuredImageId:null})})).json();assert(!Object.hasOwn(removed,'featuredImageId'));assert.deepEqual(removed.images,p.images);
});
test('asset overrides require exact baseline hashes and do not change unknown paths',async t=>{
 const mf=await fixture(t);const css=await mf.dispatchFetch('https://example.invalid/css/editorial-v41-home.css');assert.equal(css.headers.get('x-yasoya-ui-release'),'20261123');assert((await css.text()).includes('filter:none!important'));
 const js=await mf.dispatchFetch('https://example.invalid/js/admin-management.js');assert.equal(js.headers.get('x-yasoya-ui-release'),'20261123');const body=await js.text();assert(body.includes('トップページ表示用'));assert(!body.includes("['メインにする'"));assert(!body.includes('植物の代表にする'));
 const cart=await mf.dispatchFetch('https://example.invalid/js/cart.js');assert.equal(await cart.text(),await readFile(path.join(live,'public/js/cart.js'),'utf8'));
});
test('real admin signature/origin guards precede frontend overlay and API service forwarding stays intact',async t=>{
 const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});const jwk=publicKey.export({format:'jwk'});Object.assign(jwk,{kid:'offline-key',alg:'RS256',use:'sig'});
 const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');const now=Math.floor(Date.now()/1000),aud='f'.repeat(64);const payload=enc({alg:'RS256',kid:'offline-key'})+'.'+enc({iss:'https://offline-test.cloudflareaccess.com',email:'test@example.invalid',aud:[aud],iat:now,exp:now+300});const token=payload+'.'+createSign('RSA-SHA256').update(payload).sign(privateKey).toString('base64url');
 const script=await readFile(path.join(candidate,'yasoya-honten-admin/admin-worker.js'),'utf8');let forwarded=0;
 const mf=new Miniflare({modules:true,script,compatibilityDate:'2026-08-04',bindings:{PRODUCTION_ADMIN_ORIGIN:'https://admin.awaiaune.com',PRODUCTION_ACCESS_TEAM_DOMAIN:'offline-test.cloudflareaccess.com',PRODUCTION_ACCESS_AUDIENCE:aud,PRODUCTION_ADMIN_EMAIL:'test@example.invalid'},serviceBindings:{ASSETS:assets,PAYMENTS_SERVICE:()=>{forwarded++;return Response.json({unchanged:true});}},outboundService:req=>{assert.equal(new URL(req.url).hostname,'offline-test.cloudflareaccess.com');return Response.json({keys:[jwk]});}});t.after(()=>mf.dispose());
 assert.equal((await mf.dispatchFetch('https://admin.awaiaune.com/js/admin-management.js')).status,401);
 const headers={'Cf-Access-Jwt-Assertion':token};const good=await mf.dispatchFetch('https://admin.awaiaune.com/js/admin-management.js',{headers});assert.equal(good.status,200);assert((await good.text()).includes('トップページ表示用'));assert(good.headers.get('content-security-policy').includes("script-src 'self'"));
 assert.equal((await mf.dispatchFetch('https://admin.awaiaune.com/js/admin-management.js',{headers:{...headers,Origin:'https://wrong.invalid'}})).status,401);
 const html=await(await mf.dispatchFetch('https://admin.awaiaune.com/admin/',{headers})).text();assert(html.includes('トップページ表示用'));assert(!html.includes('メインにする'));
 const api=await(await mf.dispatchFetch('https://admin.awaiaune.com/api/admin/products',{headers})).json();assert.deepEqual(api,{unchanged:true});assert.equal(forwarded,1);
});
const browserEnabled=process.env.UI_BROWSER_TESTS==='1';
test('mobile/desktop: centered 11–15px labels, original brightness, broken-image fallback, slider and cart',{skip:!browserEnabled},async t=>{
 const {chromium}=require(path.join(dep,'playwright'));
 const mf=await fixture(t);const draw=adminJs.slice(adminJs.indexOf('  async function drawImages('),adminJs.indexOf('  function drawSyncStatus()'));
 const mini=`<!doctype html><meta charset="utf-8"><div id="imageList"></div><script>window.current={draft:${JSON.stringify({...products[0],featuredImageId:null})}};let current=window.current,busy=false;const $=id=>document.getElementById(id),gallery={setItems(){}},preview=async()=>${JSON.stringify('data:image/svg+xml,'+encodeURIComponent(svg))},capture=()=>{},setDirty=x=>window.dirty=x;${draw};window.drawImages=drawImages;drawImages();</script>`;
 const server=createServer(async(req,res)=>{try{if(req.url==='/__admin-fixture'){res.setHeader('content-type','text/html');res.end(mini);return;}const chunks=[];for await(const c of req)chunks.push(c);const response=await mf.dispatchFetch('http://127.0.0.1:'+server.address().port+req.url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(e){res.writeHead(500);res.end(String(e));}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(r=>server.close(r)));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});t.after(()=>browser.close());const screenshots=process.env.UI_SCREENSHOT_DIR||path.join(candidate,'screenshots');await mkdir(screenshots,{recursive:true});
 for(const [name,width,height] of [['mobile',390,844],['desktop',1440,900]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:name==='mobile',hasTouch:name==='mobile'});await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/');await page.locator('#botanicalTrack .v19-slide.v24-active').waitFor();
  const label=page.locator('#botanicalTrack .v24-active .v19-center-name');await label.scrollIntoViewIfNeeded();await page.waitForFunction(()=>{const e=document.querySelector('#botanicalTrack .v24-active');return e&&Number(getComputedStyle(e).opacity)>.999});await page.waitForFunction(()=>{const e=document.querySelector('#botanicalTrack .v24-active>img');return e&&e.complete&&e.naturalWidth>0});const metrics=await label.evaluate(e=>{const r=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect();return {size:parseFloat(getComputedStyle(e).fontSize),dx:Math.abs(r.x+r.width/2-p.x-p.width/2),dy:Math.abs(r.y+r.height/2-p.y-p.height/2),filter:getComputedStyle(e.parentElement.querySelector('img')).filter};});assert(metrics.size>=11&&metrics.size<=15);assert(metrics.dx<2&&metrics.dy<2);assert.equal(metrics.filter,'none');assert.equal(await label.evaluate(e=>getComputedStyle(e).color),'rgb(255, 255, 255)');await page.screenshot({path:path.join(screenshots,name+'-home.png')});
  const track=page.locator('#botanicalTrack');await track.focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(900);assert.equal(await page.locator('#botanicalTrack .v24-active .v19-center-name').innerText(),'YOMOGI');await page.locator('#botanicalTrack .v24-active .v39-botanical-link').click();await page.waitForURL('**/products/yomogi10.html');assert.equal(await page.locator('.v30-caption,.v30-current').count(),0);assert.equal(await page.locator('.v30-slide').count(),1);await page.screenshot({path:path.join(screenshots,name+'-product.png')});
  await page.goto(origin+'/products/lemonbalm10.html');assert.equal(await page.locator('.v30-slide').count(),2);await page.locator('.v30-dots button').nth(1).click();assert.equal(await page.locator('.v30-slide.is-active').getAttribute('data-index'),'1');await page.locator('.product-cart-button').first().click();assert.equal(await page.locator('#cartCount').innerText(),'1');assert.deepEqual(errors,[]);
  await page.route('**/api/media/**',route=>route.abort());await page.goto(origin+'/');await page.locator('#botanicalTrack .v24-active .v19-center-name').scrollIntoViewIfNeeded();await page.waitForFunction(()=>{const e=document.querySelector('#botanicalTrack .v24-active');return e&&Number(getComputedStyle(e).opacity)>.999});assert(await page.locator('#botanicalTrack .v24-active .v19-center-name').isVisible());await page.screenshot({path:path.join(screenshots,name+'-missing-image.png')});
  await page.goto(origin+'/__admin-fixture');const entry=page.locator('.image-entry').nth(1);await entry.getByRole('button',{name:'写真2をトップページ表示用にする',exact:true}).click();assert.equal(await page.evaluate(()=>current.draft.featuredImageId),cover);assert.deepEqual(await page.evaluate(()=>current.draft.images),products[0].images);await page.getByRole('button',{name:'トップページ表示用を解除',exact:true}).click();assert.equal(await page.evaluate(()=>current.draft.featuredImageId),undefined);await page.locator('.image-entry').nth(2).getByRole('button',{name:'写真3をトップページ表示用にする',exact:true}).click();assert.equal(await page.evaluate(()=>current.draft.featuredImageId),second);await page.locator('.image-entry').nth(2).getByRole('button',{name:'写真3を前へ',exact:true}).click();assert.deepEqual(await page.evaluate(()=>current.draft.images),[detail,second,cover]);assert.equal(await page.evaluate(()=>current.draft.featuredImageId),second);await page.screenshot({path:path.join(screenshots,name+'-admin-roles.png')});
  await context.close();
 }
});
