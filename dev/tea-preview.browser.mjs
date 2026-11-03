import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {previewServer,buildPreview,site,output} from './tea-preview.mjs';
const {chromium}=createRequire(import.meta.url)('playwright-core');
const files=['tea-cup-preview.jpg','tea-pour-preview.jpg','tea-leaves-preview.jpg'];
const original=execFileSync('git',['show','a00b3d0:staging/site/index.html'],{encoding:'utf8'});
let browser,server,origin,preview;
before(async()=>{preview=await buildPreview();server=previewServer();server.listen(0,'127.0.0.1');await once(server,'listening');origin='http://127.0.0.1:'+server.address().port;browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-background-networking']});});
after(async()=>{await browser?.close();if(server)await new Promise(r=>server.close(r));});
async function context(t,width=390){const c=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});t.after(()=>c.close());const outside=[],errors=[];await c.route('**/*',r=>{if(new URL(r.request().url()).origin===origin)return r.continue();outside.push(r.request().url());return r.abort();});const p=await c.newPage();p.setDefaultTimeout(6000);p.on('pageerror',e=>errors.push(e.message));return {c,p,outside,errors};}
async function swipe(p,direction='left'){
 const bounds=await p.locator('#teaStage').boundingBox(),cdp=await p.context().newCDPSession(p);const y=bounds.y+bounds.height/2,x=direction==='left'?bounds.x+bounds.width*.8:bounds.x+bounds.width*.2,end=direction==='left'?bounds.x+bounds.width*.2:bounds.x+bounds.width*.8;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:end,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
}
const active=async p=>(await p.locator('#teaStage .is-active figcaption').textContent()).trim();
test('exact images from 55aa513 and scoped full-bleed TEA stylesheet are installed',async()=>{
 const html=await readFile(site+'/index.html','utf8');let expected=original;
 for(const name of files){const p='staging/site/images/'+name;assert.equal(execFileSync('git',['hash-object',p],{encoding:'utf8'}).trim(),execFileSync('git',['rev-parse','55aa513:'+p],{encoding:'utf8'}).trim());}
 const urls=['https://images.backtoyourrootsherbs.com/making-herbal-tea-infusion-at-home.jpg','https://gewurzhaus.com.au/cdn/shop/files/Quiet-Time-Tea.jpg?v=1751348462','https://healthanswers.pfizer.com/sleep/remedies/media_18a5b44097557717cbccd8745443e7e4aaf1997a0.jpg'];
 for(let i=0;i<3;i++)expected=expected.replace(urls[i],'images/'+files[i]).replace(' onerror="this.onerror=null;this.src=\'images/'+files[i]+'\'"','');
 expected=expected.replace('</head>','<link href="css/tea-fullbleed-v54.css" rel="stylesheet"/></head>');assert.equal(html,expected);assert.equal(execFileSync('git',['diff','--name-only','a00b3d0','--','worker','production','js/admin.js','js/checkout-v1.js'],{encoding:'utf8'}).trim(),'');
});
for(const width of [375,390,430])test('mobile '+width+' loads local photos, preserves links/layout, swipe and fade',async t=>{
 const {p,outside,errors}=await context(t,width);await p.goto(origin+'/');await p.locator('#teaStage').scrollIntoViewIfNeeded();
 await p.waitForFunction(()=>[...document.querySelectorAll('#teaStage img')].every(i=>i.complete&&i.naturalWidth>0));
 assert.deepEqual(await p.locator('#teaStage img').evaluateAll(imgs=>imgs.map(i=>i.getAttribute('src'))),files.map(n=>'images/'+n));
 assert.equal(await p.locator('#teaStage').evaluate(el=>getComputedStyle(el).touchAction),'pan-y');
 assert.equal(await p.locator('#teaStage .is-active').evaluate(el=>getComputedStyle(el).transitionDuration),'0.7s, 0.7s');
 const metrics=await p.locator('#teaStage').evaluate(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}));assert(Math.abs(metrics.width-width)<1);const film=await p.locator('.v20-film-frame').boundingBox();assert(Math.abs(metrics.height-film.height)<1);assert(Math.abs(metrics.width-film.width)<1);const gap=await p.evaluate(()=>document.querySelector('.v21-film').getBoundingClientRect().top-document.querySelector('.v20-tea').getBoundingClientRect().bottom);assert(gap>=39);
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(await p.locator('.v39-botanical-link').evaluateAll(els=>els.map(e=>e.getAttribute('href'))),['products/lemonbalm.html','products/yomogi.html','products/goldenrod.html']);
 assert.equal(await active(p),'A QUIET MOMENT');if(width===390)await p.locator('.v20-tea').screenshot({path:output+'/tea-cup-390.png'});
 await swipe(p);await p.waitForFunction(()=>document.querySelector('#teaStage .is-active figcaption').textContent==='THE BREW');await p.waitForTimeout(750);if(width===390)await p.locator('.v20-tea').screenshot({path:output+'/tea-pour-390.png'});
 await swipe(p);assert.equal(await active(p),'THE LEAVES');await p.waitForTimeout(750);if(width===390)await p.locator('.v20-tea').screenshot({path:output+'/tea-leaves-390.png'});
 await swipe(p,'right');assert.equal(await active(p),'THE BREW');await p.locator('#teaStage').focus();await p.keyboard.press('ArrowRight');assert.equal(await active(p),'THE LEAVES');await p.keyboard.press('ArrowRight');assert.equal(await active(p),'A QUIET MOMENT');assert.deepEqual(errors,[]);assert.deepEqual(outside,[]);
});
test('desktop stage keeps original dimensions and local images',async t=>{
 const {p}=await context(t,1440);await p.goto(origin+'/');await p.locator('#teaStage').scrollIntoViewIfNeeded();const m=await p.locator('#teaStage').boundingBox();const film=await p.locator('.v20-film-frame').boundingBox();assert(Math.abs(m.width-film.width)<1);assert(Math.abs(m.height-film.height)<1);assert.equal(m.width,1440);assert.equal(await p.locator('#teaStage img').count(),3);
});
test('self-contained downloadable HTML renders on mobile without external resources and supports touch',async t=>{
 const {p,outside,errors}=await context(t);await p.goto(origin+'/preview.html#teaStage');await p.locator('#teaStage').scrollIntoViewIfNeeded();await p.waitForFunction(()=>[...document.querySelectorAll('#teaStage img')].every(i=>i.complete&&i.naturalWidth>0));
 assert(await p.locator('#teaStage img').evaluateAll(imgs=>imgs.every(i=>i.src.startsWith('data:image/jpeg;base64,'))));
 await swipe(p);assert.equal(await active(p),'THE BREW');assert.deepEqual(outside,[]);assert.deepEqual(errors,[]);
});
test('preview cannot access purchase/admin APIs, checkout or external services',async t=>{
 for(const path of ['/api/v1/payments','/api/admin/products','/checkout.html'])assert.equal((await fetch(origin+path)).status,403);
 assert.equal((await fetch(origin+'/api/v1/payments',{method:'POST'})).status,405);
 const {p}=await context(t);await p.goto(origin+'/');const r=await p.evaluate(async()=>({status:(await fetch('https://connect.squareup.com/v2/locations')).status}));assert.equal(r.status,503);
});

