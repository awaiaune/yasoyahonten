// Production-shaped UI via intercepted browser requests and in-memory services only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {fixture,baseEnv} from './production-fixture.mjs';
test('Access-protected production UI saves images and drafts independently while Catalog and inventory stay disabled',async t=>{
 const f=await fixture(t,{PRODUCTION_MANAGEMENT_READ_ENABLED:'1',PRODUCTION_MANAGEMENT_DRAFT_ENABLED:'1',PRODUCTION_MANAGEMENT_IMAGES_ENABLED:'1'});
 const browser=await chromium.launch({executablePath:process.env.YASOYA_CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath()),headless:true,args:['--no-sandbox','--disable-background-networking']});t.after(()=>browser.close());
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});const unexpected=[],errors=[];
 await context.route('**/*',async route=>{const r=route.request();if(new URL(r.url()).origin!==baseEnv.PRODUCTION_ADMIN_ORIGIN){unexpected.push('external');return route.abort();}const headers={...r.headers(),'Cf-Access-Jwt-Assertion':f.token};const data=r.postDataBuffer();const response=await f.ui.dispatchFetch(r.url(),{method:r.method(),headers,...(data?{body:data}:{})});return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());const idle=()=>page.waitForFunction(()=>!document.querySelector('#app [aria-busy="true"]'));
 await page.goto(baseEnv.PRODUCTION_ADMIN_ORIGIN+'/admin/');await page.getByLabel('管理トークン',{exact:true}).fill(f.env.ADMIN_TOKEN);await page.getByRole('button',{name:'管理画面を開く'}).click();await page.locator('#app').waitFor({state:'visible'});await idle();
 await page.getByRole('navigation').getByRole('button',{name:'商品',exact:true}).click();await idle();assert.equal(await page.locator('#importProducts').isVisible(),false);
 await page.getByRole('button',{name:'＋ 商品登録',exact:true}).click();await page.getByLabel('商品名',{exact:true}).fill('本番形状の架空商品');await page.getByLabel('URL識別子',{exact:true}).fill('offline-production-ui');await page.locator('[name=vname]').fill('架空商品 10g');
 await page.locator('#imageFiles').setInputFiles({name:'offline.jpg',mimeType:'image/jpeg',buffer:await readFile(new URL('../images/lemonbalm.jpg',import.meta.url))});await idle();assert.equal(await page.locator('.image-entry').count(),1);
 await page.getByRole('button',{name:'下書き保存',exact:true}).click();await idle();assert.equal(await page.locator('#dirtyStatus').innerText(),'保存済み');assert.match(await page.locator('#editorSyncStatus').innerText(),/Square Production/);assert(await page.getByRole('button',{name:'保存内容を公開'}).isDisabled());
 await page.getByRole('button',{name:'商品編集を閉じる'}).click();await page.reload();await idle();await page.getByRole('navigation').getByRole('button',{name:'商品',exact:true}).click();await idle();await page.getByRole('button',{name:'本番形状の架空商品を編集',exact:true}).click();assert.equal(await page.locator('.image-entry').count(),1);
 assert.deepEqual(unexpected,[]);assert.deepEqual(errors,[]);assert(!f.calls.some(c=>c.method==='POST'&&c.path!=='/v2/inventory/counts/batch-retrieve'));assert.equal(f.fake.payments.size,0);
});
