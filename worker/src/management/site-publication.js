import {production,productionGrant} from '../production-policy.js';
import {CATALOG} from '../catalog.js';
import {need,operation,digest,json,now} from './domain.js';

export const independentPublication=env=>env.RUNTIME_TIER==='staging'||production(env)&&env.PRODUCTION_STOREFRONT_PUBLISH_ENABLED==='1';
export const sameVariants=(a,b)=>JSON.stringify(a?.variants)===JSON.stringify(b?.variants);
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
 const staging=manager.env.RUNTIME_TIER==='staging';
 const published=p.published_revision?await manager.s.one('SELECT data_json FROM mg_revisions WHERE product_id=? AND revision=?',[id,p.published_revision]):null;
 const presentationOnly=staging&&published&&sameVariants(JSON.parse(published.data_json),p.draft);
 if(!staging)await manager.s.assertUnlocked(p.draft.variants.map(v=>v.id));
 if(status==='published'&&!presentationOnly){
  const maps=await manager.s.all('SELECT m.* FROM mg_mappings m JOIN mg_variants v ON v.id=m.variant_id WHERE v.product_id=?',[id]);
  if(staging){await manager.s.assertUnlocked(maps.map(m=>m.variant_id));await manager.assertNoPurchaseHold(maps.map(m=>m.variant_id));}
  for(const v of p.draft.variants){
   const m=maps.find(m=>m.variant_id===v.id);
   // New, unlinked products may be displayed, but cannot enter the checkout catalog.
   if(!m&&!CATALOG[v.id])continue;
   need(m,'Square対応を照合してから公開してください。',409);
   need(m.environment===(staging?'sandbox':'production')&&m.location_id===manager.env.SQUARE_LOCATION_ID,'Squareの環境・Location対応が一致しません。',409);
   if(!staging)await manager.square.verified(m.variation_id);
   const o=await manager.square.object(m.variation_id),d=o?.item_variation_data;
   need(o&&!o.is_deleted&&d?.item_id===m.item_id&&(staging||d.sku===m.sku)&&d.name===v.name&&d.track_inventory===true&&d.sellable!==false&&d.price_money?.currency==='JPY'&&Number(d.price_money.amount)===v.price,'Squareの商品・SKU・価格・在庫追跡と一致しません。',409);
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
