// Release preparation only. No historical profile, remote mutations or deploy.
import {readFile,writeFile,mkdtemp,mkdir,rm,lstat,realpath} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {validateOffConfig} from './prepare-checkout-v58.mjs';
import {assembleOff} from './prepare-off-live-assets.mjs';
const run=promisify(execFile),here=path.dirname(fileURLToPath(import.meta.url));
export const identity=Object.freeze({account:'fcf37e462257810df77e8fbc0e7f4317',worker:'yasoya-honten-payments',database:'442fa9fd-25d3-4c01-bcc3-04be7b420cf5',namespace:'6802cc5abc6d440285ec19c9e7c82103',bucket:'yasoya-honten-product-images'});
const fail=code=>{throw Error(code);};
const needs=items=>{const e=Error('MISSING_EVIDENCE');e.missing=items;throw e;};
const secretKey=k=>/(TOKEN|SECRET|PASSWORD|API_KEY|PRIVATE_KEY)/i.test(k);
const text=v=>typeof v==='string'&&v.length>0;
const same=(a,b)=>isDeepStrictEqual(a,b);
function bindingsMap(items){
 if(!Array.isArray(items))fail('VERSION_BINDINGS_MISSING');
 const map=new Map();for(const b of items){if(!text(b.name)||!text(b.type)||map.has(b.name)||b.name==='__proto__')fail('INVALID_OR_DUPLICATE_BINDING');map.set(b.name,b);}return map;
}
export function inspectVersion(v){
 if(!/^[a-f0-9-]{36}$/.test(v?.id||'')||!v.resources?.script_runtime?.compatibility_date)fail('VERSION_RUNTIME_MISSING');
 const bindings=bindingsMap(v.resources.bindings),vars={},secrets=[];
 for(const b of bindings.values()){
  if(b.type==='secret_text'){if(Object.hasOwn(b,'text')||Object.hasOwn(b,'value'))fail('SECRET_VALUE_IN_INPUT');secrets.push(b.name);}
  if(['plain_text','json'].includes(b.type)){
   if(secretKey(b.name))fail('PLAINTEXT_CREDENTIAL_IN_INPUT');
   vars[b.name]=b.type==='plain_text'?b.text:b.json;
  }
  if(/SANDBOX|STAGING|VALIDATION/.test(b.name))fail('NON_PRODUCTION_BINDING');
 }
 for(const [key,value]of Object.entries({PRODUCTION_CHECKOUT_ENABLED:'0',PRODUCTION_MANAGED_CHECKOUT_ENABLED:'0',PRODUCTION_MANAGEMENT_CATALOG_ENABLED:'0',PRODUCTION_MANAGEMENT_INVENTORY_ENABLED:'1'}))if(vars[key]!==value)fail('LIVE_OFF_FLAGS_INVALID');
 for(const name of ['SQUARE_ACCESS_TOKEN','RESEND_API_KEY','ADMIN_TOKEN'])if(!secrets.includes(name))fail('REQUIRED_SECRET_NAME_MISSING');
 for(const [name,type]of [['ORDERS_DB','d1'],['PURCHASE_COORDINATOR','durable_object_namespace'],['PRODUCT_IMAGES','r2_bucket'],['ASSETS','assets']])if(bindings.get(name)?.type!==type)fail('PRODUCTION_BINDING_MISSING');
 if(bindings.get('ORDERS_DB').id!==identity.database||bindings.get('PRODUCT_IMAGES').bucket_name!==identity.bucket)fail('PRODUCTION_RESOURCE_MISMATCH');
 const d=bindings.get('PURCHASE_COORDINATOR');
 if((d.class_name&&d.class_name!=='PurchaseCoordinator')||(d.script_name&&d.script_name!==identity.worker)||(d.namespace_id&&d.namespace_id!==identity.namespace)||d.environment)fail('PRODUCTION_DO_MISMATCH');
 return {bindings,vars,secrets:secrets.sort()};
}
export function profileFromEvidence(v,e,assetDirectory){
 const {bindings,vars,secrets}=inspectVersion(v),missing=[];
 if(e.worker!==identity.worker||e.account!==identity.account||e.versionId!==v.id)fail('EVIDENCE_IDENTITY_MISMATCH');
 if(e.activeVersionId!==v.id||e.traffic!==100)fail('SNAPSHOT_IS_NOT_SOLE_ACTIVE_VERSION');
 if(!Array.isArray(e.routes)||!Array.isArray(e.domains))missing.push('routes');
 if(typeof e.subdomain?.enabled!=='boolean'||typeof e.subdomain?.previews_enabled!=='boolean')missing.push('subdomain');
 if(!e.database)missing.push('database_name');else if(e.database.uuid!==identity.database||e.database.name!=='yasoya-orders')fail('LIVE_DATABASE_IDENTITY_MISMATCH');
 if(!e.namespace)missing.push('namespace');else if(e.namespace.id!==identity.namespace||e.namespace.class!=='PurchaseCoordinator'||e.namespace.script!==identity.worker||e.namespace.use_sqlite!==true)fail('LIVE_NAMESPACE_IDENTITY_MISMATCH');
 if(!Array.isArray(e.schedules))missing.push('schedules');
 // Version APIs can omit asset routing. Missing is not equivalent to defaults.
 const assetConfig=e.assetConfig??v.resources.assets?.config;
 if(typeof assetConfig?.run_worker_first!=='boolean')missing.push('asset_routing');
 if(!assetDirectory)missing.push('asset_directory');
 if(missing.length)needs(missing);
 if(assetConfig.run_worker_first!==true)fail('WORKER_FIRST_REQUIRED');
 const allowedAssetKeys=['run_worker_first','html_handling','not_found_handling','base_path'];
 if(Object.keys(assetConfig).some(k=>!allowedAssetKeys.includes(k)))fail('UNSUPPORTED_ASSET_SETTING');
 const c={name:identity.worker,account_id:identity.account,main:path.join(here,'storefront-worker.js'),keep_vars:true,
  compatibility_date:v.resources.script_runtime.compatibility_date,
  compatibility_flags:v.resources.script_runtime.compatibility_flags??[],vars,
  workers_dev:e.subdomain.enabled,preview_urls:e.subdomain.previews_enabled,
  routes:e.routes.map(r=>{if(!text(r.pattern)||(!r.zone_id&&!r.zone_name))fail('ROUTE_ZONE_MISSING');return {pattern:r.pattern,...(r.zone_id?{zone_id:r.zone_id}:{zone_name:r.zone_name})};}),
  assets:{directory:assetDirectory,binding:'ASSETS',...assetConfig},migrations:[]};
 for(const d of e.domains){if(d.service!==identity.worker||!text(d.hostname)||!text(d.zone_id))fail('CUSTOM_DOMAIN_IDENTITY_MISMATCH');c.routes.push({pattern:d.hostname,custom_domain:true,zone_id:d.zone_id,...(typeof d.enabled==='boolean'?{enabled:d.enabled}:{}),...(typeof d.previews_enabled==='boolean'?{previews_enabled:d.previews_enabled}:{})});}
 for(const b of bindings.values())switch(b.type){
  case 'plain_text':case 'json':case 'secret_text':case 'assets':break;
  case 'd1':if(b.name!=='ORDERS_DB')fail('ADDITIONAL_D1_REQUIRES_REVIEW');c.d1_databases=[{binding:b.name,database_name:e.database.name,database_id:b.id}];break;
  case 'durable_object_namespace':if(b.name!=='PURCHASE_COORDINATOR')fail('ADDITIONAL_DO_REQUIRES_REVIEW');c.durable_objects={bindings:[{name:b.name,class_name:b.class_name??e.namespace.class,...(b.script_name?{script_name:b.script_name}:{})}]};break;
  case 'r2_bucket':if(b.name!=='PRODUCT_IMAGES')fail('ADDITIONAL_R2_REQUIRES_REVIEW');(c.r2_buckets??=[]).push({binding:b.name,bucket_name:b.bucket_name,...(b.jurisdiction?{jurisdiction:b.jurisdiction}:{})});break;
  case 'service':(c.services??=[]).push({binding:b.name,service:b.service,...(b.environment?{environment:b.environment}:{}),...(b.entrypoint?{entrypoint:b.entrypoint}:{})});break;
  case 'kv_namespace':(c.kv_namespaces??=[]).push({binding:b.name,id:b.namespace_id});break;
  default:fail('UNSUPPORTED_BINDING_TYPE');
 }
 if(e.schedules.length)c.triggers={crons:e.schedules.map(s=>{if(!text(s.cron))fail('INVALID_CRON');return s.cron;})};
 for(const key of ['observability','limits','placement','tail_consumers','usage_model'])if(e.settings?.[key]!==undefined)c[key]=structuredClone(e.settings[key]);
 try{validateOffConfig(c);}catch(err){
  const fields={PRODUCTION_IDENTITY_INVALID:['RUNTIME_TIER','SQUARE_ENVIRONMENT','SQUARE_LOCATION_ID','PRODUCTION_WORKER_NAME','PRODUCTION_PURCHASE_PROTOCOL','SITE_URL'],EXISTING_CUSTOM_DOMAIN_REQUIRED:['routes'],EXISTING_MANAGEMENT_REQUIRED:['MANAGEMENT_ENABLED','PRODUCTION_MANAGEMENT_SCHEMA_READY','PRODUCTION_MANAGEMENT_READ_ENABLED','PRODUCTION_STOREFRONT_ENABLED'],SALES_VERIFICATION_PROFILE_REQUIRED:['PRODUCTION_UNIFIED_PUBLISH_ENABLED','PRODUCTION_STOREFRONT_PUBLISH_ENABLED'],EXISTING_INVENTORY_APPROVAL_REQUIRED:['PRODUCTION_INVENTORY_WRITER_APPROVAL'],CATALOG_INVENTORY_OR_RETIREMENT_GUARD_INVALID:['PRODUCTION_MANAGEMENT_CATALOG_ENABLED','PRODUCTION_MANAGEMENT_INVENTORY_ENABLED','STOREFRONT_RETIRE_GOLDENROD']};
  err.fields=fields[err.message];throw err;
 }
 return {config:c,receipt:{worker:identity.worker,rollbackVersion:v.id,secretNames:secrets,namespaceId:identity.namespace,migrationIntent:'none; existing namespace retained',source:'live version bindings plus read-only live metadata'}};
}

