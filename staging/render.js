import {Store} from '../worker/src/management/store.js';
import {escape} from '../worker/src/management/storefront.js';
const href=p=>'/products/'+p.slug+'.html';
const image=p=>p.images[0]?'/api/media/'+p.images[0]:'';
const img=p=>image(p)?`<img src="${image(p)}" alt="${escape(p.alt)}" loading="lazy">`:'';
const json=x=>JSON.stringify(x).replaceAll('<','\\u003c');
export async function renderV53(request,env){
 const u=new URL(request.url),match=u.pathname.match(/^\/products\/([a-z0-9-]+)\.html$/);
 if(!match&&!['/','/index.html','/products.html'].includes(u.pathname))return null;
 const allProducts=await new Store(env).publicProducts(),products=allProducts.filter(p=>p.status==='published'),p=match?allProducts.find(p=>p.slug===match[1]):null;
 if(match&&!p)return new Response('商品がありません。',{status:404});
 const template=new URL(request.url);if(match)template.pathname='/products/lemonbalm.html';
 const asset=await env.ASSETS.fetch(new Request(template));if(asset.status!==200)return asset;
 let r=new HTMLRewriter();
 if(p){
  const gallery=p.images.map((id,i)=>`<figure class="v30-slide ${i===0?'is-active':''}" data-index="${i}" aria-hidden="${i!==0}"><img src="/api/media/${id}" alt="${escape(p.alt)}"><figcaption class="v30-caption"><span>${i+1}</span></figcaption></figure>`).join('');
  r=r.on('.v30-product',{element:e=>e.setAttribute('class','v30-product v53-managed-product')})
   .on('head',{element:e=>e.append('<link rel="stylesheet" href="/css/managed-product.css">',{html:true})})
   .on('body',{element:e=>e.append('<script src="/js/managed-product.js"></script>',{html:true})})
   .on('title',{element:e=>e.setInnerContent(p.name+'｜八草屋本店')})
   .on('meta[name="description"]',{element:e=>e.setAttribute('content',p.description.replace(/<[^>]*>/g,'').slice(0,160))})
   .on('link[rel="canonical"]',{element:e=>e.setAttribute('href',u.origin+href(p))})
   .on('script[type="application/ld+json"]',{element:e=>e.setInnerContent(json({'@context':'https://schema.org','@type':'Product',name:p.name,description:p.description,url:u.origin+href(p)}),{html:true})})
   .on('.v30-slide',{element:e=>e.remove()})
   .on('.v30-gallery',{element:e=>e.prepend(gallery,{html:true})})
   .on('.v30-top h1',{element:e=>e.setInnerContent(p.name)})
   .on('.v30-current',{element:e=>e.setInnerContent('1')})
   .on('.v30-dots',{element:e=>e.setInnerContent(p.images.map((_,i)=>`<button type="button" data-go="${i}" aria-label="画像${i+1}" aria-current="${i===0}"></button>`).join(''),{html:true})})
   .on('.v30-purchase',{element:e=>e.setInnerContent(p.variants.map(v=>{
    const available=p.status==='published'&&v.active&&p.checkoutVariantIds?.includes(v.id);
    return `<div class="v53-variant-purchase"><div class="v30-product-line"><div><span class="v30-overline">JAPANESE BOTANICALS${v.amount?' · '+escape(v.amount):''}</span><strong>${escape(p.name)}${p.variants.length>1?' / '+escape(v.name):''}</strong></div><span class="v30-price">¥${v.price.toLocaleString('ja-JP')}<small> 税込</small></span></div><div class="v30-cart-row"><label class="v30-qty">数量<select class="product-quantity" id="qty-${escape(v.id)}" name="quantity">${Array.from({length:v.maxQuantity??10},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('')}</select></label><button type="button" data-add-to-cart data-quantity-selector="#qty-${escape(v.id)}" class="product-cart-button v30-cart-button" data-product-id="${escape(v.id)}" data-product-name="${escape(p.name+' '+(v.amount||''))}" data-product-price="${v.price}" ${available?'':'disabled data-site-disabled="true"'}>${available?'ADD TO CART <span>↗</span>':p.status!=='published'||!v.active?'販売停止':'購入準備中'}</button></div></div>`;
   }).join(''),{html:true})})
   .on('.v30-below',{element:e=>e.setInnerContent(`<div><span>ABOUT</span><p style="white-space:pre-line">${escape(p.description)}</p></div>`,{html:true})});
 }else{
  const scenes=products.map((p,i)=>`<div class="v33-scene ${i===0?'is-active':''}" aria-hidden="${i!==0}" data-product-href="${href(p)}">${img(p)}<div class="v33-scene-shade"></div><div class="v33-scene-label"><span class="v33-kicker">BOTANICALS</span><h1>${escape(p.name)}</h1><p>${p.status==='stopped'?'販売停止':'¥'+Math.min(...p.variants.map(v=>v.price))}</p></div></div>`).join('');
  r=r.on('.v33-images',{element:e=>e.setInnerContent(scenes||'<p>公開中の商品はありません。</p>',{html:true})})
   .on('script[type="application/ld+json"]',{element:e=>e.setInnerContent(json({'@context':'https://schema.org','@type':'ItemList',itemListElement:products.map((p,i)=>({'@type':'ListItem',position:i+1,url:u.origin+href(p),name:p.name}))}),{html:true})})
   .on('.v33-rail',{element:e=>e.setInnerContent(products.map((p,i)=>`<button class="v33-tile ${i===0?'is-active':''}" type="button" role="tab" data-index="${i}" aria-selected="${i===0}"><span>${escape(p.name)}</span></button>`).join(''),{html:true})})
   .on('.v34-view',{element:e=>{if(products[0])e.setAttribute('href',href(products[0]));else e.remove();}})
   .on('.v35-all-grid',{element:e=>e.setInnerContent(products.map(p=>`<a class="v35-all-card" href="${href(p)}"><div class="v35-all-image">${img(p)}</div><span class="v35-all-en">${escape(p.name)}</span><span class="v35-all-jp">${escape(p.description.slice(0,80))}</span><span class="v35-all-link">VIEW BOTANICAL ↗</span></a>`).join(''),{html:true})})
   .on('#botanicalTrack',{element:e=>e.setInnerContent(products.map(p=>`<article class="v19-slide">${img(p)}<div class="v19-copy"><span class="v21-eyebrow">BOTANICALS</span><h2>${escape(p.name)}</h2></div><a class="v39-botanical-link" aria-label="${escape(p.name)}" href="${href(p)}"></a></article>`).join('')||'<p>公開中の商品はありません。</p>',{html:true})});
 }
 r=r.on('meta[property="og:url"]',{element:e=>e.setAttribute('content',u.href)})
  .on('link[rel="canonical"]',{element:e=>e.setAttribute('href',u.href)})
  .on('body',{element:e=>e.append('<script src="/js/managed-storefront.js"></script>',{html:true})});
 return r.transform(asset);
}
