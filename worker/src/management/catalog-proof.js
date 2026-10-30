import {need} from './domain.js';
// Evidence is collected afresh from immutable job data and Square GETs only.
export async function catalogProof(manager,job){
 need(manager.env.RUNTIME_TIER==='staging','ステージング専用です。',403);
 const checks=[],versionInfo=[];let mappings=[];
 const check=(label,ok)=>{checks.push({label,ok:Boolean(ok)});};
 try{
  need(['publish','state'].includes(job.kind)&&job.body_json,'保存済み商品リクエストがありません。',409);
  const body=JSON.parse(job.body_json),payload=JSON.parse(job.payload_json),sent=body.batches?.[0]?.objects?.[0];
  need(body.idempotency_key===job.id&&body.batches.length===1&&body.batches[0].objects.length===1&&sent?.type==='ITEM','保存済みリクエストの証跡が不完全です。',409);
  const known=job.result_json?JSON.parse(job.result_json).mappings:payload.maps;
  const item=known?.length?await manager.square.object(known[0].item_id):sent.id.startsWith('#')?await manager.square.findCreatedItem(body):await manager.square.object(sent.id);
  check('削除状態',!item?.is_deleted&&(item?.item_data?.variations||[]).every(v=>!v.is_deleted));
  check('商品ID',sent.id.startsWith('#')||item?.id===sent.id);
  check('商品名',item?.item_data?.name===sent.item_data.name);
  check('説明',(item?.item_data?.description||'')===(sent.item_data.description||''));
  check('画像',JSON.stringify(item?.item_data?.image_ids||[])===JSON.stringify(sent.item_data.image_ids||[]));
  versionInfo.push({type:'Item',stored:known?.[0]?.item_version??null,requested:sent.version??null,current:item?.version??null});
  for(const desired of sent.item_data.variations||[]){
   const candidates=(item?.item_data?.variations||[]).filter(v=>v.item_variation_data?.sku===desired.item_variation_data?.sku);
   check('SKUの一意性',candidates.length===1);const current=candidates.length===1?candidates[0]:null;
   check('Variation ID・親子関係',Boolean(current)&&current.item_variation_data.item_id===item.id&&(desired.id.startsWith('#')||current.id===desired.id));
   check('Variation名・価格・在庫追跡',Boolean(current)&&current.item_variation_data.name===desired.item_variation_data.name&&current.item_variation_data.price_money?.currency===desired.item_variation_data.price_money?.currency&&Number(current.item_variation_data.price_money?.amount)===Number(desired.item_variation_data.price_money?.amount)&&current.item_variation_data.track_inventory===desired.item_variation_data.track_inventory);
   const old=known?.find(m=>m.variation_id===current?.id);
   versionInfo.push({type:'Variation',stored:old?.variation_version??null,requested:desired.version??null,current:current?.version??null});
  }
  check('バージョンの有効性',versionInfo.every(v=>Number.isSafeInteger(v.current)&&v.current>0&&(v.requested===null||Number.isSafeInteger(v.requested)&&v.current>=v.requested)));
  check('送信後のバージョン更新',versionInfo.every(v=>v.requested===null||v.current>v.requested));
  // Reuse the strict price/SKU/location/image/sales checks used after upsert.
  try{
   mappings=manager.square.verifyCatalog(item,payload.data,sent.item_data.image_ids,payload.targetStatus,sent.item_data.variations);
   check('商品内容・Location・販売状態',true);
   check('既存IDの維持',(known||[]).every(old=>mappings.some(m=>m.variation_id===old.variation_id&&m.item_id===old.item_id)));
  }catch{check('商品内容・Location・販売状態',false);}
  const present=o=>Boolean((o?.present_at_all_locations||o?.present_at_location_ids?.includes(manager.env.SQUARE_LOCATION_ID))&&!o?.absent_at_location_ids?.includes(manager.env.SQUARE_LOCATION_ID));
  const adoptionMappings=[];
  // Cancellation is safe only when every original optimistic version is fenced
  // by a strictly newer version on the exact same existing objects. No creates.
  const adoptionAvailable=job.kind==='publish'&&job.state==='review'&&known?.length===sent.item_data.variations.length&&item?.item_data?.variations?.length===sent.item_data.variations.length&&!sent.id.startsWith('#')&&item?.id===sent.id&&!item.is_deleted&&!item.item_data.is_archived&&present(item)&&Number.isSafeInteger(sent.version)&&Number.isSafeInteger(item.version)&&item.version>sent.version&&sent.item_data.variations.every(desired=>{
   const current=item.item_data.variations.find(v=>v.id===desired.id),d=current?.item_variation_data,old=known.find(m=>m.variation_id===desired.id&&m.item_id===item.id);
   const safe=old&&!desired.id.startsWith('#')&&d?.item_id===item.id&&d.sku===desired.item_variation_data.sku&&d.track_inventory===true&&d.price_money?.currency==='JPY'&&Number.isSafeInteger(Number(d.price_money.amount))&&Number(d.price_money.amount)>0&&!current.is_deleted&&d.sellable!==false&&present(current)&&Number.isSafeInteger(desired.version)&&Number.isSafeInteger(current.version)&&current.version>desired.version;
   if(safe)adoptionMappings.push({...old,item_version:item.version,variation_version:current.version});return Boolean(safe);
  });
  const matched=checks.length>0&&checks.every(c=>c.ok);
  return {state:matched?'matched':'mismatch',checks,versionInfo,message:matched?'保存済みリクエストと現在の商品状態が一致しています。再送せず照合完了を記録できます。':'保存済みリクエストと現在値に不一致があります。完了扱い・ロック解除・再送は行いません。',mappings:matched?mappings:[],adoption:{available:Boolean(adoptionAvailable),reason:adoptionAvailable?'元の更新対象すべてのバージョンが進んでおり、旧リクエストは再適用できません。現在値を採用して旧同期を取消できます。':'未確定処理の安全な取消条件を満たしていません。ロックを保持します。'},adoptionMappings:adoptionAvailable?adoptionMappings:[]};
 }catch(error){return {state:'unavailable',checks,versionInfo,message:error.status?error.message:'読み取り照合を完了できません。ロックを保持しています。',mappings:[],httpStatus:error.upstreamStatus||null,squareCode:error.squareCode||null};}
}
