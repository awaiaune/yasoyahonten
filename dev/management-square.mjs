// Offline Square substitute. It never forwards requests and accepts no real tokens.
import { readFile, writeFile, rename } from 'node:fs/promises';
export class ManagementSquare {
 constructor(file=null){this.file=file;this.locationId='LOCALMGMTLOCATION';this.locationPatch={};this.objects=new Map();this.counts=new Map();this.receipts=new Map();this.payments=new Map();this.version=0;this.calls=[];this.failBefore=null;this.loseAfter=null;this.lookupFails=false;this.queue=Promise.resolve();}
 async load(){if(this.file)try{const d=JSON.parse(await readFile(this.file,'utf8'));for(const k of ['objects','counts','receipts','payments'])this[k]=new Map(d[k]);this.version=d.version;}catch(e){if(e.code!=='ENOENT')throw e;}return this;}
 async persist(){if(this.file){const d={version:this.version};for(const k of ['objects','counts','receipts','payments'])d[k]=[...this[k]];await writeFile(this.file+'.tmp',JSON.stringify(d),{mode:0o600});await rename(this.file+'.tmp',this.file);}}
 fetch(request){const job=this.queue.then(()=>this.handle(request));this.queue=job.catch(()=>{});return job;}
 async handle(request){
  const u=new URL(request.url);if(u.origin!=='https://connect.squareupsandbox.com')throw Error('No external API allowed');const path=u.pathname;this.calls.push(path);if(this.lookupFails&&request.method==='GET'&&path.startsWith('/v2/payments'))return new Response('offline lookup failure',{status:503});
  if(this.failBefore===path)return Response.json({errors:[{code:'INTERNAL_SERVER_ERROR'}]},{status:503});
  let body;if(request.method!=='GET'){body=path==='/v2/catalog/images'?JSON.parse((await request.formData()).get('request')):await request.json();}let result;
  if(body?.idempotency_key&&this.receipts.has(body.idempotency_key)){const previous=this.receipts.get(body.idempotency_key);if(previous.body!==JSON.stringify(body))return Response.json({errors:[{code:'IDEMPOTENCY_KEY_REUSED'}]},{status:409});return Response.json(previous.result);}
  if(path==='/v2/locations')return Response.json({locations:[{id:this.locationId,status:'ACTIVE',country:'JP',currency:'JPY',...this.locationPatch}]});
  if(path==='/v2/catalog/list')return Response.json({objects:[...this.objects.values()].filter(o=>!u.searchParams.get('types')||u.searchParams.get('types').split(',').includes(o.type))});
  if(path==='/v2/catalog/images'){const image={...body.image,id:'TESTIMAGE'+String(++this.version).padStart(12,'0')};this.objects.set(image.id,image);result={image};}
  else if(path==='/v2/catalog/batch-upsert'){
   const item=structuredClone(body.batches[0].objects[0]),old=this.objects.get(item.id);
   if(old&&old.version!==item.version)return Response.json({errors:[{code:'VERSION_MISMATCH'}]},{status:409});
   const existing=old?.item_data.variations||[];
   for(const v of item.item_data.variations){const prev=existing.find(o=>o.id===v.id);if(prev&&v.version!==prev.version)return Response.json({errors:[{code:'VERSION_MISMATCH'}]},{status:409});}
   if(item.id.startsWith('#'))item.id='TESTITEM'+String(++this.version).padStart(12,'0');
   item.version=++this.version;
   for(const v of item.item_data.variations){if(v.id.startsWith('#'))v.id='TESTVAR'+String(++this.version).padStart(12,'0');v.version=this.keepVariationVersion&&existing.find(old=>old.id===v.id)?.version||item.version;v.item_variation_data.item_id=item.id;this.objects.set(v.id,v);}
   this.objects.set(item.id,item);result={objects:[item]};
  }else if(path.startsWith('/v2/catalog/object/')){const object=this.objects.get(path.split('/').pop());return Response.json({object},{status:object?200:404});}
  else if(path==='/v2/inventory/counts/batch-retrieve'){result={counts:body.catalog_object_ids.map(id=>({catalog_object_id:id,location_id:body.location_ids[0],state:'IN_STOCK',quantity:String(this.counts.get(id)||0)}))};}
  else if(path==='/v2/inventory/changes/batch-create'){
   for(const c of body.changes){if(c.type==='PHYSICAL_COUNT')this.counts.set(c.physical_count.catalog_object_id,Number(c.physical_count.quantity));else {const a=c.adjustment;const n=this.counts.get(a.catalog_object_id)||0;if(n<Number(a.quantity))return Response.json({errors:[{code:'INSUFFICIENT_STOCK'}]},{status:409});this.counts.set(a.catalog_object_id,n-Number(a.quantity));}}
   result={counts:[]};
  }else if(path==='/v2/payments'&&request.method==='POST'){
   const p={id:'TESTPAY'+(this.payments.size+1),status:'COMPLETED',reference_id:body.reference_id,amount_money:body.amount_money,location_id:body.location_id,created_at:new Date().toISOString()};this.payments.set(p.id,p);result={payment:p};
  }else if(path==='/v2/payments')return Response.json({payments:[...this.payments.values()]});
  else if(path.startsWith('/v2/payments/'))return Response.json({payment:this.payments.get(path.split('/').pop())});
  else throw Error('Unsupported local Square operation');
  if(body?.idempotency_key)this.receipts.set(body.idempotency_key,{body:JSON.stringify(body),result});await this.persist();
  if(this.loseAfter===path){this.loseAfter=null;throw Error('Simulated lost response after success');}
  return Response.json(result);
 }
}
