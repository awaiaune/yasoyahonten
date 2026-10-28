// Stable major contract. Both aliases must use the same DO and attempt namespace.
export const CHECKOUT_CONTRACT=1;
export const CHECKOUT_RELEASE='checkout-v1-20261027';
export class CheckoutContractError extends Error{constructor(code,message,status=409){super(message);this.code=code;this.status=status;}}
export function checkoutRoute(request){
 const url=new URL(request.url),originalPath=url.pathname;
 const match=url.pathname.match(/^\/api\/v([^/]+)\/(.*)$/);
 if(!match)return {request,originalPath,version:null};
 if(match[1]!=='1'||!['payments','payments/status','quote','inventory','checkout-capabilities'].includes(match[2]))throw new CheckoutContractError('CHECKOUT_CONTRACT_UNSUPPORTED','購入画面の更新が必要です。再決済せず最新の画面を開いてください。',426);
 url.pathname='/api/'+match[2];return {request:new Request(url,request),originalPath,version:1};
}
export function productionCheckoutEnabled(env){
 const value=env.PRODUCTION_CHECKOUT_ENABLED??'0';
 if(!['0','1'].includes(value))return false; // Block new admission, never existing recovery.
 return value==='1';
}
export function checkoutCapabilities(env,policy){
 const enabled=policy.checkout&&!policy.readOnly&&(env.RUNTIME_TIER!=='production'||env.PRODUCTION_PURCHASE_PROTOCOL==='durable-v1');
 return {contractVersion:1,supportedContracts:[1],release:CHECKOUT_RELEASE,checkoutEnabled:enabled,maintenance:!enabled,statusAvailable:true,legacyStableIdAlias:true};
}
