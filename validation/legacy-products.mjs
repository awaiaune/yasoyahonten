// Read-only importer for existing public product definitions. No API or credentials.
import {readFile} from 'node:fs/promises';
import {productPlan} from './seed-square.mjs';
const strip=s=>s.replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/[ \t]+/g,' ').trim();
export async function legacyProducts(){
 const plan=await productPlan();const result=[];
 for(const g of plan.groups){const html=await readFile(new URL('../products/'+g.key+'.html',import.meta.url),'utf8');const docs=[...html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));const ld=docs.find(d=>['Product','ProductGroup'].includes(d['@type']));
 const main=html.match(/<p\s+class="product-description"[^>]*>([\s\S]*?)<\/p>/)?.[1]||ld.description||'';
 const handling=html.match(/<div\s+class="product-handling-body"[^>]*>([\s\S]*?)<\/div>/)?.[1]||'';
 const data=html.match(/<dl\s+class="product-data"[^>]*>([\s\S]*?)<\/dl>/)?.[1]||'';
 const image=new URL(Array.isArray(ld.image)?ld.image[0]:ld.image,'https://example.invalid').pathname;
 if(!/^\/images\/[a-z0-9_.-]+\.(jpg|png|webp)$/i.test(image))throw Error('Unexpected legacy image path');
 result.push({id:g.key,slug:g.key,name:g.name,description:[strip(main),strip(data),strip(handling)].filter(Boolean).join('\n\n'),alt:g.name,sortOrder:result.length,images:[],imagePath:image,variants:g.variations.map(v=>({id:v.id,name:v.name,price:v.price,amount:'10g',maxQuantity:10,active:true}))});
 }return result;
}
