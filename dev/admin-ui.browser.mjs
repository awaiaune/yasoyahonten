// Real browser + in-memory local substitutes only. No credentials, remote Worker, Square or mail.
import {test,before,after,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdir,readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {chromium} from 'playwright-core';
import {createManagementRuntime,createManagementServer} from './management-server.mjs';
const base='http://127.0.0.1:8000';
let runtime,server,browser,context,page;
const errors=[],external=[],captures=process.env.YASOYA_UI_ARTIFACTS;
let dialogAccept=true;
async function idle(){await page.waitForFunction(()=>!document.querySelector('#app [aria-busy="true"]'));}
async function nav(label){await idle();await page.getByRole('navigation').getByRole('button',{name:label,exact:true}).click();await idle();}
async function screenshot(name){if(captures){await mkdir(captures,{recursive:true});await page.screenshot({path:captures+'/'+name+'.png',fullPage:await page.locator('dialog[open]').count()===0});}}
async function settleGallery(){await page.locator('#photoGalleryTrack').evaluate(el=>new Promise(resolve=>{let timer;const done=()=>{clearTimeout(timer);el.removeEventListener('scroll',tick);resolve();};const tick=()=>{clearTimeout(timer);timer=setTimeout(done,120);};el.addEventListener('scroll',tick,{passive:true});tick();}));}
async function noOverflow(){assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal page overflow');const dialog=page.locator('dialog[open]');if(await dialog.count())assert(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'dialog overflow');}
before(async()=>{
 runtime=await createManagementRuntime({seed:true,seedOrders:true});
 server=createManagementServer(runtime);server.listen(8000,'127.0.0.1');await once(server,'listening');
 browser=await chromium.launch({executablePath:process.env.YASOYA_CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath()),headless:true,args:['--no-sandbox','--disable-background-networking']});
 context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,serviceWorkers:'block'});
 await context.route('**/*',route=>{if(new URL(route.request().url()).origin!==base){external.push(new URL(route.request().url()).origin);return route.abort();}return route.continue();});
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>dialogAccept?d.accept():d.dismiss());
 await page.goto(base+'/admin/');
});
afterEach(async()=>{dialogAccept=true;if(page)await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));});
after(async()=>{if(context)await context.close();if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));if(runtime)await runtime.mf.dispose();});

