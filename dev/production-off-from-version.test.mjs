// Synthetic Cloudflare metadata only. No authentication, remote calls or deploy.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,cp,rm,lstat,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {identity,inspectVersion,profileFromEvidence,collectEvidence,apiReader,prepareFromVersion} from '../production/prepare-off-from-version.mjs';
const root=new URL('../',import.meta.url),versionId='36ab2dba-dd44-4f39-bc69-6db729bd24d5';
const clone=structuredClone;
function fixture(){
 const vars={RUNTIME_TIER:'production',SQUARE_ENVIRONMENT:'production',SQUARE_LOCATION_ID:'LQ693S4H2NBZ8',SQUARE_API_VERSION:'2026-07-15',PRODUCTION_WORKER_NAME:identity.worker,PRODUCTION_PURCHASE_PROTOCOL:'durable-v1',SITE_URL:'https://yasoyahonten.awaiaune.com',MANAGEMENT_ENABLED:'1',PRODUCTION_MANAGEMENT_SCHEMA_READY:'1',PRODUCTION_MANAGEMENT_READ_ENABLED:'1',PRODUCTION_STOREFRONT_ENABLED:'1',PRODUCTION_UNIFIED_PUBLISH_ENABLED:'0',PRODUCTION_STOREFRONT_PUBLISH_ENABLED:'1',PRODUCTION_INVENTORY_WRITER_APPROVAL:'shared-purchase-do-single-writer-v1',PRODUCTION_MANAGEMENT_CATALOG_ENABLED:'0',PRODUCTION_MANAGEMENT_INVENTORY_ENABLED:'1',STOREFRONT_RETIRE_GOLDENROD:'1',PRODUCTION_CHECKOUT_ENABLED:'0',PRODUCTION_MANAGED_CHECKOUT_ENABLED:'0'};
 const v={id:versionId,resources:{script:{handlers:['fetch','alarm']},script_runtime:{compatibility_date:'2026-08-04',compatibility_flags:[]},bindings:[...Object.entries(vars).map(([name,text])=>({type:'plain_text',name,text})),...['ADMIN_TOKEN','RESEND_API_KEY','SQUARE_ACCESS_TOKEN'].map(name=>({type:'secret_text',name})),{type:'d1',name:'ORDERS_DB',id:identity.database},{type:'durable_object_namespace',name:'PURCHASE_COORDINATOR',namespace_id:identity.namespace,class_name:'PurchaseCoordinator'},{type:'r2_bucket',name:'PRODUCT_IMAGES',bucket_name:identity.bucket},{type:'assets',name:'ASSETS'}]}};
 const e={account:identity.account,worker:identity.worker,versionId,activeVersionId:versionId,traffic:100,routes:[],domains:[{hostname:'yasoyahonten.awaiaune.com',service:identity.worker,zone_id:'a'.repeat(32)}],subdomain:{enabled:true,previews_enabled:false},database:{uuid:identity.database,name:'yasoya-orders'},namespace:{id:identity.namespace,class:'PurchaseCoordinator',script:identity.worker,use_sqlite:true},schedules:[{cron:'*/10 * * * *'}],assetConfig:{run_worker_first:true,html_handling:'auto-trailing-slash',not_found_handling:'none'},settings:{observability:{enabled:false}}};
 return {v,e};
}
test('build OFF profile exclusively from version bindings and live metadata; no old profile or migration replay',()=>{
 const {v,e}=fixture(),before=clone(v),{config,receipt}=profileFromEvidence(v,e,'/offline/current-assets');
 assert.equal(config.vars.PRODUCTION_CHECKOUT_ENABLED,'0');assert.equal(config.vars.PRODUCTION_MANAGED_CHECKOUT_ENABLED,'0');assert.equal(config.vars.PRODUCTION_MANAGEMENT_CATALOG_ENABLED,'0');assert.equal(config.vars.PRODUCTION_MANAGEMENT_INVENTORY_ENABLED,'1');assert.equal(config.vars.PRODUCTION_UNIFIED_PUBLISH_ENABLED,'0');
 assert.equal(config.account_id,identity.account);assert.equal(config.keep_vars,true);assert.equal(config.workers_dev,true);assert.equal(config.preview_urls,false);assert.deepEqual(config.migrations,[]);assert.deepEqual(config.triggers,{crons:['*/10 * * * *']});assert.deepEqual(config.observability,e.settings.observability);assert.equal(config.d1_databases[0].database_id,identity.database);assert.equal(config.r2_buckets[0].bucket_name,identity.bucket);assert.equal(config.assets.run_worker_first,true);
 assert.equal(receipt.namespaceId,identity.namespace);assert.deepEqual(receipt.secretNames,['ADMIN_TOKEN','RESEND_API_KEY','SQUARE_ACCESS_TOKEN']);assert(!Object.keys(config.vars).some(x=>x.includes('TOKEN')));assert.deepEqual(v,before);
});
test('class omitted by version is resolved from the actual matching namespace; never invented',()=>{
 const {v,e}=fixture();delete v.resources.bindings.find(b=>b.name==='PURCHASE_COORDINATOR').class_name;
 assert.equal(profileFromEvidence(v,e,'/assets').config.durable_objects.bindings[0].class_name,'PurchaseCoordinator');delete e.namespace;assert.throws(()=>profileFromEvidence(v,e,'/assets'),x=>x.missing.includes('namespace'));
});
test('missing non-versioned evidence is reported together; no route or asset defaults',()=>{
 const {v,e}=fixture();for(const key of ['routes','domains','subdomain','database','namespace','schedules','assetConfig'])delete e[key];
 assert.throws(()=>profileFromEvidence(v,e),x=>{assert.deepEqual(x.missing,['routes','subdomain','database_name','namespace','schedules','asset_routing','asset_directory']);return true;});
});
for(const key of ['PRODUCTION_CHECKOUT_ENABLED','PRODUCTION_MANAGED_CHECKOUT_ENABLED','PRODUCTION_MANAGEMENT_CATALOG_ENABLED','PRODUCTION_MANAGEMENT_INVENTORY_ENABLED'])test('wrong live flag refused: '+key,()=>{const {v}=fixture(),b=v.resources.bindings.find(x=>x.name===key);b.text=b.text==='1'?'0':'1';assert.throws(()=>inspectVersion(v),/LIVE_OFF_FLAGS/);});
for(const [label,mutate]of [
 ['plaintext credential',v=>v.resources.bindings.push({type:'plain_text',name:'OTHER_API_TOKEN',text:'offline-secret-sentinel'})],
 ['secret value in JSON',v=>{v.resources.bindings.find(x=>x.type==='secret_text').text='offline-secret-sentinel';}],
 ['Sandbox binding',v=>v.resources.bindings.push({type:'plain_text',name:'SQUARE_SANDBOX_APPLICATION_ID',text:'offline-sandbox'})],
 ['wrong D1',v=>{v.resources.bindings.find(x=>x.type==='d1').id='other';}],
 ['wrong DO',v=>{v.resources.bindings.find(x=>x.type==='durable_object_namespace').namespace_id='other';}],
 ['wrong R2',v=>{v.resources.bindings.find(x=>x.type==='r2_bucket').bucket_name='staging';}],
 ['duplicate',v=>v.resources.bindings.push(clone(v.resources.bindings[0]))],
 ['unknown binding type',v=>v.resources.bindings.push({type:'unknown_new_api_type',name:'UNREVIEWED'})]
])test('fail closed: '+label,()=>{const {v,e}=fixture();mutate(v);assert.throws(()=>profileFromEvidence(v,e,'/assets'));});
test('split rollout, unknown Worker and worker-first OFF stop',()=>{
 const {v,e}=fixture();for(const change of [{traffic:50},{activeVersionId:'other'},{worker:'another'},{assetConfig:{run_worker_first:false}}])assert.throws(()=>profileFromEvidence(v,{...e,...change},'/assets'));
});
function metadata(f){
 const a='/accounts/'+identity.account,w=a+'/workers/scripts/'+identity.worker;
 return new Map([[w+'/deployments',{deployments:[{versions:[{version_id:f.v.id,percentage:100}]}]}],[w+'/versions/'+f.v.id,f.v],[w+'/settings',{...f.e.settings,bindings:f.v.resources.bindings,assets:{config:f.e.assetConfig}}],[w+'/routes',f.e.routes],[a+'/workers/domains?service='+identity.worker+'&per_page=100',f.e.domains],[w+'/subdomain',f.e.subdomain],[w+'/schedules',{schedules:f.e.schedules}],[a+'/d1/database/'+identity.database,f.e.database],[a+'/workers/durable_objects/namespaces/'+identity.namespace,f.e.namespace]]);
}
test('collector uses GET only, one fixed account, no redirects; credentials never in URL/result',async()=>{
 const f=fixture(),responses=metadata(f),calls=[],token='offline-private-sentinel';
 const get=await apiReader({type:'oauth',token},{fetcher:async(url,init)=>{calls.push({url,method:init.method,redirect:init.redirect});assert.equal(init.headers.Authorization,'Bearer '+token);assert(!url.includes(token));const data=responses.get(url.replace('https://api.cloudflare.com/client/v4',''));assert.notEqual(data,undefined);return Response.json({success:true,result:data});}});
 const e=await collectEvidence(f.v,get);assert.equal(e.namespace.id,identity.namespace);assert(!JSON.stringify(e).includes(token));assert(calls.length>=9);assert(calls.every(c=>c.method==='GET'&&c.redirect==='error'));assert.equal(profileFromEvidence(f.v,e,'/assets').config.name,identity.worker);
});
test('HTTP error/permissions stop once with safe status/code/endpoint, never API body',async()=>{
 let calls=0;const get=await apiReader({type:'api_token',token:'offline-private-sentinel'},{fetcher:async()=>{calls++;return Response.json({success:false,errors:[{code:10000,message:'DO_NOT_DISCLOSE_BODY'}]},{status:403});}});
 await assert.rejects(()=>collectEvidence(fixture().v,get),err=>err.http===403&&err.codes[0]===10000&&!String(err).includes('DO_NOT_DISCLOSE_BODY'));assert.equal(calls,1);
});
test('saved version mismatch and changed runtime settings stop before assembly',async()=>{
 const f=fixture(),data=metadata(f),path='/accounts/'+identity.account+'/workers/scripts/'+identity.worker+'/versions/'+f.v.id,changed=clone(f.v);changed.resources.bindings[0].text='wrong';data.set(path,changed);await assert.rejects(()=>collectEvidence(f.v,async p=>data.get(p)));
});
test('missing assets/API asset routing report exact gaps without producing a guessed profile',async t=>{
 const dir=await mkdtemp(path.join(tmpdir(),'yasoya-version-missing-'));t.after(()=>rm(dir,{recursive:true,force:true}));const {v,e}=fixture();delete e.assetConfig;const versionFile=path.join(dir,'version.json'),evidenceFile=path.join(dir,'evidence.json'),output=path.join(dir,'output');await writeFile(versionFile,JSON.stringify(v));await writeFile(evidenceFile,JSON.stringify(e));
 await assert.rejects(()=>prepareFromVersion({versionFile,evidenceFile,output}),x=>x.missing.join(',')==='asset_routing,asset_directory');await assert.rejects(()=>lstat(output));
});
test('successful GET metadata is cached privately when local assets are missing, without bindings or credentials',async t=>{
 const dir=await mkdtemp(path.join(tmpdir(),'yasoya-version-cache-'));t.after(()=>rm(dir,{recursive:true,force:true}));const f=fixture(),data=metadata(f),versionFile=path.join(dir,'version.json');await writeFile(versionFile,JSON.stringify(f.v));let saved;
 await assert.rejects(()=>prepareFromVersion({versionFile,collect:true},{get:async p=>data.get(p)}),err=>{saved=err.evidenceFile;return err.missing.join(',')==='asset_directory'&&!!saved;});
 t.after(()=>rm(path.dirname(saved),{recursive:true,force:true}));const text=await readFile(saved,'utf8');assert(!text.includes('SQUARE_ACCESS_TOKEN'));assert(!text.includes('plain_text'));assert.equal((await stat(saved)).mode&0o777,0o600);assert.equal((await stat(path.dirname(saved))).mode&0o777,0o700);
 await assert.rejects(()=>prepareFromVersion({versionFile,evidenceFile:saved},{get:()=>{throw Error('MUST_NOT_REPEAT_GET');}}),err=>err.missing.join(',')==='asset_directory');
});
test('manual asset evidence must match the same Worker/Version and cannot override API evidence',async t=>{
 const dir=await mkdtemp(path.join(tmpdir(),'yasoya-version-asset-evidence-'));t.after(()=>rm(dir,{recursive:true,force:true}));const {v,e}=fixture(),versionFile=path.join(dir,'version.json'),evidenceFile=path.join(dir,'evidence.json'),assetSettingsFile=path.join(dir,'assets.json');await writeFile(versionFile,JSON.stringify(v));await writeFile(evidenceFile,JSON.stringify(e));
 await writeFile(assetSettingsFile,JSON.stringify({worker:identity.worker,versionId:'other',config:{run_worker_first:true}}));await assert.rejects(()=>prepareFromVersion({versionFile,evidenceFile,assetSettingsFile}),/EVIDENCE_IDENTITY_MISMATCH/);
 await writeFile(assetSettingsFile,JSON.stringify({worker:identity.worker,versionId:v.id,config:{run_worker_first:false}}));await assert.rejects(()=>prepareFromVersion({versionFile,evidenceFile,assetSettingsFile}),/EVIDENCE_CONFLICT/);
 delete e.assetConfig;await writeFile(evidenceFile,JSON.stringify(e));await writeFile(assetSettingsFile,JSON.stringify({worker:identity.worker,versionId:v.id,config:{run_worker_first:true}}));await assert.rejects(()=>prepareFromVersion({versionFile,evidenceFile,assetSettingsFile}),err=>err.missing.join(',')==='asset_directory');
});
test('private new OFF release, exact operational asset preservation, dry-run only and no original profile needed',async t=>{
 const dir=await mkdtemp(path.join(tmpdir(),'yasoya-version-release-'));t.after(()=>rm(dir,{recursive:true,force:true}));const f=fixture(),data=metadata(f),versionFile=path.join(dir,'version.json'),assets=path.join(dir,'current-assets'),output=path.join(dir,'release'),commands=[];
 await writeFile(versionFile,JSON.stringify(f.v));await cp(new URL('production/.generated/v53/',root),assets,{recursive:true});await writeFile(path.join(assets,'images/live-only.bin'),'offline-current-image');await writeFile(path.join(assets,'js/checkout-v1.js'),'older-live-payment-script');
 const r=await prepareFromVersion({versionFile,assets,output,collect:true,dryRun:true},{get:async p=>data.get(p),run:async(cmd,args)=>{commands.push({cmd,args});return {stdout:'offline dry-run build passed',stderr:''};}});
 assert.equal(r.dryRun,true);assert.equal(commands.length,1);assert(commands[0].args.includes('--dry-run'));assert.equal(commands[0].cmd,'npx');assert(!commands[0].args.includes('--remote'));
 const config=JSON.parse(await readFile(path.join(output,'release/off.local.jsonc'),'utf8'));assert.equal(config.vars.PRODUCTION_CHECKOUT_ENABLED,'0');assert.equal(config.vars.PRODUCTION_MANAGEMENT_CATALOG_ENABLED,'0');assert.deepEqual(config.migrations,[]);assert.equal((await stat(path.join(output,'recovered-off.local.jsonc'))).mode&0o777,0o600);assert.equal((await stat(output)).mode&0o777,0o700);
 assert.equal(await readFile(path.join(output,'release/site/images/live-only.bin'),'utf8'),'offline-current-image');assert.equal(await readFile(path.join(assets,'js/checkout-v1.js'),'utf8'),'older-live-payment-script');assert.deepEqual(await readFile(path.join(output,'release/site/js/checkout-v1.js')),await readFile(new URL('js/checkout-v1.js',root)));
 assert.equal(await readFile(versionFile,'utf8'),JSON.stringify(f.v));await assert.rejects(()=>prepareFromVersion({versionFile,assets,output,collect:true},{get:async p=>data.get(p)}),/OUTPUT_EXISTS/);
});