// Only GET requests to these fixed Cloudflare metadata endpoints. The collector
// stops at the first error, does not follow redirects and never logs payloads.
export async function collectEvidence(v,get){
 inspectVersion(v);
 const a='/accounts/'+identity.account,w=a+'/workers/scripts/'+identity.worker;
 const deployments=await get(w+'/deployments?page=1&per_page=1'),active=deployments.deployments?.[0];
 if(active?.versions?.length!==1||active.versions[0].version_id!==v.id||active.versions[0].percentage!==100)fail('SNAPSHOT_IS_NOT_SOLE_ACTIVE_VERSION');
 const fresh=await get(w+'/versions/'+v.id);inspectVersion(fresh);
 if(!same([...bindingsMap(fresh.resources.bindings)].sort(),[...bindingsMap(v.resources.bindings)].sort())||!same(fresh.resources.script_runtime,v.resources.script_runtime))fail('SAVED_VERSION_CONTENT_MISMATCH');
 const settings=await get(w+'/settings');
 if(settings.bindings&&!same([...bindingsMap(settings.bindings)].sort(),[...bindingsMap(v.resources.bindings)].sort()))fail('LIVE_SETTINGS_CHANGED_SINCE_VERSION');
 const routes=await get(w+'/routes'),domains=await get(a+'/workers/domains?service='+identity.worker+'&per_page=100');
 if(!Array.isArray(domains))fail('DOMAINS_RESPONSE_INVALID');
 // Some accounts/API versions return the account-wide list despite a service
 // selector. Preserve only domains explicitly bound to this Worker.
 const ownDomains=domains.filter(d=>d.service===identity.worker);
 return {account:identity.account,worker:identity.worker,versionId:v.id,activeVersionId:active.versions[0].version_id,traffic:100,
  settings:Object.fromEntries(['observability','limits','placement','tail_consumers','usage_model'].filter(k=>settings[k]!==undefined).map(k=>[k,settings[k]])),routes,domains:ownDomains,subdomain:await get(w+'/subdomain'),schedules:(await get(w+'/schedules')).schedules,
  database:await get(a+'/d1/database/'+identity.database),namespace:await get(a+'/workers/durable_objects/namespaces/'+identity.namespace),
  ...(settings.assets?.config?{assetConfig:settings.assets.config}:settings.assets&&Object.hasOwn(settings.assets,'run_worker_first')?{assetConfig:settings.assets}:{})};
}
export async function apiReader(auth,{fetcher=fetch}={}){
 if(!['oauth','api_token'].includes(auth?.type)||!text(auth.token)||/[\s"']/.test(auth.token)||/^Bearer/i.test(auth.token))fail('AUTH_CREDENTIAL_FORMAT_INVALID');
 const call=async endpoint=>{
  if(!endpoint.startsWith('/accounts/'+identity.account+'/'))fail('ACCOUNT_ENDPOINT_REJECTED');
  let response;try{response=await fetcher('https://api.cloudflare.com/client/v4'+endpoint,{method:'GET',headers:{Authorization:'Bearer '+auth.token},redirect:'error',signal:AbortSignal.timeout(20000)});}catch{fail('METADATA_NETWORK_FAILED');}
  let body;try{body=await response.json();}catch{fail('METADATA_RESPONSE_NOT_JSON');}
  if(!response.ok||body.success!==true){const err=Error('METADATA_HTTP_ERROR');err.http=response.status;err.codes=(body.errors||[]).map(x=>x.code).filter(Number.isInteger);err.endpoint=endpoint.split('?')[0];throw err;}
  return {result:body.result,info:body.result_info};
 };
 return async endpoint=>{
  const stopPagination=()=>{const err=Error('METADATA_PAGINATION_REQUIRES_REVIEW');err.endpoint=endpoint.split('?')[0];throw err;};
  const first=await call(endpoint);
  // The deployment endpoint returns {deployments:[...]} and may have many
  // history pages. Cloudflare documents first result as the latest deployment.
  // Only inspect page 1 with per_page=1; do not fetch irrelevant history.
  const latestOnly='/accounts/'+identity.account+'/workers/scripts/'+identity.worker+'/deployments?page=1&per_page=1';
  if(endpoint===latestOnly){
   if(!Array.isArray(first.result?.deployments)||first.result.deployments.length!==1||
      (first.info?.page!==undefined&&first.info.page!==1)||
      (first.info?.per_page!==undefined&&first.info.per_page!==1)||
      (first.info?.count!==undefined&&first.info.count!==1))stopPagination();
   return first.result;
  }
  const pages=first.info?.total_pages;
  if(pages===undefined||pages===null||pages===1){
   // An unpaginated list of exactly the maximum page size may be incomplete.
   if(Array.isArray(first.result)&&first.result.length>=100&&!first.info)stopPagination();
   return first.result;
  }
  // Never return a truncated snapshot or guess pagination metadata.
  if(!Array.isArray(first.result)||!Number.isSafeInteger(pages)||pages<2||pages>25||first.info.page!==1)stopPagination();
  const url=new URL(endpoint,'https://api.cloudflare.com');
  const size=first.info.per_page;
  if(!Number.isSafeInteger(size)||size<1||size>100)stopPagination();
  const joined=[...first.result];
  for(let page=2;page<=pages;page++){
   url.searchParams.set('page',String(page));
   url.searchParams.set('per_page',String(size));
   const next=await call(url.pathname+url.search);
   if(!Array.isArray(next.result)||!next.result.length||next.info?.page!==page||next.info?.total_pages!==pages||next.info?.per_page!==size||JSON.stringify(next.result)===JSON.stringify(first.result))stopPagination();
   joined.push(...next.result);
   if(joined.length>2500)stopPagination();
  }
  if(Number.isSafeInteger(first.info.total_count)&&joined.length!==first.info.total_count)stopPagination();
  return joined;
 };
}

const childEnv=()=>({...process.env,WRANGLER_SEND_METRICS:'false',WRANGLER_LOG:'error',WRANGLER_LOG_SANITIZE:'true'});
async function authReader(){
 let stdout;try{({stdout}=await run('npx',['--yes','wrangler@4.155.0','auth','token','--json'],{env:childEnv(),encoding:'utf8',timeout:120000,maxBuffer:1024*1024}));}catch{fail('WRANGLER_AUTH_UNAVAILABLE');}
 let auth;try{auth=JSON.parse(stdout);}catch{fail('WRANGLER_AUTH_RESPONSE_INVALID');}stdout=undefined;
 return apiReader(auth);
}
const acquisition={
 routes:'GET workers/scripts/yasoya-honten-payments/routes + GET workers/domains?service=yasoya-honten-payments (--collect)',
 subdomain:'GET workers/scripts/yasoya-honten-payments/subdomain (--collect)',
 database_name:'GET d1/database/'+identity.database+' (--collect)',
 namespace:'GET workers/durable_objects/namespaces/'+identity.namespace+' (--collect)',
 schedules:'GET workers/scripts/yasoya-honten-payments/schedules (--collect)',
 asset_routing:'GET workers/scripts/yasoya-honten-payments/settings (--collect). If omitted by API, export the CURRENT asset routing settings (run_worker_first and any explicitly configured html_handling/not_found_handling/base_path) to a private JSON file and pass --asset-settings FILE. Do not use historical ready.jsonc.',
 asset_directory:'Version JSON has no local asset path or image bytes. Locate the directory used for the current release (find /workspaces -type d -path \'*/production/.generated/v53\' -not -path \'*/node_modules/*\'). Do not select a freshly rebuilt candidate directory. Pass --assets DIRECTORY for the existing operational ASSETS directory; the script checks known live HTML/cart hashes and preserves its images/product/admin files. The uploaded 20-file ZIP is not a full ASSETS directory.'
};
export async function prepareFromVersion({versionFile,evidenceFile,assetSettingsFile,assets,output,collect=false,dryRun=false},deps={}){
 const v=JSON.parse(await readFile(versionFile,'utf8'));inspectVersion(v);
 let e;if(collect)e=await collectEvidence(v,deps.get??await authReader());else if(evidenceFile)e=JSON.parse(await readFile(evidenceFile,'utf8'));else needs(['routes','subdomain','database_name','namespace','schedules','asset_routing',...(!assets?['asset_directory']:[])]);
 if(assetSettingsFile){const manual=JSON.parse(await readFile(assetSettingsFile,'utf8'));if(manual.versionId!==v.id||manual.worker!==identity.worker)fail('ASSET_SETTINGS_EVIDENCE_IDENTITY_MISMATCH');if(e.assetConfig&&!same(e.assetConfig,manual.config))fail('ASSET_SETTINGS_EVIDENCE_CONFLICT');e.assetConfig=manual.config;}
 let prepared;
 try{prepared=profileFromEvidence(v,e,assets?await realpath(assets):undefined);}catch(err){
  if(collect&&err.missing){
   // Cache only the approved non-secret metadata so supplying a missing local
   // asset path never requires repeating successful authentication/GET calls.
   const cache=await mkdtemp(path.join(tmpdir(),'yasoya-off-evidence-'));
   err.evidenceFile=path.join(cache,'evidence.json');
   await writeFile(err.evidenceFile,JSON.stringify(e,null,2)+'\n',{flag:'wx',mode:0o600});
  }
  throw err;
 }
 const {config,receipt}=prepared;
 // No actual/off profile is required. Only a newly allocated private directory
 // is written; never replace an existing local file or build operational assets.
 let dir;
 if(output){try{await lstat(output);fail('OUTPUT_EXISTS');}catch(err){if(err.code!=='ENOENT')throw err;}await mkdir(output,{mode:0o700});dir=await realpath(output);}else dir=await mkdtemp(path.join(tmpdir(),'yasoya-off-from-version-'));
 try{
  const recovered=path.join(dir,'recovered-off.local.jsonc');await writeFile(recovered,JSON.stringify(config,null,2)+'\n',{flag:'wx',mode:0o600});
  await assembleOff(recovered,path.join(dir,'release'));
  await writeFile(path.join(dir,'evidence.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
  if(dryRun){let result;try{result=await (deps.run??run)('npx',['--yes','wrangler@4.155.0','deploy','--dry-run','--config',path.join(dir,'release/off.local.jsonc'),'--outdir',path.join(dir,'dry-run')],{env:childEnv(),encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});}catch{fail('WRANGLER_DRY_RUN_FAILED');}await writeFile(path.join(dir,'dry-run.log'),result.stdout+'\n'+result.stderr,{flag:'wx',mode:0o600});}
  return {directory:dir,version:v.id,dryRun};
 }catch(err){if(err.message!=='WRANGLER_DRY_RUN_FAILED')await rm(dir,{recursive:true,force:true});throw err;}
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 try{
  const args=process.argv.slice(2),options={versionFile:args.shift()};
  while(args.length){const flag=args.shift();if(flag==='--collect')options.collect=true;else if(flag==='--dry-run')options.dryRun=true;else {const key={'--evidence':'evidenceFile','--assets':'assets','--asset-settings':'assetSettingsFile','--output':'output'}[flag];if(!key||!args.length)fail('INVALID_ARGUMENTS');options[key]=args.shift();}}
  if(!options.versionFile)fail('VERSION_JSON_PATH_REQUIRED');
  const r=await prepareFromVersion(options);console.log((r.dryRun?'SUCCESS: OFF dry-run passed. ':'OFF release prepared. ')+r.directory+'; no deployment.');
 }catch(err){console.error('STOP: '+(/^[A-Z_]+$/.test(err.message)?err.message:'LOCAL_PREPARATION_FAILED'));if(err.missing)for(const field of err.missing)console.error(field+': '+acquisition[field]);if(err.evidenceFile)console.error('Private metadata cache: '+err.evidenceFile+' ; use --evidence FILE instead of --collect on the next run.');if(err.fields)console.error('Check fields from live Version/settings: '+err.fields.join(', ')+'; do not replace them with example values.');if(err.http)console.error('HTTP '+err.http+'; codes '+err.codes.join(',')+'; GET '+err.endpoint);else if(err.endpoint)console.error('GET '+err.endpoint+'; metadata pagination incomplete');process.exitCode=1;}
}
