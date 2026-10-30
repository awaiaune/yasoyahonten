import {retiredProduct,removeFeaturedStatements} from './storefront-selection.js';
import {production,productionGrant} from '../production-policy.js';
import {CATALOG} from '../catalog.js';
import {need,operation,digest,json,now,ManagementError} from './domain.js';

export const independentPublication=env=>env.RUNTIME_TIER==='staging'||production(env)&&env.PRODUCTION_STOREFRONT_PUBLISH_ENABLED==='1';
const commercialVariants=data=>(data?.variants||[]).map(v=>[v.id,v.name?.trim(),v.price,v.maxQuantity??10,v.active!==false]).sort((a,b)=>a[0].localeCompare(b[0]));
export const sameVariants=(a,b)=>JSON.stringify(commercialVariants(a))===JSON.stringify(commercialVariants(b));
export const siteEnabled=env=>production(env)&&env.PRODUCTION_STOREFRONT_ENABLED==='1';
export function siteGrant(env){
 if(env.RUNTIME_TIER==='staging'){need(env.MANAGEMENT_ENABLED==='1','サイト公開は無効です。',403);return;}
 need(production(env)&&env.PRODUCTION_STOREFRONT_PUBLISH_ENABLED==='1','サイト公開は無効です。',403);
 productionGrant(env,'draft');
}
// Local publication is deliberately separate from Square Catalog synchronization.
export async function publishSite(manager,id,input,actor){
 siteGrant(manager.env);operation(input.operationId);
 const status=input.status||'published';need(['published','stopped','archived'].includes(status),'公開状態が不正です。');
 const fp=await digest(['site-publication',id,input]);const previous=await manager.command(input.operationId,fp);if(previous)return previous;
 const p=await manager.s.product(id);need(p&&p.version===input.expectedVersion,'商品が更新されています。再読込してください。',409);
 if(status==='published')need(!retiredProduct(manager.env,p)&&!(await manager.s.retiredProductIds()).has(id),'この商品は販売終了です。再公開できません。',409);
 if(manager.env.RUNTIME_TIER==='staging')return publishStagingSite(manager,p,input,actor,fp,status);
 await manager.s.assertUnlocked(p.draft.variants.map(v=>v.id));
 if(status==='published'){
  const maps=await manager.s.all('SELECT m.* FROM mg_mappings m JOIN mg_variants v ON v.id=m.variant_id WHERE v.product_id=?',[id]);
  for(const v of p.draft.variants){
   const m=maps.find(m=>m.variant_id===v.id);
   if(!m&&!CATALOG[v.id])continue;
   need(m,'Square対応を照合してから公開してください。',409);
   need(m.environment==='production'&&m.location_id===manager.env.SQUARE_LOCATION_ID,'Squareの環境・Location対応が一致しません。',409);
   await manager.square.verified(m.variation_id);
   const o=await manager.square.object(m.variation_id),d=o?.item_variation_data;
   need(o&&!o.is_deleted&&d?.item_id===m.item_id&&d.sku===m.sku&&d.name===v.name&&d.track_inventory===true&&d.sellable!==false&&d.price_money?.currency==='JPY'&&Number(d.price_money.amount)===v.price,'Squareの商品・SKU・価格・在庫追跡と一致しません。',409);
   need((o.present_at_all_locations||o.present_at_location_ids?.includes(manager.env.SQUARE_LOCATION_ID))&&!o.absent_at_location_ids?.includes(manager.env.SQUARE_LOCATION_ID),'対象Locationで販売できません。',409);
   if(CATALOG[v.id]&&manager.env.PRODUCTION_MANAGED_CHECKOUT_ENABLED!=='1')need(v.price===CATALOG[v.id].price,'既存購入価格を維持してください。',409);
  }
 }
 const result={ok:true,state:'done',siteOnly:true,status};
 await manager.s.batch([
  ['UPDATE mg_products SET published_revision=?,status=?,sort_order=?,version=version+1,updated_at=? WHERE id=?',[status==='published'?p.draft_revision:p.published_revision,status,p.draft.sortOrder,now(),id]],
  ['INSERT INTO mg_commands VALUES(?,?,?)',[input.operationId,fp,json(result)]],
  manager.s.audit(actor,'site_'+status,id,{revision:p.draft_revision,squareWrite:false})
 ]);return result;
}

// Publishing presentation data never requires an external write or releases a lock.
async function publishStagingSite(manager,p,input,actor,fp,status){
 const row=p.published_revision?await manager.s.one('SELECT data_json FROM mg_revisions WHERE product_id=? AND revision=?',[p.id,p.published_revision]):null;
 const previous=row?JSON.parse(row.data_json):null;
 let data=p.draft,revision=p.draft_revision;const warnings=[],statements=[];
 if(status==='published'&&!sameVariants(previous,p.draft)){
  try{
   const maps=await manager.s.all('SELECT m.* FROM mg_mappings m JOIN mg_variants v ON v.id=m.variant_id WHERE v.product_id=?',[p.id]);
   await manager.s.assertUnlocked(maps.map(m=>m.variant_id));await manager.assertNoPurchaseHold(maps.map(m=>m.variant_id));
   for(const v of p.draft.variants){
    const m=maps.find(m=>m.variant_id===v.id);if(!m)continue; // Visible only; checkout excludes unlinked IDs.
    need(m.environment==='sandbox'&&m.location_id===manager.env.SQUARE_LOCATION_ID,'Squareの環境・Location対応が一致しません。',409);
    const o=await manager.square.object(m.variation_id),d=o?.item_variation_data;
    need(o&&!o.is_deleted&&d?.item_id===m.item_id&&d.name===v.name&&d.track_inventory===true&&d.sellable!==false&&d.price_money?.currency==='JPY'&&Number(d.price_money.amount)===v.price&&(o.present_at_all_locations||o.present_at_location_ids?.includes(manager.env.SQUARE_LOCATION_ID))&&!o.absent_at_location_ids?.includes(manager.env.SQUARE_LOCATION_ID),'Squareの価格・販売設定・在庫追跡と一致しません。',409);
   }
  }catch(error){
   if(!previous)throw error;
   // Retain the last published commercial snapshot, never the unsynchronized price.
   data={...p.draft,variants:previous.variants};
   warnings.push('表示情報のみ公開しました。価格・バリエーション・販売設定は前回公開値を維持しています。'+(error instanceof ManagementError?error.message:'Square照合結果を確認できません。'));
  }
 }
 if(status==='published'&&data!==p.draft){
  revision=(await manager.s.one('SELECT MAX(revision) AS revision FROM mg_revisions WHERE product_id=?',[p.id])).revision+1;
  statements.push(['INSERT INTO mg_revisions VALUES(?,?,?,?)',[p.id,revision,json(data),now()]]);
 }
 if(status!=='published')statements.push(...await removeFeaturedStatements(manager.s,p.id,actor));
 const result={ok:true,state:'done',siteOnly:true,status,warnings};
 statements.push(
  ['UPDATE mg_products SET published_revision=?,status=?,sort_order=?,version=version+1,updated_at=? WHERE id=?',[status==='published'?revision:p.published_revision,status,p.draft.sortOrder,now(),p.id]],
  ['INSERT INTO mg_commands VALUES(?,?,?)',[input.operationId,fp,json(result)]],
  manager.s.audit(actor,'site_'+status,p.id,{revision,status,squareWrite:false,warnings})
 );
 await manager.s.batch(statements);return result;
}