test('Cloudflare paginated metadata is read completely via bounded GET-only pages',async()=>{
 const prefix='https://api.cloudflare.com/client/v4';
 const endpoint='/accounts/'+identity.account+'/workers/domains?service='+identity.worker+'&per_page=100';
 const calls=[];
 const get=await apiReader({type:'api_token',token:'offline-private-sentinel'},{fetcher:async(url,init)=>{
  const u=new URL(url),p=Number(u.searchParams.get('page')||1);
  calls.push({page:p,service:u.searchParams.get('service'),method:init.method,redirect:init.redirect});
  const result=p===1?[{id:'a'},{id:'b'}]:p===2?[{id:'c'},{id:'d'}]:[{id:'e'}];
  return Response.json({success:true,result,result_info:{page:p,per_page:100,total_pages:3,total_count:5}});
 }});
 const result=await get(endpoint);
 assert.deepEqual(result.map(x=>x.id),['a','b','c','d','e']);
 assert.deepEqual(calls.map(x=>x.page),[1,2,3]);
 assert(calls.every(x=>x.service===identity.worker&&x.method==='GET'&&x.redirect==='error'));
});
test('Cloudflare changing or repeating paginated pages must fail closed',async()=>{
 const endpoint='/accounts/'+identity.account+'/workers/domains?service='+identity.worker+'&per_page=100';
 for(const mismatch of ['repeated','wrong-page','changed-count']){
  const get=await apiReader({type:'oauth',token:'offline-private-sentinel'},{fetcher:async(url)=>{
   const p=Number(new URL(url).searchParams.get('page')||1);
   const items=p===1?[{id:'original'}]:mismatch==='repeated'?[{id:'original'}]:[{id:'other'}];
   const page=mismatch==='wrong-page'&&p===2?1:p;
   const count=mismatch==='changed-count'&&p===2?3:2;
   return Response.json({success:true,result:items,result_info:{page,per_page:100,total_pages:count,total_count:2}});
  }});
  await assert.rejects(()=>get(endpoint),/METADATA_PAGINATION_REQUIRES_REVIEW/,mismatch);
 }
});
