// Offline render/D1/browser regression. All inventory responses are substitutes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {chromium} from 'playwright-core';

const origin='https://staging.awaiaune.com';
const defaults={RUNTIME_TIER:'staging',SQUARE_ENVIRONMENT:'sandbox',SQUARE_LOCATION_ID:'SANDBOXLOCATION',SQUARE_ACCESS_MODE:'READ_WRITE',VALIDATION_CHECKOUT_ENABLED:'1',VALIDATION_MAIL_ENABLED:'0',VALIDATION_CRON_ENABLED:'0',MANAGEMENT_ENABLED:'1',MANAGEMENT_STOCK_WRITES:'single-writer',MANAGEMENT_CHECKOUT_PAUSED:'0',PRODUCTION_CHECKOUT_ENABLED:'0',PRODUCTION_MANAGED_CHECKOUT_ENABLED:'0'};
const mapping={variant_id:'herb-10g',environment:'sandbox',location_id:'SANDBOXLOCATION',item_id:'SANDBOXITEM123',variation_id:'SANDBOXVAR123',item_version:1,variation_version:1};
const html='<html><head><meta charset="utf-8"><title></title></head><body><div class="v30-purchase"></div></body></html>';
test('managed product checkout uses environment policy and mapped published snapshot',{timeout:60000},async t=>{
 const {outputFiles}=await build({stdin:{contents:`import {renderV53} from './worker/src/management/v53-render.js';export default {fetch(r,e){return renderV53(r,{...e,...JSON.parse(r.headers.get('x-test-env')||'{}')});}}`,resolveDir:new URL('..',import.meta.url).pathname},bundle:true,write:false,format:'esm',platform:'browser'});
 const mf=new Miniflare({cf:false,modules:true,script:outputFiles[0].text,compatibilityDate:'2026-08-04',d1Databases:{ORDERS_DB:'offline-staging-purchase'},bindings:defaults,serviceBindings:{ASSETS:()=>new Response(html,{headers:{'Content-Type':'text/html'}})}});t.after(()=>mf.dispose());
 const db=await mf.getD1Database('ORDERS_DB');
 for(const sql of (await readFile(new URL('../staging/migrations/0002_management.sql',import.meta.url),'utf8')).replace("CHECK(environment='sandbox')","CHECK(environment IN ('sandbox','production'))").split(';').filter(s=>s.trim()))await db.prepare(sql).run();
 const data={name:'ハーブ',description:'説明',alt:'ハーブ',images:[],variants:[{id:'herb-10g',name:'通常',price:980,active:true,maxQuantity:10}]};
 const reset=async({status='published',active=true,map=mapping,published=1}={})=>{
  await db.prepare('DELETE FROM mg_mappings').run();await db.prepare('DELETE FROM mg_revisions').run();await db.prepare('DELETE FROM mg_products').run();
  await db.prepare('INSERT INTO mg_products(id,slug,status,version,draft_revision,published_revision,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').bind('herb','herb',status,1,1,published,0,'2026-11-06','2026-11-06').run();
  await db.prepare('INSERT INTO mg_revisions VALUES(?,?,?,?)').bind('herb',1,JSON.stringify({...data,variants:[{...data.variants[0],active}]}),'2026-11-06').run();
  if(map)await db.prepare('INSERT INTO mg_mappings VALUES(?,?,?,?,?,?,?)').bind(...Object.values(map)).run();
 };
 const render=patch=>mf.dispatchFetch(origin+'/products/herb.html',{headers:{'x-test-env':JSON.stringify(patch||{})}});
 const cases=[
  ['staging ON without production flags',{}, {},true],
  ['staging OFF',{VALIDATION_CHECKOUT_ENABLED:'0'}, {},false],
  ['production flags cannot override staging OFF',{VALIDATION_CHECKOUT_ENABLED:'0',PRODUCTION_CHECKOUT_ENABLED:'1',PRODUCTION_MANAGED_CHECKOUT_ENABLED:'1'}, {},false],
  ['paused staging',{MANAGEMENT_CHECKOUT_PAUSED:'1'}, {},false],
  ['read-only staging',{SQUARE_ACCESS_MODE:'READ_ONLY'}, {},false],
  ['invalid staging flag',{VALIDATION_CHECKOUT_ENABLED:'invalid'}, {},false],
  ['wrong Square environment',{SQUARE_ENVIRONMENT:'production'}, {},false],
  ['unknown runtime',{RUNTIME_TIER:'unknown'}, {},false],
  ['production OFF is preserved',{RUNTIME_TIER:'production',SQUARE_ENVIRONMENT:'production'}, {},false],
  ['production managed OFF is preserved',{RUNTIME_TIER:'production',PRODUCTION_CHECKOUT_ENABLED:'1'}, {},false],
  ['production existing ON switches preserved',{RUNTIME_TIER:'production',PRODUCTION_CHECKOUT_ENABLED:'1',PRODUCTION_MANAGED_CHECKOUT_ENABLED:'1'}, {},true],
  ['missing mapping',{}, {map:null},false],
  ['wrong Location',{}, {map:{...mapping,location_id:'ANOTHERLOCATION'}},false],
  ['production Location forbidden',{SQUARE_LOCATION_ID:'LQ693S4H2NBZ8'}, {map:{...mapping,location_id:'LQ693S4H2NBZ8'}},false],
  ['empty Item',{}, {map:{...mapping,item_id:''}},false],
  ['empty Variation',{}, {map:{...mapping,variation_id:''}},false],
  ['known production Variation forbidden',{}, {map:{...mapping,variation_id:'RRTIT6N4QLIYPUW633WDBG36'}},false],
  ['stopped product',{}, {status:'stopped'},false],
  ['inactive variant',{}, {active:false},false],
 ];
 for(const [name,env,seed,enabled] of cases)await t.test(name,async()=>{
  await reset(seed);const r=await render(env);assert.equal(r.status,200);const body=await r.text();assert.equal(body.includes('disabled data-site-disabled="true"'),!enabled);assert.equal(body.includes('ADD TO CART'),enabled);
 });
 for(const status of ['draft','archived'])await t.test(status+' is not purchasable by direct URL',async()=>{await reset({status,published:null});assert.equal((await render()).status,404);});
 await t.test('mapping from another environment is not admitted',async()=>{
  // Production schema allows both environments; bypass the Sandbox table CHECK
  // only in this isolated fixture schema to reproduce an invalid migrated mapping.
  await reset();await db.prepare("UPDATE mg_mappings SET environment='production'").run();
  assert((await (await render()).text()).includes('disabled data-site-disabled="true"'));
 });
 await t.test('inventory response bounds quantity and never revives site-disabled buttons',async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-background-networking']});t.after(()=>browser.close());
  const script=await readFile(new URL('../js/managed-storefront.js',import.meta.url),'utf8');
  for(const [label,seed,patch,n,status] of [['in-stock',{}, {},2,200],['zero',{}, {},0,200],['inventory-error',{}, {},2,503],['OFF',{}, {VALIDATION_CHECKOUT_ENABLED:'0'},5,200],['unmapped',{map:null}, {},5,200],['stopped',{status:'stopped'}, {},5,200]]){
   await reset(seed);const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(8000);let reads=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.pathname==='/js/managed-storefront.js')return route.fulfill({contentType:'application/javascript',body:script});if(u.pathname==='/js/managed-product.js')return route.fulfill({contentType:'application/javascript',body:''});if(u.pathname==='/api/inventory'){reads++;return route.fulfill({status,json:{inventory:[{id:'herb-10g',availableQuantity:n}]}});}if(u.origin!==origin)throw Error('Unexpected external request');const r=await render(patch);return route.fulfill({contentType:'text/html',body:(await r.text()).replace('</head>',`<script>window.YASOYA_STORE_CONFIG={environment:'sandbox',workerBaseUrl:location.origin};</script></head>`)});});
   await page.goto(origin+'/products/herb.html');const button=page.locator('.product-cart-button');
   if(label==='in-stock'){await page.waitForFunction(()=>document.querySelectorAll('select option').length===2&&!document.querySelector('.product-cart-button').disabled);assert.equal(await page.locator('select option').count(),2);}
   else if(['zero','inventory-error'].includes(label)){await page.waitForFunction(()=>document.querySelector('select').disabled||document.querySelector('.product-cart-button').textContent==='在庫確認できません').catch(async e=>{throw Error(label+': '+JSON.stringify({reads,errors})+' '+e.message)});assert(await button.isDisabled());}
   else {assert(await button.isDisabled());assert.equal(reads,0);}
   assert.deepEqual(errors,[],label);await page.close();
  }
 });
});
