// Called only after the staging database and Access guards. Never releases an
// existing purchase attempt; a refusal proves only this request was not passed on.
import {assertCheckout} from '../worker/src/external-policy.js';
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function checkoutRecipientGuard(request,env){
 const path=new URL(request.url).pathname;
 const preflight=/^\/api\/(?:v1\/)?checkout-preflight$/.test(path);
 const payment=/^\/api\/(?:v1\/)?payments$/.test(path);
 if(!preflight&&!(payment&&request.method==='POST'))return null;
 if(request.method!=='POST')return reply({error:{code:'METHOD_NOT_ALLOWED',message:'POSTで確認してください。'}},405);
 if(env.RUNTIME_TIER!=='staging'||env.SQUARE_ENVIRONMENT!=='sandbox')return reply({error:{code:'STAGING_ONLY',message:'Staging専用の確認です。'}},403);
 if(request.headers.get('Origin')!==env.SITE_URL)return reply({error:{code:'ORIGIN_NOT_ALLOWED',message:'Stagingの購入画面から操作してください。'}},403);
 let body;
 try{body=await request.clone().json();}catch{return reply({error:{code:'INVALID_JSON',message:'入力形式を確認してください。'}},400);}
 const email=preflight?body?.email:body?.contact?.email;
 if(typeof email!=='string'||email.length>320||email!==env.STAGING_ADMIN_EMAIL){
  return reply({error:{code:'STAGING_RECIPIENT_NOT_ALLOWED',message:'Stagingで許可されているテスト用メールアドレスを入力してください。'},currentRequestForwarded:false,retryAllowed:false},400);
 }
 if(preflight){
  try{assertCheckout(env);}catch{return reply({error:{code:'CHECKOUT_DISABLED',message:'Stagingの購入受付は停止中、または設定を確認できません。'}},503);}
  return reply({ok:true,recipientAllowed:true});
 }
 return null;
}
