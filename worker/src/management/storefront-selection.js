import {production,productionGrant} from '../production-policy.js';
import {need,operation,digest,json} from './domain.js';
export const selectionEnabled=env=>env.RUNTIME_TIER==='staging'||production(env)&&env.STOREFRONT_FEATURED_ENABLED==='1';
export const retirementEnabled=env=>env.RUNTIME_TIER==='staging'||env.STOREFRONT_RETIRE_GOLDENROD==='1';
const retiredIds=new Set(['goldenrod','goldenrod-leaf-10g','goldenrod-leaf-stem-20g']);
export function retiredProduct(env,p){
 if(!retirementEnabled(env))return false;
 const data=p.draft||p;
 const name=String(data.name||'').normalize('NFKC').replace(/\s/g,'').toLowerCase();
 return retiredIds.has(p.id)||retiredIds.has(p.slug)||(data.variants||[]).some(v=>retiredIds.has(v.id))||name.includes('セイタカアワダチソウ')||name.includes('goldenrod');
}
export const eligibleProduct=p=>p.status==='published'&&p.variants.some(v=>v.active!==false);
export async function featuredSettings(store){
 const row=await store.one("SELECT id,detail_json FROM mg_audit WHERE resource_id='storefront' AND action='home_featured_saved' ORDER BY rowid DESC LIMIT 1");
 return {version:row?.id||null,productIds:row?JSON.parse(row.detail_json).productIds:[]};
}
export async function featuredProducts(store){
 const settings=await featuredSettings(store),products=await store.publicProducts();
 return settings.productIds.slice(0,3).map(id=>products.find(p=>p.id===id&&eligibleProduct(p))).filter(Boolean);
}
export async function featuredAdmin(manager,method,input,actor){
 need(selectionEnabled(manager.env),'トップページの掲載設定は無効です。',403);if(production(manager.env))productionGrant(manager.env,method==='GET'?'read':'draft');
 const settings=await featuredSettings(manager.s),candidates=(await manager.s.publicProducts()).filter(eligibleProduct);
 if(method==='GET')return {...settings,selectedProductIds:settings.productIds.filter(id=>candidates.some(p=>p.id===id)),candidates:candidates.map(p=>({id:p.id,name:p.name,slug:p.slug}))};
 need(method==='POST','Method not allowed',405);operation(input.operationId);
 need(Array.isArray(input.productIds)&&input.productIds.length<=3&&input.productIds.every(id=>typeof id==='string')&&new Set(input.productIds).size===input.productIds.length,'重複なしで最大3商品を選択してください。');
 const fp=await digest(['home-featured',input.expectedVersion,input.productIds]),previous=await manager.command(input.operationId,fp);if(previous)return previous;
 need(input.expectedVersion===settings.version,'別の画面で掲載設定が更新されました。再読み込みしてください。',409);
 need(input.productIds.every(id=>candidates.some(p=>p.id===id)),'公開済み・販売中の商品だけを掲載できます。設定を読み直してください。',409);
 const audit=manager.s.audit(actor,'home_featured_saved','storefront',{productIds:input.productIds});
 const result={ok:true,version:audit[1][0],productIds:input.productIds};
 await manager.s.batch([audit,['INSERT INTO mg_commands VALUES(?,?,?)',[input.operationId,fp,json(result)]]]);return result;
}
export async function removeFeaturedStatements(store,id,actor){
 if(!selectionEnabled(store.env))return [];
 const settings=await featuredSettings(store);
 return settings.productIds.includes(id)?[store.audit(actor,'home_featured_saved','storefront',{productIds:settings.productIds.filter(n=>n!==id),reason:'product-unavailable'})]:[];
}
