import test from 'node:test';
import assert from 'node:assert/strict';
import {Square} from '../worker/src/management/square.js';
import {inspectSalesCatalog} from '../worker/src/management/sales-version-proof.js';
function fixture(){
 const env={RUNTIME_TIER:'staging',SQUARE_LOCATION_ID:'TESTLOCATION'};
 const variant={id:'lemonbalm',name:'通常',unitPrice:980};
 const object={type:'ITEM_VARIATION',id:'TESTVARIATION',version:11,present_at_location_ids:['TESTLOCATION'],item_variation_data:{item_id:'TESTITEM0001',sku:'lemonbalm',name:'通常',price_money:{amount:980,currency:'JPY'},track_inventory:true}};
 const item={type:'ITEM',id:'TESTITEM0001',version:11,present_at_location_ids:['TESTLOCATION'],item_data:{name:'レモンバーム',description:'説明',image_ids:[],variations:[object]}};
 const mapping={variant_id:variant.id,environment:'sandbox',location_id:env.SQUARE_LOCATION_ID,item_id:item.id,variation_id:object.id,item_version:10,variation_version:10};
 const sent=structuredClone(item);sent.version=9;sent.item_data.variations[0].version=9;
 const job={id:'completed-sync',kind:'publish',state:'done',body_json:JSON.stringify({idempotency_key:'completed-sync',batches:[{objects:[sent]}]}),payload_json:JSON.stringify({data:{name:'レモンバーム',description:'説明',variants:[{id:variant.id,name:'通常',price:980,active:true}]},maps:[mapping],targetStatus:'published'}),result_json:JSON.stringify({mappings:[mapping]})};
 const square=new Square(env),reads=[];square.object=async id=>{reads.push(id);return structuredClone(item);};square.assertUniqueSku=async(id,sku)=>{assert.equal(id,object.id);assert.equal(sku,'lemonbalm');};square.request=()=>assert.fail('No external writes');
 const manager={env,square,s:{one:async()=>job,batch:()=>assert.fail('No D1 write')}};
 return {manager,mapping,object,variant,item,job,reads};
}
test('newer version with exact completed content and unique SKU permits purchase without mutation',async()=>{const f=fixture();const r=await inspectSalesCatalog(f.manager,f.mapping,f.object,f.variant);assert.equal(r.ok,true);assert.equal(r.versionRevalidated,true);assert.equal(f.mapping.variation_version,10);assert.equal(f.object.version,11);assert.equal(f.job.state,'done');assert.deepEqual(f.reads,['TESTITEM0001']);});
for(const [label,patch] of [
 ['item name',f=>f.item.item_data.name='外部変更'],['description',f=>f.item.item_data.description='外部説明'],['images',f=>f.item.item_data.image_ids=['OTHERIMAGE']],['item ID',f=>f.item.id='OTHERITEM0001'],['variation ID',f=>f.object.id='OTHERVARIATION'],['SKU',f=>f.object.item_variation_data.sku='other'],['variation name',f=>f.object.item_variation_data.name='別名'],['price',f=>f.object.item_variation_data.price_money.amount=1200],['currency',f=>f.object.item_variation_data.price_money.currency='USD'],['tracking',f=>f.object.item_variation_data.track_inventory=false],['location',f=>f.object.absent_at_location_ids=['TESTLOCATION']],['deleted',f=>f.object.is_deleted=true],['sellable',f=>f.object.item_variation_data.sellable=false],['override',f=>f.object.item_variation_data.location_overrides=[{location_id:'TESTLOCATION',track_inventory:false}]],['version rollback',f=>f.object.version=9],['item version rollback',f=>f.item.version=9],['wrong environment',f=>f.mapping.environment='production'],['wrong Location mapping',f=>f.mapping.location_id='OTHERLOCATION'],['new Variation',f=>f.item.item_data.variations.push({...f.object,id:'ADDEDVARIATION'})]
])test(label+' change stays blocked',async()=>{const f=fixture();patch(f);assert.equal((await inspectSalesCatalog(f.manager,f.mapping,f.object,f.variant)).ok,false);});
test('missing completed evidence does not permit version mismatch',async()=>{const f=fixture();f.manager.s.one=async()=>null;assert.equal((await inspectSalesCatalog(f.manager,f.mapping,f.object,f.variant)).ok,false);});
test('unknown SKU uniqueness does not permit version mismatch',async()=>{const f=fixture();f.manager.square.assertUniqueSku=async()=>{throw Error('unknown');};assert.equal((await inspectSalesCatalog(f.manager,f.mapping,f.object,f.variant)).ok,false);});
test('item content change blocks even when Variation version stays unchanged',async()=>{const f=fixture();f.object.version=f.mapping.variation_version;f.item.item_data.name='外部変更';assert.equal((await inspectSalesCatalog(f.manager,f.mapping,f.object,f.variant)).ok,false);});
test('different snapshots fail closed',async()=>{const f=fixture();f.manager.square.object=async()=>{const item=structuredClone(f.item);item.item_data.variations[0].version++;return item;};assert.equal((await inspectSalesCatalog(f.manager,f.mapping,f.object,f.variant)).ok,false);});

test('repeated version advances remain read-only and require fresh content proof',async()=>{const f=fixture();for(const version of [11,12,13]){f.object.version=version;f.item.version=version;const r=await inspectSalesCatalog(f.manager,f.mapping,f.object,f.variant);assert.equal(r.ok,true);assert.equal(f.mapping.variation_version,10);}f.item.item_data.name='changed';assert.equal((await inspectSalesCatalog(f.manager,f.mapping,f.object,f.variant)).ok,false);});
test('production cannot use the staging content revalidation path',async()=>{const f=fixture();f.manager.env.RUNTIME_TIER='production';await assert.rejects(inspectSalesCatalog(f.manager,f.mapping,f.object,f.variant),{status:403});});

test('versions cannot go below the successful sync result even if D1 mapping is older',async()=>{const f=fixture(),result=JSON.parse(f.job.result_json);result.mappings[0].variation_version=12;f.job.result_json=JSON.stringify(result);assert.equal((await inspectSalesCatalog(f.manager,f.mapping,f.object,f.variant)).ok,false);});
