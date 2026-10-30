import {retiredProduct} from './storefront-selection.js';
import {need,now,operation} from './domain.js';
import {catalogProof} from './catalog-proof.js';
// These statements are committed atomically with mappings, done state and locks.
export function releaseStatements(manager,job,payload){
 if(manager.env.RUNTIME_TIER!=='staging'||!payload.releaseSite)return [];
 return [
  ["UPDATE mg_products SET published_revision=?,status=CASE WHEN status IN ('stopped','archived') AND version>? THEN status ELSE 'published' END,sort_order=?,version=version+1,updated_at=? WHERE id=?",[payload.revision,payload.expectedVersion,payload.data.sortOrder,now(),job.resource_id]],
  manager.s.audit('authenticated-admin','release_published',job.resource_id,{job:job.id,revision:payload.revision})
 ];
}
export async function release(manager,id,input,actor){
 need(manager.env.RUNTIME_TIER==='staging','ステージング専用です。',403);
 operation(input.operationId);
 const product=await manager.s.product(id);need(product,'商品がありません。',404);need(!retiredProduct(manager.env,product)&&!(await manager.s.retiredProductIds()).has(id),'この商品は販売終了です。Square ID・履歴を維持し、再公開しません。',409);
 const existing=await manager.s.one('SELECT * FROM mg_jobs WHERE id=?',[input.operationId]);
 if(existing){need(existing.kind==='publish'&&existing.resource_id===id&&JSON.parse(existing.payload_json).releaseSite&&JSON.parse(existing.payload_json).expectedVersion===input.expectedVersion,'操作IDが別の処理に使われています。',409);return resumeRelease(manager,existing);}
 const p=await manager.s.product(id);need(p,'商品がありません。',404);
 const locks=await manager.s.locked(p.draft.variants.map(v=>v.id));
 if(locks.length){
  const ids=[...new Set(locks.map(l=>l.job_id))];need(ids.length===1,'複数の保留処理があります。詳細で確認してください。',409);
  const job=await manager.s.one('SELECT * FROM mg_jobs WHERE id=?',[ids[0]]);
  need(job?.kind==='publish'&&JSON.parse(job.payload_json).releaseSite,'既存の同期・在庫処理が保留中です。先に同じ処理を確認・再開してください。',409);
  return resumeRelease(manager,job);
 }
 const previous=await manager.s.one("SELECT * FROM mg_jobs WHERE resource_id=? AND kind='publish' AND state='done' ORDER BY rowid DESC LIMIT 1",[id]);
 if(previous&&JSON.parse(previous.payload_json).releaseSite&&JSON.parse(previous.payload_json).revision===p.published_revision&&p.published_revision===p.draft_revision&&p.status==='published'){const proof=await catalogProof(manager,previous);need(proof.state!=='unavailable','Square現在値を確認できません。公開完了と判断せず、同じ操作を再確認してください。',503);if(proof.state==='matched')return manager.job(previous.id);}
 return manager.publish(id,{...input,releaseSite:true},actor);
}
async function resumeRelease(manager,job){
 if(job.state==='done'||job.state==='cancelled')return manager.job(job.id);
 const proof=job.body_json?await catalogProof(manager,job):null;
 if(proof?.state==='matched')return manager.reconcile(job.id);
 if(job.state==='review'&&!job.body_json&&Date.now()-Date.parse(job.created_at)<3600000&&job.attempts<8){await manager.s.run("UPDATE mg_jobs SET state='retry' WHERE id=?",[job.id]);job.state='retry';}
 if(job.state!=='review'){await manager.run(job.id);await manager.schedule();}
 return manager.job(job.id);
}

// Read versions for a NEW request only. Existing body_json is never rewritten.
export async function prepareReleaseMappings(manager,maps){
 if(!maps.length)return maps;
 need(new Set(maps.map(m=>m.item_id)).size===1,'複数のSquare Itemが混在しています。自動変更せず停止しました。',409);
 const item=await manager.square.object(maps[0].item_id);
 need(item?.type==='ITEM'&&!item.is_deleted&&item.item_data.variations.every(v=>maps.some(m=>m.variation_id===v.id)),'未管理または削除されたVariationがあります。自動削除せず停止しました。',409);
 const result=[];
 for(const m of maps){
  const v=item.item_data.variations.find(v=>v.id===m.variation_id);
  need(v?.item_variation_data?.sku===m.sku&&!v.is_deleted&&Number.isSafeInteger(item.version)&&Number.isSafeInteger(v.version)&&item.version>=m.item_version&&v.version>=m.variation_version,'既存ID・SKU・バージョンを確認できません。新規作成せず停止しました。',409);
  const completed=await manager.s.one("SELECT j.* FROM mg_jobs j JOIN mg_variants known ON known.product_id=j.resource_id WHERE known.id=? AND j.kind='publish' AND j.state='done' ORDER BY j.rowid DESC LIMIT 1",[m.variant_id]);
  if(completed?.body_json){
   const saved=JSON.parse(completed.body_json),data=JSON.parse(completed.payload_json).data,index=data.variants.findIndex(v=>v.id===m.variant_id);
   need(saved.batches[0].objects[0].item_data.variations[index]?.item_variation_data?.sku===m.sku,'既存SKUが変更されています。自動採用せず停止しました。',409);
  }
  await manager.square.assertUniqueSku(v.id,m.sku);
  result.push({...m,item_version:item.version,variation_version:v.version});
 }
 return result;
}
