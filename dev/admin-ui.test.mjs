import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {renderApiScript} from '../validation/prepare.mjs';
import {REVIEW_TARGET} from '../validation/actions-review.mjs';
const manifest={...REVIEW_TARGET,workerName:'yasoya-payments-validation',databaseName:'yasoya-validation-orders',variations:{'lemonbalm-10g':'OFFLINEVAR001','yomogi-10g':'OFFLINEVAR002','goldenrod-leaf-10g':'OFFLINEVAR003'},notificationEmail:'test@example.invalid'};
test('both redesigned admin scripts keep the exact validation-origin guard without a production API fallback',async()=>{
 for(const name of ['admin.js','admin-management.js']){
  const source=await readFile(new URL('../js/'+name,import.meta.url),'utf8');assert(!source.includes('https://yasoya-honten-payments.tatsurou3523.workers.dev'));
  const rendered=renderApiScript(source,manifest);
  for(const config of [undefined,{environment:'production',workerBaseUrl:manifest.workerOrigin},{environment:'sandbox',workerBaseUrl:'https://other.invalid'}]){
   let requests=0;const context={window:{YASOYA_STORE_CONFIG:config},location:{origin:manifest.workerOrigin},fetch:()=>requests++,document:new Proxy({},{get(){throw Error('DOM must not initialize');}})};
   assert.throws(()=>vm.runInNewContext(rendered,context),/Sandbox configuration required/);assert.equal(requests,0);
  }
 }
});
test('missing local admin API configuration fails closed on login, without sending a request',async()=>{
 const elements=new Map();const get=id=>{if(!elements.has(id))elements.set(id,{value:id==='token'?'local-development-only':'',dataset:{},addEventListener(){}});return elements.get(id);};let requests=0;
 const context={window:{},sessionStorage:{getItem:()=>''},document:{getElementById:get,querySelectorAll:()=>[]},fetch:()=>requests++,Intl,Map,setTimeout,clearTimeout};
 vm.runInNewContext(await readFile(new URL('../js/admin.js',import.meta.url),'utf8'),context);
 get('loginForm').onsubmit({preventDefault(){}});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(requests,0);assert.match(get('loginError').textContent,/管理APIの設定がありません/);assert.equal(get('loginBtn').disabled,false);
});

async function components(){const context={window:{}};vm.runInNewContext(await readFile(new URL('../js/admin-ui.js',import.meta.url),'utf8'),context);return context.window.YasoyaUI;}
test('brand presentation accepts names and color tokens only, without changing connection or authentication settings',async()=>{
 const ui=await components(),names=[],wordmarks=[],styles=[];
 const root={querySelectorAll:selector=>[{set textContent(value){(selector==='[data-brand-name]'?names:wordmarks).push(value);}}],documentElement:{style:{setProperty:(key,value)=>styles.push([key,value])}}};
 const brand=ui.applyBrand(root,{name:'表示専用のブランド',wordmark:'TEST SHOP',colors:{green:'#224422',paper:'url(https://other.invalid)'},workerBaseUrl:'https://other.invalid',token:'not-a-real-secret'});
 assert.equal(brand.name,'表示専用のブランド');assert.equal(brand.colors.green,'#224422');assert.equal(brand.colors.paper,'#f6f4ee');assert.deepEqual(Object.keys(brand).sort(),['colors','name','wordmark']);assert.equal(names[0],brand.name);assert.equal(wordmarks[0],brand.wordmark);assert(styles.every(([key,value])=>/^--(?:paper|ink|green|soft)$/.test(key)&&/^#[a-f0-9]{6}$/i.test(value)));
});
test('shared product cards and status/empty states escape untrusted product text',async()=>{
 const ui=await components();const p={id:'test',status:'draft',draft:{name:'<script>bad()</script>',alt:'<img onerror=bad()>',images:[],variants:[{amount:'<svg onload=bad()>',price:980}]}};
 const card=ui.productCard(p,n=>'JPY '+n);assert(!card.includes('<script>'));assert(!card.includes('<svg'));assert(card.includes('&lt;script&gt;'));assert(card.includes('data-edit="test"'));assert(!ui.emptyState('<script>bad()</script>').includes('<script>'));assert(!ui.statusBadge('<img onerror=bad()>').includes('<img'));
});
