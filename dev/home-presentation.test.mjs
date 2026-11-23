import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {readFile} from 'node:fs/promises';
import {detailImageIds,presentationImageUrl} from '../worker/src/management/presentation-images.js';
const top='a'.repeat(64), detail='b'.repeat(64), second='c'.repeat(64);
const product={id:'test-product',slug:'lemonbalm',name:'レモンバーム',status:'published',description:'説明',alt:'植物',images:[detail,top,second],featuredImageId:top,variants:[{id:'lemonbalm-10g',name:'10g',price:980,active:true,maxQuantity:10}]};
test('selecting top artwork excludes only that image from detail; clearing restores original order',()=>{
 assert.deepEqual(detailImageIds(product),[detail,second]);
 assert.deepEqual(product.images,[detail,top,second]);
 assert.deepEqual(detailImageIds({...product,featuredImageId:null}),[detail,top,second]);
 assert.deepEqual(detailImageIds({...product,images:[top]}),[]);
 assert.equal(presentationImageUrl(product),'/api/media/'+top);
 assert.equal(presentationImageUrl({...product,featuredImageId:null}),'/api/media/'+detail);
 assert.equal(presentationImageUrl({...product,slug:'yomogi',featuredImageId:null}),'/api/media/'+detail);
});
const bundle=await build({stdin:{contents:`import {renderV53} from './worker/src/management/v53-render.js';import {Store} from './worker/src/management/store.js';const p=${JSON.stringify(product)};Store.prototype.publicProducts=async()=>[p];Store.prototype.one=async()=>({id:'settings',detail_json:JSON.stringify({productIds:[p.id]})});export default {fetch:renderV53};`,resolveDir:new URL('..',import.meta.url).pathname},bundle:true,write:false,format:'esm',platform:'browser'});
test('real HTMLRewriter home/detail output keeps links/dots and excludes artwork from detail while preserving concise home labels and SEO text',async t=>{
 const mf=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-08-04',outboundService:()=>{throw Error('Network forbidden');},serviceBindings:{ASSETS:async req=>new Response(await readFile(new URL(new URL(req.url).pathname.startsWith('/products/')?'../staging/site/products/lemonbalm.html':'../production/site/index.html',import.meta.url),'utf8'),{headers:{'Content-Type':'text/html'}})}});
 t.after(()=>mf.dispose());
 const home=await (await mf.dispatchFetch('https://example.invalid/')).text();
 assert(home.includes('/api/media/'+top));assert(!home.includes('class="v19-copy"'));assert(home.includes('<h2 class="v19-center-name">レモンバーム</h2>'));assert(home.includes('href="/products/lemonbalm.html"'));assert(home.includes('自然乾燥のハーブティーを届けるオンラインショップ'));
 const html=await (await mf.dispatchFetch('https://example.invalid/products/lemonbalm.html')).text();
 assert(!html.includes('/api/media/'+top));assert(html.includes('/api/media/'+detail));assert(html.includes('/api/media/'+second));assert(!html.includes('class="v30-caption"'));assert(!html.includes('class="v30-current"'));assert.equal((html.match(/data-go="/g)||[]).length,2);assert(html.includes('data-product-id="lemonbalm-10g"'));
});