test('TEA centered caption, image-overlay progress and preserved film gap',async t=>{
 const {p}=await context(t,390);
 await p.goto(origin+'/');
 await p.locator('#teaStage').scrollIntoViewIfNeeded();
 const stage=await p.locator('#teaStage').boundingBox();
 const caption=await p.locator('#teaStage .is-active figcaption').boundingBox();
 const dots=await p.locator('.v20-tea-indicator').boundingBox();
 const film=await p.locator('.v20-film-frame').boundingBox();
 assert(Math.abs(caption.x+caption.width/2-stage.x-stage.width/2)<3,'TEA caption must be centered horizontally');
 assert(Math.abs(caption.y+caption.height/2-stage.y-stage.height/2)<3,'TEA caption must be centered vertically');
 assert(dots.y>=stage.y+stage.height-70,'TEA progress should be near the image bottom');
 assert(dots.y+dots.height<=stage.y+stage.height+1,'TEA progress must overlay the photograph');
 assert(Math.abs(stage.width-film.width)<1,'TEA and film widths differ');
 assert(Math.abs(stage.height-film.height)<1,'TEA and film heights differ');
 const gap=await p.evaluate(()=>document.querySelector('.v21-film').getBoundingClientRect().top-document.querySelector('.v20-tea').getBoundingClientRect().bottom);
 assert(gap>=39 && gap<50,'White gap between TEA and film was changed');
});
test('SHOP ALL VIEW is centered near the first mobile fold and opens collection',async t=>{
 const {p}=await context(t,390);
 await p.goto(origin+'/products.html');
 const teaser=await p.locator('.v35-teaser').boundingBox();
 const button=await p.locator('.v35-all-open').boundingBox();
 assert(Math.abs(button.x+button.width/2-195)<2,'ALL VIEW is not horizontally centered');
 assert(button.y-teaser.y<8,'ALL VIEW must be visible at the top of the teaser');
 assert(button.height>=44,'ALL VIEW tap target is too small');
 await p.locator('.v35-all-open').click();
 assert.equal(await p.locator('#all-botanicals').getAttribute('aria-hidden'),'false');
 await p.locator('.v35-all-back').click();
 assert.equal(await p.locator('#all-botanicals').getAttribute('aria-hidden'),'true');
});
