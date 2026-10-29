import application,{PurchaseCoordinator} from '../worker/src/index.js';
import {assertAccess,AccessDenied} from '../validation/access.js';
import {assertStagingDatabase,StagingSetupError} from './safety.js';
import {renderV53} from './render.js';
export class StagingPurchaseCoordinator extends PurchaseCoordinator{
 constructor(ctx,env){super(ctx,env);ctx.blockConcurrencyWhile(()=>assertStagingDatabase(env));}
 serialize(action,options){return super.serialize(async()=>{await assertStagingDatabase(this.env);return action();},options);}
}
export default {async fetch(request,env,ctx){
 const headers={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow, noarchive'};
 let phase='setup_database';
 try{
  await assertStagingDatabase(env);phase='access';await assertAccess(request,env);phase='application';
  const url=new URL(request.url);if(url.origin!==env.SITE_URL)return new Response('Host rejected',{status:403,headers});
  let response;
  if(url.pathname==='/js/store-config.js')response=new Response('window.YASOYA_STORE_CONFIG=Object.freeze('+JSON.stringify({environment:'sandbox',squareApplicationId:env.SQUARE_SANDBOX_APPLICATION_ID,squareLocationId:env.SQUARE_LOCATION_ID,workerBaseUrl:url.origin,currency:'JPY'})+');',{headers:{'Content-Type':'application/javascript'}});
  else if(url.pathname.startsWith('/api/')){
   if(request.method==='POST'&&/^\/api\/(?:v1\/)?payments$/.test(url.pathname)){
    const body=await request.clone().json();if(body.contact?.email!==env.STAGING_ADMIN_EMAIL)return new Response('Use the approved test recipient',{status:400,headers});
   }
   response=await application.fetch(request,env,ctx);
  }else if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers});
  else response=await renderV53(request,env)||await env.ASSETS.fetch(request);
  const h=new Headers(response.headers);for(const [k,v]of Object.entries(headers))h.set(k,v);
  h.set('X-Content-Type-Options','nosniff');
  h.set('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline' https://sandbox.web.squarecdn.com; connect-src 'self' https://*.squareupsandbox.com https://sandbox.web.squarecdn.com; frame-src https://*.squareupsandbox.com https://sandbox.web.squarecdn.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers:h});
 }catch(error){
  // Only controlled reason codes; never log errors, requests, headers, claims or env.
  const code=error instanceof StagingSetupError||error instanceof AccessDenied?error.code:'STAGING_'+phase.toUpperCase()+'_FAILED';
  console.warn(JSON.stringify({event:'staging_gate_failure',phase,code}));
  return new Response('Staging sign-in or setup required',{status:401,headers});}
}};
