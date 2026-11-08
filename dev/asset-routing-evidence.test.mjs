// Offline metadata fixtures only: no Cloudflare authentication or remote writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,stat,readFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {checkedAssetConfig,evidenceFromVersionAPI,evidenceFromDeployRecord,searchDeployRecords,resolveAssetRouting,validateAssetEvidence,sameAssetRouting} from '../production/asset-routing-evidence.mjs';
import {apiReader} from '../production/prepare-off-from-version.mjs';
import {safeReleaseDiagnostic} from '../production/release-diagnostics.mjs';
const worker='yasoya-honten-payments',account='fcf37e462257810df77e8fbc0e7f4317',id='36ab2dba-dd44-4f39-bc69-6db729bd24d5';
const version=()=>({id,resources:{bindings:[{type:'assets',name:'ASSETS'}]}});
const config={run_worker_first:true,html_handling:'auto-trailing-slash',not_found_handling:'none',base_path:'/'};
const body=()=>({id,bindings:[{type:'assets',name:'ASSETS'},{type:'secret_text',name:'SQUARE_ACCESS_TOKEN'}],assets:{config:{...config},jwt:'NEVER_CACHE_UPLOAD_CREDENTIAL'},author_email:'DO_NOT_CACHE_PERSON'});
const active=()=>({deployments:[{versions:[{version_id:id,percentage:100}]}]});
async function temp(t){const dir=await mkdtemp(path.join(tmpdir(),'yasoya-routing-fixture-'));t.after(()=>rm(dir,{recursive:true,force:true}));return dir;}
const record=()=>({type:'deploy',worker_name:worker,version_id:id,status:'success',assets:{binding:'ASSETS',config}});
test('official Version-specific API evidence retains exact routing and binding, excludes raw credentials/author',()=>{
 const p=evidenceFromVersionAPI(body(),version());validateAssetEvidence(p,version());assert.deepEqual(p.config,config);assert.equal(p.source.endpoint,`/accounts/${account}/workers/workers/${worker}/versions/${id}`);assert(!JSON.stringify(p).includes('NEVER_CACHE'));assert(!JSON.stringify(p).includes('DO_NOT_CACHE'));
});
test('omitted optional fields stay omitted, not inferred from public asset equality',()=>{
 const b=body();b.assets.config={run_worker_first:true};assert.deepEqual(evidenceFromVersionAPI(b,version()).config,{run_worker_first:true});
});
for(const [label,mutate,code] of [
 ['wrong Version',b=>b.id='other','VERSION_MISMATCH'],
 ['wrong binding',b=>b.bindings[0].name='OTHER','BINDING_MISMATCH'],
 ['duplicate binding',b=>b.bindings.push(b.bindings[0]),'BINDING_MISMATCH'],
 ['missing worker-first',b=>delete b.assets.config.run_worker_first,'CONFIG_MISSING'],
 ['unknown setting',b=>b.assets.config.unknown=true,'CONFIG_UNSUPPORTED'],
 ['invalid handling',b=>b.assets.config.html_handling='invented','CONFIG_INVALID'],
 ['null base path',b=>b.assets.config.base_path=null,'CONFIG_INVALID']
])test(label+' fails closed',()=>{const b=body();mutate(b);assert.throws(()=>evidenceFromVersionAPI(b,version()),new RegExp(code));});
test('API omitting assets can fall back; missing binding in validated snapshot cannot',()=>{const b=body();delete b.assets;assert.equal(evidenceFromVersionAPI(b,version()),null);assert.throws(()=>evidenceFromVersionAPI(body(),{id,resources:{bindings:[]}}),/BINDING_MISMATCH/);});
test('known false or scoped routing is preserved for policy rejection, never promoted to true',()=>{assert.equal(checkedAssetConfig({run_worker_first:false}).run_worker_first,false);assert.deepEqual(checkedAssetConfig({run_worker_first:['/api/*']}).run_worker_first,['/api/*']);});
test('GET succeeds, active Version rechecked, private cache reused without another routing read',async t=>{
 const dir=await temp(t),calls=[];const get=async p=>{calls.push(p);return p.includes('/deployments?')?active():body();};
 const first=await resolveAssetRouting(version(),{cacheDirectory:path.join(dir,'private'),get,roots:[]});assert.equal(calls.length,2);assert.equal((await stat(path.dirname(first.file))).mode&511,448);assert.equal((await stat(first.file)).mode&511,384);const raw=await readFile(first.file,'utf8');assert(!raw.includes('NEVER_CACHE'));assert(!raw.includes('DO_NOT_CACHE'));
 const second=await resolveAssetRouting(version(),{cacheDirectory:path.join(dir,'private'),get:async()=>assert.fail('cached routing refetched'),roots:[]});assert(second.reused);assert.deepEqual(second.proof,first.proof);
});
test('changed active deployment prevents persistence',async t=>{const dir=await temp(t);await assert.rejects(()=>resolveAssetRouting(version(),{cacheDirectory:path.join(dir,'private'),roots:[],get:async p=>p.includes('/deployments?')?{deployments:[{versions:[{version_id:'other',percentage:100}]}]}:body()}),/LIVE_VERSION_CHANGED/);});
test('positive API Version mismatch stops without historical fallback',async t=>{const dir=await temp(t);await assert.rejects(()=>resolveAssetRouting(version(),{cacheDirectory:path.join(dir,'private'),roots:[],get:async()=>({...body(),id:'other'})}),/VERSION_MISMATCH/);});
test('API denial uses version-bound embedded deployment receipt, not a bare config',async t=>{
 const root=await temp(t);await mkdir(path.join(root,'production'));await writeFile(path.join(root,'production','release-receipt.json'),JSON.stringify(record()));
 const r=await resolveAssetRouting(version(),{cacheDirectory:path.join(root,'private'),roots:[root],get:async p=>{if(p.includes('/deployments?'))return active();throw Object.assign(Error('METADATA_HTTP_ERROR'),{http:401,codes:[10000]});}});assert.equal(r.proof.source.kind,'deployment_record');assert.deepEqual(r.proof.config,config);
});
test('stock deploy output and mutable config alone cannot establish routing',async t=>{
 const root=await temp(t);await mkdir(path.join(root,'production'));await writeFile(path.join(root,'production','ready.jsonc'),JSON.stringify({name:worker,assets:{binding:'ASSETS',...config}}));await writeFile(path.join(root,'production','deploy.json'),JSON.stringify({type:'deploy',worker_name:worker,version_id:id}));const result=await searchDeployRecords(version(),[root]);assert.equal(result.proof,null);assert.equal(result.summary.unboundConfigs,1);
});
test('digest-bound deployment config accepted only inside project with identical bytes',async t=>{
 const root=await temp(t),file=path.join(root,'deploy.json'),c=JSON.stringify({name:worker,account_id:account,assets:{directory:'./site',binding:'ASSETS',...config}});await writeFile(path.join(root,'actual.jsonc'),c);
 const row={type:'deploy',worker_name:worker,version_id:id,config_path:'actual.jsonc',config_sha256:createHash('sha256').update(c).digest('hex')};assert.equal((await evidenceFromDeployRecord(row,file,version(),root)).source.proof,'digest_bound_config');assert.equal(await evidenceFromDeployRecord({...row,config_sha256:'a'.repeat(64)},file,version(),root),null);assert.equal(await evidenceFromDeployRecord({...row,config_path:'../outside.jsonc'},file,version(),root),null);
 await writeFile(path.join(root,'ready.jsonc'),c);assert.equal(await evidenceFromDeployRecord({...row,config_path:'ready.jsonc'},file,version(),root),null);
});
for(const [label,change]of [['wrong Worker',{worker_name:'other'}],['wrong Version',{version_id:'other'}],['dry-run',{dry_run:true}],['environment override',{wrangler_environment:'preview'}],['failed deploy',{status:'failed'}]])test('ignore unproven record: '+label,async()=>assert.equal(await evidenceFromDeployRecord({...record(),...change},'/project/receipt.json',version()),null));
test('conflicting version-bound receipts stop',async t=>{const root=await temp(t);await mkdir(path.join(root,'production'));await writeFile(path.join(root,'production','deploy-a.json'),JSON.stringify(record()));const r=record();r.assets.config={run_worker_first:false};await writeFile(path.join(root,'production','deploy-b.json'),JSON.stringify(r));await assert.rejects(()=>searchDeployRecords(version(),[root]),/EVIDENCE_CONFLICT/);});
test('missing API/local proof returns bounded safe failure and one Dashboard checklist',async t=>{
 const root=await temp(t);await assert.rejects(()=>resolveAssetRouting(version(),{cacheDirectory:path.join(root,'private'),roots:[path.join(root,'missing')],get:async()=>{throw Object.assign(Error('RAW_RESPONSE_SECRET'),{http:403,codes:[10000]});}}),e=>{assert.equal(e.diagnostic.code,'ASSET_ROUTING_EVIDENCE_UNAVAILABLE');assert.equal(e.diagnostic.readFailures[0].http,403);assert.equal(e.diagnostic.localRecords.existingRoots,0);assert(!JSON.stringify(e.diagnostic).includes('RAW_RESPONSE_SECRET'));return true;});
});
test('cache symlink and invalid JSON stop rather than silently replace',async t=>{const root=await temp(t),cache=path.join(root,'private');await mkdir(cache);const file=path.join(cache,'asset-routing-'+id+'.json');await writeFile(file,'invalid');await assert.rejects(()=>resolveAssetRouting(version(),{cacheDirectory:cache,get:async()=>assert.fail()}),/CACHE_INVALID/);await rm(file);await symlink(path.join(root,'elsewhere'),file);await assert.rejects(()=>resolveAssetRouting(version(),{cacheDirectory:cache,get:async()=>assert.fail()}),/CACHE_UNSAFE/);});
test('proof source/identity and unexpected data rejected; profile reuse requires exact config',()=>{
 const p=evidenceFromVersionAPI(body(),version());assert(sameAssetRouting({directory:'/site',binding:'ASSETS',...config},p));assert(!sameAssetRouting({directory:'/site',binding:'ASSETS',run_worker_first:true},p));assert.throws(()=>validateAssetEvidence({...p,worker:'other'},version()),/IDENTITY_MISMATCH/);assert.throws(()=>validateAssetEvidence({...p,source:{kind:'unproven'}},version()),/SOURCE_UNVERIFIED/);assert.throws(()=>validateAssetEvidence({...p,rawResponse:'NEVER_SAVE'},version()),/SOURCE_UNVERIFIED/);
});
test('asset error codes remain distinct from D1 metadata read failures',()=>{assert.equal(safeReleaseDiagnostic('asset_routing_version_api',Error('ASSET_ROUTING_CONFIG_UNSUPPORTED')).code,'ASSET_ROUTING_CONFIG_UNSUPPORTED');});
test('snapshot routing conflict stops; cache parent symlink cannot be followed',async t=>{
 const p=evidenceFromVersionAPI(body(),version()),v=version();v.resources.assets={config:{run_worker_first:false}};assert.throws(()=>validateAssetEvidence(p,v),/EVIDENCE_CONFLICT/);
 const root=await temp(t),real=path.join(root,'real'),link=path.join(root,'link');await mkdir(real);await symlink(real,link);await assert.rejects(()=>resolveAssetRouting(version(),{cacheDirectory:link,get:async()=>assert.fail()}),/CACHE_UNSAFE/);
});

test('actual shared API reader sends only authenticated GET to fixed Version and deployment endpoints',async t=>{
 const root=await temp(t),calls=[];const get=await apiReader({type:'oauth',token:'offline-auth-sentinel'},{fetcher:async(url,init)=>{calls.push({url,method:init.method,redirect:init.redirect});assert.equal(init.headers.Authorization,'Bearer offline-auth-sentinel');assert(!url.includes('offline-auth-sentinel'));return Response.json({success:true,result:url.includes('/deployments?')?active():body()});}});
 const r=await resolveAssetRouting(version(),{cacheDirectory:path.join(root,'private'),get,roots:[]});assert.equal(calls.length,2);assert(calls.every(c=>c.method==='GET'&&c.redirect==='error'));assert(!JSON.stringify(r).includes('offline-auth-sentinel'));assert(!calls[0].url.includes('include=modules'));
});
