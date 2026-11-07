// Restore a non-secret Version snapshot, never credentials or Production data.
import {readFile,writeFile,mkdir,lstat,chmod,rename,unlink} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
const ACCOUNT='fcf37e462257810df77e8fbc0e7f4317',WORKER='yasoya-honten-payments';
export const EXPECTED_VERSION='36ab2dba-dd44-4f39-bc69-6db729bd24d5';
const stop=code=>{throw Error(code);};
export function unwrapCachedVersion(value){
 if(value?.cacheSchema===undefined)return value;
 if(value.cacheSchema!==1||value.account!==ACCOUNT||value.worker!==WORKER||value.versionId!==EXPECTED_VERSION||value.version?.id!==value.versionId)stop('VERSION_CACHE_IDENTITY_MISMATCH');
 return value.version;
}
function noCredentials(value){
 if(typeof value==='string'&&/^(?:Bearer\s|(?:sq0atp-|ghp_|github_pat_|EAAA)[A-Za-z0-9_-]{16,})/.test(value))stop('VERSION_SENSITIVE_VALUE_BLOCKED');
 if(value&&typeof value==='object')for(const [key,child]of Object.entries(value)){
  if(/TOKEN|SECRET|PASSWORD|API_KEY|AUTHORIZATION|COOKIE|CREDENTIAL/i.test(key))stop('VERSION_SENSITIVE_VALUE_BLOCKED');
  noCredentials(child);
 }
}
export function validatedVersion(value,inspect){
 const v=unwrapCachedVersion(value);
 if(v?.id!==EXPECTED_VERSION)stop('VERSION_ID_MISMATCH');
 const {vars}=inspect(v);
 if(vars.RUNTIME_TIER!=='production'||vars.SQUARE_ENVIRONMENT!=='production'||vars.PRODUCTION_WORKER_NAME!==WORKER||vars.SQUARE_LOCATION_ID!=='LQ693S4H2NBZ8')stop('VERSION_PRODUCTION_IDENTITY_MISMATCH');
 const fields={plain_text:['type','name','text'],json:['type','name','json'],secret_text:['type','name'],d1:['type','name','id'],durable_object_namespace:['type','name','namespace_id','class_name','script_name','environment'],r2_bucket:['type','name','bucket_name','jurisdiction'],assets:['type','name'],service:['type','name','service','environment','entrypoint'],kv_namespace:['type','name','namespace_id']};
 const bindings=v.resources.bindings.map(b=>{
  const allowed=fields[b.type];
  if(!allowed||Object.keys(b).some(k=>!allowed.includes(k))){
   const error=Error('VERSION_BINDING_FIELDS_UNSUPPORTED'),unknown=Object.keys(b).filter(k=>!allowed?.includes(k));
   error.bindingType=allowed?b.type:'unsupported';
   error.unsupportedFields=unknown.filter(k=>/^[a-z_][a-z_]{0,31}$/.test(k));
   error.redactedFieldCount=unknown.length-error.unsupportedFields.length;
   throw error; // Field identifiers only; never binding names or field values.
  }
  if(b.type==='plain_text')noCredentials(b.text);if(b.type==='json')noCredentials(b.json);
  return structuredClone(b); // secret_text has already been checked: names only.
 });
 noCredentials(v.resources.script_runtime);
 // Author metadata, upload JWTs and arbitrary top-level API fields are omitted.
 const snapshot={id:v.id,resources:{bindings,script_runtime:structuredClone(v.resources.script_runtime)}};
 if(v.resources.assets?.config){
  const config=v.resources.assets.config;
  if(Object.keys(config).some(k=>!['run_worker_first','html_handling','not_found_handling','base_path'].includes(k)))stop('VERSION_ASSET_FIELDS_UNSUPPORTED');
  noCredentials(config);snapshot.resources.assets={config:structuredClone(config)};
 }
 return snapshot;
}
async function readSnapshot(file){
 try{
  const info=await lstat(file);
  if(!info.isFile()||info.isSymbolicLink()||(process.getuid&&info.uid!==process.getuid()))stop('VERSION_FILE_UNSAFE');
  try{return JSON.parse(await readFile(file,'utf8'));}catch(e){if(e instanceof SyntaxError)stop('VERSION_JSON_INVALID');throw e;}
 }catch(e){if(e.code==='ENOENT')return undefined;throw e;}
}
async function saveSnapshot(directory,version){
 try{await mkdir(directory,{mode:0o700});}catch(e){if(e.code!=='EEXIST')throw e;}
 const info=await lstat(directory);
 if(!info.isDirectory()||info.isSymbolicLink()||(process.getuid&&info.uid!==process.getuid()))stop('VERSION_CACHE_PATH_UNSAFE');
 await chmod(directory,0o700);
 const file=path.join(directory,'live-version.json');
 try{const old=await lstat(file);if(!old.isFile()||old.isSymbolicLink()||(process.getuid&&old.uid!==process.getuid()))stop('VERSION_CACHE_PATH_UNSAFE');}catch(e){if(e.code!=='ENOENT')throw e;}
 const temp=path.join(directory,'version-'+randomUUID()+'.json');
 try{
  const envelope={cacheSchema:1,account:ACCOUNT,worker:WORKER,versionId:version.id,verifiedAt:new Date().toISOString(),verification:'sole_active_version_100_percent',version};
  await writeFile(temp,JSON.stringify(envelope)+'\n',{flag:'wx',mode:0o600});await chmod(temp,0o600);await rename(temp,file);
 }finally{try{await unlink(temp);}catch(e){if(e.code!=='ENOENT')throw e;}}
 return file;
}
export async function recoverLiveVersion({temporaryFile='/tmp/yasoya-live-version.json',cacheDirectory},{get,inspect,onStage=()=>{}}){
 onStage('version_json_read');let stored=await readSnapshot(temporaryFile),source='temporary';
 if(stored===undefined){onStage('version_cache_read');stored=await readSnapshot(path.join(cacheDirectory,'live-version.json'));source='persistent';}
 let version;if(stored!==undefined){onStage('version_validate');version=validatedVersion(stored,inspect);}
 // Even a cached snapshot must not be used after the active Version changes.
 onStage('version_deployment_verify');
 const base='/accounts/'+ACCOUNT+'/workers/scripts/'+WORKER;
 const verifyActive=async()=>{const deployment=await get(base+'/deployments?page=1&per_page=1'),active=deployment?.deployments?.[0]?.versions;if(!Array.isArray(active)||active.length!==1||active[0].version_id!==EXPECTED_VERSION||active[0].percentage!==100)stop('LIVE_VERSION_CHANGED');};
 await verifyActive();
 if(!version){
  onStage('version_fetch');version=validatedVersion(await get(base+'/versions/'+EXPECTED_VERSION),inspect);source='remote';
  // A rollout may have changed while the historical Version was being fetched.
  onStage('version_deployment_recheck');await verifyActive();
 }
 onStage('version_cache_write');const versionFile=await saveSnapshot(cacheDirectory,version);
 return {version,versionFile,source};
}
