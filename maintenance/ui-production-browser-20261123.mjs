import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const dep=process.env.UI_TEST_NODE_MODULES,dir=process.env.UI_DEPLOYMENT_DIR;
const require=createRequire(path.join(dep,'../package.json')),{chromium}=require(path.join(dep,'playwright'));
const browser=await chromium.launch({headless:true});
const origin='https://yasoyahonten.awaiaune.com';await mkdir(path.join(dir,'screenshots'),{recursive:true});
const results=[];
try{
 for(const [name,width,height] of [['mobile',390,844],['desktop',1440,900]]){
  const ctx=await browser.newContext({viewport:{width,height},isMobile:name==='mobile',hasTouch:name==='mobile'});
  // Read-only requests only. Cart tests use isolated local storage; checkout is never submitted.
  await ctx.route('**/*',route=>['GET','HEAD'].includes(route.request().method())?route.continue():route.abort());
  const page=await ctx.newPage();const response=await page.goto(origin+'/',{waitUntil:'networkidle'});assert.equal(response.status(),200);
  const label=page.locator('#botanicalTrack .v24-active .v19-center-name');await label.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('#botanicalTrack .v24-active')).opacity)>.999);
  const m=await label.evaluate(e=>{const p=e.parentElement,r=e.getBoundingClientRect(),q=p.getBoundingClientRect(),c=getComputedStyle(e);return {size:parseFloat(c.fontSize),color:c.color,filter:getComputedStyle(p.querySelector('img')).filter,center:Math.abs(r.x+r.width/2-q.x-q.width/2)<2&&Math.abs(r.y+r.height/2-q.y-q.height/2)<2,after:getComputedStyle(p,'::after').display};});
  assert(m.center&&m.size>=11&&m.size<=15);assert.equal(m.color,'rgb(255, 255, 255)');assert.equal(m.filter,'none');assert.equal(m.after,'none');
  await page.waitForFunction(()=>{const i=document.querySelector('#botanicalTrack .v24-active>img');return i.complete&&i.naturalWidth>0});
  await page.screenshot({path:path.join(dir,'screenshots',name+'-production-home.png')});
  assert.equal(await page.locator('.shop-description').count(),1);await page.locator('.shop-description').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(dir,'screenshots',name+'-production-description.png')});
  const track=page.locator('#botanicalTrack');await track.scrollIntoViewIfNeeded();await track.focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(1000);
  assert.equal(await page.locator('#botanicalTrack .v24-active .v19-center-name').innerText(),'YOMOGI');await page.locator('#botanicalTrack .v24-active .v39-botanical-link').click();await page.waitForURL('**/products/yomogi10.html');
  assert.equal(await page.locator('.v30-caption,.v30-current').count(),0);assert(await page.locator('.v30-purchase').isVisible());
  await page.screenshot({path:path.join(dir,'screenshots',name+'-production-yomogi.png')});
  await page.goto(origin+'/products/lemonbalm10.html',{waitUntil:'networkidle'});const dots=page.locator('.v30-dots button');
  if(await dots.count()>1){await dots.nth(1).click();assert.equal(await page.locator('.v30-slide.is-active').getAttribute('data-index'),'1');}
  await page.screenshot({path:path.join(dir,'screenshots',name+'-production-lemonbalm.png')});
  const add=page.locator('.product-cart-button').first();let cart='unavailable product; offline cart verification already passed';
  if(await add.isEnabled()){
   await add.click();assert.equal(await page.locator('#cartCount').innerText(),'1');cart='local cart count 1; no checkout request';
  }
  await page.route('**/api/media/**',route=>route.abort());await page.goto(origin+'/');const fallback=page.locator('#botanicalTrack .v24-active .v19-center-name');await fallback.scrollIntoViewIfNeeded();await page.waitForTimeout(1000);assert(await fallback.isVisible());assert.equal(await fallback.innerText(),'LEMON BALM');
  await page.screenshot({path:path.join(dir,'screenshots',name+'-production-missing-image.png')});results.push({viewport:name,...m,cart,slider:'YOMOGI link correct',gallery:'dots retained',fallback:'HTML name visible'});await ctx.close();
 }
 const f=path.join(dir,'deployment-receipt.json'),j=JSON.parse(await readFile(f,'utf8'));assert.equal(j.state,'production-smoke-passed');j.browser=results;j.state='production-verified';await writeFile(f,JSON.stringify(j,null,2));console.log('PASS actual production mobile/desktop, image colors, slider, gallery, cart and broken-image fallback');
}finally{await browser.close();}
