// Pure read-only preflight. Call only with an explicitly authorized DB (tests use memory).
export async function reviewPreMigrationSchema(db){
 const {results=[]}=await db.prepare("SELECT name,type,sql FROM sqlite_master WHERE type IN ('table','index','view','trigger') ORDER BY name").all();
 if(results.some(r=>r.name.startsWith('mg_')||r.name==='production_environment'))throw Error('Production management schema already exists; review migration history instead of replaying');
 const orders=results.find(r=>r.name==='orders'&&r.type==='table');
 if(!orders||!['order_reference','payment_id','status','items_json','contact_json','shipping_method','tracking_number','shipped_at'].every(k=>new RegExp('\\b'+k+'\\b').test(orders.sql)))throw Error('Existing orders schema does not match the approved legacy interface');
 return {tables:results.filter(r=>r.type==='table').map(r=>r.name),ordersSchema:orders.sql,readyForReviewedAdditiveMigration:true};
}
