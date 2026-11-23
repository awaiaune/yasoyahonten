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
const candidate=process.env.UI_CANDIDATE_DIR||'/workspace/scratch/0b689c1f2c59/home-polish/candidate';
const raw=await readFile('maintenance/ui-release-record-20261123/deployed/storefront-worker.js','utf8');
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
test('home description is in metadata only, preserves title/canonical, and uses published product names',async t=>{
 const [old,mf]=await Promise.all([fixture(t,raw),fixture(t)]);
 for(const path of ['/','/index.html']){
  const b=await(await old.dispatchFetch('https://example.invalid'+path)).text(),s=await(await mf.dispatchFetch('https://example.invalid'+path)).text();
  assert(!s.includes('class="shop-description"'));assert(!s.split('<body')[1].includes(description));assert(s.includes('<meta name="description" content="'+description+'">'));const ld=JSON.parse(s.match(/<script type="application\/ld\+json">([^<]+)</)[1]);assert.equal(ld.description,description);
  assert.equal(s.match(/<title>.*?<\/title>/)[0],b.match(/<title>.*?<\/title>/)[0]);assert.equal(s.match(/<link rel="canonical"[^>]+>/)[0],b.match(/<link rel="canonical"[^>]+>/)[0]);assert(s.includes('<h2 class="v19-center-name">LEMON BALM</h2>'));assert(s.includes('<h2 class="v19-center-name">YOMOGI</h2>'));
 }
 const renamed=structuredClone(products);renamed[0].name='新しいハーブ名 & 香り';renamed[1].name='管理画面のヨモギ';const changed=await fixture(t,updated,renamed);const html=await(await changed.dispatchFetch('https://example.invalid/')).text();assert(html.includes('<h2 class="v19-center-name">新しいハーブ名 &amp; 香り</h2>'));assert(html.includes('<h2 class="v19-center-name">管理画面のヨモギ</h2>'));
});
test('product pages, shop, cart and checkout remain identical to the deployed version',async t=>{
 const [old,mf]=await Promise.all([fixture(t,raw),fixture(t)]);
 for(const p of ['/products/lemonbalm10.html','/products/yomogi10.html','/products','/js/cart.js','/checkout.html','/js/admin-management.js']){
  const [a,b]=await Promise.all([old.dispatchFetch('https://example.invalid'+p),mf.dispatchFetch('https://example.invalid'+p)]);assert.equal(a.status,b.status);assert.equal(await a.text(),await b.text(),p);
 }
});
test('mobile/desktop positions near swipe progress, dynamic names, slider and broken image fallback', {skip:process.env.UI_BROWSER_TESTS!=='1'},async t=>{
 const {chromium}=require(path.join(dep,'playwright')),mf=await fixture(t);
 const server=createServer(async(req,res)=>{try{const response=await mf.dispatchFetch('http://127.0.0.1:'+server.address().port+req.url,{method:req.method,headers:req.headers});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(e){res.writeHead(500);res.end(String(e));}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true});t.after(()=>browser.close());const screenshots=path.join(candidate,'screenshots');await mkdir(screenshots,{recursive:true});
 for(const [name,width,height] of [['mobile',390,844],['desktop',1440,900]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:name==='mobile',hasTouch:name==='mobile'});await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());const page=await context.newPage();await page.goto(origin+'/');const label=page.locator('#botanicalTrack .v24-active .v19-center-name');await label.scrollIntoViewIfNeeded();await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('#botanicalTrack .v24-active')).opacity)>.999);
  const m=await label.evaluate(e=>{const r=e.getBoundingClientRect(),p=document.querySelector('.v19-progress').getBoundingClientRect(),c=getComputedStyle(e);return {size:parseFloat(c.fontSize),color:c.color,align:c.textAlign,dx:Math.abs(r.left-p.left),gap:p.top-r.bottom,filter:getComputedStyle(e.parentElement.querySelector('img')).filter};});assert(m.size>=11&&m.size<=13);assert.equal(m.color,'rgb(255, 255, 255)');assert.equal(m.align,'left');assert(m.dx<2);assert(m.gap>=18&&m.gap<=30);assert.equal(m.filter,'none');assert.equal(await page.locator('.shop-description').count(),0);assert(!(await page.locator('body').innerText()).includes(description));await page.screenshot({path:path.join(screenshots,name+'-home.png')});
  const track=page.locator('#botanicalTrack');await track.focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(1000);assert.equal(await page.locator('#botanicalTrack .v24-active .v19-center-name').innerText(),'YOMOGI');await page.locator('#botanicalTrack .v24-active .v39-botanical-link').click();await page.waitForURL('**/products/yomogi10.html');assert(await page.locator('.v30-purchase').isVisible());
  await page.route('**/api/media/**',route=>route.abort());await page.goto(origin+'/');await label.scrollIntoViewIfNeeded();await page.waitForTimeout(1000);assert(await label.isVisible());assert.equal(await label.innerText(),'LEMON BALM');await page.screenshot({path:path.join(screenshots,name+'-missing.png')});await context.close();
 }
});