test('mobile login and dashboard show real local aggregates, photos and accessible four-way navigation',async()=>{
 await page.getByLabel('管理トークン',{exact:true}).fill('local-development-only');await page.getByRole('button',{name:'管理画面を開く'}).click();
 await page.locator('#app').waitFor({state:'visible'});await idle();
 assert.equal(await page.locator('#homePending').innerText(),'1');assert.equal(await page.locator('#homeProducts').innerText(),'3');assert.equal(await page.locator('#homeLowStock').innerText(),'0');
 assert.equal(await page.getByRole('navigation').getByRole('button').count(),4);
 assert.equal(await page.locator('[aria-current="page"]').innerText(),'ホーム');
 const bounds=await page.getByRole('navigation').boundingBox();assert(bounds.y>700,'navigation must sit at the bottom of the mobile screen');
 for(const button of await page.getByRole('navigation').getByRole('button').all()){const b=await button.boundingBox();assert(b.width>=44&&b.height>=44);}
 await noOverflow();await screenshot('home-390');
});
test('products support authenticated thumbnails, search, status filters and no-result feedback',async()=>{
 await nav('商品');await page.waitForFunction(()=>[...document.querySelectorAll('#productList img')].every(i=>i.complete&&i.naturalWidth>0));
 assert.equal(await page.locator('.product-card').count(),3);
 await page.getByRole('searchbox',{name:'商品を検索'}).fill('ヨモギ');assert.equal(await page.locator('.product-card').count(),1);
 await page.getByRole('searchbox').fill('見つからない商品');assert.match(await page.locator('#productList').innerText(),/一致する商品がありません/);
 await page.getByRole('searchbox').fill('');await page.getByLabel('公開状態で絞り込み').selectOption('draft');assert.equal(await page.locator('.product-card').count(),0);
 await page.getByLabel('公開状態で絞り込み').selectOption('all');await noOverflow();await screenshot('products-390');
});
test('unsaved edits remain after cancelled close; draft save preserves public price and publication requires confirmation',async()=>{
 await page.locator('[data-edit="lemonbalm"]').click();await page.getByLabel('商品名',{exact:true}).fill('乾燥レモンバーム 10g（画面確認）');assert.equal(await page.locator('#dirtyStatus').innerText(),'未保存の変更あり');
 dialogAccept=false;await page.getByRole('button',{name:'商品編集を閉じる'}).click();assert(await page.locator('#productEditor').isVisible());
 dialogAccept=true;await page.getByRole('button',{name:'下書き保存',exact:true}).click();await idle();assert.equal(await page.locator('#dirtyStatus').innerText(),'保存済み');
 const publicName=await page.evaluate(async()=>{const r=await fetch('/api/catalog');return (await r.json()).products.find(p=>p.id==='lemonbalm').name;});assert(!publicName.includes('画面確認'));
 dialogAccept=false;await page.getByRole('button',{name:'保存内容を公開'}).click();assert.equal((await runtime.db.prepare("SELECT published_revision AS r FROM mg_products WHERE id='lemonbalm'").first()).r,1);
 dialogAccept=true;await page.getByRole('button',{name:'保存内容を公開'}).click();await idle();assert.match(await page.locator('#editorMessage').innerText(),/反映しました/);
 await screenshot('editor-390');await noOverflow();await page.getByRole('button',{name:'商品編集を閉じる'}).click();
});
test('product creation, two-photo upload, reorder and variant creation work on a touch-sized form',async()=>{
 await page.getByRole('button',{name:'＋ 商品登録',exact:true}).click();
 await page.getByLabel('商品名',{exact:true}).fill('画面試験ハーブ');await page.getByLabel('URL識別子',{exact:true}).fill('ui-test-herb');
 await page.locator('[name=vname]').fill('画面試験ハーブ 10g');
 const photos=await Promise.all(['lemonbalm.jpg','yomogi.jpg'].map(async name=>({name,mimeType:'image/jpeg',buffer:await readFile(new URL('../images/'+name,import.meta.url))})));
 await page.locator('#imageFiles').setInputFiles(photos);await idle();assert.equal(await page.locator('.image-entry').count(),2);
 await page.getByText('写真の順序・メイン画像を編集',{exact:true}).click();
 const first=await page.locator('.image-entry img').first().getAttribute('src');await page.getByRole('button',{name:'写真1を後ろへ'}).click();
 await page.waitForFunction(first=>document.querySelector('.image-entry img').src!==first,first);
 await page.getByRole('button',{name:'＋ バリエーションを追加'}).click();assert.equal(await page.locator('#variantList fieldset').count(),2);
 await page.locator('[name=vname]').nth(1).fill('画面試験ハーブ 5g');await page.getByRole('button',{name:'下書き保存',exact:true}).click();await idle();
 assert.equal(await page.locator('#dirtyStatus').innerText(),'保存済み');await noOverflow();await page.getByRole('button',{name:'商品編集を閉じる'}).click();
 await page.getByLabel('公開状態で絞り込み').selectOption('draft');assert.equal(await page.locator('.product-card').count(),1);await page.getByLabel('公開状態で絞り込み').selectOption('all');
});
test('photo gallery supports real touch swipes, keyboard and indicators without changing image order or dirty state',async()=>{
 await page.getByRole('button',{name:'画面試験ハーブを編集',exact:true}).click();await page.emulateMedia({reducedMotion:'reduce'});
 await page.getByRole('button',{name:'写真1を表示',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#photoGalleryTrack').scrollLeft===0);
 const before=await page.locator('.image-entry img').evaluateAll(imgs=>imgs.map(i=>i.src));assert.equal(await page.locator('#dirtyStatus').innerText(),'保存済み');
 const track=page.locator('#photoGalleryTrack');await track.scrollIntoViewIfNeeded();const box=await track.boundingBox();
 const cdp=await context.newCDPSession(page),y=box.y+box.height/2;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*.85,y}]});
 for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width*(.85-.7*i/8),y}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();await settleGallery();
 await page.waitForFunction(()=>document.querySelector('#photoGalleryPosition').textContent==='写真 2 / 2');
 assert.equal(await page.getByRole('button',{name:'写真2を表示',exact:true}).getAttribute('aria-current'),'true');
 assert.deepEqual(await page.locator('.image-entry img').evaluateAll(imgs=>imgs.map(i=>i.src)),before);assert.equal(await page.locator('#dirtyStatus').innerText(),'保存済み');
 await track.focus();await page.keyboard.press('ArrowLeft');await page.waitForFunction(()=>document.querySelector('#photoGalleryPosition').textContent==='写真 1 / 2');
 await page.keyboard.press('End');await page.waitForFunction(()=>document.querySelector('#photoGalleryPosition').textContent==='写真 2 / 2');
 await settleGallery();await page.waitForFunction(()=>Math.abs(document.querySelector('#photoGalleryTrack').scrollLeft-document.querySelector('#photoGalleryTrack').clientWidth)<1);await screenshot('gallery-390');assert.equal(await page.locator('#photoGalleryPosition').innerText(),'写真 2 / 2');await page.getByRole('button',{name:'商品編集を閉じる'}).click();await page.emulateMedia({reducedMotion:'no-preference'});
});
test('main image and deletion use existing image order; save failure keeps photos and unsaved state for retry',async()=>{
 await page.getByRole('button',{name:'画面試験ハーブを編集',exact:true}).click();
 const arrangement=page.locator('.photo-arrangement');if(!(await arrangement.evaluate(e=>e.open)))await arrangement.locator('summary').click();
 await page.waitForFunction(()=>[...document.querySelectorAll('.image-entry img')].every(i=>i.src));
 const chosen=await page.locator('.image-entry img').nth(1).getAttribute('src');await page.getByRole('button',{name:'写真2をメインにする',exact:true}).click();
 await page.waitForFunction(chosen=>document.querySelector('.image-entry img').src===chosen,chosen);assert.equal(await page.locator('#dirtyStatus').innerText(),'未保存の変更あり');
 dialogAccept=false;await page.getByRole('button',{name:'写真2を外す',exact:true}).click();assert.equal(await page.locator('.image-entry').count(),2);
 dialogAccept=true;await page.getByRole('button',{name:'写真2を外す',exact:true}).click();assert.equal(await page.locator('.image-entry').count(),1);assert.equal(await page.locator('#photoGalleryPosition').innerText(),'写真 1 / 1');
 await page.route('**/api/admin/products/*',route=>route.request().method()==='PUT'?route.fulfill({status:503,contentType:'application/json',body:'{"error":{"message":"保存失敗の試験"}}'}):route.continue());
 await page.getByRole('button',{name:'下書き保存',exact:true}).click();await idle();assert.match(await page.locator('#editorMessage').innerText(),/保存失敗/);assert.equal(await page.locator('#dirtyStatus').innerText(),'未保存の変更あり');assert.equal(await page.locator('.image-entry').count(),1);
 await page.unroute('**/api/admin/products/*');await page.getByRole('button',{name:'下書き保存',exact:true}).click();await idle();assert.equal(await page.locator('#dirtyStatus').innerText(),'保存済み');
 await page.getByRole('button',{name:'商品編集を閉じる'}).click();
});

