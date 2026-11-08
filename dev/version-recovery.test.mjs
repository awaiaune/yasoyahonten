// Version and deployment transports are synthetic; no credentials/network.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,mkdir,rm,lstat,symlink,cp} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {recoverLiveVersion,validatedVersion,unwrapCachedVersion,EXPECTED_VERSION} from '../production/recover-live-version.mjs';
import {inspectVersion,prepareFromVersion,identity} from '../production/prepare-off-from-version.mjs';
const exec=promisify(execFile),base='/accounts/'+identity.account+'/workers/scripts/'+identity.worker;
function version(){
 const vars={RUNTIME_TIER:'production',SQUARE_ENVIRONMENT:'production',SQUARE_LOCATION_ID:'LQ693S4H2NBZ8',PRODUCTION_WORKER_NAME:identity.worker,PRODUCTION_PURCHASE_PROTOCOL:'durable-v1',SITE_URL:'https://yasoyahonten.awaiaune.com',MANAGEMENT_ENABLED:'1',PRODUCTION_MANAGEMENT_SCHEMA_READY:'1',PRODUCTION_MANAGEMENT_READ_ENABLED:'1',PRODUCTION_STOREFRONT_ENABLED:'1',PRODUCTION_UNIFIED_PUBLISH_ENABLED:'0',PRODUCTION_STOREFRONT_PUBLISH_ENABLED:'1',PRODUCTION_INVENTORY_WRITER_APPROVAL:'shared-purchase-do-single-writer-v1',PRODUCTION_MANAGEMENT_CATALOG_ENABLED:'0',PRODUCTION_MANAGEMENT_INVENTORY_ENABLED:'1',STOREFRONT_RETIRE_GOLDENROD:'1',PRODUCTION_CHECKOUT_ENABLED:'0',PRODUCTION_MANAGED_CHECKOUT_ENABLED:'0'};
 return {id:EXPECTED_VERSION,metadata:{author_email:'PRIVATE_AUTHOR',token:'PRIVATE_TOKEN'},resources:{script_runtime:{compatibility_date:'2026-08-04',compatibility_flags:[]},bindings:[...Object.entries(vars).map(([name,text])=>({type:'plain_text',name,text})),...['ADMIN_TOKEN','SQUARE_ACCESS_TOKEN','RESEND_API_KEY'].map(name=>({type:'secret_text',name})),{type:'d1',name:'ORDERS_DB',id:identity.database},{type:'durable_object_namespace',name:'PURCHASE_COORDINATOR',class_name:'PurchaseCoordinator',namespace_id:identity.namespace},{type:'r2_bucket',name:'PRODUCT_IMAGES',bucket_name:identity.bucket},{type:'assets',name:'ASSETS'}]}};
}
const deployment=()=>({deployments:[{versions:[{version_id:EXPECTED_VERSION,percentage:100}]}]});
async function fixture(t){const dir=await mkdtemp(path.join(tmpdir(),'yasoya-version-recovery-test-'));t.after(()=>rm(dir,{recursive:true,force:true}));return {dir,temporaryFile:path.join(dir,'temporary.json'),cacheDirectory:path.join(dir,'private')};}
function reader(v=version()){const calls=[];return {calls,get:async endpoint=>{calls.push(endpoint);if(endpoint===base+'/deployments?page=1&per_page=1')return deployment();if(endpoint===base+'/versions/'+EXPECTED_VERSION)return structuredClone(v);throw Error('UNEXPECTED_ENDPOINT');}};}
test('missing temporary and persistent snapshots fetch once, validate, and persist only non-secret fields with 0700/0600',async t=>{
 const f=await fixture(t),r=reader(),phases=[],result=await recoverLiveVersion(f,{get:r.get,inspect:inspectVersion,onStage:s=>phases.push(s)});
 assert.equal(result.source,'remote');assert.deepEqual(r.calls,[base+'/deployments?page=1&per_page=1',base+'/versions/'+EXPECTED_VERSION,base+'/deployments?page=1&per_page=1']);assert(phases.includes('version_fetch'));assert.equal(result.version.id,EXPECTED_VERSION);
 assert.equal((await lstat(f.cacheDirectory)).mode&0o777,0o700);assert.equal((await lstat(result.versionFile)).mode&0o777,0o600);
 const saved=await readFile(result.versionFile,'utf8');assert(!saved.includes('PRIVATE_'));assert(!saved.includes('author_email'));assert(saved.includes('SQUARE_ACCESS_TOKEN'));assert.equal(unwrapCachedVersion(JSON.parse(saved)).id,EXPECTED_VERSION);await assert.rejects(()=>lstat(f.temporaryFile));
});
test('existing valid temporary snapshot is reused, left byte-identical, and still verifies active Version',async t=>{
 const f=await fixture(t),r=reader(),original=JSON.stringify(version());await writeFile(f.temporaryFile,original);const result=await recoverLiveVersion(f,{get:r.get,inspect:inspectVersion});assert.equal(result.source,'temporary');assert.deepEqual(r.calls,[base+'/deployments?page=1&per_page=1']);assert.equal(await readFile(f.temporaryFile,'utf8'),original);
});
test('after temporary-file loss the persistent snapshot is reused without a second Version fetch',async t=>{
 const f=await fixture(t),first=reader();await recoverLiveVersion(f,{get:first.get,inspect:inspectVersion});const next=reader();const result=await recoverLiveVersion(f,{get:next.get,inspect:inspectVersion});assert.equal(result.source,'persistent');assert.deepEqual(next.calls,[base+'/deployments?page=1&per_page=1']);
});
for(const where of ['temporary','persistent'])test('invalid '+where+' JSON stops instead of bypassing validation or overwriting it',async t=>{
 const f=await fixture(t),r=reader(),file=where==='temporary'?f.temporaryFile:path.join(f.cacheDirectory,'live-version.json');if(where==='persistent')await mkdir(f.cacheDirectory);await writeFile(file,'{PRIVATE_INVALID');
 await assert.rejects(()=>recoverLiveVersion(f,{get:r.get,inspect:inspectVersion}),/VERSION_JSON_INVALID/);assert.deepEqual(r.calls,[]);assert.equal(await readFile(file,'utf8'),'{PRIVATE_INVALID');
});
test('deployment-fetch rejection remains a failure and creates no cache',async t=>{
 const f=await fixture(t),err=Object.assign(Error('METADATA_HTTP_ERROR'),{http:401,codes:[10000]});await assert.rejects(()=>recoverLiveVersion(f,{get:async()=>{throw err;},inspect:inspectVersion}),e=>e===err);await assert.rejects(()=>lstat(f.cacheDirectory));
});
test('Version-fetch failure keeps HTTP error evidence and does not save a partial snapshot',async t=>{
 const f=await fixture(t);let n=0;await assert.rejects(()=>recoverLiveVersion(f,{get:async()=>{if(n++===0)return deployment();throw Object.assign(Error('METADATA_HTTP_ERROR'),{http:500,codes:[10001]});},inspect:inspectVersion}),e=>e.http===500);await assert.rejects(()=>lstat(f.cacheDirectory));assert.equal(n,2);
});
test('a different fetched Version ID is rejected before persistence',async t=>{
 const f=await fixture(t),v=version();v.id='11111111-1111-4111-8111-111111111111';const r=reader(v);await assert.rejects(()=>recoverLiveVersion(f,{get:r.get,inspect:inspectVersion}),/VERSION_ID_MISMATCH/);await assert.rejects(()=>lstat(f.cacheDirectory));
});
test('a rollout changing during Version fetch is rejected at the post-fetch recheck',async t=>{
 const f=await fixture(t);let calls=0;await assert.rejects(()=>recoverLiveVersion(f,{inspect:inspectVersion,get:async endpoint=>{calls++;if(endpoint.includes('/versions/'))return version();if(calls===1)return deployment();return {deployments:[{versions:[{version_id:'other',percentage:100}]}]};}}),/LIVE_VERSION_CHANGED/);assert.equal(calls,3);await assert.rejects(()=>lstat(f.cacheDirectory));
});
for(const active of [[{version_id:'11111111-1111-4111-8111-111111111111',percentage:100}],[{version_id:EXPECTED_VERSION,percentage:50}],[{version_id:EXPECTED_VERSION,percentage:50},{version_id:'other',percentage:50}]])test('changed/split active rollout stops even when a valid saved snapshot exists: '+JSON.stringify(active),async t=>{
 const f=await fixture(t),original=JSON.stringify(version());await writeFile(f.temporaryFile,original);let calls=0;await assert.rejects(()=>recoverLiveVersion(f,{get:async()=>{calls++;return {deployments:[{versions:active}]};},inspect:inspectVersion}),/LIVE_VERSION_CHANGED/);assert.equal(calls,1);await assert.rejects(()=>lstat(f.cacheDirectory));assert.equal(await readFile(f.temporaryFile,'utf8'),original);
});
for(const [name,value]of [['RUNTIME_TIER','staging'],['SQUARE_ENVIRONMENT','sandbox'],['PRODUCTION_WORKER_NAME','wrong-worker'],['SQUARE_LOCATION_ID','wrong-location'],['PRODUCTION_CHECKOUT_ENABLED','1']])test('recovered Version refuses unsafe '+name,()=>{
 const v=version();v.resources.bindings.find(b=>b.name===name).text=value;assert.throws(()=>validatedVersion(v,inspectVersion),/VERSION_PRODUCTION_IDENTITY_MISMATCH|LIVE_OFF_FLAGS_INVALID/);
});
test('wrong storage binding, missing Secret name and Secret values cannot enter persistent cache',async t=>{
 const f=await fixture(t);
 for(const change of [v=>{v.resources.bindings.find(b=>b.type==='d1').id='wrong';},v=>{v.resources.bindings=v.resources.bindings.filter(b=>b.name!=='ADMIN_TOKEN');},v=>{v.resources.bindings.find(b=>b.type==='secret_text').text='PRIVATE_SECRET';},v=>{v.resources.bindings.push({type:'json',name:'CONFIG',json:{nested:{access_token:'PRIVATE_TOKEN'}}});}]){
  const v=version();change(v);const r=reader(v);await assert.rejects(()=>recoverLiveVersion(f,{get:r.get,inspect:inspectVersion}));await assert.rejects(()=>lstat(f.cacheDirectory));
 }
});
test('cache envelope must match the known Worker/account/Version, with no inferred identity',()=>{
 const v=validatedVersion(version(),inspectVersion),cache={cacheSchema:1,account:identity.account,worker:identity.worker,versionId:EXPECTED_VERSION,version:v};
 for(const change of [{account:'other'},{worker:'other'},{versionId:'other'},{cacheSchema:2}])assert.throws(()=>unwrapCachedVersion({...cache,...change}),/VERSION_CACHE_IDENTITY_MISMATCH/);
});
test('symlink input/cache paths are refused without following or modifying them',async t=>{
 const f=await fixture(t),real=path.join(f.dir,'real.json');await writeFile(real,JSON.stringify(version()));await symlink(real,f.temporaryFile);await assert.rejects(()=>recoverLiveVersion(f,{get:reader().get,inspect:inspectVersion}),/VERSION_FILE_UNSAFE/);
 await rm(f.temporaryFile);const target=path.join(f.dir,'target');await mkdir(target);await symlink(target,f.cacheDirectory);await assert.rejects(()=>recoverLiveVersion(f,{get:reader().get,inspect:inspectVersion}),/VERSION_CACHE_PATH_UNSAFE/);await assert.rejects(()=>lstat(path.join(target,'live-version.json')));
});
test('persistent snapshot under common .git is untrackable even with git add --force',async t=>{
 const f=await fixture(t),repo=path.join(f.dir,'repo');await exec('git',['init',repo]);const r=reader(),cacheDirectory=path.join(repo,'.git','yasoya-release-private');const result=await recoverLiveVersion({...f,cacheDirectory},{get:r.get,inspect:inspectVersion});
 // Git versions either refuse .git pathspecs or silently ignore them. The
 // required invariant is the empty index, including after force-add/add-all.
 try{await exec('git',['-C',repo,'add','--force',result.versionFile]);}catch(e){assert([1,128].includes(e.code));}
 await exec('git',['-C',repo,'add','--all']);assert.equal((await exec('git',['-C',repo,'ls-files'])).stdout,'');
});
test('missing snapshot recovery continues through D1-denial proof, asset copy and OFF dry-run without manual files',async t=>{
 const f=await fixture(t),v=version(),r=reader(v),recovered=await recoverLiveVersion(f,{get:r.get,inspect:inspectVersion}),assets=path.join(f.dir,'assets');await cp(new URL('../production/.generated/v53/',import.meta.url),assets,{recursive:true});
 const get=async p=>{
  if(p===base+'/deployments?page=1&per_page=1')return deployment();if(p===base+'/versions/'+EXPECTED_VERSION)return v;
  if(p===base+'/settings')return {bindings:v.resources.bindings,assets:{config:{run_worker_first:true}}};if(p===base+'/routes')return [];if(p.includes('/workers/domains?'))return [{hostname:'yasoyahonten.awaiaune.com',service:identity.worker,zone_id:'a'.repeat(32)}];if(p===base+'/subdomain')return {enabled:true,previews_enabled:false};if(p===base+'/schedules')return {schedules:[]};
  if(p.includes('/d1/database/'))throw Object.assign(Error('METADATA_HTTP_ERROR'),{http:401,codes:[10000]});if(p.includes('/durable_objects/namespaces/'))return {id:identity.namespace,class:'PurchaseCoordinator',script:identity.worker,use_sqlite:true};throw Error('UNEXPECTED_ENDPOINT');
 };
 const commands=[],output=path.join(f.dir,'prepared');const result=await prepareFromVersion({versionFile:recovered.versionFile,assets,output,collect:true,dryRun:true},{get,run:async(cmd,args)=>{commands.push({cmd,args});return {stdout:'offline build',stderr:''};}});
 assert.equal(result.dryRun,true);assert.equal(commands.length,1);assert(commands[0].args.includes('--dry-run'));assert.equal(result.databaseEvidence.apiReadVerified,false);
 const c=JSON.parse(await readFile(path.join(output,'release/off.local.jsonc'),'utf8'));assert.equal(c.vars.PRODUCTION_CHECKOUT_ENABLED,'0');assert.equal(c.vars.PRODUCTION_MANAGED_CHECKOUT_ENABLED,'0');assert.equal(c.vars.PRODUCTION_MANAGEMENT_CATALOG_ENABLED,'0');assert.equal(c.vars.PRODUCTION_MANAGEMENT_INVENTORY_ENABLED,'1');assert.deepEqual(c.migrations,[]);
});
