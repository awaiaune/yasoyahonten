// Production-shaped in-memory regression for presentation-only publishing.
// No real payment, Cloudflare, D1, R2, Square, emails or authenticated external calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './production-fixture.mjs';

test('Catalog OFF still permits an independent site-only photo/content publication without Square writes',async t=>{
 const f=await fixture(t,{
  PRODUCTION_CHECKOUT_ENABLED:'0',
  PRODUCTION_MANAGED_CHECKOUT_ENABLED:'0',
  PRODUCTION_STOREFRONT_ENABLED:'1',
  PRODUCTION_STOREFRONT_PUBLISH_ENABLED:'1',
  PRODUCTION_UNIFIED_PUBLISH_ENABLED:'1',
  PRODUCTION_MANAGEMENT_SCHEMA_READY:'1',
  PRODUCTION_MANAGEMENT_READ_ENABLED:'1',
  PRODUCTION_MANAGEMENT_DRAFT_ENABLED:'1',
  PRODUCTION_MANAGEMENT_IMAGES_ENABLED:'1',
  PRODUCTION_MANAGEMENT_CATALOG_ENABLED:'0',
  PRODUCTION_MANAGEMENT_INVENTORY_ENABLED:'0',
  PRODUCTION_CATALOG_CUTOVER_APPROVAL:'NOT_APPROVED'
 });
 const initial=await f.api('/api/admin/products');
 assert.equal(initial.capabilities.catalog,false);
 assert.equal(initial.capabilities.sitePublish,true);
 assert.equal(initial.capabilities.unifiedPublish,false);
 const id='offline-plant-photo-preview',variant='offline-plant-photo-10g';
 const save=await f.api('/api/admin/products/'+id,'PUT',{
  name:'架空の植物',description:'植物の代表写真を表示するテスト',
  images:[],alt:'架空の写真',sortOrder:0,slug:id,expectedVersion:0,operationId:crypto.randomUUID(),
  variants:[{id:variant,name:'10g',price:980,amount:'10g',maxQuantity:10,active:true}]
 });
 assert.equal(save.version,1);
 const detail=await f.api('/api/admin/products/'+id);
 assert.equal(detail.product.capabilities.unifiedPublish,false);
 assert.equal(detail.product.capabilities.sitePublish,true);
 const blocked=await f.request('/api/admin/products/'+id+'/release','POST',{expectedVersion:detail.product.version,operationId:crypto.randomUUID()});
 assert.equal(blocked.status,403,'unapproved unified Square catalog publication must remain blocked');
 const published=await f.api('/api/admin/products/'+id+'/site','POST',{
  expectedVersion:detail.product.version,status:'published',operationId:crypto.randomUUID()
 });
 assert.equal(published.ok,true);
 assert.equal(published.siteOnly,true);
 const after=await f.api('/api/admin/products/'+id);
 assert.equal(after.product.status,'published');
 assert.equal(after.product.published_revision,after.product.draft_revision);
 assert.equal(f.calls.filter(c=>c.method!=='GET'&&!c.path.includes('counts/batch-retrieve')).length,0,'No Square write');
 assert.equal(f.fake.payments.size,0,'No payment');
 const order=await f.db.prepare("SELECT COUNT(*) AS n FROM orders").first();
 assert.equal(order.n,1,'Existing order must stay intact');
});
