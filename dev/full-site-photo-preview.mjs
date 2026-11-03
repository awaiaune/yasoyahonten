// Read-only full-design preview driven by the already-running local management server.
// No Square, Cloudflare, credentials, D1, or R2 writes; local catalog and media are GET-only.
import {createServer} from 'node:http';
import {readFile,realpath} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const site=path.resolve(fileURLToPath(new URL('../staging/site/',import.meta.url)));
const local='http://127.0.0.1:8000';
const port=8790;
const types={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'application/javascript; charset=utf-8',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',svg:'image/svg+xml',woff2:'font/woff2',ico:'image/x-icon'};
const config='window.YASOYA_STORE_CONFIG=Object.freeze({environment:"preview",workerBaseUrl:location.origin,currency:"JPY"});';
function htmlSafeJson(x){return JSON.stringify(x).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');}
function deny(res,status=403,msg='閲覧専用プレビューです。購入や管理操作は利用できません。'){res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(msg);}
async function getCatalog(){
 const ctl=new AbortController();
 const timeout=setTimeout(()=>ctl.abort(),5000);
 try{
  const r=await fetch(local+'/api/catalog',{signal:ctl.signal,redirect:'error'});
  if(!r.ok)throw Error('ローカルの商品一覧が取得できません（HTTP '+r.status+'）。');
  const body=await r.json();
  if(!Array.isArray(body.products))throw Error('ローカル商品データの形式が異なります。');
  return body.products;
 }finally{clearTimeout(timeout);}
}
function mount(products){
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const all=(Array.isArray(products)?products:[]).filter(p=>p&&p.status==='published');
 // Production has retired goldenrod; local --seed fixtures may still contain it.
 // This preview excludes its old fixture rather than displaying a retired product.
 const published=all.filter(p=>!/^goldenrod(?:-|$)/.test(p.slug||''));
 const gallery=p=>Array.isArray(p.images)?p.images:[];
 const botanicalId=p=>gallery(p).includes(p.featuredImageId)?p.featuredImageId:gallery(p)[0];
 const photo=p=>botanicalId(p)?'/api/media/'+botanicalId(p):'/images/'+p.slug+'.jpg';
 const image=p=>'<img src="'+esc(photo(p))+'" alt="'+esc(p.alt||p.name)+'" loading="lazy">';
 const href=p=>'/products/'+encodeURIComponent(p.slug)+'.html';
 const home=document.getElementById('botanicalTrack');
 if(home){
  const features=published.slice(0,3);
  home.innerHTML=features.map((p,i)=>'<article class="v19-slide" aria-label="'+esc(p.name)+'">'+image(p)+'<div class="v19-copy"><span class="v21-eyebrow">JAPANESE BOTANICALS</span><h2>'+esc(p.name)+'</h2><span class="v21-detail">THE PLANT · NATURAL FORM</span></div><a aria-label="'+esc(p.name)+'の商品詳細を見る" class="v39-botanical-link" href="'+href(p)+'"></a></article>').join('');
  const bar=document.querySelector('.v19-progress');
  if(bar)bar.innerHTML=features.map((_,i)=>'<span'+(i===0?' class="active"':'')+'></span>').join('');
 }
 const shop=document.querySelector('.v33-shop');
 if(shop){
  const scenes=shop.querySelector('.v33-images');
  if(scenes)scenes.innerHTML=published.map((p,i)=>'<div class="v33-scene'+(i===0?' is-active':'')+'" aria-hidden="'+(i!==0)+'" data-product-href="'+href(p)+'">'+image(p)+'<div class="v33-scene-shade"></div><div class="v33-scene-label"><span class="v33-kicker">BOTANICALS</span><h1>'+esc(p.name)+'</h1></div></div>').join('')||'<p>公開中の商品はありません。</p>';
  const rail=shop.querySelector('.v33-rail');
  if(rail)rail.innerHTML=published.map((p,i)=>'<button class="v33-tile'+(i===0?' is-active':'')+'" type="button" role="tab" data-index="'+i+'" aria-selected="'+(i===0)+'"><span>'+esc(p.name)+'</span></button>').join('');
  const view=shop.querySelector('.v34-view');
  if(view){if(published[0])view.href=href(published[0]);else view.remove();}
  const grid=document.querySelector('.v35-all-grid');
  if(grid)grid.innerHTML=published.map(p=>'<a class="v35-all-card" href="'+href(p)+'"><div class="v35-all-image">'+image(p)+'</div><span class="v35-all-en">'+esc(p.name)+'</span><span class="v35-all-jp">'+esc((p.description||'').slice(0,80))+'</span><span class="v35-all-link">VIEW BOTANICAL ↗</span></a>').join('');
 }
 const slug=decodeURIComponent(location.pathname.match(/^\/products\/([a-z0-9-]+)\.html$/)?.[1]||'');
 if(slug){
  const p=published.find(x=>x.slug===slug);
  if(p){
   const g=document.querySelector('.v30-gallery');
   if(g){
    g.querySelectorAll('.v30-slide').forEach(el=>el.remove());
    g.insertAdjacentHTML('afterbegin',gallery(p).map((id,i)=>'<figure class="v30-slide'+(i===0?' is-active':'')+'" data-index="'+i+'" aria-hidden="'+(i!==0)+'"><img src="/api/media/'+esc(id)+'" alt="'+esc(p.alt||p.name)+'"><figcaption class="v30-caption"><span>'+String(i+1)+'</span></figcaption></figure>').join(''));
    const dots=g.querySelector('.v30-dots');
    if(dots)dots.innerHTML=gallery(p).map((_,i)=>'<button type="button" data-go="'+i+'" aria-label="写真'+(i+1)+'" aria-current="'+(i===0)+'"></button>').join('');
    const current=g.querySelector('.v30-current');if(current)current.textContent='1';
   }
   const title=document.querySelector('.v30-top h1');if(title)title.textContent=p.name;
   const line=document.querySelector('.v30-product-line strong');if(line)line.textContent=p.name;
   const price=document.querySelector('.v30-price');if(price)price.textContent='¥'+Math.min(...p.variants.map(v=>v.price)).toLocaleString('ja-JP');
   document.title=p.name+' | 八草屋本店（表示確認）';
  }
  document.querySelectorAll('[data-add-to-cart],.product-cart-button').forEach(btn=>{btn.disabled=true;btn.removeAttribute('data-add-to-cart');btn.textContent='表示確認のみ';});
 }
 const badge=document.createElement('div');
 badge.textContent='LOCAL PREVIEW · 購入不可';
 badge.style.cssText='position:fixed;z-index:300;left:12px;bottom:12px;padding:7px 10px;border-radius:3px;background:rgba(252,251,248,.92);color:#303730;font:10px sans-serif;letter-spacing:.05em;pointer-events:none;box-shadow:0 1px 8px #0002';
 document.body.append(badge);
}
function addData(html,products){
 const init='('+mount.toString()+')('+htmlSafeJson(products)+');';
 // The inline mount runs after the DOM is parsed but before existing deferred
 // gallery handlers, so the original swipe and fade scripts bind to real photos.
 html=html.replace('</body>','<script>'+init+'</script></body>');
 // No original cart, order, checkout or inventory script runs in visual preview.
 html=html.replace(/<script\b[^>]*src=["'][^"']*(?:cart|checkout|inventory|store-config|managed-storefront|products-inventory|\/script\.js)[^"']*["'][^>]*>\s*<\/script>/gi,'');
 html=html.replace('</head>','<meta name="robots" content="noindex,nofollow"></head>');
 return html;
}
function safePath(raw){
 let p=decodeURIComponent(new URL(raw,'http://preview.local').pathname);
 if(p==='/'||p==='')p='/index.html';
 if(!/^\/[a-zA-Z0-9_./-]+$/.test(p)||p.split('/').some(s=>s==='..'||s.startsWith('.')))return null;
 return p;
}
function patchedScript(file,content){
 if(!/\/shop-gallery-v3[34]\.js$/.test(file))return content;
 return content.replace(/const (links|urls)=\['products\/lemonbalm\.html','products\/yomogi\.html','products\/goldenrod\.html'\];/,
  (m,v)=>v==='links'?'const links=scenes.map(s=>s.dataset.productHref);':'const urls=[...root.querySelectorAll(".v33-scene")].map(s=>s.dataset.productHref);');
}
const server=createServer(async(req,res)=>{
 if(!['GET','HEAD'].includes(req.method))return deny(res,405,'表示確認専用のため書き込みはできません。');
 const p=safePath(req.url);
 if(!p)return deny(res,404,'Not found');
 if(p==='/js/store-config.js'){
  res.writeHead(200,{'Content-Type':types.js,'Cache-Control':'no-store'});return res.end(req.method==='HEAD'?undefined:config);
 }
 if(p==='/api/catalog'||/^\/api\/media\/[a-f0-9]{64}$/.test(p)){
  try{
   const u=local+p;
   const r=await fetch(u,{method:req.method,redirect:'error'});
   res.writeHead(r.status,{'Content-Type':r.headers.get('content-type')||'application/octet-stream','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'});
   return res.end(req.method==='HEAD'?undefined:Buffer.from(await r.arrayBuffer()));
  }catch{return deny(res,503,'ローカル管理画面（ポート8000）に接続できません。');}
 }
 if(p.startsWith('/api/')||p.startsWith('/admin')||p.includes('checkout')||p.includes('thanks'))return deny(res);
 let file=path.resolve(site,'.'+p);
 let isDetail=false;
 if(/^\/products\/[a-z0-9-]+\.html$/.test(p)){
  isDetail=true;
  try{await realpath(file)}catch{file=path.resolve(site,'products/lemonbalm.html');}
 }
 try{
  const actual=await realpath(file);
  if(!actual.startsWith(site+path.sep))return deny(res,404,'Not found');
  let bytes=await readFile(actual);
  let type=types[actual.split('.').at(-1)]||'application/octet-stream';
  if(type.startsWith('text/html')&&(p==='/index.html'||p==='/products.html'||isDetail)){
   const products=await getCatalog();
   bytes=Buffer.from(addData(bytes.toString('utf8'),products),'utf8');
  }else if(type.startsWith('application/javascript'))bytes=Buffer.from(patchedScript(p,bytes.toString('utf8')),'utf8');
  res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'});
  return res.end(req.method==='HEAD'?undefined:bytes);
 }catch(e){
  return deny(res,503,'プレビューの表示に失敗しました。ポート8000の管理画面が起動中か確認してください。 '+String(e.message||''));
 }
});
server.listen(port,'0.0.0.0',()=>console.log('Local visual preview: http://localhost:'+port+'/  (PORTS '+port+', keep Private; purchases blocked)'));
