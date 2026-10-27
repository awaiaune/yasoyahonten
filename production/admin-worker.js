// Separate Access-protected UI. No public storefront or Square token is served here.
import {assertProductionAdmin} from './access.js';
export default {async fetch(request,env){try{
 await assertProductionAdmin(request,env);const url=new URL(request.url);if(url.origin!==env.PRODUCTION_ADMIN_ORIGIN)return new Response('Unavailable',{status:403});
 if(url.pathname==='/js/store-config.js')return new Response('window.YASOYA_STORE_CONFIG=Object.freeze('+JSON.stringify({environment:'production',workerBaseUrl:env.PRODUCTION_ADMIN_ORIGIN,currency:'JPY'})+');',{headers:{'Content-Type':'application/javascript','Cache-Control':'no-store'}});
 let response;
 if(/^\/api\/admin\//.test(url.pathname)){if(!env.PAYMENTS_SERVICE)return new Response('Unavailable',{status:503});response=await env.PAYMENTS_SERVICE.fetch(request);}
 else{if(!['GET','HEAD'].includes(request.method)||!/^\/(admin\/(?:index.html)?|(?:js|css)\/[a-z0-9-]+\.(?:js|css))$/.test(url.pathname)||!env.ASSETS)return new Response('Not found',{status:404});response=await env.ASSETS.fetch(request);}
 const headers=new Headers(response.headers);headers.set('Cache-Control','no-store');headers.set('X-Robots-Tag','noindex, nofollow');headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");return new Response(response.body,{status:response.status,headers});
 }catch{return new Response('Management access unavailable',{status:401,headers:{'Cache-Control':'no-store'}});}}};
