import {featuredAdmin,retiredProduct,removeFeaturedStatements} from './storefront-selection.js';
import {release,releaseStatements,prepareReleaseMappings} from './release.js';
import {inspectSalesCatalog} from './sales-version-proof.js';
import {production,productionGrant,productionPolicy} from '../production-policy.js';
import {externalPolicy,assertSquareWrite} from '../external-policy.js';
import { importLegacy } from './importer.js';
import { CATALOG } from '../catalog.js';
import {publishSite,independentPublication} from './site-publication.js';
import {catalogProof} from './catalog-proof.js';
import {inspectSync} from './sync-diagnostics.js';
import { Store } from './store.js';
import { Square } from './square.js';
import { Supervision } from './supervision.js';
import { need, ManagementError, draft, identifier, operation, integer, text, digest, now, json, squareId } from './domain.js';
export class Management {
 constructor(env,storage,services={}){this.env=env;this.storage=storage;this.s=new Store(env);this.square=new Square(env);this.supervision=new Supervision(this,services);}
 async command(id,fingerprint){const previous=await this.s.one('SELECT * FROM mg_commands WHERE id=?',[id]);if(!previous)return null;need(previous.fingerprint===fingerprint,'同じ操作IDの内容を変更できません。',409);return JSON.parse(previous.result_json);}
 async save(id,input,actor){
  productionGrant(this.env,'draft');
  identifier(id);operation(input.operationId);const data=draft(input);const fp=await digest(['save',id,input.expectedVersion,input.slug,data]);const previous=await this.command(input.operationId,fp);if(previous)return previous;
  const p=await this.s.product(id);need((p?.version||0)===input.expectedVersion,'別の画面で更新されています。再読込してください。',409);
  const slug=identifier(input.slug);need(!p||p.slug===slug,'既存商品のURLは変更できません。',409);
  const old=p?.draft.variants||[];need(old.every(v=>data.variants.some(n=>n.id===v.id)),'既存バリエーションは削除せず販売停止にしてください。');
  // Drafts have no external effects; staging locks protect sync/stock and checkout only.
  if(this.env.RUNTIME_TIER!=='staging')await this.s.assertUnlocked([...old,...data.variants].map(v=>v.id));
  for(const v of data.variants){const row=await this.s.one('SELECT product_id FROM mg_variants WHERE id=?',[v.id]);need(!row||row.product_id===id,'別商品で使用中の識別子です。',409);}
  for(const image of data.images)need(await this.s.one('SELECT id FROM mg_images WHERE id=?',[image]),'画像を先にアップロードしてください。');
  const latest=this.env.RUNTIME_TIER==='staging'?(await this.s.one('SELECT MAX(revision) AS revision FROM mg_revisions WHERE product_id=?',[id]))?.revision:p?.draft_revision;
  const revision=(latest||0)+1,version=(p?.version||0)+1,result={id,version,revision};const at=now();
  const statements=[['INSERT INTO mg_revisions VALUES(?,?,?,?)',[id,revision,json(data),at]]];
  if(p)statements.push(['UPDATE mg_products SET draft_revision=?,version=?,updated_at=? WHERE id=?',[revision,version,at,id]]);
  else statements.push(['INSERT INTO mg_products VALUES(?,?,?,?,?,?,?,?,?)',[id,slug,data.sortOrder,'draft',version,revision,null,at,at]]);
  for(const v of data.variants)statements.push(['INSERT OR IGNORE INTO mg_variants VALUES(?,?)',[v.id,id]]);
  statements.push(['INSERT INTO mg_commands VALUES(?,?,?)',[input.operationId,fp,json(result)]],this.s.audit(actor,'draft_saved',id,{revision,version}));
  await this.s.batch(statements);return result;
 }
 async link(id,input,actor){
  productionGrant(this.env,'draft');
  operation(input.operationId);const fp=await digest(['link',id,input]);const previous=await this.command(input.operationId,fp);if(previous)return previous;
  const p=await this.s.product(id);need(p,'商品がありません。',404);need(p.version===input.expectedVersion,'再読込してください。',409);await this.s.assertUnlocked(p.draft.variants.map(v=>v.id));
  if(!input.mappings&&this.env.RUNTIME_TIER==='sandbox-validation'){const ids=JSON.parse(this.env.SQUARE_VARIATION_IDS||'{}');input.mappings=p.draft.variants.map(v=>({variantId:v.id,variationId:ids[v.id]}));}
  need(Array.isArray(input.mappings)&&input.mappings.length===p.draft.variants.length,'全バリエーションの対応表が必要です。');
  const maps=[];
  for(const v of p.draft.variants){need(!await this.s.one('SELECT variant_id FROM mg_mappings WHERE variant_id=?',[v.id]),'対応済みIDは変更できません。',409);
   const ref=input.mappings.find(m=>m.variantId===v.id);squareId(ref?.variationId,this.env);const variation=await this.square.object(ref.variationId),d=variation?.item_variation_data;
   need(variation?.type==='ITEM_VARIATION'&&d?.price_money?.currency==='JPY'&&Number(d.price_money.amount)===v.price&&d.name===v.name&&d.track_inventory===true,'Sandboxの商品内容と一致しません。',409);
   if(production(this.env)){await this.square.assertWritableLocation();await this.square.assertUniqueSku(variation.id,d.sku);}
   const expected=this.square.expectedLink(v.id);
   if(this.env.RUNTIME_TIER==='sandbox-validation'&&JSON.parse(this.env.SQUARE_VARIATION_IDS||'{}')[v.id])need(expected&&expected.variationId===variation.id&&expected.itemId===d.item_id&&expected.sku===d.sku&&!variation.is_deleted&&(variation.present_at_all_locations||variation.present_at_location_ids?.includes(this.env.SQUARE_LOCATION_ID))&&!variation.absent_at_location_ids?.includes(this.env.SQUARE_LOCATION_ID),'既存Item・Variation・SKUが一致しません。',409);
   need(variation.id===ref.variationId,'Variation IDが一致しません。',409);
   const item=await this.square.object(d.item_id);need(item?.id===d.item_id,'Item IDが一致しません。',409);need(item?.type==='ITEM'&&Number.isSafeInteger(item.version)&&Number.isSafeInteger(variation.version),'Squareの商品が確認できません。',409);
   need((item.present_at_all_locations||item.present_at_location_ids?.includes(this.env.SQUARE_LOCATION_ID))&&!item.absent_at_location_ids?.includes(this.env.SQUARE_LOCATION_ID),'Locationが一致しません。',409);
   maps.push({variant_id:v.id,item_id:item.id,variation_id:variation.id,item_version:item.version,variation_version:variation.version,...(production(this.env)?{sku:d.sku}: {})});
  }
  need(new Set(maps.map(m=>m.item_id)).size===1,'商品が複数のSquare Itemへ分かれています。',409);
  await this.s.batch([...maps.map(m=>this.mappingInsert(m)),['UPDATE mg_products SET version=version+1 WHERE id=?',[id]],['INSERT INTO mg_commands VALUES(?,?,?)',[input.operationId,fp,json({ok:true})]],this.s.audit(actor,production(this.env)?'production_linked':'sandbox_linked',id,{variants:maps.map(m=>m.variant_id)})]);return {ok:true};
 }
 mappingInsert(m){if(production(this.env)){need(typeof m.sku==='string'&&m.sku.length>0,'実照合したSKUが必要です。',409);return ['INSERT INTO mg_mappings(variant_id,environment,location_id,item_id,variation_id,item_version,variation_version,sku,instance_id,verified_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(variant_id) DO UPDATE SET item_version=excluded.item_version,variation_version=excluded.variation_version,verified_at=excluded.verified_at WHERE item_id=excluded.item_id AND variation_id=excluded.variation_id AND sku=excluded.sku',[m.variant_id,'production',this.env.SQUARE_LOCATION_ID,m.item_id,m.variation_id,m.item_version,m.variation_version,m.sku,this.env.PRODUCTION_INSTANCE_ID,now()]];}return ['INSERT INTO mg_mappings VALUES(?,?,?,?,?,?,?) ON CONFLICT(variant_id) DO UPDATE SET item_id=excluded.item_id,variation_id=excluded.variation_id,item_version=excluded.item_version,variation_version=excluded.variation_version',[m.variant_id,'sandbox',this.env.SQUARE_LOCATION_ID,m.item_id,m.variation_id,m.item_version,m.variation_version]];}
 async assertSalesCatalog(quote){
  for(const v of quote.items){if(production(this.env)&&!(await this.s.publicProducts()).some(p=>p.variants.some(n=>n.id===v.id)))continue;const mapping=await this.s.one('SELECT * FROM mg_mappings WHERE variant_id=?',[v.id]);need(mapping,'Square対応がありません。',409);const object=await this.square.object(mapping.variation_id),data=object?.item_variation_data;
   if(this.env.RUNTIME_TIER==='staging'){const check=await inspectSalesCatalog(this,mapping,object,v);need(check.ok,'Square照合不一致：'+check.mismatches.map(m=>m.label+(m.key==='version'?'（D1 '+m.saved+' ／ Square '+m.current+'）':'')).join('・')+'。管理画面の「同期状況を確認（読取のみ）」で確認してください。再送や在庫上書きはしていません。',409);continue;}
   need(data&&Number(data.price_money?.amount)===v.unitPrice&&data.price_money.currency==='JPY'&&data.name===v.name&&object.version===mapping.variation_version&&data.track_inventory===true&&!object.absent_at_location_ids?.includes(this.env.SQUARE_LOCATION_ID),'Squareの商品が外部から変更されています。再同期するまで購入できません。',409);
  }
 }
 async assertNoPurchaseHold(ids){
  const holds=await this.storage.get('sku-holds')||{};
  for(const id of ids){const m=await this.s.one('SELECT variation_id FROM mg_mappings WHERE variant_id=?',[id]);need(!m||!holds[`${this.env.SQUARE_LOCATION_ID}:${m.variation_id}`]?.length,'注文の在庫確認中です。保留を解消するまで変更できません。',409);}
 }
 async queue(kind,id,payload,op,actor,ids,extra=[]){
  assertSquareWrite(this.env,kind==='stock'?'inventory':'catalog');
  operation(op);const fp=await digest([kind,id,payload]);const previous=await this.s.one('SELECT * FROM mg_jobs WHERE id=?',[op]);if(previous){need(previous.fingerprint===fp,'同じ操作IDの内容を変更できません。',409);return this.job(op);}
  await this.s.assertUnlocked(ids);await this.assertNoPurchaseHold(ids);const at=now();
  // Arm before persistence as well: a crash immediately after D1 commit is covered.
  // Alarm failure never authorizes sending; the independent watchdog finds the row.
  await this.supervision.arm();
  await this.s.batch([['INSERT INTO mg_jobs(id,kind,resource_id,fingerprint,payload_json,state,next_due,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)',[op,kind,id,fp,json(payload),'queued',Date.now(),at,at]],...ids.map(v=>['INSERT INTO mg_locks VALUES(?,?)',[v,op]]),...extra,this.s.audit(actor,'job_queued',id,{job:op,kind})]);
  if(await this.schedule())await this.run(op);await this.schedule();return this.job(op);
 }
 async publish(id,input,actor){
  assertSquareWrite(this.env);
  operation(input.operationId);const old=await this.s.one('SELECT * FROM mg_jobs WHERE id=?',[input.operationId]);if(old){const q=JSON.parse(old.payload_json);need(old.kind==='publish'&&old.resource_id===id&&q.expectedVersion===input.expectedVersion,'操作IDが別の内容に使われています。',409);return this.job(old.id);}
  const p=await this.s.product(id);need(p&&p.version===input.expectedVersion,'商品が更新されています。再読込してください。',409);
  need(!retiredProduct(this.env,p)&&!(await this.s.retiredProductIds()).has(id),'この商品は販売終了です。履歴・Square IDを維持し、再公開は行いません。',409);
  if(production(this.env))for(const v of p.draft.variants)need(!CATALOG[v.id]||v.price===CATALOG[v.id].price,'既存公開サイトの価格切替は未実装です。価格変更を公開できません。',409);
  if(this.env.RUNTIME_TIER==='staging'){const locks=await this.s.locked(p.draft.variants.map(v=>v.id));need(!locks.length,'既存の同期・在庫ロックがあります。新しい同期は開始していません。「同期状況を確認（読取のみ）」で実行中・再試行待ち・要確認を確認してください。',409);await this.square.assertWritableLocation();}
  const maps=await this.s.all('SELECT m.* FROM mg_mappings m JOIN mg_variants v ON v.id=m.variant_id WHERE v.product_id=?',[id]);
  for(const v of p.draft.variants)need(!CATALOG[v.id]||maps.some(m=>m.variant_id===v.id),'既存商品はSandbox IDを関連付けてから公開してください。',409);
  return this.queue('publish',id,{expectedVersion:p.version,revision:p.draft_revision,data:p.draft,maps,targetStatus:'published',...(this.env.RUNTIME_TIER==='staging'&&input.releaseSite?{releaseSite:true}:{})},input.operationId,actor,p.draft.variants.map(v=>v.id));
 }
 async state(id,input,actor){
  assertSquareWrite(this.env);
  operation(input.operationId);need(['stopped','archived'].includes(input.status),'販売停止またはアーカイブを選択してください。');
  const previous=await this.command(input.operationId,await digest(['state',id,input]));if(previous)return previous;
  const p=await this.s.product(id);need(p&&p.version===input.expectedVersion,'商品が更新されています。',409);await this.s.assertUnlocked(p.draft.variants.map(v=>v.id));
  const result={ok:true,status:input.status};
  const extra=[['UPDATE mg_products SET status=?,version=version+1,updated_at=? WHERE id=?',[input.status,now(),id]],['INSERT INTO mg_commands VALUES(?,?,?)',[input.operationId,await digest(['state',id,input]),json(result)]],this.s.audit(actor,input.status,id,{})];
  extra.push(...await removeFeaturedStatements(this.s,id,actor));
  const maps=await this.s.all('SELECT m.* FROM mg_mappings m JOIN mg_variants v ON v.id=m.variant_id WHERE v.product_id=?',[id]);
  if(maps.length&&p.published_revision){const r=await this.s.one('SELECT data_json FROM mg_revisions WHERE product_id=? AND revision=?',[id,p.published_revision]);await this.queue('state',id,{expectedVersion:p.version+1,revision:p.published_revision,data:JSON.parse(r.data_json),maps,targetStatus:input.status},input.operationId,actor,p.draft.variants.map(v=>v.id),extra);}
  else await this.s.batch(extra);
  return result;
 }
 async inventory(){
  const retired=await this.s.retiredProductIds(),products=(await this.s.products()).filter(p=>!retired.has(p.id)),allowed=new Set(products.flatMap(p=>p.draft.variants.map(v=>v.id))),maps=(await this.s.all('SELECT * FROM mg_mappings')).filter(m=>allowed.has(m.variant_id)),counts=await this.square.count(maps.map(m=>m.variation_id));const locks=await this.s.all('SELECT * FROM mg_locks'),holds=await this.storage.get('sku-holds')||{};const at=now();const rows=[],snapshots=[];
  for(const p of products)for(const v of p.draft.variants){const m=maps.find(m=>m.variant_id===v.id),quantity=m?counts.get(m.variation_id):null;
   rows.push({source:externalPolicy(this.env).source,accessMode:externalPolicy(this.env).managementOnly?'SANDBOX_MANAGEMENT':externalPolicy(this.env).readOnly?'READ_ONLY':'READ_WRITE',...(production(this.env)?{canWriteInventory:productionPolicy(this.env).inventory}:{}),id:v.id,name:v.name,productId:p.id,productStatus:p.status,quantity,observedAt:m?at:null,syncState:locks.find(l=>l.variant_id===v.id)?'held':m?'synced':'unmapped',held:Boolean(locks.some(l=>l.variant_id===v.id)||m&&holds[`${this.env.SQUARE_LOCATION_ID}:${m.variation_id}`]?.length)});
   if(m)snapshots.push([v.id,quantity,at]);
  }for(let start=0;start<snapshots.length;start+=25){const batch=snapshots.slice(start,start+25);await this.s.run('INSERT INTO mg_stock_snapshot VALUES '+batch.map(()=>'(?,?,?)').join(',')+' ON CONFLICT(variant_id) DO UPDATE SET quantity=excluded.quantity,observed_at=excluded.observed_at',batch.flat());}return rows;
 }
 async adjust(id,input,actor){
  assertSquareWrite(this.env,'inventory');
  operation(input.operationId);const old=await this.s.one('SELECT * FROM mg_jobs WHERE id=?',[input.operationId]);if(old){need(old.kind==='stock'&&old.resource_id===id&&JSON.parse(old.payload_json).requestFingerprint===await digest(input),'操作IDが別の内容に使われています。',409);return this.job(old.id);}
  need(this.env.MANAGEMENT_STOCK_WRITES==='single-writer','在庫変更には販売経路の排他方針の承認が必要です。',409);
  need(['receipt','adjustment','count'].includes(input.kind),'在庫操作が正しくありません。');const quantity=integer(input.quantity,input.kind==='adjustment'?-100000:0,100000);if(input.kind==='receipt')need(quantity>0,'入庫数は1以上です。');
  const reason=text(input.reason,500),m=await this.s.one('SELECT * FROM mg_mappings WHERE variant_id=?',[id]);need(m,'Squareとの対応がありません。',409);
  const retired=await this.s.retiredProductIds();if(retired.size){const owner=await this.s.one('SELECT product_id FROM mg_variants WHERE id=?',[id]);need(!retired.has(owner?.product_id),'販売終了商品の在庫変更は受け付けません。既存在庫・履歴を維持します。',409);}
  await this.s.assertUnlocked([id]);await this.assertNoPurchaseHold([id]);
  need(Number.isFinite(Date.parse(input.observedAt))&&Date.now()-Date.parse(input.observedAt)<300000&&Date.parse(input.observedAt)<=Date.now()+5000,'在庫表示を更新してください。',409);
  const current=(await this.square.count([m.variation_id])).get(m.variation_id);need(current===input.expectedQuantity,'在庫が変更されています。再読込してください。',409);
  const target=input.kind==='count'?quantity:current+quantity;integer(target,0,1000000);
  return this.queue('stock',id,{kind:input.kind,quantity,reason,before:current,target,mapping:m,requestFingerprint:await digest(input)},input.operationId,actor,[id],[['INSERT INTO mg_inventory_operations VALUES(?,?,?,?,?,?,?,?,?,?)',[input.operationId,id,input.kind,quantity,reason,actor,current,null,'queued',now()]]]);
 }
 async job(id){const r=await this.s.one('SELECT j.*,n.state AS notification_state FROM mg_jobs j LEFT JOIN mg_job_notifications n ON n.job_id=j.id WHERE j.id=?',[id]);need(r,'ジョブがありません。',404);const payload=JSON.parse(r.payload_json);return {release:Boolean(payload.releaseSite),submittedRevision:payload.revision??null,phase:r.state==='done'?'complete':r.result_json?'save-and-publish':r.body_json?'square-confirmation':'validation',nextAction:r.state==='done'?'公開済み':r.state==='review'?'同じ処理を読取照合。新規キーで再送しない':'同じ公開処理を確認・再開',id:r.id,kind:r.kind,resourceId:r.resource_id,state:r.state,attempts:r.attempts,error:r.last_error,updatedAt:r.updated_at,lockCount:(await this.s.one('SELECT COUNT(*) AS n FROM mg_locks WHERE job_id=?',[id])).n,notificationState:r.notification_state||'none'};}
 async jobs(){return Promise.all((await this.s.all('SELECT id FROM mg_jobs ORDER BY created_at DESC LIMIT 200')).map(r=>this.job(r.id)));}
 async reconcile(id){
  if(!production(this.env)&&this.env.RUNTIME_TIER!=='staging')assertSquareWrite(this.env);
  const j=await this.s.one('SELECT * FROM mg_jobs WHERE id=?',[id]);need(j,'ジョブがありません。',404);productionGrant(this.env,j.kind==='stock'?'inventory':'catalog');if(j.state==='done'){if(this.env.RUNTIME_TIER==='staging'){const proof=j.result_json&&JSON.parse(j.result_json);need(j.kind==='stock'?proof?.applied===true:Array.isArray(proof?.mappings)&&proof.mappings.length>0,'成功証跡がないためロックを解除できません。',409);await this.s.batch([['DELETE FROM mg_locks WHERE job_id=?',[id]],this.s.audit('authenticated-admin','completed_lock_released',j.resource_id,{job:id})]);}return this.job(id);}
  need(j.state==='review'||this.env.RUNTIME_TIER==='staging'&&j.kind!=='stock'&&['queued','running','retry'].includes(j.state),'読み取り照合できる状態ではありません。再送せず状態を確認してください。',409);const p=JSON.parse(j.payload_json);let result;
  if(j.kind==='stock'){need(j.result_json,'在庫操作の成功証跡がありません。Square側履歴の手動確認が必要です。',409);const count=(await this.square.count([p.mapping.variation_id])).get(p.mapping.variation_id);need(count===p.target,'在庫が一致しません。上書きせず停止しました。',409);result=JSON.parse(j.result_json);}
  else if(this.env.RUNTIME_TIER==='staging'){const proof=await catalogProof(this,j);need(proof.state==='matched',proof.message+' '+proof.checks.filter(c=>!c.ok).map(c=>c.label).join('・'),409);result={mappings:proof.mappings,evidence:{type:'saved-request-current-state-match',checks:proof.checks,versions:proof.versionInfo,checkedAt:now()}};}
  else {const known=j.result_json?JSON.parse(j.result_json).mappings:p.maps;const body=j.body_json?JSON.parse(j.body_json):null;need(known?.length||this.env.RUNTIME_TIER==='staging'&&body,'Square Item IDが不明です。自動照合できません。',409);const item=known?.length?await this.square.object(known[0].item_id):await this.square.findCreatedItem(body);const mappings=this.square.verifyCatalog(item,p.data,body?.batches[0].objects[0].item_data.image_ids,p.targetStatus,body?.batches[0].objects[0].item_data.variations);for(const old of known||[]){const m=mappings.find(m=>m.variant_id===old.variant_id);need(m?.variation_id===old.variation_id&&(this.env.RUNTIME_TIER!=='staging'||m.item_id===old.item_id),'Square IDが一致しません。',409);}result={mappings};}
  if(this.env.RUNTIME_TIER==='staging'){
   const updates=j.kind==='stock'?[
    ['UPDATE mg_inventory_operations SET after_quantity=?,state=? WHERE id=?',[p.target,'done',id]],
    ['INSERT INTO mg_stock_snapshot VALUES(?,?,?) ON CONFLICT(variant_id) DO UPDATE SET quantity=excluded.quantity,observed_at=excluded.observed_at',[j.resource_id,p.target,now()]]
   ]:result.mappings.map(m=>this.mappingInsert(m));
   updates.push(...releaseStatements(this,j,p));
   updates.push(["UPDATE mg_jobs SET result_json=?,state='done',last_error=NULL,updated_at=? WHERE id=?",[json(result),now(),id]],['DELETE FROM mg_locks WHERE job_id=?',[id]],this.s.audit('authenticated-admin','job_readonly_reconciled',j.resource_id,{job:id,kind:j.kind,squareWrite:false}));
   await this.s.batch(updates);return this.job(id);
  }
  await this.s.run("UPDATE mg_jobs SET result_json=?,state='queued' WHERE id=?",[json(result),id]);await this.run(id);await this.schedule();return this.job(id);
 }
 async adoptCurrent(id){
  need(this.env.RUNTIME_TIER==='staging','ステージング専用です。',403);
  let stage='read-proof';
  try{
  const j=await this.s.one('SELECT * FROM mg_jobs WHERE id=?',[id]);if(j?.state==='cancelled'&&JSON.parse(j.result_json||'{}').resolution==='version-fenced-current-state-adopted'){stage='read-result';return await this.job(id);}
  need(j?.state==='review'&&j.kind==='publish','要確認の商品同期だけが対象です。',409);
  const proof=await catalogProof(this,j);need(proof.adoption?.available,proof.adoption?.reason||proof.message,409);
  const payload=JSON.parse(j.payload_json);stage='check-holds';await this.assertNoPurchaseHold(payload.data.variants.map(v=>v.id));
  stage='commit';await this.s.batch([...proof.adoptionMappings.map(m=>this.mappingInsert(m)),
   ["UPDATE mg_jobs SET state='cancelled',result_json=?,last_error=?,updated_at=? WHERE id=?",[json({resolution:'version-fenced-current-state-adopted',versions:proof.versionInfo}),'成功扱いにせず、読取確認した現在値を採用して取消しました。',now(),id]],
   ['DELETE FROM mg_locks WHERE job_id=?',[id]],
   ["UPDATE mg_job_notifications SET state='cancelled' WHERE job_id=?",[id]],
   ['UPDATE mg_products SET version=version+1 WHERE id=?',[j.resource_id]],
   this.s.audit('authenticated-admin','job_cancelled_after_version_fence',j.resource_id,{job:id,squareWrite:false})]);
  stage='read-result';return await this.job(id);
  }catch(error){
   if(error instanceof ManagementError){error.code='ADMIN_ADOPTION_REJECTED';error.actionStage=stage;throw error;}
   const failure=new ManagementError(503,'旧同期取消の'+({'read-proof':'読み取り照合','check-holds':'購入保留確認',commit:'D1保存','read-result':'結果取得'}[stage])+'で処理結果を確認できません。ジョブ状態を読み取り確認してください。');failure.code='ADMIN_ADOPTION_FAILED';failure.actionStage=stage;throw failure;
  }
 }
 async retry(id){
  if(!production(this.env))assertSquareWrite(this.env);const j=await this.s.one('SELECT * FROM mg_jobs WHERE id=?',[id]);need(j,'ジョブがありません。',404);productionGrant(this.env,j.kind==='stock'?'inventory':'catalog');need(j.state!=='cancelled','取消済みの同期は再送できません。',409);need(j.state!=='review','競合・期限切れは自動再送できません。照合が必要です。',409);if(j.state!=='done')await this.run(id);await this.schedule();return this.job(id);}
 async run(id){
  if(externalPolicy(this.env).readOnly)return;
  const j=await this.s.one('SELECT * FROM mg_jobs WHERE id=?',[id]);if(!j||['done','review','cancelled'].includes(j.state))return;
  if(production(this.env)&&!productionPolicy(this.env)[j.kind==='stock'?'inventory':'catalog'])return;
  if(!await this.schedule())return;
  const p=JSON.parse(j.payload_json);let releasePhase='入力・既存ID確認';try{
   need(j.result_json||Date.now()-Date.parse(j.created_at)<3600000,'安全な再試行期限を超えました。新しいキーで再送しないでください。',409);
   need(j.result_json||j.attempts<8,'再試行回数を超えました。',409);
   await this.s.run("UPDATE mg_jobs SET state='running',attempts=attempts+1,updated_at=? WHERE id=?",[now(),id]);
   let body=j.body_json?JSON.parse(j.body_json):null,result=j.result_json?JSON.parse(j.result_json):null;
   if(!body){
    if(j.kind==='stock'){
     if(production(this.env)||externalPolicy(this.env).managementOnly)need((await this.square.count([p.mapping.variation_id])).get(p.mapping.variation_id)===p.before,'送信前に在庫が変わりました。棚卸しで上書きせず照合してください。',409);
     const adjustment={catalog_object_id:p.mapping.variation_id,location_id:this.env.SQUARE_LOCATION_ID,state:'IN_STOCK',quantity:String(p.target),occurred_at:now(),reference_id:id};
     body={idempotency_key:id,changes:[{type:'PHYSICAL_COUNT',physical_count:adjustment}]};
    }else{
     let preserved=await this.square.preserveMappings(p.maps);
     if(this.env.RUNTIME_TIER==='staging'&&p.releaseSite)preserved=await prepareReleaseMappings(this,preserved,p);
     await this.square.assertNewSkusAvailable(p.data,p.maps);
     if(p.releaseSite)releasePhase='画像確認';
     const imageIds=[];
     for(const imageId of p.data.images){let mapping=await this.s.one('SELECT * FROM mg_image_mappings WHERE image_id=?',[imageId]);if(!mapping){const image=await this.s.one('SELECT * FROM mg_images WHERE id=?',[imageId]);need(image&&this.env.PRODUCT_IMAGES,'画像ストレージが確認できません。',503);const object=await this.env.PRODUCT_IMAGES.get(image.object_key);need(object,'画像がありません。',409);const squareImageId=await this.square.image(imageId,await object.arrayBuffer(),image.mime);await this.s.run('INSERT INTO mg_image_mappings VALUES(?,?,?,?)',[imageId,production(this.env)?'production':'sandbox',squareImageId,now()]);mapping={square_image_id:squareImageId};}imageIds.push(mapping.square_image_id);}
     body=this.square.catalogBody({id:j.resource_id,data:p.data},preserved,id,imageIds);
     if(j.kind==='state')for(const item of body.batches[0].objects){item.item_data.is_archived=p.targetStatus==='archived';item.present_at_location_ids=[];item.absent_at_location_ids=[this.env.SQUARE_LOCATION_ID];for(const v of item.item_data.variations){v.present_at_location_ids=[];v.absent_at_location_ids=[this.env.SQUARE_LOCATION_ID];}}
    }
    await this.s.run('UPDATE mg_jobs SET body_json=? WHERE id=?',[json(body),id]);
   }
   if(!result&&p.releaseSite&&j.body_json){const proof=await catalogProof(this,j);if(proof.state==='matched')result={mappings:proof.mappings};}
   if(!result){
    if(p.releaseSite)releasePhase='Square送信・応答確認';
    if(j.kind==='stock'){await this.square.request('/v2/inventory/changes/batch-create','POST',body);result={applied:true};}
    else { result={mappings:await this.square.publish(body,p.data)}; for(const old of p.maps){const mapped=result.mappings.find(m=>m.variant_id===old.variant_id);need(mapped?.variation_id===old.variation_id&&mapped.item_id===old.item_id,'既存Square IDが変化しました。',409);} }
    await this.s.run('UPDATE mg_jobs SET result_json=? WHERE id=?',[json(result),id]);
   }
   if(p.releaseSite){releasePhase='Square現在値照合';const proof=await catalogProof(this,{...j,body_json:json(body),result_json:json(result)});need(proof.state==='matched','公開前照合に失敗：'+proof.checks.filter(c=>!c.ok).map(c=>c.label).join('・')+'。同じ公開処理を確認してください。',409);result={...result,mappings:proof.mappings};}
   const updates=[];
   if(j.kind==='stock'){
    const quantity=(await this.square.count([p.mapping.variation_id])).get(p.mapping.variation_id);
    need(quantity===p.target,'適用後に外部在庫が変化しました。再初期化せず照合してください。',409);
    updates.push(['UPDATE mg_inventory_operations SET after_quantity=?,state=? WHERE id=?',[quantity,'done',id]],['INSERT INTO mg_stock_snapshot VALUES(?,?,?) ON CONFLICT(variant_id) DO UPDATE SET quantity=excluded.quantity,observed_at=excluded.observed_at',[j.resource_id,quantity,now()]]);
   }else{
    updates.push(...result.mappings.map(m=>this.mappingInsert(m)));
    if(p.releaseSite)updates.push(...releaseStatements(this,j,p));
    else if(independentPublication(this.env))updates.push(['UPDATE mg_products SET version=version+1,updated_at=? WHERE id=?',[now(),j.resource_id]]);
    else updates.push(['UPDATE mg_products SET published_revision=?,status=?,sort_order=?,version=version+1,updated_at=? WHERE id=?',[p.revision,p.targetStatus,p.data.sortOrder,now(),j.resource_id]]);
   }
   updates.push(["UPDATE mg_jobs SET state='done',last_error=NULL,updated_at=? WHERE id=?",[now(),id]],['DELETE FROM mg_locks WHERE job_id=?',[id]],this.s.audit('system','job_completed',j.resource_id,{job:id,kind:j.kind}));
   if(p.releaseSite){releasePhase='D1証跡保存・サイト公開';updates.push(['UPDATE mg_jobs SET result_json=? WHERE id=?',[json(result),id]]);}
   await this.s.batch(updates);
  }catch(error){
   const review=error.status===409||error.status===422||j.attempts>=7;const state=review?'review':'retry';
   await this.s.run('UPDATE mg_jobs SET state=?,last_error=?,next_due=?,updated_at=? WHERE id=?',[state,(p.releaseSite?'［'+releasePhase+'］':'')+(error instanceof ManagementError?error.message:'通信または保存に失敗しました。固定IDで再試行します。'),Date.now()+Math.min(3600000,15000*2**j.attempts),now(),id]);
   if(j.kind==='stock')await this.s.run('UPDATE mg_inventory_operations SET state=? WHERE id=?',[state,id]);
  }
 }
 async schedule(){return this.supervision.schedule();}
 async recover(){return this.supervision.tick();}
 async productView(p){
  const j=await this.s.one("SELECT * FROM mg_jobs WHERE resource_id=? AND kind IN ('publish','state') ORDER BY rowid DESC LIMIT 1",[p.id]);
  const maps=await this.s.all("SELECT m.variant_id FROM mg_mappings m JOIN mg_variants v ON v.id=m.variant_id WHERE v.product_id=?",[p.id]);
  const policy=externalPolicy(this.env);
  const blockingJobs=await this.s.all("SELECT DISTINCT l.job_id AS id,j.kind,j.state,j.last_error AS error,j.updated_at AS updatedAt,json_extract(j.payload_json,'$.releaseSite') AS release FROM mg_locks l JOIN mg_variants v ON v.id=l.variant_id LEFT JOIN mg_jobs j ON j.id=l.job_id WHERE v.product_id=?",[p.id]);
  const publication=await this.s.one("SELECT detail_json FROM mg_audit WHERE resource_id=? AND action IN ('site_published','release_published') ORDER BY rowid DESC LIMIT 1",[p.id]);
  return {...p,retired:(await this.s.retiredProductIds()).has(p.id),...(this.env.RUNTIME_TIER==='staging'&&j&&JSON.parse(j.payload_json).releaseSite?{releaseJob:{...await this.job(j.id),submittedRevision:JSON.parse(j.payload_json).revision}}:{}),siteWarnings:publication?JSON.parse(publication.detail_json).warnings||[]:[],blockingJobs,syncState:j?.state||(p.draft.variants.every(v=>maps.some(m=>m.variant_id===v.id))?'linked':'unlinked'),
   source:policy.source,...(this.env.RUNTIME_TIER==='staging'?{capabilities:{draft:true,images:true,sitePublish:true,unifiedPublish:true,featuredProducts:true,catalog:!policy.readOnly,inventory:!policy.readOnly}}:{}),...(production(this.env)?{capabilities:{...productionPolicy(this.env),featuredProducts:this.env.STOREFRONT_FEATURED_ENABLED==='1',sitePublish:this.env.PRODUCTION_STOREFRONT_PUBLISH_ENABLED==='1'&&productionPolicy(this.env).draft}}:{}),accessMode:production(this.env)?(productionPolicy(this.env).catalog||productionPolicy(this.env).inventory?'PRODUCTION_MANAGEMENT':'PRODUCTION_READ_ONLY'):policy.managementOnly?'SANDBOX_MANAGEMENT':policy.readOnly?'READ_ONLY':'READ_WRITE',
   useConfiguredLinks:this.env.RUNTIME_TIER==='sandbox-validation'&&p.draft.variants.every(v=>Boolean(this.square.expectedLink(v.id)))};
 }
 async products(){return Promise.all((await this.s.products()).map(p=>this.productView(p)));}
 async handle(path,method,body,actor){
  if(path==='/api/admin/storefront/featured')return featuredAdmin(this,method,body,actor);
  if(path==='/api/admin/products/import'&&method==='POST'){need(!production(this.env),'本番の既存商品は実照合した下書きと対応表で導入してください。',409);return importLegacy(this,actor);}
  if(path==='/api/admin/products'&&method==='GET')return {products:await this.products(),...(this.env.RUNTIME_TIER==='staging'?{source:'square-sandbox',capabilities:{draft:true,images:true,sitePublish:true,unifiedPublish:true,featuredProducts:true,catalog:!externalPolicy(this.env).readOnly,inventory:!externalPolicy(this.env).readOnly}}:{}),...(production(this.env)?{source:'square-production',capabilities:{...productionPolicy(this.env),featuredProducts:this.env.STOREFRONT_FEATURED_ENABLED==='1'}}:{})};
  if(path==='/api/admin/inventory'&&method==='GET')return {inventory:await this.inventory()};
  if(path==='/api/admin/audit'&&method==='GET')return {events:await this.s.all('SELECT actor,action,resource_id,detail_json,created_at FROM mg_audit ORDER BY created_at DESC LIMIT 200')};
  if(path==='/api/admin/jobs'&&method==='GET')return {jobs:await this.jobs(),orphanLocks:await this.s.all('SELECT l.variant_id AS variantId,l.job_id AS jobId FROM mg_locks l LEFT JOIN mg_jobs j ON j.id=l.job_id WHERE j.id IS NULL'),monitoring:await this.supervision.status()};
  let m=path.match(/^\/api\/admin\/products\/([a-z0-9-]+)(?:\/(publish|release|state|link|site|sync-check))?$/);
  if(m){const id=identifier(m[1]);if(method==='GET'&&!m[2]){const product=await this.s.product(id);need(product,'商品がありません。',404);return {product:await this.productView(product)};}
   if(method==='PUT'&&!m[2])return this.save(id,body,actor);
   if(method==='POST'&&m[2])return m[2]==='release'?release(this,id,body,actor):m[2]==='sync-check'?inspectSync(this,id):m[2]==='site'?publishSite(this,id,body,actor):this[m[2]](id,body,actor);
  }
  m=path.match(/^\/api\/admin\/inventory\/([a-z0-9-]+)$/);if(m&&method==='POST')return this.adjust(m[1],body,actor);
  m=path.match(/^\/api\/admin\/jobs\/([a-f0-9-]+)$/);if(m&&method==='GET'){need(this.env.RUNTIME_TIER==='staging','ステージング専用です。',403);return {job:await this.job(operation(m[1]))};}
  m=path.match(/^\/api\/admin\/jobs\/([a-f0-9-]+)\/(retry|reconcile|adopt-current)$/);if(m&&method==='POST')return this[m[2]==='adopt-current'?'adoptCurrent':m[2]](operation(m[1]));
  need(false,'管理APIが見つかりません。',404);
 }
}
