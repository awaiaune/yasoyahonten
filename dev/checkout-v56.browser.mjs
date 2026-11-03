// Playwright-only visual smoke checks against a local read-only server.
// Does not load Square, call APIs, submit forms, or write customer data.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {chromium} from 'playwright-core';
const port=8792,base='http://127.0.0.1:'+port;
async function server(t){
 const p=spawn(process.execPath,[new URL('./checkout-v56-preview.mjs',import.meta.url).pathname],{
   env:{...process.env,YASOYA_PREVIEW_PORT:String(port)},stdio:'ignore'
 });
 t.after(()=>{p.kill('SIGTERM');});
 for(let i=0;i<55;i++){
   if(p.exitCode!==null)throw Error('Offline preview server exited unexpectedly');
   try{const r=await fetch(base+'/checkout.html');if(r.status===200)return;}catch{}
   await new Promise(resolve=>setTimeout(resolve,120));
 }
 throw Error('Offline preview unavailable');
}
test('checkout and thank-you layouts are consistent on phones and desktop',async t=>{
 await server(t);
 const browser=await chromium.launch({
   executablePath:process.env.YASOYA_CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath()),
   headless:true,args:['--no-sandbox','--disable-background-networking']
 });
 t.after(()=>browser.close());
 for(const width of [390,1440]){
   const page=await browser.newPage({viewport:{width,height:844}});
   const unexpected=[];
   page.on('request',r=>{const u=new URL(r.url());if(u.origin!==base&&!u.hostname.endsWith('googleapis.com')&&!u.hostname.endsWith('gstatic.com'))unexpected.push(u.href);});
   await page.goto(base+'/checkout.html');
   await page.locator('.checkout-summary').waitFor({state:'visible'});
   assert.equal(await page.locator('.editorial-header').count(),1);
   assert.equal(await page.locator('.v21-footer').count(),1);
   assert.equal(await page.locator('#checkoutNotice').count(),0);
   assert.equal(await page.locator('#paymentButton').isDisabled(),true);
   assert.equal(await page.locator('h1.checkout-title').textContent(),'Checkout.');
   assert(await page.locator('#card-container').innerText().then(v=>v.includes('デザイン確認用')));
   const geometry=await page.evaluate(()=>({
      width:document.documentElement.scrollWidth,viewport:innerWidth,
      form:document.querySelector('.checkout-form').getBoundingClientRect().toJSON(),
      summary:document.querySelector('.checkout-summary').getBoundingClientRect().toJSON()
   }));
   assert(geometry.width<=geometry.viewport+2,'Horizontal overflow at '+width);
   if(width===390)assert(geometry.summary.y<geometry.form.y,'Summary should lead on mobile');
   else assert(geometry.summary.x>geometry.form.x,'Summary should be a right column on desktop');
   await page.goto(base+'/thanks.html');
   assert.equal(await page.locator('.editorial-header').count(),1);
   assert.equal(await page.locator('.v21-footer').count(),1);
   assert.equal(await page.locator('h1').textContent(),'Thank you.');
   assert.equal(await page.locator('#checkoutNotice').count(),0);
   assert(!(await page.locator('main').innerText()).includes('ご注文を受け付けました。'));
   assert.equal((await page.evaluate(()=>document.documentElement.scrollWidth))<=width+2,true);
   assert.deepEqual(unexpected,[]);
   await page.close();
 }
});
