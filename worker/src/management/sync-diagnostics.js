import {catalogProof} from './catalog-proof.js';
import {need} from './domain.js';
export async function inspectSync(manager,id){
 need(manager.env.RUNTIME_TIER==='staging','ステージング専用の診断です。',403);
 const p=await manager.s.product(id);need(p,'商品がありません。',404);
 const locks=await manager.s.locked(p.draft.variants.map(v=>v.id));
 const jobs=[];for(const jobId of new Set(locks.map(l=>l.job_id))){
  const row=await manager.s.one('SELECT * FROM mg_jobs WHERE id=?',[jobId]);
  jobs.push(row?{...await manager.job(jobId),hasSavedRequest:Boolean(row.body_json),hasSuccessEvidence:Boolean(row.result_json),nextAction:row.state==='done'?'成功証跡を確認して残存ロックを解除':row.state==='review'?'新規同期・再送をせず、同期結果を読み取り照合':row.state==='retry'?'新規操作を作らず、同じジョブの結果・再試行期限を確認':'実行結果を待つ。長時間変化しない場合は同期一覧を確認'}:{id:jobId,state:'missing',nextAction:'処理記録がないため自動解除できません。ロックを保持して個別確認'});
 }
 const report={productId:id,checkedAt:new Date().toISOString(),connection:{ok:false},jobs,variants:[],inventory:null};
 try{
  const locations=await manager.square.request('/v2/locations');const location=locations.locations?.find(l=>l.id===manager.env.SQUARE_LOCATION_ID);
  report.connection={ok:true,locationFound:Boolean(location),locationActive:location?.status==='ACTIVE',currency:location?.currency||null};
 }catch(error){report.connection={ok:false,httpStatus:error.upstreamStatus||null,squareCode:error.squareCode||null,nextAction:error.upstreamStatus===401?'Sandbox Access Tokenの有効性をSquare側で確認':error.upstreamStatus===403?'SandboxトークンのMERCHANT_PROFILE_READ権限を確認':'接続結果を確認。新規同期や在庫更新は行わない'};return report;}
 const maps=await manager.s.all('SELECT m.* FROM mg_mappings m JOIN mg_variants v ON v.id=m.variant_id WHERE v.product_id=?',[id]);
 const skuCounts=new Map(),seenCursors=new Set();let cursor,skuComplete=false;
 try{for(let page=0;page<100;page++){
  const data=await manager.square.request('/v2/catalog/list?types=ITEM_VARIATION'+(cursor?'&cursor='+encodeURIComponent(cursor):''));
  for(const o of data.objects||[])if(!o.is_deleted&&o.item_variation_data?.sku){const sku=o.item_variation_data.sku;skuCounts.set(sku,(skuCounts.get(sku)||0)+1);}
  if(!data.cursor){skuComplete=true;break;}if(typeof data.cursor!=='string'||seenCursors.has(data.cursor))break;seenCursors.add(data.cursor);cursor=data.cursor;
 }}catch{ /* A partial list must never establish SKU uniqueness. */ }
 report.skuCheck={complete:skuComplete};
 for(const job of jobs)if(['publish','state'].includes(job.kind)&&job.hasSavedRequest){const row=await manager.s.one('SELECT * FROM mg_jobs WHERE id=?',[job.id]);const {mappings,adoptionMappings,...proof}=await catalogProof(manager,row);job.proof=proof;job.nextAction=proof.state==='matched'?'再送せず照合完了を記録':proof.message;}
 const discovered=[];
 if(!maps.length)for(const job of jobs)if(job.hasSavedRequest){
  const row=await manager.s.one('SELECT body_json,payload_json FROM mg_jobs WHERE id=?',[job.id]);
  try{const body=JSON.parse(row.body_json),payload=JSON.parse(row.payload_json),item=await manager.square.findCreatedItem(body);
   for(const v of payload.data?.variants||[]){const sent=body.batches[0].objects[0].item_data.variations.find(o=>o.item_variation_data.sku===v.id),objects=item.item_data.variations.filter(o=>o.item_variation_data?.sku===sent?.item_variation_data.sku);
    if(objects.length===1)discovered.push({variant_id:v.id,item_id:item.id,variation_id:objects[0].id,environment:'sandbox',location_id:manager.env.SQUARE_LOCATION_ID});}
  }catch(error){report.discovery={complete:false,reason:error.status?error.message:'作成済みItemの読み取り照合に失敗しました。',nextAction:'再送やロック解除をせず、この診断結果で個別確認'};}
 }
 for(const v of p.draft.variants){const stored=maps.find(m=>m.variant_id===v.id),m=stored||discovered.find(m=>m.variant_id===v.id);
  if(!m){report.variants.push({variantId:v.id,mapped:false,nextAction:locks.length?'既存ジョブを読み取り照合し、作成済みItemを確認':'未連携。新規同期の前に既存ジョブ・SKU重複を確認'});continue;}
  try{
   const object=await manager.square.object(m.variation_id),item=await manager.square.object(m.item_id),d=object?.item_variation_data;
   const overrides=d?.location_overrides?.find(o=>o.location_id===manager.env.SQUARE_LOCATION_ID);
   const present=o=>Boolean((o?.present_at_all_locations||o?.present_at_location_ids?.includes(manager.env.SQUARE_LOCATION_ID))&&!o?.absent_at_location_ids?.includes(manager.env.SQUARE_LOCATION_ID));
   report.variants.push({variantId:v.id,mapped:Boolean(stored),discovered:!stored,itemId:m.item_id,variationId:m.variation_id,sku:d?.sku||null,checks:{sandbox:m.environment==='sandbox',location:m.location_id===manager.env.SQUARE_LOCATION_ID,itemId:item?.id===m.item_id,variationId:object?.id===m.variation_id,parent:d?.item_id===m.item_id,skuPresent:Boolean(d?.sku),skuUnique:skuComplete?skuCounts.get(d?.sku)===1:null,notDeleted:!object?.is_deleted&&!item?.is_deleted,name:d?.name===v.name,price:d?.price_money?.currency==='JPY'&&Number(d.price_money.amount)===v.price,tracking:(overrides?.track_inventory??d?.track_inventory)===true,sellable:d?.sellable!==false,present:present(item)&&present(object),catalogVersion:Number.isSafeInteger(m.item_version)&&Number.isSafeInteger(m.variation_version)?object?.version===m.variation_version&&item?.version===m.item_version:null},versions:{item:{stored:m.item_version??null,current:item?.version??null},variation:{stored:m.variation_version??null,current:object?.version??null},reason:!Number.isSafeInteger(m.item_version)||!Number.isSafeInteger(m.variation_version)?'ローカル未記録（同期失敗とは判定しません）':object?.version!==m.variation_version||item?.version!==m.item_version?'Square現在値が保存済み対応表と異なります。保存済みリクエストの内容照合で判定します。':'保存済み対応表と一致'},expected:{name:v.name,price:v.price,currency:'JPY',tracking:true},actual:{name:d?.name||null,price:d?.price_money?.amount??null,currency:d?.price_money?.currency||null,tracking:overrides?.track_inventory??d?.track_inventory??null}});
  }catch(error){report.variants.push({variantId:v.id,mapped:Boolean(stored),discovered:!stored,itemId:m.item_id,variationId:m.variation_id,httpStatus:error.upstreamStatus||null,squareCode:error.squareCode||null,nextAction:'IDまたはITEMS_READ権限を確認。既存対応表は変更しない'});}
 }
 try{const inventoryMaps=[...maps,...discovered];const counts=await manager.square.count(inventoryMaps.map(m=>m.variation_id));report.inventory=inventoryMaps.map(m=>({variantId:m.variant_id,quantity:counts.get(m.variation_id)??null}));}catch(error){report.inventory={available:false,httpStatus:error.upstreamStatus||null,squareCode:error.squareCode||null,nextAction:error.upstreamStatus===403?'INVENTORY_READ権限を確認':'在庫は未確認です。0件として扱わず接続結果を確認'};}
 return report;
}
