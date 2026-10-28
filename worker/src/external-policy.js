import {productionCheckoutEnabled} from './checkout-contract.js';
import {production,productionIdentity,productionGrant,productionSquareRequest} from './production-policy.js';
// Server bindings only. Browser payloads/headers never configure these controls.
export class ExternalPolicyError extends Error {
 constructor(code,message){super(message);this.status=503;this.code=code;}
}
const deny=(code,message)=>{throw new ExternalPolicyError(code,message);};
export function externalPolicy(env){
 if(production(env)){productionIdentity(env);return {readOnly:false,managementOnly:false,checkout:productionCheckoutEnabled(env),mail:true,cron:false,source:'square-production'};}
 // Explicit local mode may write only through a bound Square substitute.
 const local=env.LOCAL_TEST_MODE==='1'&&env.SQUARE_ENVIRONMENT==='sandbox';
 const invalid=()=>deny('EXTERNAL_POLICY_INVALID','外部接続の安全設定が未指定または不正です。');
 if(!['READ_ONLY','READ_WRITE','SANDBOX_MANAGEMENT'].includes(env.SQUARE_ACCESS_MODE))return invalid();
 if(env.SQUARE_ENVIRONMENT!=='sandbox'||(!local&&!['sandbox-validation','staging'].includes(env.RUNTIME_TIER)))return invalid();
 for(const k of ['VALIDATION_CHECKOUT_ENABLED','VALIDATION_MAIL_ENABLED','VALIDATION_CRON_ENABLED'])if(!['0','1'].includes(env[k]))return invalid();
 if(env.MANAGEMENT_ENABLED==='1'&&(!['disabled','single-writer'].includes(env.MANAGEMENT_STOCK_WRITES)||!['0','1'].includes(env.MANAGEMENT_CHECKOUT_PAUSED)))return invalid();
 const readOnly=env.SQUARE_ACCESS_MODE==='READ_ONLY';
 const managementOnly=env.SQUARE_ACCESS_MODE==='SANDBOX_MANAGEMENT';
 if(managementOnly){
  if(env.VALIDATION_MANAGEMENT_WRITE_APPROVAL!=='sandbox-management-single-writer-v1'||env.MANAGEMENT_ENABLED!=='1'||env.MANAGEMENT_STOCK_WRITES!=='single-writer'||env.MANAGEMENT_CHECKOUT_PAUSED!=='1')return invalid();
  if(['VALIDATION_CHECKOUT_ENABLED','VALIDATION_MAIL_ENABLED','VALIDATION_CRON_ENABLED'].some(k=>env[k]!=='0'))return invalid();
  if(!local&&(env.SITE_URL!=='https://validation.awaiaune.com'||env.ALLOWED_ORIGINS!==env.SITE_URL))return invalid();
 }else if(env.VALIDATION_MANAGEMENT_WRITE_APPROVAL!==undefined)return invalid();
 if(!readOnly&&local&&!env.LOCAL_SQUARE)return invalid();
 if(readOnly&&(env.VALIDATION_CHECKOUT_ENABLED!=='0'||env.VALIDATION_MAIL_ENABLED!=='0'||env.MANAGEMENT_STOCK_WRITES==='single-writer'))return invalid();
 if(env.VALIDATION_CHECKOUT_ENABLED==='1'&&env.MANAGEMENT_CHECKOUT_PAUSED==='1')return invalid();
 return {readOnly,managementOnly,checkout:env.VALIDATION_CHECKOUT_ENABLED==='1',mail:!readOnly&&env.VALIDATION_MAIL_ENABLED==='1',cron:env.VALIDATION_CRON_ENABLED==='1',source:local?'local-mock':'square-sandbox'};
}
export function assertSquareWrite(env,kind='catalog'){if(production(env))return productionGrant(env,kind);if(externalPolicy(env).readOnly)deny('SQUARE_READ_ONLY','読み取り専用のためSquareへの書き込みは停止中です。');}
export function assertCheckout(env){const p=externalPolicy(env);if(p.readOnly||!p.checkout)deny('CHECKOUT_DISABLED','新規購入は停止中です。');}
export function assertMail(env){const p=externalPolicy(env);if(p.source==='local-mock'&&!env.LOCAL_RESEND)deny('LOCAL_MAIL_TRANSPORT_MISSING','ローカルメール代替処理が未設定です。');if(!p.mail)deny('MAIL_DISABLED','検証メール送信は停止中です。');}
export function assertSquareRequest(env,target,method='GET'){
 if(production(env))return productionSquareRequest(env,target,method);
 const p=externalPolicy(env),u=new URL(target);
 if(p.source==='local-mock'&&!env.LOCAL_SQUARE)deny('LOCAL_SQUARE_TRANSPORT_MISSING','ローカルSquare代替処理が未設定です。');
 if(u.origin!=='https://connect.squareupsandbox.com'||u.username||u.password)deny('SQUARE_DESTINATION_DENIED','Sandbox以外のSquare接続は禁止です。');
 const read=(method==='GET'&&(/^\/v2\/catalog\/(list|object\/[A-Z0-9]+)$/.test(u.pathname)||u.pathname==='/v2/locations'||/^\/v2\/payments(?:\/[A-Za-z0-9_-]+)?$/.test(u.pathname)))||(method==='POST'&&u.pathname==='/v2/inventory/counts/batch-retrieve');
 if(p.readOnly&&!read)assertSquareWrite(env);
 if(p.managementOnly&&!read&&!(method==='POST'&&['/v2/catalog/batch-upsert','/v2/catalog/images','/v2/inventory/changes/batch-create'].includes(u.pathname)))deny('MANAGEMENT_WRITE_DENIED','管理用Catalog・画像・在庫以外への書き込みは禁止です。');
}
