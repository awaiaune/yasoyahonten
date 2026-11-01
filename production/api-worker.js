// Initial management rollout: preserve the existing API without publishing site assets.
import application from '../worker/src/index.js';
import {productionIdentity,ProductionError} from '../worker/src/production-policy.js';
export {PurchaseCoordinator} from '../worker/src/index.js';

export default {
 async fetch(request,env,ctx){
  try{
   productionIdentity(env);
   const url=new URL(request.url);
   if(/^\/api\/admin(?:\/|$)/.test(url.pathname)){
    if(url.origin!==env.PRODUCTION_ADMIN_ORIGIN)return new Response('Use the protected management origin',{status:403});
    return application.fetch(request,env,ctx);
   }
   if(!/^https:\/\/yasoya-honten-payments\.[a-z0-9-]+\.workers\.dev$/.test(env.PRODUCTION_LEGACY_API_ORIGIN||'')||url.origin!==env.PRODUCTION_LEGACY_API_ORIGIN)return new Response('Host rejected',{status:403});
   if(!url.pathname.startsWith('/api/'))return new Response('Not found',{status:404});
   return application.fetch(request,env,ctx);
  }catch(error){
   return Response.json({error:{code:error instanceof ProductionError?error.code:'PRODUCTION_UNAVAILABLE',message:'処理を開始できません。管理者に確認してください。'}},{status:error instanceof ProductionError?error.status:503,headers:{'Cache-Control':'no-store'}});
  }
 },
 scheduled(event,env,ctx){productionIdentity(env);return application.scheduled(event,env,ctx);}
};
