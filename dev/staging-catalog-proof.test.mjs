import test from 'node:test';
import assert from 'node:assert/strict';
import {Square} from '../worker/src/management/square.js';
import {catalogProof} from '../worker/src/management/catalog-proof.js';
const id='e21ef065-22e7-4aef-94f1-cfc266ddf678';
function fixture(){
 const env={RUNTIME_TIER:'staging',SQUARE_LOCATION_ID:'TESTLOCATION'};
 const variation={type:'ITEM_VARIATION',id:'TESTVARIATION01',version:10,present_at_location_ids:[env.SQUARE_LOCATION_ID],item_variation_data:{item_id:'TESTITEM0001',sku:'original-sku',name:'通常',price_money:{amount:980,currency:'JPY'},track_inventory:true}};
 const sent={type:'ITEM',id:'TESTITEM0001',version:10,present_at_location_ids:[env.SQUARE_LOCATION_ID],item_data:{name:'元の商品',description:'説明\n\n通常：10g',image_ids:[],variations:[variation]}};
 const data={name:'元の商品',description:'説明',variants:[{id:'herb-10g',name:'通常',amount:'10g',price:980,maxQuantity:10,active:true}]};
 const maps=[{variant_id:'herb-10g',environment:'sandbox',location_id:env.SQUARE_LOCATION_ID,item_id:sent.id,variation_id:variation.id,item_version:10,variation_version:10}];
 const job={id,kind:'publish',state:'review',body_json:JSON.stringify({idempotency_key:id,batches:[{objects:[sent]}]}),payload_json:JSON.stringify({data,maps,targetStatus:'published'}),result_json:null};
 const item=structuredClone(sent);item.version=11;item.item_data.variations[0].version=11;
 const square=new Square(env),reads=[];square.object=async id=>{reads.push(id);return structuredClone(item);};square.findCreatedItem=async()=>structuredClone(item);square.request=()=>{throw Error('No remote write allowed');};
 return {manager:{env,square},job,item,reads};
}
test('stored version mismatch is compatible with proven saved-request success; no replay',async()=>{
 const f=fixture(),body=f.job.body_json,proof=await catalogProof(f.manager,f.job);assert.equal(proof.state,'matched');assert.equal(proof.mappings[0].item_version,11);assert.deepEqual(proof.versionInfo[0],{type:'Item',stored:10,requested:10,current:11});assert.equal(f.job.body_json,body);assert.deepEqual(f.reads,['TESTITEM0001']);
});
test('no version advancement is not proof and cannot release or cancel',async()=>{
 const f=fixture();f.item.version=10;f.item.item_data.variations[0].version=10;
 const proof=await catalogProof(f.manager,f.job);assert.equal(proof.state,'mismatch');assert.equal(proof.adoption.available,false);assert.equal(proof.mappings.length,0);
});
test('changed content cannot complete; exact IDs and advanced versions allow explicit cancellation',async()=>{
 const f=fixture();f.item.item_data.variations[0].item_variation_data.price_money.amount=1400;
 const proof=await catalogProof(f.manager,f.job);assert.equal(proof.state,'mismatch');assert.equal(proof.adoption.available,true);assert.equal(proof.mappings.length,0);assert.equal(proof.adoptionMappings[0].variation_id,'TESTVARIATION01');
});
test('SKU/identity changes, missing versions and creates never authorize cancellation',async()=>{
 for(const patch of [f=>f.item.item_data.variations[0].item_variation_data.sku='other',f=>delete f.item.item_data.variations[0].version,f=>{const body=JSON.parse(f.job.body_json);body.batches[0].objects[0].id='#new';f.job.body_json=JSON.stringify(body);}]){
  const f=fixture();patch(f);const proof=await catalogProof(f.manager,f.job);assert.equal(proof.adoption?.available,false);
 }
});
test('unrecorded local versions remain distinct from failed content checks',async()=>{
 const f=fixture(),payload=JSON.parse(f.job.payload_json);delete payload.maps[0].item_version;delete payload.maps[0].variation_version;f.job.payload_json=JSON.stringify(payload);
 const proof=await catalogProof(f.manager,f.job);assert.equal(proof.state,'matched');assert.equal(proof.versionInfo[0].stored,null);
});
test('saved request identity is required and production cannot run staging proof',async()=>{
 const f=fixture(),body=JSON.parse(f.job.body_json);body.idempotency_key='wrong';f.job.body_json=JSON.stringify(body);assert.equal((await catalogProof(f.manager,f.job)).state,'unavailable');assert.equal(f.reads.length,0);
 await assert.rejects(catalogProof({env:{RUNTIME_TIER:'production'}},f.job),{status:403});
});
