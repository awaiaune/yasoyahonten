import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assertProductionAdmin} from '../production/access.js';
import admin from '../production/admin-worker.js';

const read=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
const dashboard=await read('../production/dashboard-input.example.json');
const config=await read('../production/admin.example.jsonc');
// The production email is entered privately in Dashboard, never inferred from staging.
const env={...config.vars,PRODUCTION_ADMIN_EMAIL:'owner@example.invalid'};
const issuer='https://'+dashboard.accessTeamDomain;
const now=Date.now();
const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',keys.publicKey),kid:'local-only',alg:'RS256',use:'sig'};
async function token(patch={},headerPatch={}){
 const enc=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const seconds=Math.floor(now/1000);
 const body=enc({alg:'RS256',kid:jwk.kid,...headerPatch})+'.'+enc({iss:issuer,aud:[dashboard.accessAudience],email:env.PRODUCTION_ADMIN_EMAIL,iat:seconds-1,exp:seconds+3600,...patch});
 return body+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(body))).toString('base64url');
}
const fetcher=async url=>{
 assert.equal(String(url),issuer+'/cdn-cgi/access/certs');
 return Response.json({keys:[jwk]});
};
const request=jwt=>new Request(env.PRODUCTION_ADMIN_ORIGIN+'/admin/',{headers:{'Cf-Access-Jwt-Assertion':jwt}});

test('confirmed Team Domain/AUD agree in both Worker templates; alternate entrypoints stay disabled',async()=>{
 const backend=await read('../production/v53.candidate.jsonc');
 assert.equal(dashboard.accessTeamDomain,'white-hill-a411.cloudflareaccess.com');
 for(const c of [config,backend]){
  assert.equal(c.vars.PRODUCTION_ACCESS_TEAM_DOMAIN,dashboard.accessTeamDomain);
  assert.equal(c.vars.PRODUCTION_ACCESS_AUDIENCE,dashboard.accessAudience);
 }
 assert.equal(config.workers_dev,false);
 assert.equal(config.preview_urls,false);
 assert.equal(config.assets.run_worker_first,true);
});
test('configured production Issuer/AUD accept a locally signed authorized-email JWT',async()=>{
 await assertProductionAdmin(request(await token()),env,{fetcher,now});
});
for(const [label,claims,header] of [
 ['wrong Issuer',{iss:'https://other.cloudflareaccess.com'}],
 ['wrong AUD',{aud:['0'.repeat(64)]}],
 ['different email',{email:'other@example.invalid'}],
 ['expired JWT',{exp:1}],
 ['unsupported algorithm',{}, {alg:'HS256'}],
])test('configured Access rejects '+label,async()=>{
 await assert.rejects(()=>token(claims,header).then(jwt=>assertProductionAdmin(request(jwt),env,{fetcher,now})),{status:401});
});
test('correct claims with a forged signature are rejected',async()=>{
 const parts=(await token()).split('.');
 const bytes=Buffer.from(parts[2],'base64url');bytes[0]^=1;parts[2]=bytes.toString('base64url');
 await assert.rejects(()=>assertProductionAdmin(request(parts.join('.')),env,{fetcher,now}),{status:401});
});
test('email-header spoofing cannot expose protected UI, assets or API',async()=>{
 let accessed=false;
 const guarded={...env,ASSETS:{fetch(){accessed=true;}},PAYMENTS_SERVICE:{fetch(){accessed=true;}}};
 for(const path of ['/admin/','/js/admin.js','/api/admin/products']){
  const response=await admin.fetch(new Request(env.PRODUCTION_ADMIN_ORIGIN+path,{headers:{'Cf-Access-Authenticated-User-Email':env.PRODUCTION_ADMIN_EMAIL}}),guarded);
  assert.equal(response.status,401);
 }
 assert.equal(accessed,false);
});
test('even a valid owner JWT cannot use a workers.dev or preview hostname',async()=>{
 const originalFetch=globalThis.fetch;
 let assetsRead=0;
 try{
  globalThis.fetch=fetcher; // Certificates are local; no external requests.
  const guarded={...env,ASSETS:{fetch(){assetsRead++;return new Response('local-only');}}};
  const jwt=await token();
  for(const host of ['yasoya-honten-admin.example.workers.dev','preview-yasoya-honten-admin.example.workers.dev']){
   const response=await admin.fetch(new Request('https://'+host+'/admin/',{headers:{'Cf-Access-Jwt-Assertion':jwt}}),guarded);
   assert.equal(response.status,403);
  }
  assert.equal(assetsRead,0);
  assert.equal((await admin.fetch(request(jwt),guarded)).status,200);
  assert.equal(assetsRead,1);
 }finally{globalThis.fetch=originalFetch;}
});