test('stock receipt and physical count have distinct forms, confirmation and explicit before/after results',async()=>{
 await nav('在庫');await noOverflow();const stockBoxes=await Promise.all((await page.locator('.inventory-card').all()).slice(0,2).map(e=>e.boundingBox()));assert(stockBoxes[1].y>stockBoxes[0].y,'inventory must stay a vertical list');await screenshot('inventory-390');
 const row=page.locator('.inventory-card').filter({has:page.locator('[data-id="yomogi-10g"]')});
 await row.getByRole('button',{name:/の入庫$/}).click();await page.getByLabel('追加する個数',{exact:true}).fill('2');await page.getByLabel('変更理由',{exact:true}).fill('画面からのローカル入庫');assert.equal(await page.locator('#inventoryAfter').innerText(),'5個 → 7個');
 dialogAccept=false;await page.getByRole('button',{name:'内容を確認して更新'}).click();assert(await page.locator('#inventoryEditor').isVisible());
 dialogAccept=true;await page.getByRole('button',{name:'内容を確認して更新'}).click();await idle();assert.match(await page.locator('#inventoryMessage').innerText(),/5個 → 7個/);
 await row.getByRole('button',{name:/の棚卸し$/}).click();await page.getByLabel('数えた最終在庫数',{exact:true}).fill('2');await page.getByLabel('変更理由',{exact:true}).fill('画面から実数確認');await page.getByRole('button',{name:'内容を確認して更新'}).click();await idle();assert.match(await row.innerText(),/2\s*個/);
 await nav('ホーム');assert.equal(await page.locator('#homeLowStock').innerText(),'1');assert.match(await page.locator('#lowStockList').innerText(),/ヨモギ/);
});
test('lost inventory response reuses the original operation key and never adds stock twice',async()=>{
 await nav('在庫');const row=page.locator('.inventory-card').filter({has:page.locator('[data-id="yomogi-10g"]')});
 await row.getByRole('button',{name:/の入庫$/}).click();await page.getByLabel('追加する個数',{exact:true}).fill('1');await page.getByLabel('変更理由',{exact:true}).fill('通信断の再試行');
 const keys=[];let lose=true;
 await page.route('**/api/admin/inventory/yomogi-10g',async route=>{if(route.request().method()!=='POST')return route.continue();keys.push(route.request().postDataJSON().operationId);const response=await route.fetch();if(lose){lose=false;return route.abort('failed');}return route.fulfill({response});});
 await page.getByRole('button',{name:'内容を確認して更新'}).click();await idle();assert(await page.locator('#inventoryEditor').isVisible());
 await page.getByRole('button',{name:'内容を確認して更新'}).click();await idle();assert.equal(keys.length,2);assert.equal(keys[0],keys[1]);assert.match(await row.innerText(),/3\s*個/);
 await page.unroute('**/api/admin/inventory/yomogi-10g');
});
test('concurrent external stock change is rejected and keeps the adjustment dialog with an error',async()=>{
 const row=page.locator('.inventory-card').filter({has:page.locator('[data-id="goldenrod-leaf-10g"]')});await row.getByRole('button',{name:/の棚卸し$/}).click();
 const map=await runtime.db.prepare("SELECT variation_id FROM mg_mappings WHERE variant_id='goldenrod-leaf-10g'").first();runtime.square.counts.set(map.variation_id,4);
 await page.getByLabel('数えた最終在庫数',{exact:true}).fill('1');await page.getByLabel('変更理由',{exact:true}).fill('競合を上書きしない');await page.getByRole('button',{name:'内容を確認して更新'}).click();await idle();
 assert.match(await page.locator('#inventoryEditorMessage').innerText(),/在庫が変更/);assert.equal(runtime.square.counts.get(map.variation_id),4);await page.getByRole('button',{name:'在庫変更を閉じる'}).click();
});
test('held stock is visibly separate and cannot open a stock mutation form',async()=>{
 const id='00000000-0000-4000-8000-000000000001';await runtime.db.prepare('INSERT INTO mg_locks VALUES(?,?)').bind('lemonbalm-10g',id).run();
 await page.getByRole('button',{name:'最新の在庫を取得'}).click();await idle();const row=page.locator('.inventory-card').filter({has:page.locator('[data-id="lemonbalm-10g"]')});
 assert.match(await row.innerText(),/販売保留中/);assert(await row.getByRole('button',{name:/の入庫$/}).isDisabled());await runtime.db.prepare('DELETE FROM mg_locks WHERE job_id=?').bind(id).run();
});
test('order detail and shipping confirmation retain tracking, prevent double submission, and update home counts',async()=>{
 await nav('注文');await page.locator('.order').first().click();await page.locator('#detail').waitFor({state:'visible'});assert.match(await page.locator('#detailBody').innerText(),/架空/);await page.locator('#method').selectOption('クリックポスト');await page.locator('#tracking').fill('0001234567');
 dialogAccept=false;await page.getByRole('button',{name:'発送を確定する'}).click();assert(await page.locator('#detail').isVisible());
 dialogAccept=true;await page.getByRole('button',{name:'発送を確定する'}).dblclick();await page.locator('#detail').waitFor({state:'hidden'});await page.getByRole('button',{name:'発送済み',exact:true}).click();await idle();await page.locator('.order').first().waitFor();assert.equal(await page.locator('.order').count(),2);
 await page.locator('#orders [data-order="LOCAL-DEMO-PENDING-001"]').click();await page.locator('#detail').waitFor({state:'visible'});assert.match(await page.locator('#detailBody').innerText(),/0001234567/);assert.equal(await page.locator('#ship').count(),0);await screenshot('order-detail-390');await noOverflow();await page.getByRole('button',{name:'注文詳細を閉じる'}).click();
 await nav('ホーム');assert.equal(await page.locator('#homePending').innerText(),'0');
});
test('home failures never present unknown stock as zero; loading state blocks duplicate writes',async()=>{
 await nav('ホーム');let release;const waiting=new Promise(resolve=>release=resolve);await page.route('**/api/admin/inventory',async route=>{await waiting;return route.fulfill({status:503,contentType:'application/json',body:'{"error":{"message":"試験用の一時エラー"}}'});});await page.locator('#reloadHome').click();await page.waitForFunction(()=>document.querySelector('#homePanel').getAttribute('aria-busy')==='true');assert(await page.locator('#reloadHome').isDisabled());release();await idle();
 assert.equal(await page.locator('#homeLowStock').innerText(),'—');assert.match(await page.locator('#homeMessage').innerText(),/一部の情報を取得できません/);await page.unroute('**/api/admin/inventory');
});
test('long product names stay inside photo cards and short viewports keep focused fields clear of fixed actions',async()=>{
 await nav('商品');await page.getByRole('button',{name:'画面試験ハーブを編集',exact:true}).click();
 await page.getByLabel('商品名',{exact:true}).fill('長い商品名の表示確認用ハーブ'.repeat(6));await page.getByRole('button',{name:'下書き保存',exact:true}).click();await idle();
 await page.setViewportSize({width:390,height:420});const input=page.locator('#variantList [name=price]').first();await input.click();
 const bounds=await input.boundingBox(),top=await page.locator('#productEditor .dialog-heading').boundingBox(),bottom=await page.locator('.editor-actions').boundingBox();
 assert(bounds.y>=top.y+top.height-1&&bounds.y+bounds.height<=bottom.y+1,'focused field must not be hidden by editor actions');await noOverflow();await screenshot('editor-short-390');
 await page.getByRole('button',{name:'商品編集を閉じる'}).click();await page.setViewportSize({width:320,height:844});await noOverflow();
 const name=page.locator('#productList .product-name').filter({hasText:'長い商品名'});assert.equal(await name.count(),1);assert.equal(await name.evaluate(e=>getComputedStyle(e).webkitLineClamp),'3');
});
test('brand presentation can change without changing API configuration, token or current shop data',async()=>{
 const result=await page.evaluate(()=>{const config=JSON.stringify(window.YASOYA_STORE_CONFIG),token=sessionStorage.getItem('yasoyaAdminToken');window.YasoyaUI.applyBrand(document,{name:'表示試験ブランド',wordmark:'DISPLAY TEST',colors:{green:'#334433'},workerBaseUrl:'https://invalid.example'});const changed=document.querySelector('[data-brand-name]').textContent;const safe=config===JSON.stringify(window.YASOYA_STORE_CONFIG)&&token===sessionStorage.getItem('yasoyaAdminToken');window.YasoyaUI.applyBrand();return {changed,safe};});
 assert.equal(result.changed,'表示試験ブランド');assert.equal(result.safe,true);assert.equal(await page.locator('[data-brand-name]').innerText(),'八草屋本店');
});

