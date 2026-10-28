import { Store } from './store.js';
export const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeJson=x=>JSON.stringify(x).replaceAll('<','\\u003c');
function image(p){return p.images[0]?'/api/media/'+p.images[0]:'';}
function cards(products){return products.map(p=>`<a class="product-card" href="/products/${escape(p.slug)}.html">${image(p)?`<div class="product-image"><img loading="lazy" src="${image(p)}" alt="${escape(p.alt)}"></div>`:''}<div class="product-info"><h3>${escape(p.name)}</h3><p>${escape(p.description.slice(0,100))}</p><p>¥${Math.min(...p.variants.map(v=>v.price))||0}</p><p>${p.status==='stopped'?'販売停止':'販売中'}</p></div></a>`).join('');}
function content(p){return `<div class="product-detail-inner"><h1>${escape(p.name)}</h1><div class="product-main-image">${p.images.map(id=>`<img src="/api/media/${id}" alt="${escape(p.alt)}">`).join('')}</div><div class="product-information"><h2>${escape(p.name)}</h2><p class="product-description" style="white-space:pre-line">${escape(p.description)}</p><div class="product-data">${p.variants.map(v=>`<p>${escape(v.name)} ${escape(v.amount)} ¥${v.price.toLocaleString('ja-JP')}</p>`).join('')}</div>${p.variants.filter(v=>v.active).map(v=>`<div class="product-cart-area"><label>数量<select class="product-quantity">${Array.from({length:Math.min(v.maxQuantity,10)},(_,i)=>`<option>${i+1}</option>`).join('')}</select></label><button class="product-cart-button" data-product-id="${escape(v.id)}" data-product-name="${escape(v.name)}" data-product-price="${v.price}" ${p.status!=='published'?'disabled':''}>${p.status==='published'?'カートに入れる':'販売停止'}</button></div>`).join('')}</div></div>`;}
export async function renderPage(request,env){
 const url=new URL(request.url),s=new Store(env);const products=await s.publicProducts();const match=url.pathname.match(/^\/products\/([a-z0-9-]+)\.html$/);
 if(!match&&!['/','/index.html','/products.html'].includes(url.pathname))return null;
 const p=match?products.find(p=>p.slug===match[1]):null;if(match&&!p)return new Response('商品がありません。',{status:404});
 if(!env.ASSETS)return null;
 const template=new URL(request.url);if(match)template.pathname='/products/lemonbalm.html';
 const asset=await env.ASSETS.fetch(new Request(template,{method:'GET'}));if(!asset.ok)return asset;
 let rewriter=new HTMLRewriter();
 if(p){
  const title=p.name+'｜八草屋本店',canonical=url.origin+'/products/'+p.slug+'.html';
  const data={'@context':'https://schema.org','@type':'ProductGroup',name:p.name,description:p.description,url:canonical,productGroupID:p.id,image:p.images.map(i=>url.origin+'/api/media/'+i),hasVariant:p.variants.filter(v=>v.active).map(v=>({'@type':'Product',name:v.name,sku:v.id,offers:{'@type':'Offer',price:v.price,priceCurrency:'JPY',url:canonical,...(p.status==='published'?{}:{availability:'https://schema.org/OutOfStock'})}}))};
  rewriter=rewriter.on('title',{element:e=>e.setInnerContent(escape(title),{html:true})}).on('meta[name="description"]',{element:e=>e.setAttribute('content',p.description.replace(/<[^>]*>/g,'').slice(0,160))}).on('link[rel="canonical"]',{element:e=>e.setAttribute('href',canonical)}).on('script[type="application/ld+json"]',{element:e=>e.setInnerContent(safeJson(data),{html:true})}).on('.product-detail',{element:e=>e.setInnerContent(content(p),{html:true})}).on('.product-handling',{element:e=>e.remove()}).on('script[src$="inventory.js"]',{element:e=>e.remove()});
 }else rewriter=rewriter.on('.product-list',{element:e=>e.setInnerContent(cards(products),{html:true})}).on('.editorial-products-count',{element:e=>e.setInnerContent(String(products.length)+' PRODUCTS')}).on('script[type="application/ld+json"]',{element:e=>e.setInnerContent(safeJson({'@context':'https://schema.org','@type':'ItemList',itemListElement:products.map((p,i)=>({'@type':'ListItem',position:i+1,url:url.origin+'/products/'+p.slug+'.html',name:p.name}))}),{html:true})});
 const response=rewriter.transform(asset);const headers=new Headers(response.headers);headers.set('Cache-Control','no-store');headers.set('X-Content-Type-Options','nosniff');
 // Product pages use existing cart CSS/JS; refresh each variant's stock via the managed script.
 const html=await response.text();return new Response(html.replace('</body>','<script src="/js/managed-storefront.js"></script></body>'),{headers});
}
