import {SANDBOX_CATALOG} from '../../../validation/catalog.js';
import {need} from './domain.js';
import {uploadImage} from './images.js';
const strip=s=>s.replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/[ \t]+/g,' ').trim();
export async function importLegacy(manager,actor){
 need(manager.env.ASSETS&&manager.env.PRODUCT_IMAGES,'Assetsと画像ストレージが必要です。',503);const result=[];
 for(const slug of ['lemonbalm','yomogi','goldenrod']){
  if(await manager.s.product(slug)){result.push({id:slug,state:'exists'});continue;}
  const response=await manager.env.ASSETS.fetch(new Request('https://assets.internal/products/'+slug+'.html'));need(response.ok,'既存の商品HTMLがありません。',409);const html=await response.text();
  const docs=[...html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));const ld=docs.find(d=>['Product','ProductGroup'].includes(d['@type']));need(ld,'商品定義を読み取れません。',409);
  const variants=Object.entries(SANDBOX_CATALOG).filter(([id])=>id.startsWith(slug==='goldenrod'?'goldenrod-leaf-10g':slug+'-')).map(([id,v])=>({id,name:v.name,price:v.price,amount:'10g',maxQuantity:v.maxQuantity,active:true}));need(variants.length===1,'検証対象の商品が一致しません。',409);
  const schema=ld['@type']==='ProductGroup'?ld.hasVariant.find(v=>v.sku===variants[0].id):ld;need(Number(schema?.offers?.price)===variants[0].price&&schema?.offers?.priceCurrency==='JPY','既存価格が一致しません。',409);
  const imagePath=new URL(Array.isArray(ld.image)?ld.image[0]:ld.image,'https://assets.internal').pathname;need(/^\/images\/[a-z0-9_.-]+\.(jpg|png|webp)$/i.test(imagePath),'画像パスが正しくありません。',409);
  const image=await manager.env.ASSETS.fetch(new Request('https://assets.internal'+imagePath));need(image.ok,'既存画像がありません。',409);const mime=imagePath.endsWith('.png')?'image/png':imagePath.endsWith('.webp')?'image/webp':'image/jpeg';
  const saved=await uploadImage(new Request('https://upload.internal/',{method:'POST',headers:{'Content-Type':mime},body:image.body,duplex:'half'}),manager.env);
  const main=html.match(/<p\s+class="product-description"[^>]*>([\s\S]*?)<\/p>/)?.[1]||ld.description||'',data=html.match(/<dl\s+class="product-data"[^>]*>([\s\S]*?)<\/dl>/)?.[1]||'',handling=html.match(/<div\s+class="product-handling-body"[^>]*>([\s\S]*?)<\/div>/)?.[1]||'';
  await manager.save(slug,{operationId:crypto.randomUUID(),expectedVersion:0,slug,name:variants[0].name,description:[strip(main),strip(data),strip(handling)].filter(Boolean).join('\n\n'),alt:variants[0].name,sortOrder:result.length,images:[saved.id],variants},actor);
  result.push({id:slug,state:'draft_imported'});
 }return {products:result};
}
