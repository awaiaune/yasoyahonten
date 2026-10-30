import test from 'node:test';
import assert from 'node:assert/strict';
import {salesCatalogCheck} from '../worker/src/management/sales-catalog-check.js';
import {Management} from '../worker/src/management/service.js';
const env={RUNTIME_TIER:'staging',SQUARE_LOCATION_ID:'TESTLOCATION'};
function fixture(){return {mapping:{variation_version:10,variation_id:'TESTVARIATION'},object:{version:10,item_variation_data:{name:'通常',price_money:{amount:980,currency:'JPY'},track_inventory:true}},variant:{id:'lemonbalm',name:'通常',unitPrice:980}};}
test('unchanged checkout catalog passes without writes',async()=>{
 const f=fixture(),manager=new Management(env,{});manager.s.one=async()=>f.mapping;manager.square.object=async()=>f.object;manager.s.batch=()=>assert.fail('No D1 write');manager.square.request=()=>assert.fail('No Square write');await manager.assertSalesCatalog({items:[f.variant]});
});
for(const [key,change] of [['version',f=>f.object.version++],['price',f=>f.object.item_variation_data.price_money.amount=1200],['currency',f=>f.object.item_variation_data.price_money.currency='USD'],['name',f=>f.object.item_variation_data.name='別名'],['tracking',f=>f.object.item_variation_data.track_inventory=false],['location',f=>f.object.absent_at_location_ids=['TESTLOCATION']]])test(key+' mismatch remains 409 and reports exact field without adopting state',async()=>{
 const f=fixture();change(f);const snapshot=JSON.stringify(f),result=salesCatalogCheck(env,f.mapping,f.object,f.variant);assert.equal(result.ok,false);assert.deepEqual(result.mismatches.map(m=>m.key),[key]);const manager=new Management(env,{});manager.s.one=async()=>f.mapping;manager.square.object=async()=>f.object;await assert.rejects(manager.assertSalesCatalog({items:[f.variant]}),e=>e.status===409&&e.message.includes(result.mismatches[0].label));assert.equal(JSON.stringify(f),snapshot);
});
test('increased catalog version is not automatically accepted even if content matches',()=>{const f=fixture();f.object.version=11;const r=salesCatalogCheck(env,f.mapping,f.object,f.variant);assert.deepEqual(r.mismatches,[{key:'version',label:'Variationバージョン',saved:10,current:11}]);});
