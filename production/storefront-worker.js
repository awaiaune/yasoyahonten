// Production-only public entrypoint. Existing purchase DO identity is unchanged.
import application from '../worker/src/index.js';
export {PurchaseCoordinator} from '../worker/src/index.js';
import {productionIdentity,productionDatabase,ProductionError} from '../worker/src/production-policy.js';
import {Store} from '../worker/src/management/store.js';
import {renderV53} from '../worker/src/management/v53-render.js';
// Square vendor origins: https://developer.squareup.com/docs/web-payments/content-security-policy
// Keep issuer frames restricted; pci-connect is already covered by *.squareup.com.
// The SDK posts buyer-verification notificationData to Square's API iframe.
// form-action is independent of frame-src/connect-src; allow only this origin.
const csp="default-src 'self'; script-src 'self' 'unsafe-inline' https://web.squarecdn.com; connect-src 'self' https://connect.squareup.com https://*.squareup.com https://web.squarecdn.com https://o160250.ingest.sentry.io; frame-src 'self' https://*.squareup.com https://web.squarecdn.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://web.squarecdn.com; font-src 'self' https://square-fonts-production-f.squarecdn.com https://d1g145x70srn7h.cloudfront.net https://fonts.gstatic.com https://web.squarecdn.com; img-src 'self' data: blob:; base-uri 'self'; form-action 'self' https://api.squareup.com; frame-ancestors 'none'";
export default {async fetch(request,env,ctx){
 try{
  productionIdentity(env);
  const url=new URL(request.url),admin=/^\/api\/admin(?:\/|$)/.test(url.pathname);
  if(admin){if(url.origin!==env.PRODUCTION_ADMIN_ORIGIN)return new Response('Use the protected management origin',{status:403});return application.fetch(request,env,ctx);}
  // Preserve old clients' status/recovery URLs during the origin cutover.
  if(/^https:\/\/yasoya-honten-payments\.[a-z0-9-]+\.workers\.dev$/.test(env.PRODUCTION_LEGACY_API_ORIGIN||'')&&url.origin===env.PRODUCTION_LEGACY_API_ORIGIN&&url.pathname.startsWith('/api/'))return application.fetch(request,env,ctx);
  if(url.origin!==env.SITE_URL)return new Response('Host rejected',{status:403});
  if(/^\/admin(?:\/|$)/.test(url.pathname))return new Response('Not found',{status:404});
  let response;
  if(url.pathname==='/js/store-config.js'){
   if(!/^sq0idp-/.test(env.SQUARE_PRODUCTION_APPLICATION_ID||''))throw new ProductionError('PRODUCTION_APPLICATION_INVALID','Production Application ID is not configured');
   if(env.STOREFRONT_RETIRE_GOLDENROD==='1')await productionDatabase(env);
   const config={environment:'production',managedStorefront:true,squareApplicationId:env.SQUARE_PRODUCTION_APPLICATION_ID,squareLocationId:env.SQUARE_LOCATION_ID,workerBaseUrl:url.origin,currency:'JPY'};
   response=new Response('window.YASOYA_STORE_CONFIG=Object.freeze('+JSON.stringify(config)+');window.YASOYA_RETIRED_VARIANT_IDS='+JSON.stringify(await new Store(env).retiredVariantIds())+';',{headers:{'Content-Type':'application/javascript'}});
  }else if(url.pathname.startsWith('/api/'))response=await application.fetch(request,env,ctx);
  else if(!['GET','HEAD'].includes(request.method))response=new Response('Method not allowed',{status:405});
  else if(env.PRODUCTION_STOREFRONT_ENABLED!=='1')response=new Response('Storefront is not enabled',{status:503});
  else {await productionDatabase(env);response=await renderV53(request,env)||await env.ASSETS.fetch(request);}
  const headers=new Headers(response.headers);headers.set('Cache-Control','no-store');headers.set('X-Content-Type-Options','nosniff');headers.set('Content-Security-Policy',csp);
  return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers});
 }catch(error){return Response.json({error:{code:error instanceof ProductionError?error.code:'PRODUCTION_UNAVAILABLE',message:'処理を開始できません。管理者に確認してください。'}},{status:error.status||503,headers:{'Cache-Control':'no-store'}});}
}};
