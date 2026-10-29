import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assertAccess} from '../validation/access.js';
import {assertStagingDatabase} from '../staging/safety.js';
import {baseEnv,jwt,jwk} from './production-fixture.mjs';
const env={RUNTIME_TIER:'staging',SQUARE_ENVIRONMENT:'sandbox',STAGING_WORKER_NAME:'yasoya-v53-staging',SITE_URL:'https://staging.awaiaune.com',ALLOWED_ORIGINS:'https://staging.awaiaune.com',STAGING_DATABASE_ID:'d16c9e56-076a-4470-8d78-4fcfbe32b4dd',STAGING_INSTANCE_ID:'853e7e9a-fbf1-4d88-94b6-16506a9f09a3',SQUARE_LOCATION_ID:'OFFLINELOCATION',SQUARE_SANDBOX_APPLICATION_ID:'sandbox-sq0idb-offline',SQUARE_SANDBOX_ACCESS_TOKEN:'offline-only',VALIDATION_ADMIN_TOKEN:'offline-only',ACCESS_TEAM_DOMAIN:baseEnv.PRODUCTION_ACCESS_TEAM_DOMAIN,ACCESS_AUDIENCE:baseEnv.PRODUCTION_ACCESS_AUDIENCE,STAGING_ADMIN_EMAIL:baseEnv.PRODUCTION_ADMIN_EMAIL,VALIDATION_MAIL_ENABLED:'0',VALIDATION_CRON_ENABLED:'0',ORDERS_DB:{},PURCHASE_COORDINATOR:{}};
const verify=async(patch={},fetcher=async()=>Response.json({keys:[jwk]}))=>assertAccess(new Request(env.SITE_URL,{headers:{'Cf-Access-Jwt-Assertion':await jwt(patch)}}),env,{fetcher});
test('missing custom-domain Access assertion is identified and denied',async()=>{
 await assert.rejects(assertAccess(new Request(env.SITE_URL),env),{code:'ACCESS_JWT_MISSING',message:'Validation access denied'});
});
for(const [name,patch,code] of [
 ['issuer',{iss:'https://different.cloudflareaccess.com'},'ACCESS_ISSUER_MISMATCH'],
 ['email',{email:'other@example.invalid'},'ACCESS_EMAIL_MISMATCH'],
 ['audience',{aud:['b'.repeat(64)]},'ACCESS_AUDIENCE_MISMATCH'],
 ['expiry',{exp:1},'ACCESS_TOKEN_TIME_INVALID']
])test(name+' mismatch exposes only a fixed code',async()=>assert.rejects(verify(patch),{code,message:'Validation access denied'}));
test('cert retrieval errors do not expose exception details',async()=>{
 await assert.rejects(verify({},async()=>{throw Error('sensitive upstream detail');}),{code:'ACCESS_VERIFICATION_FAILED',message:'Validation access denied'});
 await assert.rejects(verify({},async()=>new Response('',{status:403})),{code:'ACCESS_CERTS_HTTP_ERROR'});
});
test('valid signed Access assertion is still required and accepted',async()=>verify());
test('setup and D1 marker failures have fixed codes only',async()=>{
 await assert.rejects(assertStagingDatabase({...env,STAGING_ADMIN_EMAIL:''}),{code:'SETUP_APPROVED_ADMINISTRATOR'});
 await assert.rejects(assertStagingDatabase({...env,ORDERS_DB:{prepare:()=>({first:async()=>null})}}),{code:'D1_MARKER_MISMATCH'});
});
test('deployment preserves dashboard vars and contains no overriding placeholders',async()=>{
 const config=JSON.parse(await readFile(new URL('../staging/wrangler.jsonc',import.meta.url),'utf8'));
 assert.equal(config.keep_vars,true);
 for(const name of ['ACCESS_AUDIENCE','ACCESS_TEAM_DOMAIN','STAGING_ADMIN_EMAIL','SQUARE_LOCATION_ID','SQUARE_SANDBOX_APPLICATION_ID'])assert.equal(Object.hasOwn(config.vars,name),false);
});
test('Worker logs only controlled reason codes and keeps the public 401 generic',async()=>{
 const {default:worker}=await import('../staging/worker.js');
 const logs=[],original=console.warn;console.warn=(entry)=>logs.push(JSON.parse(entry));
 try{
  for(const [patch,code] of [
   [{STAGING_ADMIN_EMAIL:''},'SETUP_APPROVED_ADMINISTRATOR'],
   [{ORDERS_DB:{prepare:()=>{throw Error('private database details');}}},'STAGING_SETUP_DATABASE_FAILED'],
   [{ORDERS_DB:{prepare:()=>({first:async()=>({instance_id:env.STAGING_INSTANCE_ID,database_id:env.STAGING_DATABASE_ID})})}},'ACCESS_JWT_MISSING']
  ]){
   const response=await worker.fetch(new Request(env.SITE_URL),{...env,...patch},{});
   assert.equal(response.status,401);assert.equal(await response.text(),'Staging sign-in or setup required');
   assert.equal(logs.at(-1).code,code);assert.deepEqual(Object.keys(logs.at(-1)),['event','phase','code']);
  }
  assert(!JSON.stringify(logs).includes('private database details'));
 }finally{console.warn=original;}
});
