// Production-shaped metadata fixtures; no remote calls or credentials.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm,cp,lstat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {normalizeD1Binding,PRODUCTION_D1_ID,EXPECTED_VERSION,validatedVersion,recoverLiveVersion} from '../production/recover-live-version.mjs';
import {inspectVersion,collectEvidence,profileFromEvidence,confirmedDatabaseEvidence,prepareFromVersion,identity} from '../production/prepare-off-from-version.mjs';
import {safeReleaseDiagnostic} from '../production/release-diagnostics.mjs';
const forms=[{id:PRODUCTION_D1_ID},{database_id:PRODUCTION_D1_ID},{id:PRODUCTION_D1_ID,database_id:PRODUCTION_D1_ID}],clone=structuredClone;
function fixture(fields=forms[0]){
 const vars={RUNTIME_TIER:'production',SQUARE_ENVIRONMENT:'production',SQUARE_LOCATION_ID:'LQ693S4H2NBZ8',PRODUCTION_WORKER_NAME:identity.worker,PRODUCTION_PURCHASE_PROTOCOL:'durable-v1',SITE_URL:'https://yasoyahonten.awaiaune.com',MANAGEMENT_ENABLED:'1',PRODUCTION_MANAGEMENT_SCHEMA_READY:'1',PRODUCTION_MANAGEMENT_READ_ENABLED:'1',PRODUCTION_STOREFRONT_ENABLED:'1',PRODUCTION_UNIFIED_PUBLISH_ENABLED:'0',PRODUCTION_STOREFRONT_PUBLISH_ENABLED:'1',PRODUCTION_INVENTORY_WRITER_APPROVAL:'shared-purchase-do-single-writer-v1',PRODUCTION_MANAGEMENT_CATALOG_ENABLED:'0',PRODUCTION_MANAGEMENT_INVENTORY_ENABLED:'1',STOREFRONT_RETIRE_GOLDENROD:'1',PRODUCTION_CHECKOUT_ENABLED:'0',PRODUCTION_MANAGED_CHECKOUT_ENABLED:'0'};
 const v={id:EXPECTED_VERSION,resources:{script_runtime:{compatibility_date:'2026-08-04',compatibility_flags:[]},bindings:[...Object.entries(vars).map(([name,text])=>({type:'plain_text',name,text})),...['ADMIN_TOKEN','SQUARE_ACCESS_TOKEN','RESEND_API_KEY'].map(name=>({type:'secret_text',name})),{type:'d1',name:'ORDERS_DB',...fields},{type:'durable_object_namespace',name:'PURCHASE_COORDINATOR',class_name:'PurchaseCoordinator',namespace_id:identity.namespace},{type:'r2_bucket',name:'PRODUCT_IMAGES',bucket_name:identity.bucket},{type:'assets',name:'ASSETS'}]}};
 const e={account:identity.account,worker:identity.worker,versionId:v.id,activeVersionId:v.id,traffic:100,routes:[],domains:[{hostname:'yasoyahonten.awaiaune.com',service:identity.worker,zone_id:'a'.repeat(32)}],subdomain:{enabled:true,previews_enabled:false},database:{uuid:PRODUCTION_D1_ID,name:'yasoya-orders'},namespace:{id:identity.namespace,class:'PurchaseCoordinator',script:identity.worker,use_sqlite:true},schedules:[],assetConfig:{run_worker_first:true}};return {v,e};
}
const d1=v=>v.resources.bindings.find(b=>b.type==='d1');
const a='/accounts/'+identity.account,w=a+'/workers/scripts/'+identity.worker;
const denied=()=>Object.assign(Error('METADATA_HTTP_ERROR'),{http:401,codes:[10000],endpoint:a+'/d1/database/'+PRODUCTION_D1_ID});
function metadata(f,{fresh=f.v,settings=f.v.resources.bindings,d1Denied=false}={}){
 return async endpoint=>{
  if(endpoint===w+'/deployments?page=1&per_page=1')return {deployments:[{versions:[{version_id:EXPECTED_VERSION,percentage:100}]}]};
  if(endpoint===w+'/versions/'+EXPECTED_VERSION)return clone(fresh);
  if(endpoint===w+'/settings')return {bindings:clone(settings),assets:{config:f.e.assetConfig}};
  if(endpoint===w+'/routes')return f.e.routes;if(endpoint.includes('/workers/domains?'))return f.e.domains;if(endpoint===w+'/subdomain')return f.e.subdomain;if(endpoint===w+'/schedules')return {schedules:[]};if(endpoint===a+'/d1/database/'+PRODUCTION_D1_ID){if(d1Denied)throw denied();return f.e.database;}if(endpoint===a+'/workers/durable_objects/namespaces/'+identity.namespace)return f.e.namespace;throw Error('UNEXPECTED_ENDPOINT');
 };
}
for(const fields of forms)test('canonical D1 identity from '+Object.keys(fields).join('+')+' without mutating source',()=>{
 const f=fixture(fields),before=clone(f.v),binding=d1(f.v),normalized=normalizeD1Binding(binding);
 assert.deepEqual(normalized,{type:'d1',name:'ORDERS_DB',id:PRODUCTION_D1_ID});assert.equal(inspectVersion(f.v).bindings.get('ORDERS_DB').id,PRODUCTION_D1_ID);assert.deepEqual(d1(validatedVersion(f.v,inspectVersion)),normalized);assert.deepEqual(f.v,before);
 const proof=confirmedDatabaseEvidence(f.v,denied());assert.equal(proof.database.uuid,PRODUCTION_D1_ID);assert.equal(proof.databaseEvidence.databaseId,PRODUCTION_D1_ID);assert.equal(profileFromEvidence(f.v,f.e,'/assets').config.d1_databases[0].database_id,PRODUCTION_D1_ID);
});
for(const [fields,code]of [[{},'D1_BINDING_ID_MISSING'],[{id:PRODUCTION_D1_ID,database_id:'wrong'},'D1_BINDING_ID_CONFLICT'],[{id:'wrong',database_id:PRODUCTION_D1_ID},'D1_BINDING_ID_CONFLICT'],[{database_id:'wrong'},'D1_BINDING_ID_MISMATCH'],[{id:'wrong',database_id:'wrong'},'D1_BINDING_ID_MISMATCH'],[{database_id:' '+PRODUCTION_D1_ID},'D1_BINDING_ID_MISMATCH'],[{id:undefined,database_id:PRODUCTION_D1_ID},'D1_BINDING_ID_CONFLICT']])test('unsafe D1 alias set refuses with '+code+': '+JSON.stringify(fields),()=>{
 const f=fixture(fields);for(const fn of [()=>normalizeD1Binding(d1(f.v)),()=>inspectVersion(f.v),()=>validatedVersion(f.v,inspectVersion),()=>confirmedDatabaseEvidence(f.v,denied()),()=>profileFromEvidence(f.v,f.e,'/assets')])assert.throws(fn,e=>e.message===code);assert.equal(safeReleaseDiagnostic('version_validate',Error(code)).code,code);
});
test('unknown D1 fields are not silently removed and diagnostics never expose values',()=>{
 const f=fixture({...forms[2],extra_field:'PRIVATE_VALUE'});let error;try{validatedVersion(f.v,inspectVersion);}catch(e){error=e;}assert.equal(error.message,'VERSION_BINDING_FIELDS_UNSUPPORTED');const diagnostic=safeReleaseDiagnostic('version_validate',error);assert.deepEqual(diagnostic.unsupportedFields,['extra_field']);assert(!JSON.stringify(diagnostic).includes('PRIVATE_VALUE'));assert(!diagnostic.unsupportedFields.includes('database_id'));
});
test('all snapshot/fresh-Version/settings alias combinations compare semantically and produce the exact Wrangler ID',async()=>{
 for(const old of forms)for(const current of forms)for(const setting of forms){
  const f=fixture(old),get=metadata(f,{fresh:fixture(current).v,settings:fixture(setting).v.resources.bindings}),e=await collectEvidence(f.v,get),profile=profileFromEvidence(f.v,e,'/assets');assert.equal(profile.config.d1_databases[0].database_id,PRODUCTION_D1_ID);
 }
});
test('fresh Version or settings containing contradictory aliases stops rather than bypassing comparison',async()=>{
 const f=fixture(),wrong=fixture({id:PRODUCTION_D1_ID,database_id:'wrong'}).v;
 await assert.rejects(()=>collectEvidence(f.v,metadata(f,{fresh:wrong})),/D1_BINDING_ID_CONFLICT/);await assert.rejects(()=>collectEvidence(f.v,metadata(f,{settings:wrong.resources.bindings})),/D1_BINDING_ID_CONFLICT/);
});
test('database_id-only recovery caches canonical id, reuses it and reaches correct OFF configuration/dry-run under D1 denial',async t=>{
 const dir=await mkdtemp(path.join(tmpdir(),'yasoya-d1-alias-test-'));t.after(()=>rm(dir,{recursive:true,force:true}));const f=fixture(forms[1]),temporaryFile=path.join(dir,'absent.json'),cacheDirectory=path.join(dir,'cache'),get=metadata(f,{fresh:fixture(forms[2]).v,settings:fixture(forms[1]).v.resources.bindings,d1Denied:true});
 const recovered=await recoverLiveVersion({temporaryFile,cacheDirectory},{get,inspect:inspectVersion});assert.equal(recovered.source,'remote');assert.deepEqual(d1(recovered.version),{type:'d1',name:'ORDERS_DB',id:PRODUCTION_D1_ID});
 const reused=await recoverLiveVersion({temporaryFile,cacheDirectory},{get:async endpoint=>{assert(endpoint.includes('/deployments?'));return get(endpoint);},inspect:inspectVersion});assert.equal(reused.source,'persistent');assert.deepEqual(reused.version,recovered.version);assert.equal((await lstat(reused.versionFile)).mode&0o777,0o600);
 const before=await readFile(reused.versionFile),assets=path.join(dir,'assets'),output=path.join(dir,'release');await cp(new URL('../production/.generated/v53/',import.meta.url),assets,{recursive:true});let calls=0;
 const result=await prepareFromVersion({versionFile:reused.versionFile,assets,output,collect:true,dryRun:true},{get,run:async(cmd,args)=>{assert.equal(cmd,'npx');assert(args.includes('--dry-run'));calls++;return {stdout:'offline build',stderr:''};}});
 assert.equal(result.dryRun,true);assert.equal(calls,1);assert.equal(result.databaseEvidence.apiReadVerified,false);assert.equal(result.databaseEvidence.databaseId,PRODUCTION_D1_ID);assert.deepEqual(await readFile(reused.versionFile),before);
 const profile=JSON.parse(await readFile(path.join(output,'release/off.local.jsonc'),'utf8'));assert.deepEqual(profile.d1_databases,[{binding:'ORDERS_DB',database_name:'yasoya-orders',database_id:PRODUCTION_D1_ID}]);assert.equal(profile.vars.PRODUCTION_CHECKOUT_ENABLED,'0');assert.equal(profile.vars.PRODUCTION_MANAGED_CHECKOUT_ENABLED,'0');assert.equal(profile.vars.PRODUCTION_MANAGEMENT_CATALOG_ENABLED,'0');assert.equal(profile.vars.PRODUCTION_MANAGEMENT_INVENTORY_ENABLED,'1');assert.deepEqual(profile.migrations,[]);
});
