// Existing UI backport only. No remote/authenticated services or data writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,mkdir,rm} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {chromium} from 'playwright-core';
const exec=promisify(execFile),root=new URL('../',import.meta.url).pathname,base='f7669111cd52d75b04181b8f0fc17658fd4c9a7a',patch=path.join(root,'production/admin-payment-trace-ui.patch');
async function fixture(t){
 const dir=await mkdtemp('/tmp/yasoya-admin-trace-overlay-');t.after(()=>rm(dir,{recursive:true,force:true}));await exec('git',['init','--quiet'],{cwd:dir});
 for(const file of ['admin/index.html','js/admin.js']){await mkdir(path.dirname(path.join(dir,file)),{recursive:true});await writeFile(path.join(dir,file),(await exec('git',['show',base+':'+file],{cwd:root,maxBuffer:2*1024*1024})).stdout);}
 return dir;
}
test('minimal backport changes only trace HTML/query/rendering and preserves unrelated live UI',async t=>{
 const dir=await fixture(t),file=path.join(dir,'admin/index.html'),old=await readFile(file,'utf8');const preserved=old.replace('植物の代表写真','既存の植物代表写真');await writeFile(file,preserved);await writeFile(path.join(dir,'keep.css'),'unchanged');
 await exec('git',['apply','--check',patch],{cwd:dir});await exec('git',['apply',patch],{cwd:dir});
 const html=await readFile(file,'utf8');assert(html.includes('paymentTraceList'));assert.equal(html.replace(/          <h3>決済段階の診断履歴<\/h3>[\s\S]*?(?=        <\/section>)/,''),preserved);assert.equal(await readFile(path.join(dir,'keep.css'),'utf8'),'unchanged');
 assert.equal(await readFile(path.join(dir,'js/admin.js'),'utf8'),await readFile(path.join(root,'js/admin.js'),'utf8'));
 await assert.rejects(()=>exec('git',['apply','--check',patch],{cwd:dir}));
});
test('patched legacy admin displays safe trace on mobile using authenticated GET without recovery/payment requests',async t=>{
 const dir=await fixture(t);await exec('git',['apply',patch],{cwd:dir});const calls=[];
 const diagnostic={attemptId:'00000000-0000-4000-8000-000000000001',createdAt:Date.parse('2026-11-09T03:20:00Z'),events:[
  ...['pay_click','sdk_start'].map(stage=>({stage,activation:stage==='sdk_start',source:'browser',at:1794194400000})),
  {stage:'sdk_ok',source:'browser',at:1794194400100},{stage:'payment_dispatch',source:'browser',at:1794194400200},{stage:'square_send',source:'server',at:1794194400300},
  {stage:'square_response',source:'server',at:1794194400400,httpStatus:402,requestId:'safe-square-request',codes:['CARD_DECLINED_VERIFICATION_REQUIRED','PRIVATE_CARD']},
  {stage:'csp_blocked',source:'browser',at:1794194400500,directive:'frame-src',blockedURI:'PRIVATE_URL',token:'PRIVATE_TOKEN'},{stage:'PRIVATE_EVENT',source:'server'}]};
 const server=createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/')){calls.push({path:url.pathname,method:req.method,query:url.searchParams.toString(),auth:req.headers.authorization==='Bearer local-development-only'});res.setHeader('Content-Type','application/json');res.end(JSON.stringify(url.pathname==='/api/admin/payment-attempts'?{attempts:[],failures:[],diagnostics:[diagnostic]}:url.pathname.includes('/orders')?{orders:[]}:url.pathname.includes('/products')?{products:[],capabilities:{}}:url.pathname.includes('/inventory')?{inventory:[]}:{jobs:[]}));return;}
  if(url.pathname==='/js/store-config.js'){res.setHeader('Content-Type','application/javascript');res.end(`window.YASOYA_STORE_CONFIG={environment:'production',workerBaseUrl:location.origin};`);return;}
  const file=url.pathname==='/admin/'?'admin/index.html':url.pathname.slice(1);if(file.includes('..'))throw Error('unsafe');res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await readFile(path.join(['admin/index.html','js/admin.js'].includes(file)?dir:root,file)));
 }catch{res.writeHead(404);res.end();}});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>server.close(resolve)));
 const browser=await chromium.launch({executablePath:process.env.YASOYA_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-background-networking']});t.after(()=>browser.close());const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const origin='http://127.0.0.1:'+server.address().port;await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 await page.goto(origin+'/admin/');await page.getByLabel('管理トークン',{exact:true}).fill('local-development-only');await page.getByRole('button',{name:'管理画面を開く'}).click();await page.locator('#app').waitFor({state:'visible'});await page.getByRole('button',{name:'未解決決済を確認',exact:true}).click();await page.locator('#paymentTraceList summary').waitFor();await page.locator('#paymentTraceList summary').click();const text=await page.locator('#paymentTraceList').innerText();
 for(const expected of ['00000000-0000-4000-8000-000000000001','2026','操作有効：あり','操作有効：なし','12:20','SDK本人認証開始','SDKトークン化完了','購入API送信開始','Square決済要求開始','HTTP 402','safe-square-request','CARD_DECLINED_VERIFICATION_REQUIRED','frame-src'])assert(text.includes(expected),expected);
 assert(!text.includes('PRIVATE_'));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);assert(calls.every(c=>c.method==='GET'));assert(calls.every(c=>!c.path.includes('/recover')&&!c.path.includes('/payments')));assert.deepEqual(calls.filter(c=>c.path==='/api/admin/payment-attempts'),[{path:'/api/admin/payment-attempts',method:'GET',query:'include_failed=1&include_diagnostics=1',auth:true}]);
});
