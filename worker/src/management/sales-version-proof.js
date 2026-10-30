import {need} from './domain.js';
import {catalogProof} from './catalog-proof.js';
import {salesCatalogCheck} from './sales-catalog-check.js';
// A version change is a reason to revalidate, never permission to overwrite.
// Only an immutable, completed sync provides the expected Square content.
export async function inspectSalesCatalog(manager,mapping,object,variant){
 need(manager.env.RUNTIME_TIER==='staging','ステージング専用です。',403);
 const check=salesCatalogCheck(manager.env,mapping,object,variant);
 if(check.mismatches.some(m=>m.key!=='version'))return check;
 const job=await manager.s.one("SELECT j.* FROM mg_jobs j JOIN mg_variants v ON v.product_id=j.resource_id WHERE v.id=? AND j.kind='publish' AND j.state='done' AND j.result_json IS NOT NULL ORDER BY j.updated_at DESC,j.id DESC LIMIT 1",[variant.id]);
 if(!job)return check;
 const proof=await catalogProof(manager,job);
 const verified=proof.mappings?.find(m=>m.variant_id===variant.id);
 const valid=proof.state==='matched'&&proof.versionInfo.every(v=>Number.isSafeInteger(v.stored)&&v.current>=v.stored)&&verified?.item_id===mapping.item_id&&verified?.variation_id===mapping.variation_id&&verified?.variation_version===object?.version&&mapping.environment==='sandbox'&&mapping.location_id===manager.env.SQUARE_LOCATION_ID&&Number.isSafeInteger(mapping.item_version)&&Number.isSafeInteger(mapping.variation_version)&&verified.item_version>=mapping.item_version&&verified.variation_version>=mapping.variation_version;
 if(!valid)return {...check,ok:false,mismatches:[...check.mismatches,{key:'contentProof',label:'完了済み同期との照合：'+(proof.checks.filter(c=>!c.ok).map(c=>c.label).join('・')||'ID・バージョン・証跡')}],proof:{state:proof.state,failed:proof.checks.filter(c=>!c.ok).map(c=>c.label)}};
 // Explicitly reject non-sellable/deleted objects and unexpected location overrides.
 const d=object.item_variation_data,overrides=d.location_overrides||[];
 const payload=JSON.parse(job.payload_json),sent=JSON.parse(job.body_json).batches[0].objects[0].item_data.variations[payload.data.variants.findIndex(v=>v.id===variant.id)];
 if(object.type!=='ITEM_VARIATION'||object.is_deleted||d.sellable===false||d.item_id!==mapping.item_id||d.sku!==sent?.item_variation_data?.sku||overrides.some(o=>o.location_id===manager.env.SQUARE_LOCATION_ID&&(o.track_inventory===false||o.price_money&&(o.price_money.currency!=='JPY'||Number(o.price_money.amount)!==variant.unitPrice))))return {...check,ok:false,mismatches:[{key:'salesPolicy',label:'販売状態・Location別価格／在庫設定'}]};
 try{await manager.square.assertUniqueSku(object.id,d.sku);}catch{return {...check,ok:false,mismatches:[{key:'sku',label:'SKUの一意性（未確認を含む）'}]};}
 return {...check,ok:true,mismatches:[],versionRevalidated:object.version!==mapping.variation_version,proof:{state:'matched',jobId:job.id},nextAction:'完了済み同期と現在の商品内容を読取照合済み。Square・D1・在庫への書込みなしで購入できます。'};
}
