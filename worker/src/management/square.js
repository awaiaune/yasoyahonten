import { need, ManagementError, guard, squareId } from './domain.js';
const squareDescription=d=>d.description+(d.variants.some(v=>v.amount)?'\n\n'+d.variants.filter(v=>v.amount).map(v=>v.name+'：'+v.amount).join('\n'):'');
export class Square {
 constructor(env){this.env=env;}
 async request(path,method='GET',body){
  await guard(this.env);
  need(/^\/v2\/(catalog\/(batch-upsert|object\/[A-Z0-9]+)|inventory\/(counts\/batch-retrieve|changes\/batch-create))$/.test(path),'許可されていないSquare操作です。',503);
  const url='https://connect.squareupsandbox.com'+path;
  const token=this.env.RUNTIME_TIER==='sandbox-validation'?this.env.SQUARE_SANDBOX_ACCESS_TOKEN:this.env.SQUARE_ACCESS_TOKEN;
  need(token,'Sandboxキーが未設定です。',503);
  const options={method,redirect:'manual',signal:AbortSignal.timeout(8000),headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','Square-Version':'2026-07-15'},...(body?{body:JSON.stringify(body)}:{})};
  const r=this.env.LOCAL_SQUARE?await this.env.LOCAL_SQUARE.fetch(new Request(url,options)):await fetch(url,options);
  const data=await r.json().catch(()=>({}));
  if(!r.ok){const conflict=r.status===409||data.errors?.some(e=>['VERSION_MISMATCH','CATALOG_VERSION_MISMATCH'].includes(e.code));throw new ManagementError(conflict?409:(r.status>=400&&r.status<500&&r.status!==429?422:503),conflict?'Square側が変更されています。自動上書きを停止しました。':'Square同期に失敗しました。');}
  return data;
 }
 async count(ids){
  if(!ids.length)return new Map();for(const id of ids)squareId(id);if(ids.length>100){const counts=new Map();for(let start=0;start<ids.length;start+=100)for(const [id,n] of await this.count(ids.slice(start,start+100)))counts.set(id,n);return counts;}
  const data=await this.request('/v2/inventory/counts/batch-retrieve','POST',{catalog_object_ids:ids,location_ids:[this.env.SQUARE_LOCATION_ID],states:['IN_STOCK']});
  need(!data.cursor,'在庫応答が不完全です。',503);
  const result=new Map(ids.map(id=>[id,0]));
  for(const c of data.counts||[])if(ids.includes(c.catalog_object_id)&&c.location_id===this.env.SQUARE_LOCATION_ID&&c.state==='IN_STOCK'){
   const n=Number(c.quantity);need(Number.isSafeInteger(n)&&n>=0,'在庫数を安全に扱えません。',409);result.set(c.catalog_object_id,n);
  }
  return result;
 }
 async object(id){squareId(id);return (await this.request('/v2/catalog/object/'+id)).object;}
 catalogBody(product,maps,key,imageIds=[]){
  const existing=maps[0];const itemId=existing?.item_id||'#item-'+product.id;
  const item={type:'ITEM',id:itemId,present_at_all_locations:false,present_at_location_ids:[this.env.SQUARE_LOCATION_ID],item_data:{name:product.data.name,description:squareDescription(product.data),is_archived:false,image_ids:imageIds,variations:product.data.variants.map(v=>{
   const m=maps.find(m=>m.variant_id===v.id);return {type:'ITEM_VARIATION',id:m?.variation_id||'#var-'+v.id,...(m?{version:m.variation_version}:{}),present_at_all_locations:false,present_at_location_ids:v.active?[this.env.SQUARE_LOCATION_ID]:[],absent_at_location_ids:v.active?[]:[this.env.SQUARE_LOCATION_ID],item_variation_data:{item_id:itemId,name:v.name,sku:v.id,pricing_type:'FIXED_PRICING',price_money:{amount:v.price,currency:'JPY'},track_inventory:true}};
  })}};
  if(existing)item.version=existing.item_version;
  return {idempotency_key:key,batches:[{objects:[item]}]};
 }
 async publish(body,expected){
  const data=await this.request('/v2/catalog/batch-upsert','POST',body);
  const item=data.objects?.find(o=>o.type==='ITEM');const target=body.batches[0].objects[0];return this.verifyCatalog(item,expected,target.item_data.image_ids,target.item_data.is_archived?'archived':target.absent_at_location_ids?.includes(this.env.SQUARE_LOCATION_ID)?'stopped':'published');
 }
 verifyCatalog(item,expected,imageIds,status='published'){
  need(item?.item_data?.variations?.length===expected.variants.length,'Square応答の確認が必要です。',409);
  need(item.item_data.name===expected.name&&item.item_data.description===squareDescription(expected),'Square商品情報が一致しません。',409);if(imageIds)need(JSON.stringify(item.item_data.image_ids||[])===JSON.stringify(imageIds),'Square画像が一致しません。',409);squareId(item.id);
  const present=o=>(o.present_at_all_locations||o.present_at_location_ids?.includes(this.env.SQUARE_LOCATION_ID))&&!o.absent_at_location_ids?.includes(this.env.SQUARE_LOCATION_ID);
  need(status==='published'?present(item)&&!item.item_data.is_archived:!present(item)&&Boolean(item.item_data.is_archived)===(status==='archived'),'Square販売状態が一致しません。',409);
  const maps=expected.variants.map(v=>{const o=item.item_data.variations.find(o=>o.item_variation_data?.sku===v.id),d=o?.item_variation_data;
   need(d&&d.price_money?.currency==='JPY'&&Number(d.price_money.amount)===v.price&&d.track_inventory===true&&d.name===v.name,'Squareの商品情報が一致しません。',409);
   need(Boolean(present(o))===(status==='published'&&v.active),'Squareの販売対象が一致しません。',409);squareId(o.id);need(Number.isSafeInteger(item.version)&&Number.isSafeInteger(o.version),'Squareバージョンが不明です。',409);
   return {variant_id:v.id,item_id:item.id,variation_id:o.id,item_version:item.version,variation_version:o.version};
  });return maps;
 }
 async image(imageId,bytes,mime){
  await guard(this.env);const key='mg-image-'+imageId;
  const form=new FormData();form.set('request',JSON.stringify({idempotency_key:key,image:{type:'IMAGE',id:'#'+imageId,image_data:{name:imageId,caption:'商品画像'}}}));form.set('file',new Blob([bytes],{type:mime}),'product.'+(mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg'));
  const token=this.env.RUNTIME_TIER==='sandbox-validation'?this.env.SQUARE_SANDBOX_ACCESS_TOKEN:this.env.SQUARE_ACCESS_TOKEN;need(token,'Sandboxキーが必要です。',503);
  const r=await (this.env.LOCAL_SQUARE?this.env.LOCAL_SQUARE.fetch(new Request('https://connect.squareupsandbox.com/v2/catalog/images',{method:'POST',headers:{Authorization:'Bearer '+token,'Square-Version':'2026-07-15'},body:form})):fetch('https://connect.squareupsandbox.com/v2/catalog/images',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(8000),headers:{Authorization:'Bearer '+token,'Square-Version':'2026-07-15'},body:form}));
  const data=await r.json().catch(()=>({}));if(!r.ok)throw new ManagementError(r.status>=500||r.status===429?503:422,'Square画像同期に失敗しました。');squareId(data.image?.id);return data.image.id;
 }

}