test('320/360/390/412/768/1280 widths remain usable, with desktop sidebar and mobile bottom navigation',async()=>{
 for(const width of [320,360,390,412,768,1280]){
  await page.setViewportSize({width,height:900});for(const name of ['ホーム','注文','商品','在庫']){await nav(name);await noOverflow();}
  await nav('商品');if(width<=640)assert.equal(await page.locator('#productList').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),2,'mobile product grid must have exactly two columns');const cards=await page.locator('#productList .product-card').all();const boxes=await Promise.all(cards.slice(0,2).map(c=>c.boundingBox()));assert(Math.abs(boxes[0].y-boxes[1].y)<1,'product cards must share the first row');for(const c of cards){const image=await c.locator('.product-photo').boundingBox();assert(Math.abs(image.width-image.height)<1,'product image must be square');}await page.locator('[data-edit="yomogi"]').click();await noOverflow();await page.locator('#productEditor').evaluate(e=>e.scrollTop=e.scrollHeight);const db=await page.locator('#productEditor').boundingBox(),close=await page.locator('#closeEditor').boundingBox(),save=await page.locator('#saveProduct').boundingBox();assert(close.y>=db.y&&close.y+close.height<=db.y+db.height,'editor close must remain visible');assert(save.y>=db.y&&save.y+save.height<=db.y+db.height+1,'save must remain visible');await page.getByRole('button',{name:'商品編集を閉じる'}).click();
  if(width===1280){const b=await page.getByRole('navigation').boundingBox();assert(b.x<200&&b.width<240);await nav('ホーム');await screenshot('home-1280');}
 }
});
test('UI makes no external requests or payments and produces no uncaught JavaScript errors',async()=>{
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.equal(runtime.square.payments.size,0);assert(!runtime.square.calls.some(p=>p.startsWith('/v2/payments')));
});
