import {need} from './domain.js';
import {salesCatalogCheck} from './sales-catalog-check.js';
// Checkout validates the published commercial snapshot, not historical copy/images.
// Successful immutable jobs bind SKU/IDs; inventory/catalog version changes never
// rewrite that identity, and do not require replaying a Square write.
export async function inspectSalesCatalog(manager,mapping,object,variant){
 need(manager.env.RUNTIME_TIER==='staging','ステージング専用です。',403);
 const check=salesCatalogCheck(manager.env,mapping,object,variant);
 const fail=label=>({...check,ok:false,mismatches:[{key:'salesProof',label}],nextAction:'「公開する」で既存IDを維持した公開処理を実行してください。保留処理がある場合は同じ処理を確認・再開してください。'});
 if(check.mismatches.some(m=>m.key!=='version'))return check;
 const job=await manager.s.one("SELECT j.* FROM mg_jobs j JOIN mg_variants v ON v.product_id=j.resource_id WHERE v.id=? AND j.kind='publish' AND j.state='done' AND j.result_json IS NOT NULL ORDER BY j.rowid DESC LIMIT 1",[variant.id]);
 if(!job)return fail('SKUと商品IDを結び付ける完了記録がありません');
 let expected,record;
 try{
  const payload=JSON.parse(job.payload_json),body=JSON.parse(job.body_json),result=JSON.parse(job.result_json);
  const index=payload.data.variants.findIndex(v=>v.id===variant.id),sent=body.batches[0].objects[0];
  need(index>=0&&body.idempotency_key===job.id&&sent.type==='ITEM','記録不足',409);
  expected=sent.item_data.variations[index];record=result.mappings.find(m=>m.variant_id===variant.id);
  need(record&&expected?.item_variation_data?.sku&&record.item_id===mapping.item_id&&record.variation_id===mapping.variation_id&&(sent.id.startsWith('#')||sent.id===record.item_id)&&(expected.id.startsWith('#')||expected.id===record.variation_id),'記録不足',409);
 }catch{return fail('完了記録の固定ID・SKUを確認できません');}
 const item=await manager.square.object(mapping.item_id),d=object?.item_variation_data;
 const present=o=>Boolean((o?.present_at_all_locations||o?.present_at_location_ids?.includes(manager.env.SQUARE_LOCATION_ID))&&!o?.absent_at_location_ids?.includes(manager.env.SQUARE_LOCATION_ID));
 if(mapping.environment!=='sandbox'||mapping.location_id!==manager.env.SQUARE_LOCATION_ID||item?.type!=='ITEM'||item.id!==mapping.item_id||item.is_deleted||item.item_data?.is_archived||!present(item)||object?.type!=='ITEM_VARIATION'||object.id!==mapping.variation_id||object.is_deleted||d?.item_id!==item.id||d?.sku!==expected.item_variation_data.sku||d.sellable===false||!present(object))return fail('固定ID・SKU・削除状態・Location販売設定が一致しません');
 const nested=item.item_data.variations?.find(v=>v.id===object.id);
 if(!nested||nested.version!==object.version||['item_id','sku','name','track_inventory','sellable'].some(k=>nested.item_variation_data?.[k]!==d[k])||nested.item_variation_data?.price_money?.currency!==d.price_money?.currency||Number(nested.item_variation_data?.price_money?.amount)!==Number(d.price_money?.amount))return fail('照合中にSquare商品が更新されました。再度公開状況を確認してください');
 const overrides=d.location_overrides||[];
 if(overrides.some(o=>o.location_id===manager.env.SQUARE_LOCATION_ID&&(o.track_inventory===false||o.price_money&&(o.price_money.currency!=='JPY'||Number(o.price_money.amount)!==variant.unitPrice))))return fail('Location別価格・在庫追跡が一致しません');
 if(![mapping.item_version,mapping.variation_version,record.item_version,record.variation_version,item.version,object.version].every(v=>Number.isSafeInteger(v)&&v>0)||item.version<Math.max(mapping.item_version,record.item_version)||object.version<Math.max(mapping.variation_version,record.variation_version))return fail('商品バージョンの後退または記録不足を検出しました');
 try{await manager.square.assertUniqueSku(object.id,d.sku);}catch{return fail('SKUの一意性を確認できません');}
 return {...check,ok:true,mismatches:[],versionRevalidated:object.version!==mapping.variation_version,proof:{state:'matched',jobId:job.id},nextAction:'公開価格・固定ID・SKU・販売設定を読取照合済み。説明・画像・在庫更新は購入用の対応記録を無効にしません。'};
}
