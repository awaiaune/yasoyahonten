import {production,productionSquareRequest} from '../production-policy.js';
import {assertSquareRequest, assertSquareWrite, externalPolicy} from '../external-policy.js';
import { need, ManagementError, guard, squareId } from './domain.js';
const squareDescription=d=>d.description+(d.variants.some(v=>v.amount)?'\n\n'+d.variants.filter(v=>v.amount).map(v=>v.name+'：'+v.amount).join('\n'):'');
export class Square {
 constructor(env){this.env=env;}
 baseUrl(){return production(this.env)?'https://connect.squareup.com':'https://connect.squareupsandbox.com';}
 token(){return production(this.env)?this.env.PRODUCTION_MANAGEMENT_SQUARE_TOKEN:['sandbox-validation','staging'].includes(this.env.RUNTIME_TIER)?this.env.SQUARE_SANDBOX_ACCESS_TOKEN:this.env.SQUARE_ACCESS_TOKEN;}
 async verified(id){const row=await this.env.ORDERS_DB.prepare('SELECT * FROM mg_mappings WHERE variation_id=?').bind(id).first();need(row?.environment==='production'&&row.location_id===this.env.SQUARE_LOCATION_ID&&row.instance_id===this.env.PRODUCTION_INSTANCE_ID&&typeof row.sku==='string'&&row.sku.length>0&&row.verified_at,'実照合済みの本番対応表が必要です。',409);return row;}
 async request(path,method='GET',body){
  await guard(this.env);
  need(/^\/v2\/(locations|catalog\/(list(?:\?[^#]*)?|batch-upsert|object\/[A-Z0-9]+)|inventory\/(counts\/batch-retrieve|changes\/batch-create))$/.test(path),'許可されていないSquare操作です。',503);
  const url=this.baseUrl()+path;
  if(production(this.env))productionSquareRequest(this.env,url,method,'management');else assertSquareRequest(this.env,url,method);
  if((production(this.env)||externalPolicy(this.env).managementOnly)&&method!=='GET'&&path!=='/v2/inventory/counts/batch-retrieve'){
   await this.assertWritableLocation();
   if(path==='/v2/inventory/changes/batch-create')need(body?.changes?.length===1&&body.changes[0].type==='PHYSICAL_COUNT'&&body.changes[0].physical_count?.location_id===this.env.SQUARE_LOCATION_ID&&body.changes[0].physical_count.state==='IN_STOCK','管理在庫は対象Locationの棚卸し確定だけを許可します。',409);
   if(production(this.env)&&path==='/v2/inventory/changes/batch-create'){const id=body.changes[0].physical_count.catalog_object_id,m=await this.verified(id),v=await this.object(id);need(v?.item_variation_data?.sku===m.sku&&v.item_variation_data.item_id===m.item_id&&v.item_variation_data.track_inventory===true,'在庫操作前に本番ID・SKUが変わっています。',409);}
   if(path==='/v2/catalog/batch-upsert'){
    const items=body?.batches?.flatMap(b=>b.objects)||[];
    need(items.length===1&&items[0].type==='ITEM'&&items.every(item=>[item,...(item.item_data?.variations||[])].every(o=>o.present_at_all_locations===false&&[...(o.present_at_location_ids||[]),...(o.absent_at_location_ids||[])].every(id=>id===this.env.SQUARE_LOCATION_ID))),'Catalogの公開先は対象Sandbox Locationだけに限定します。',409);
   }
  }
  if(path==='/v2/catalog/batch-upsert'){this.assertExistingBody(body);if(production(this.env))for(const item of body.batches.flatMap(b=>b.objects))for(const v of item.item_data.variations){if(v.id.startsWith('#'))continue;const old=await this.verified(v.id);need(old.item_id===item.id&&old.sku===v.item_variation_data.sku&&v.item_variation_data.item_id===item.id,'既存の本番Item・Variation・SKUを変更できません。',409);}}
  const token=this.token();
  need(token,'Sandboxキーが未設定です。',503);
  const options={method,redirect:'manual',signal:AbortSignal.timeout(8000),headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','Square-Version':'2026-07-15'},...(body?{body:JSON.stringify(body)}:{})};
  const r=this.env.LOCAL_SQUARE?await this.env.LOCAL_SQUARE.fetch(new Request(url,options)):await fetch(url,options);
  const data=await r.json().catch(()=>({}));
  if(!r.ok){const conflict=r.status===409||data.errors?.some(e=>['VERSION_MISMATCH','CATALOG_VERSION_MISMATCH'].includes(e.code));const error=new ManagementError(conflict?409:(r.status>=400&&r.status<500&&r.status!==429?422:503),conflict?'Square側が変更されています。自動上書きを停止しました。':'Square同期に失敗しました。');error.upstreamStatus=r.status;error.squareCode=/^[A-Z0-9_]{1,80}$/.test(data.errors?.[0]?.code||'')?data.errors[0].code:'UNKNOWN';throw error;}
  return data;
 }
 async assertUniqueSku(id,sku){
  need(typeof sku==='string'&&sku.length>0,'実SKUが必要です。',409);let cursor;const seen=new Set();let found=0;
  for(let page=0;page<100;page++){const data=await this.request('/v2/catalog/list?types=ITEM_VARIATION'+(cursor?'&cursor='+encodeURIComponent(cursor):''));for(const o of data.objects||[])if(!o.is_deleted&&o.item_variation_data?.sku===sku){need(o.id===id,'Square SKUが重複しています。',409);found++;}if(!data.cursor){need(found===1,'Square SKUが欠落または重複しています。',409);return;}need(typeof data.cursor==='string'&&!seen.has(data.cursor),'SKU照合の一覧取得が不完全です。',409);cursor=data.cursor;seen.add(cursor);}
  need(false,'SKU照合の上限を超えました。',409);
 }
 async assertWritableLocation(){
  const data=await this.request('/v2/locations');
  const matches=(data.locations||[]).filter(l=>l.id===this.env.SQUARE_LOCATION_ID);
  need(matches.length===1&&matches[0].status==='ACTIVE'&&matches[0].country==='JP'&&matches[0].currency==='JPY','Sandbox Locationの状態・国・通貨が一致しません。書き込みを停止しました。',409);
 }
 async assertNewSkusAvailable(product,maps){
  if(!production(this.env)&&!externalPolicy(this.env).managementOnly&&this.env.RUNTIME_TIER!=='staging')return;
  const missing=product.variants.filter(v=>!maps.some(m=>m.variant_id===v.id));if(!missing.length)return;
  const skus=new Set(missing.map(v=>v.id)),seen=new Set();let cursor;
  for(let page=0;page<100;page++){
   const data=await this.request('/v2/catalog/list?types=ITEM_VARIATION'+(cursor?'&cursor='+encodeURIComponent(cursor):''));
   need(!(data.objects||[]).some(o=>!o.is_deleted&&skus.has(o.item_variation_data?.sku)),'同じSKUの商品がSquareに存在します。新規登録せず対応表を確認してください。',409);
   if(!data.cursor)return;need(typeof data.cursor==='string'&&!seen.has(data.cursor),'Square商品一覧のページ取得が不完全です。',409);cursor=data.cursor;seen.add(cursor);
  }
  need(false,'Square商品一覧の確認上限を超えました。',409);
 }
 assertExistingBody(body){
  if(!['sandbox-validation','staging'].includes(this.env.RUNTIME_TIER))return;
  // Also inspect durable bodies created by older code; never rewrite a stored request.
  for(const id of Object.keys(JSON.parse(this.env.SQUARE_VARIATION_IDS||'{}'))){
   const ref=this.expectedLink(id);need(ref,'既存Item・Variation・SKUの対応表が必要です。',409);
   for(const item of body?.batches?.flatMap(b=>b.objects)||[]){
    const variations=item.item_data?.variations||[];
    const touched=item.id===ref.itemId||variations.some(v=>v.id===ref.variationId||[id,ref.sku].includes(v.item_variation_data?.sku));
    if(touched)need(item.id===ref.itemId&&variations.some(v=>v.id===ref.variationId&&v.item_variation_data?.item_id===ref.itemId&&v.item_variation_data?.sku===ref.sku),'既存Square ID・SKUを変える送信本文は再送できません。',409);
   }
  }
 }
 expectedLink(id){
  if(this.env.RUNTIME_TIER!=='sandbox-validation')return null;
  let links;try{links=JSON.parse(this.env.SQUARE_EXISTING_LINKS||'{}');}catch{need(false,'既存Square対応表が不正です。',503);}
  const ref=links[id];if(!ref)return null;need(ref.sku==='yasoya-sandbox-v1:'+id,'既存SKUが一致しません。',409);squareId(ref.itemId);squareId(ref.variationId);need(typeof ref.sku==='string'&&ref.sku.length>0&&ref.sku.length<=255,'既存SKUが不正です。',503);
  const ids=JSON.parse(this.env.SQUARE_VARIATION_IDS||'{}');need(ids[id]===ref.variationId,'既存Variation IDが一致しません。',409);return ref;
 }
 async preserveMappings(maps){
  if((production(this.env)||externalPolicy(this.env).managementOnly)&&maps.length){
   need(new Set(maps.map(m=>m.item_id)).size===1,'商品対応表が複数Itemに分かれています。',409);
   const item=await this.object(maps[0].item_id),known=new Set(maps.map(m=>m.variation_id));
   need(item?.type==='ITEM'&&!item.is_deleted&&item.item_data?.variations?.every(v=>known.has(v.id)),'Square側に未管理のバリエーションがあります。上書きせず照合してください。',409);
  }
  return Promise.all(maps.map(async m=>{const ref=this.expectedLink(m.variant_id),o=await this.object(m.variation_id),d=o?.item_variation_data;
   need(o?.id===m.variation_id&&d?.item_id===m.item_id&&typeof d.sku==='string'&&d.sku.length>0,'Square ID・SKUを確認できません。',409);
   if(['sandbox-validation','staging'].includes(this.env.RUNTIME_TIER)&&JSON.parse(this.env.SQUARE_VARIATION_IDS||'{}')[m.variant_id])need(ref&&ref.itemId===m.item_id&&ref.variationId===m.variation_id&&ref.sku===d.sku,'既存Square対応表が一致しません。',409);
   if(production(this.env)){const verified=await this.verified(m.variation_id);need(verified.item_id===m.item_id&&verified.variant_id===m.variant_id&&verified.sku===d.sku,'実照合後に本番ID・SKUが変わっています。',409);}
   return {...m,sku:d.sku};}));
 }
 async count(ids){
  if(!ids.length)return new Map();for(const id of ids){squareId(id,this.env);if(production(this.env))await this.verified(id);}if(ids.length>100){const counts=new Map();for(let start=0;start<ids.length;start+=100)for(const [id,n] of await this.count(ids.slice(start,start+100)))counts.set(id,n);return counts;}
  const data=await this.request('/v2/inventory/counts/batch-retrieve','POST',{catalog_object_ids:ids,location_ids:[this.env.SQUARE_LOCATION_ID],states:['IN_STOCK']});
  need(!data.cursor,'在庫応答が不完全です。',503);
  const result=new Map(ids.map(id=>[id,0]));
  for(const c of data.counts||[])if(ids.includes(c.catalog_object_id)&&c.location_id===this.env.SQUARE_LOCATION_ID&&c.state==='IN_STOCK'){
   const n=Number(c.quantity);need(Number.isSafeInteger(n)&&n>=0,'在庫数を安全に扱えません。',409);result.set(c.catalog_object_id,n);
  }
  return result;
 }
 async findCreatedItem(body){
  const sent=body?.batches?.[0]?.objects?.[0],skus=sent?.item_data?.variations?.map(v=>v.item_variation_data?.sku);
  need(sent?.id?.startsWith('#')&&skus?.length&&skus.every(Boolean)&&new Set(skus).size===skus.length,'作成時のSKU証跡がありません。自動照合できません。',409);
  const matches=new Map(),seen=new Set();let cursor;
  for(let page=0;page<100;page++){
   const data=await this.request('/v2/catalog/list?types=ITEM'+(cursor?'&cursor='+encodeURIComponent(cursor):''));
   for(const item of data.objects||[])if(!item.is_deleted&&item.type==='ITEM'&&item.item_data?.variations?.some(v=>skus.includes(v.item_variation_data?.sku)))matches.set(item.id,item);
   if(!data.cursor){need(matches.size===1,'作成済みItemを一意に確認できません。SKUの欠落・重複を確認してください。',409);return [...matches.values()][0];}
   need(typeof data.cursor==='string'&&!seen.has(data.cursor),'Square一覧の照合が不完全です。',503);seen.add(data.cursor);cursor=data.cursor;
  }
  need(false,'Square一覧の確認上限を超えました。',503);
 }
 async object(id){squareId(id,this.env);return (await this.request('/v2/catalog/object/'+id)).object;}
 catalogBody(product,maps,key,imageIds=[]){
  const existing=maps[0];const itemId=existing?.item_id||'#item-'+product.id;
  const item={type:'ITEM',id:itemId,present_at_all_locations:false,present_at_location_ids:[this.env.SQUARE_LOCATION_ID],item_data:{name:product.data.name,description:squareDescription(product.data),is_archived:false,image_ids:imageIds,variations:product.data.variants.map(v=>{
   const m=maps.find(m=>m.variant_id===v.id);need(!m||typeof m.sku==='string'&&m.sku.length>0,'既存SKUの照合が必要です。',409);return {type:'ITEM_VARIATION',id:m?.variation_id||'#var-'+v.id,...(m?{version:m.variation_version}:{}),present_at_all_locations:false,present_at_location_ids:v.active?[this.env.SQUARE_LOCATION_ID]:[],absent_at_location_ids:v.active?[]:[this.env.SQUARE_LOCATION_ID],item_variation_data:{item_id:itemId,name:v.name,sku:m?.sku??v.id,pricing_type:'FIXED_PRICING',price_money:{amount:v.price,currency:'JPY'},track_inventory:true}};
  })}};
  if(existing)item.version=existing.item_version;
  return {idempotency_key:key,batches:[{objects:[item]}]};
 }
 async publish(body,expected){
  const data=await this.request('/v2/catalog/batch-upsert','POST',body);
  const item=data.objects?.find(o=>o.type==='ITEM');const target=body.batches[0].objects[0];return this.verifyCatalog(item,expected,target.item_data.image_ids,target.item_data.is_archived?'archived':target.absent_at_location_ids?.includes(this.env.SQUARE_LOCATION_ID)?'stopped':'published',target.item_data.variations);
 }
 verifyCatalog(item,expected,imageIds,status='published',sent=[]){
  need(item?.item_data?.variations?.length===expected.variants.length,'Square応答の確認が必要です。',409);
  need(item.item_data.name===expected.name&&item.item_data.description===squareDescription(expected),'Square商品情報が一致しません。',409);if(imageIds)need(JSON.stringify(item.item_data.image_ids||[])===JSON.stringify(imageIds),'Square画像が一致しません。',409);squareId(item.id,this.env);
  const present=o=>(o.present_at_all_locations||o.present_at_location_ids?.includes(this.env.SQUARE_LOCATION_ID))&&!o.absent_at_location_ids?.includes(this.env.SQUARE_LOCATION_ID);
  need(status==='published'?present(item)&&!item.item_data.is_archived:!present(item)&&Boolean(item.item_data.is_archived)===(status==='archived'),'Square販売状態が一致しません。',409);
  const maps=expected.variants.map((v,index)=>{
   const desired=sent[index],ref=this.expectedLink(v.id),sku=desired?.item_variation_data?.sku||ref?.sku||v.id;
   const candidates=item.item_data.variations.filter(o=>o.item_variation_data?.sku===sku);need(candidates.length===1,'Square SKUが重複または欠落しています。',409);
   const o=candidates[0],d=o?.item_variation_data;
   need(d.item_id===item.id&&(!desired||desired.id.startsWith('#')||o.id===desired.id)&&(!ref||ref.itemId===item.id&&ref.variationId===o.id&&ref.sku===d.sku),'Square Item・Variation・SKUが一致しません。',409);
   need(d&&d.price_money?.currency==='JPY'&&Number(d.price_money.amount)===v.price&&d.track_inventory===true&&d.name===v.name,'Squareの商品情報が一致しません。',409);
   need(Boolean(present(o))===(status==='published'&&v.active),'Squareの販売対象が一致しません。',409);squareId(o.id,this.env);need(Number.isSafeInteger(item.version)&&Number.isSafeInteger(o.version),'Squareバージョンが不明です。',409);
   return {variant_id:v.id,item_id:item.id,variation_id:o.id,item_version:item.version,variation_version:o.version,...(production(this.env)?{sku:d.sku}: {})};
  });return maps;
 }
 async image(imageId,bytes,mime){
  await guard(this.env);assertSquareWrite(this.env);const key=(production(this.env)?'mg-production-image-':'mg-image-')+imageId;
  if(production(this.env))productionSquareRequest(this.env,this.baseUrl()+'/v2/catalog/images','POST','management');else assertSquareRequest(this.env,this.baseUrl()+'/v2/catalog/images','POST');
  if(production(this.env)||externalPolicy(this.env).managementOnly)await this.assertWritableLocation();
  const form=new FormData();form.set('request',JSON.stringify({idempotency_key:key,image:{type:'IMAGE',id:'#'+imageId,image_data:{name:imageId,caption:'商品画像'}}}));form.set('file',new Blob([bytes],{type:mime}),'product.'+(mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg'));
  const token=this.token();need(token,'Sandboxキーが必要です。',503);
  const r=await (this.env.LOCAL_SQUARE?this.env.LOCAL_SQUARE.fetch(new Request(this.baseUrl()+'/v2/catalog/images',{method:'POST',headers:{Authorization:'Bearer '+token,'Square-Version':'2026-07-15'},body:form})):fetch(this.baseUrl()+'/v2/catalog/images',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(8000),headers:{Authorization:'Bearer '+token,'Square-Version':'2026-07-15'},body:form}));
  const data=await r.json().catch(()=>({}));if(!r.ok)throw new ManagementError(r.status>=500||r.status===429?503:422,'Square画像同期に失敗しました。');squareId(data.image?.id,this.env);return data.image.id;
 }

}
