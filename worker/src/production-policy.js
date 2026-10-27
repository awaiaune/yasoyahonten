import {productionCheckoutEnabled} from './checkout-contract.js';
// Production is a separate trust boundary. No Sandbox identifiers or defaults are reused.
export class ProductionError extends Error {constructor(code,message,status=503){super(message);this.code=code;this.status=status;}}
export const production=env=>env.RUNTIME_TIER==='production';
const fail=(code,message,status)=>{throw new ProductionError(code,message,status);};
const flag=(env,key)=>{const v=env[key]??'0';if(!['0','1'].includes(v))fail('PRODUCTION_CONFIG_INVALID','本番管理設定が不正です。');return v==='1';};
export function productionIdentity(env){
 if(!production(env)||env.SQUARE_ENVIRONMENT!=='production'||env.SQUARE_LOCATION_ID!=='LQ693S4H2NBZ8'||env.PRODUCTION_WORKER_NAME!=='yasoya-honten-payments'||env.LOCAL_TEST_MODE||env.LOCAL_SQUARE||env.LOCAL_RESEND||env.SQUARE_SANDBOX_ACCESS_TOKEN)fail('PRODUCTION_CONFIG_INVALID','本番と検証環境の分離設定を確認してください。');
}
export function productionPolicy(env){
 productionIdentity(env);
 const grants=Object.fromEntries(['READ','DRAFT','IMAGES','CATALOG','INVENTORY'].map(k=>[k.toLowerCase(),flag(env,'PRODUCTION_MANAGEMENT_'+k+'_ENABLED')]));
 if(grants.read&&env.MANAGEMENT_ENABLED!=='1')fail('PRODUCTION_CONFIG_INVALID','本番管理の有効設定が必要です。');
 if((grants.draft||grants.images||grants.catalog||grants.inventory)&&!grants.read)fail('PRODUCTION_CONFIG_INVALID','管理閲覧権限が必要です。');
 if((grants.catalog||grants.inventory)&&env.PRODUCTION_MANAGEMENT_SCHEMA_READY!=='1')fail('PRODUCTION_CONFIG_INVALID','本番管理スキーマの準備確認が必要です。');
 if(grants.catalog&&env.PRODUCTION_CATALOG_CUTOVER_APPROVAL!=='verified-storefront-and-pricing-v1')fail('PRODUCTION_CONFIG_INVALID','商品公開と購入時価格の切替承認が必要です。');
 if(grants.inventory&&env.PRODUCTION_INVENTORY_WRITER_APPROVAL!=='shared-purchase-do-single-writer-v1')fail('PRODUCTION_CONFIG_INVALID','購入DOと外部在庫変更経路の排他承認が必要です。');
 return grants;
}
export function productionGrant(env,key){if(!production(env))return;const p=productionPolicy(env);if(!p[key])fail('PRODUCTION_MANAGEMENT_DENIED','この本番管理操作は無効です。',403);}
export async function productionDatabase(env){
 productionPolicy(env);
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(env.PRODUCTION_INSTANCE_ID||'')||env.PRODUCTION_DATABASE_ID!=='442fa9fd-25d3-4c01-bcc3-04be7b420cf5'||!env.ORDERS_DB||!env.PURCHASE_COORDINATOR)fail('PRODUCTION_CONFIG_INVALID','本番専用DB・DOの識別設定が必要です。');
 const row=await env.ORDERS_DB.prepare('SELECT instance_id,database_id,location_id FROM production_environment WHERE id=1').first();
 if(row?.instance_id!==env.PRODUCTION_INSTANCE_ID||row?.database_id!==env.PRODUCTION_DATABASE_ID||row?.location_id!==env.SQUARE_LOCATION_ID)fail('PRODUCTION_MARKER_MISMATCH','本番DB識別マーカーが一致しません。');
}
export function productionSquareRequest(env,target,method='GET',scope='purchase'){
 if(scope==='management')productionPolicy(env);else productionIdentity(env);const u=new URL(target);
 if(u.origin!=='https://connect.squareup.com'||u.username||u.password||u.hash)fail('PRODUCTION_DESTINATION_DENIED','本番Square以外への接続は禁止です。');
 const read=method==='GET'&&(/^\/v2\/catalog\/(list|object\/[A-Z0-9]+)$/.test(u.pathname)||u.pathname==='/v2/locations'||scope==='purchase'&&/^\/v2\/payments(?:\/[A-Za-z0-9_-]+)?$/.test(u.pathname))||method==='POST'&&u.pathname==='/v2/inventory/counts/batch-retrieve';
 if(scope==='purchase'&&method==='POST'&&u.pathname==='/v2/payments'&&!productionCheckoutEnabled(env))fail('CHECKOUT_DISABLED','新規購入は一時停止中です。注文の状態確認は継続できます。',503);
 if(scope==='management'){
  productionGrant(env,'read');if(read)return;
  if(method==='POST'&&['/v2/catalog/batch-upsert','/v2/catalog/images'].includes(u.pathname))return productionGrant(env,'catalog');
  if(method==='POST'&&u.pathname==='/v2/inventory/changes/batch-create')return productionGrant(env,'inventory');
 }else if(read||method==='POST'&&['/v2/payments','/v2/inventory/changes/batch-create'].includes(u.pathname))return;
 fail('PRODUCTION_OPERATION_DENIED','許可されていない本番Square操作です。',403);
}
// No stable ID can be reconstructed from an old client's changing card tokens.
export function adaptProductionPurchase(request,body,env){
 productionIdentity(env);
 const supplied=body.attemptId??request.headers.get('Idempotency-Key');
 if(typeof supplied!=='string'||! /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(supplied))fail('PURCHASE_CLIENT_UPGRADE_REQUIRED','決済は実行していません。購入画面を更新してください。',409);
 if(body.attemptId&&request.headers.has('Idempotency-Key')&&body.attemptId.toLowerCase()!==request.headers.get('Idempotency-Key').toLowerCase())fail('PURCHASE_ID_CONFLICT','注文番号が一致しません。',409);
 if(env.PRODUCTION_PURCHASE_PROTOCOL!=='durable-v1')fail('PURCHASE_COMPATIBILITY_UNVERIFIED','購入APIの互換性確認が完了していません。',503);
 return {...body,attemptId:supplied.toLowerCase()};
}
export function adaptProductionPurchaseResponse(result,status,path='/api/payments'){
 if(path!=='/api/payments')return {status,body:result};
 // Never let a legacy-style HTTP-success check mistake an unknown result for paid.
 if(status>=200&&status<300&&!result?.ok)return {status:409,body:{...result,error:{code:'PURCHASE_PENDING',message:'処理状況を確認中です。同じ注文番号で照会し、再決済しないでください。'}}};
 return {status,body:result};
}
