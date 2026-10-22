import { importLegacy } from './importer.js';
import { CATALOG } from '../catalog.js';
import { Store } from './store.js';
import { Square } from './square.js';
import { Supervision } from './supervision.js';
import { need, draft, identifier, operation, integer, text, digest, now, json, squareId } from './domain.js';
export class Management {
 constructor(env,storage,services={}){this.env=env;this.storage=storage;this.s=new Store(env);this.square=new Square(env);this.supervision=new Supervision(this,services);}
 async command(id,fingerprint){const previous=await this.s.one('SELECT * FROM mg_commands WHERE id=?',[id]);if(!previous)return null;need(previous.fingerprint===fingerprint,'同じ操作IDの内容を変更できません。',409);return JSON.parse(previous.result_json);}
 async save(id,input,actor){
  identifier(id);operation(input.operationId);const data=draft(input);const fp=await digest(['save',id,input.expectedVersion,input.slug,data]);const previous=await this.command(input.operationId,fp);if(previous)return previous;
  const p=await this.s.product(id);need((p?.version||0)===input.expectedVersion,'別の画面で更新されています。再読込してください。',409);
  const slug=identifier(input.slug);need(!p||p.slug===slug,'既存商品のURLは変更できません。',409);
  const old=p?.draft.variants||[];need(old.every(v=>data.variants.some(n=>n.id===v.id)),'既存バリエーションは削除せず販売停止にしてください。');
  await this.s.assertUnlocked([...old,...data.variants].map(v=>v.id));
  for(const v of data.variants){const row=await this.s.one('SELECT product_id FROM mg_variants WHERE id=?',[v.id]);need(!row||row.product_id===id,'別商品で使用中の識別子です。',409);}
  for(const image of data.images)need(await this.s.one('SELECT id FROM mg_images WHERE id=?',[image]),'画像を先にアップロードしてください。');
  const revision=(p?.draft_revision||0)+1,version=(p?.version||0)+1,result={id,version,revision};const at=now();
  const statements=[['INSERT INTO mg_revisions VALUES(?,?,?,?)',[id,revision,json(data),at]]];
  if(p)statements.push(['UPDATE mg_products SET draft_revision=?,version=?,updated_at=? WHERE id=?',[revision,version,at,id]]);
  else statements.push(['INSERT INTO mg_products VALUES(?,?,?,?,?,?,?,?,?)',[id,slug,data.sortOrder,'draft',version,revision,null,at,at]]);
  for(const v of data.variants)statements.push(['INSERT OR IGNORE INTO mg_variants VALUES(?,?)',[v.id,id]]);
  statements.push(['INSERT INTO mg_commands VALUES(?,?,?)',[input.operationId,fp,json(result)]],this.s.audit(actor,'draft_saved',id,{revision,version}));
  await this.s.batch(statements);return result;
 }
 async link(id,input,actor){
  operation(input.operationId);const fp=await digest(['link',id,input]);const previous=await this.command(input.operationId,fp);if(previous)return previous;
  const p=await this.s.product(id);need(p,'商品がありません。',404);need(p.version===input.expectedVersion,'再読込してください。',409);await this.s.assertUnlocked(p.draft.variants.map(v=>v.id));
  if(!input.mappings&&this.env.RUNTIME_TIER==='sandbox-validation'){const ids=JSON.parse(this.env.SQUARE_VARIATION_IDS||'{}');input.mappings=p.draft.variants.map(v=>({variantId:v.id,variationId:ids[v.id]}));}
  need(Array.isArray(input.mappings)&&input.mappings.length===p.draft.variants.length,'全バリエーションの対応表が必要です。');
  const maps=[];
  for(const v of p.draft.variants){need(!await this.s.one('SELECT variant_id FROM mg_mappings WHERE variant_id=?',[v.id]),'対応済みIDは変更できません。',409);
   const ref=input.mappings.find(m=>m.variantId===v.id);squareId(ref?.variationId);const variation=await this.square.object(ref.variationId),d=variation?.item_variation_data;
   need(variation?.type==='ITEM_VARIATION'&&d?.price_money?.currency==='JPY'&&Number(d.price_money.amount)===v.price&&d.name===v.name&&d.track_inventory===true,'Sandboxの商品内容と一致しません。',409);
   const item=await this.square.object(d.item_id);need(item?.type==='ITEM'&&Number.isSafeInteger(item.version)&&Number.isSafeInteger(variation.version),'Squareの商品が確認できません。',409);
   need((item.present_at_all_locations||item.present_at_location_ids?.includes(this.env.SQUARE_LOCATION_ID))&&!item.absent_at_location_ids?.includes(this.env.SQUARE_LOCATION_ID),'Locationが一致しません。',409);
   maps.push({variant_id:v.id,item_id:item.id,variation_id:variation.id,item_version:item.version,variation_version:variation.version});
  }
  need(new Set(maps.map(m=>m.item_id)).size===1,'商品が複数のSquare Itemへ分かれています。',409);
  await this.s.batch([...maps.map(m=>this.mappingInsert(m)),['UPDATE mg_products SET version=version+1 WHERE id=?',[id]],['INSERT INTO mg_commands VALUES(?,?,?)',[input.operationId,fp,json({ok:true})]],this.s.audit(actor,'sandbox_linked',id,{variants:maps.map(m=>m.variant_id)})]);return {ok:true};
 }
 mappingInsert(m){return ['INSERT INTO mg_mappings VALUES(?,?,?,?,?,?,?) ON CONFLICT(variant_id) DO UPDATE SET item_id=excluded.item_id,variation_id=excluded.variation_id,item_version=excluded.item_version,variation_version=excluded.variation_version',[m.variant_id,'sandbox',this.env.SQUARE_LOCATION_ID,m.item_id,m.variation_id,m.item_version,m.variation_version]];}
 async assertSalesCatalog(quote){
  for(const v of quote.items){const mapping=await this.s.one('SELECT * FROM mg_mappings WHERE variant_id=?',[v.id]);need(mapping,'Square対応がありません。',409);const object=await this.square.object(mapping.variation_id),data=object?.item_variation_data;
   need(data&&Number(data.price_money?.amount)===v.unitPrice&&data.price_money.currency==='JPY'&&data.name===v.name&&object.version===mapping.variation_version&&data.track_inventory===true&&!object.absent_at_location_ids?.includes(this.env.SQUARE_LOCATION_ID),'Squareの商品が外部から変更されています。再同期するまで購入できません。',409);
  }
 }
 async assertNoPurchaseHold(ids){
  const holds=await this.storage.get('sku-holds')||{};
  for(const id of ids){const m=await this.s.one('SELECT variation_id FROM mg_mappings WHERE variant_id=?',[id]);need(!m||!holds[`${this.env.SQUARE_LOCATION_ID}:${m.variation_id}`]?.length,'注文の在庫確認中です。保留を解消するまで変更できません。',409);}
 }
 async queue(kind,id,payload,op,actor,ids,extra=[]){
  operation(op);const fp=await digest([kind,id,payload]);const previous=await this.s.one('SELECT * FROM mg_jobs WHERE id=?',[op]);if(previous){need(previous.fingerprint===fp,'同じ操作IDの内容を変更できません。',409);return this.job(op);}
  await this.s.assertUnlocked(ids);await this.assertNoPurchaseHold(ids);const at=now();
  // Arm before persistence as well: a crash immediately after D1 commit is covered.
  // Alarm failure never authorizes sending; the independent watchdog finds the row.
  await this.supervision.arm();
  await this.s.batch([['INSERT INTO mg_jobs(id,kind,resource_id,fingerprint,payload_json,state,next_due,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)',[op,kind,id,fp,json(payload),'queued',Date.now(),at,at]],...ids.map(v=>['INSERT INTO mg_locks VALUES(?,?)',[v,op]]),...extra,this.s.audit(actor,'job_queued',id,{job:op,kind})]);
  if(await this.schedule())await this.run(op);await this.schedule();return this.job(op);
 }
 async publish(id,input,actor){
  operation(input.operationId);const old=await this.s.one('SELECT * FROM mg_jobs WHERE id=?',[input.operationId]);if(old){const q=JSON.parse(old.payload_json);need(old.kind==='publish'&&old.resource_id===id&&q.expectedVersion===input.expectedVersion,'操作IDが別の内容に使われています。',409);return this.job(old.id);}
  const p=await this.s.product(id);need(p&&p.version===input.expectedVersion,'商品が更新されています。再読込してください。',409);
  const maps=await this.s.all('SELECT m.* FROM mg_mappings m JOIN mg_variants v ON v.id=m.variant_id WHERE v.product_id=?',[id]);
  for(const v of p.draft.variants)need(!CATALOG[v.id]||maps.some(m=>m.variant_id===v.id),'既存商品はSandbox IDを関連付けてから公開してください。',409);
  return this.queue('publish',id,{expectedVersion:p.version,revision:p.draft_revision,data:p.draft,maps,targetStatus:'published'},input.operationId,actor,p.draft.variants.map(v=>v.id));
 }
 async state(id,input,actor){
  operation(input.operationId);need(['stopped','archived'].includes(input.status),'販売停止またはアーカイブを選択してください。');
  const previous=await this.command(input.operationId,await digest(['state',id,input]));if(previous)return previous;
  const p=await this.s.product(id);need(p&&p.version===input.expectedVersion,'商品が更新されています。',409);await this.s.assertUnlocked(p.draft.variants.map(v=>v.id));
  const result={ok:true,status:input.status};
  const extra=[['UPDATE mg_products SET status=?,version=version+1,updated_at=? WHERE id=?',[input.status,now(),id]],['INSERT INTO mg_commands VALUES(?,?,?)',[input.operationId,await digest(['state',id,input]),json(result)]],this.s.audit(actor,input.status,id,{})];
  const maps=await this.s.all('SELECT m.* FROM mg_mappings m JOIN mg_variants v ON v.id=m.variant_id WHERE v.product_id=?',[id]);
  if(maps.length&&p.published_revision){const r=await this.s.one('SELECT data_json FROM mg_revisions WHERE product_id=? AND revision=?',[id,p.published_revision]);await this.queue('state',id,{expectedVersion:p.version+1,revision:p.published_revision,data:JSON.parse(r.data_json),maps,targetStatus:input.status},input.operationId,actor,p.draft.variants.map(v=>v.id),extra);}
  else await this.s.batch(extra);
  return result;
 }
 async inventory(){
  const maps=await this.s.all('SELECT * FROM mg_mappings'),counts=await this.square.count(maps.map(m=>m.variation_id));const products=await this.s.products(),locks=await this.s.all('SELECT * FROM mg_locks'),holds=await this.storage.get('sku-holds')||{};const at=now();const rows=[],snapshots=[];
  for(const p of products)for(const v of p.draft.variants){const m=maps.find(m=>m.variant_id===v.id),quantity=m?counts.get(m.variation_id):null;
   rows.push({id:v.id,name:v.name,productId:p.id,productStatus:p.status,quantity,observedAt:at,syncState:locks.find(l=>l.variant_id===v.id)?'held':m?'synced':'unmapped',held:Boolean(locks.some(l=>l.variant_id===v.id)||m&&holds[`${this.env.SQUARE_LOCATION_ID}:${m.variation_id}`]?.length)});
   if(m)snapshots.push([v.id,quantity,at]);
  }for(let start=0;start<snapshots.length;start+=25){const batch=snapshots.slice(start,start+25);await this.s.run('INSERT INTO mg_stock_snapshot VALUES '+batch.map(()=>'(?,?,?)').join(',')+' ON CONFLICT(variant_id) DO UPDATE SET quantity=excluded.quantity,observed_at=excluded.observed_at',batch.flat());}return rows;
 }
 async adjust(id,input,actor){
  operation(input.operationId);const old=await this.s.one('SELECT * FROM mg_jobs WHERE id=?',[input.operationId]);if(old){need(old.kind==='stock'&&old.resource_id===id&&JSON.parse(old.payload_json).requestFingerprint===await digest(input),'操作IDが別の内容に使われています。',409);return this.job(old.id);}
  need(this.env.MANAGEMENT_STOCK_WRITES==='single-writer','在庫変更には販売経路の排他方針の承認が必要です。',409);
  need(['receipt','adjustment','count'].includes(input.kind),'在庫操作が正しくありません。');const quantity=integer(input.quantity,input.kind==='adjustment'?-100000:0,100000);if(input.kind==='receipt')need(quantity>0,'入庫数は1以上です。');
  const reason=text(input.reason,500),m=await this.s.one('SELECT * FROM mg_mappings WHERE variant_id=?',[id]);need(m,'Squareとの対応がありません。',409);
  await this.s.assertUnlocked([id]);await this.assertNoPurchaseHold([id]);
  need(Number.isFinite(Date.parse(input.observedAt))&&Date.now()-Date.parse(input.observedAt)<300000&&Date.parse(input.observedAt)<=Date.now()+5000,'在庫表示を更新してください。',409);
  const current=(await this.square.count([m.variation_id])).get(m.variation_id);need(current===input.expectedQuantity,'在庫が変更されています。再読込してください。',409);
  const target=input.kind==='count'?quantity:current+quantity;integer(target,0,1000000);
  return this.queue('stock',id,{kind:input.kind,quantity,reason,before:current,target,mapping:m,requestFingerprint:await digest(input)},input.operationId,actor,[id],[['INSERT INTO mg_inventory_operations VALUES(?,?,?,?,?,?,?,?,?,?)',[input.operationId,id,input.kind,quantity,reason,actor,current,null,'queued',now()]]]);
 }
 async job(id){const r=await this.s.one('SELECT j.*,n.state AS notification_state FROM mg_jobs j LEFT JOIN mg_job_notifications n ON n.job_id=j.id WHERE j.id=?',[id]);need(r,'ジョブがありません。',404);return {id:r.id,kind:r.kind,resourceId:r.resource_id,state:r.state,attempts:r.attempts,error:r.last_error,updatedAt:r.updated_at,notificationState:r.notification_state||'none'};}
 async jobs(){return Promise.all((await this.s.all('SELECT id FROM mg_jobs ORDER BY created_at DESC LIMIT 200')).map(r=>this.job(r.id)));}
 async reconcile(id){
  const j=await this.s.one('SELECT * FROM mg_jobs WHERE id=?',[id]);need(j,'ジョブがありません。',404);if(j.state==='done')return this.job(id);
  need(j.state==='review','通常の再試行を使ってください。',409);const p=JSON.parse(j.payload_json);let result;
  if(j.kind==='stock'){need(j.result_json,'在庫操作の成功証跡がありません。Square側履歴の手動確認が必要です。',409);const count=(await this.square.count([p.mapping.variation_id])).get(p.mapping.variation_id);need(count===p.target,'在庫が一致しません。上書きせず停止しました。',409);result=JSON.parse(j.result_json);}
  else {const known=j.result_json?JSON.parse(j.result_json).mappings:p.maps;need(known?.length,'Square Item IDが不明です。自動照合できません。',409);const item=await this.square.object(known[0].item_id);const body=j.body_json?JSON.parse(j.body_json):null;const mappings=this.square.verifyCatalog(item,p.data,body?.batches[0].objects[0].item_data.image_ids,p.targetStatus);for(const old of known){const m=mappings.find(m=>m.variant_id===old.variant_id);need(m?.variation_id===old.variation_id,'Square IDが一致しません。',409);}result={mappings};}
  await this.s.run("UPDATE mg_jobs SET result_json=?,state='queued' WHERE id=?",[json(result),id]);await this.run(id);await this.schedule();return this.job(id);
 }
 async retry(id){const j=await this.s.one('SELECT * FROM mg_jobs WHERE id=?',[id]);need(j,'ジョブがありません。',404);need(j.state!=='review','競合・期限切れは自動再送できません。照合が必要です。',409);if(j.state!=='done')await this.run(id);await this.schedule();return this.job(id);}
 async run(id){
  const j=await this.s.one('SELECT * FROM mg_jobs WHERE id=?',[id]);if(!j||['done','review'].includes(j.state))return;
  if(!await this.schedule())return;
  const p=JSON.parse(j.payload_json);try{
   need(j.result_json||Date.now()-Date.parse(j.created_at)<3600000,'安全な再試行期限を超えました。新しいキーで再送しないでください。',409);
   need(j.result_json||j.attempts<8,'再試行回数を超えました。',409);
   await this.s.run("UPDATE mg_jobs SET state='running',attempts=attempts+1,updated_at=? WHERE id=?",[now(),id]);
   let body=j.body_json?JSON.parse(j.body_json):null,result=j.result_json?JSON.parse(j.result_json):null;
   if(!body){
    if(j.kind==='stock'){
     const adjustment={catalog_object_id:p.mapping.variation_id,location_id:this.env.SQUARE_LOCATION_ID,state:'IN_STOCK',quantity:String(p.target),occurred_at:now(),reference_id:id};
     body={idempotency_key:id,changes:[{type:'PHYSICAL_COUNT',physical_count:adjustment}]};
    }else{
     const imageIds=[];
     for(const imageId of p.data.images){let mapping=await this.s.one('SELECT * FROM mg_image_mappings WHERE image_id=?',[imageId]);if(!mapping){const image=await this.s.one('SELECT * FROM mg_images WHERE id=?',[imageId]);need(image&&this.env.PRODUCT_IMAGES,'画像ストレージが確認できません。',503);const object=await this.env.PRODUCT_IMAGES.get(image.object_key);need(object,'画像がありません。',409);const squareImageId=await this.square.image(imageId,await object.arrayBuffer(),image.mime);await this.s.run('INSERT INTO mg_image_mappings VALUES(?,?,?,?)',[imageId,'sandbox',squareImageId,now()]);mapping={square_image_id:squareImageId};}imageIds.push(mapping.square_image_id);}
     body=this.square.catalogBody({id:j.resource_id,data:p.data},p.maps,id,imageIds);
     if(j.kind==='state')for(const item of body.batches[0].objects){item.item_data.is_archived=p.targetStatus==='archived';item.present_at_location_ids=[];item.absent_at_location_ids=[this.env.SQUARE_LOCATION_ID];for(const v of item.item_data.variations){v.present_at_location_ids=[];v.absent_at_location_ids=[this.env.SQUARE_LOCATION_ID];}}
    }
    await this.s.run('UPDATE mg_jobs SET body_json=? WHERE id=?',[json(body),id]);
   }
   if(!result){
    if(j.kind==='stock'){await this.square.request('/v2/inventory/changes/batch-create','POST',body);result={applied:true};}
    else { result={mappings:await this.square.publish(body,p.data)}; for(const old of p.maps){const mapped=result.mappings.find(m=>m.variant_id===old.variant_id);need(mapped?.variation_id===old.variation_id&&mapped.item_id===old.item_id,'既存Square IDが変化しました。',409);} }
    await this.s.run('UPDATE mg_jobs SET result_json=? WHERE id=?',[json(result),id]);
   }
   const updates=[];
   if(j.kind==='stock'){
    const quantity=(await this.square.count([p.mapping.variation_id])).get(p.mapping.variation_id);
    need(quantity===p.target,'適用後に外部在庫が変化しました。再初期化せず照合してください。',409);
    updates.push(['UPDATE mg_inventory_operations SET after_quantity=?,state=? WHERE id=?',[quantity,'done',id]],['INSERT INTO mg_stock_snapshot VALUES(?,?,?) ON CONFLICT(variant_id) DO UPDATE SET quantity=excluded.quantity,observed_at=excluded.observed_at',[j.resource_id,quantity,now()]]);
   }else{
    updates.push(...result.mappings.map(m=>this.mappingInsert(m)));
    updates.push(['UPDATE mg_products SET published_revision=?,status=?,sort_order=?,version=version+1,updated_at=? WHERE id=?',[p.revision,p.targetStatus,p.data.sortOrder,now(),j.resource_id]]);
   }
   updates.push(["UPDATE mg_jobs SET state='done',last_error=NULL,updated_at=? WHERE id=?",[now(),id]],['DELETE FROM mg_locks WHERE job_id=?',[id]],this.s.audit('system','job_completed',j.resource_id,{job:id,kind:j.kind}));
   await this.s.batch(updates);
  }catch(error){
   const review=error.status===409||error.status===422||j.attempts>=7;const state=review?'review':'retry';
   await this.s.run('UPDATE mg_jobs SET state=?,last_error=?,next_due=?,updated_at=? WHERE id=?',[state,error.status?'同期内容・競合を確認してください。':'通信または保存に失敗しました。固定IDで再試行します。',Date.now()+Math.min(3600000,15000*2**j.attempts),now(),id]);
   if(j.kind==='stock')await this.s.run('UPDATE mg_inventory_operations SET state=? WHERE id=?',[state,id]);
  }
 }
 async schedule(){return this.supervision.schedule();}
 async recover(){return this.supervision.tick();}
 async products(){const products=await this.s.products();for(const p of products){const j=await this.s.one("SELECT state FROM mg_jobs WHERE resource_id=? AND kind IN ('publish','state') ORDER BY rowid DESC LIMIT 1",[p.id]);p.syncState=j?.state||'unlinked';}return products;}
 async handle(path,method,body,actor){
  if(path==='/api/admin/products/import'&&method==='POST')return importLegacy(this,actor);
  if(path==='/api/admin/products'&&method==='GET')return {products:await this.products()};
  if(path==='/api/admin/inventory'&&method==='GET')return {inventory:await this.inventory()};
  if(path==='/api/admin/audit'&&method==='GET')return {events:await this.s.all('SELECT actor,action,resource_id,detail_json,created_at FROM mg_audit ORDER BY created_at DESC LIMIT 200')};
  if(path==='/api/admin/jobs'&&method==='GET')return {jobs:await this.jobs(),monitoring:await this.supervision.status()};
  let m=path.match(/^\/api\/admin\/products\/([a-z0-9-]+)(?:\/(publish|state|link))?$/);
  if(m){const id=identifier(m[1]);if(method==='GET'&&!m[2]){const product=await this.s.product(id);need(product,'商品がありません。',404);return {product};}
   if(method==='PUT'&&!m[2])return this.save(id,body,actor);
   if(method==='POST'&&m[2])return this[m[2]](id,body,actor);
  }
  m=path.match(/^\/api\/admin\/inventory\/([a-z0-9-]+)$/);if(m&&method==='POST')return this.adjust(m[1],body,actor);
  m=path.match(/^\/api\/admin\/jobs\/([a-f0-9-]+)\/(retry|reconcile)$/);if(m&&method==='POST')return this[m[2]](operation(m[1]));
  need(false,'管理APIが見つかりません。',404);
 }
}
