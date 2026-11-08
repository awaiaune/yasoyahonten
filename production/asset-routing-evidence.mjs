// Version-bound routing evidence only. GET transport is supplied by the
// existing authenticated reader. No raw responses/logs/credentials are stored.
import {readFile,writeFile,readdir,lstat,mkdir,chmod,rename,unlink,realpath} from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {parseConfig} from './prepare-checkout-v58.mjs';
const ACCOUNT='fcf37e462257810df77e8fbc0e7f4317',WORKER='yasoya-honten-payments';
export const PROJECTS=['/workspaces/yasoya-v60-csp','/workspaces/yasoya-v60-verify','/workspaces/yasoya-v59-verify'];
const keys=['run_worker_first','html_handling','not_found_handling','base_path'];
const stop=code=>{throw Error(code);};
const endpoint=v=>'/accounts/'+ACCOUNT+'/workers/workers/'+WORKER+'/versions/'+v.id;
export function checkedAssetConfig(input){
 if(!input||typeof input!=='object'||Array.isArray(input))stop('ASSET_ROUTING_CONFIG_MISSING');
 if(Object.keys(input).some(k=>!keys.includes(k)))stop('ASSET_ROUTING_CONFIG_UNSUPPORTED');
 if(!Object.hasOwn(input,'run_worker_first'))stop('ASSET_ROUTING_CONFIG_MISSING');
 const r=input.run_worker_first;
 if(typeof r!=='boolean'&&!(Array.isArray(r)&&r.length&&r.every(x=>typeof x==='string'&&/^!?\//.test(x))&&r.some(x=>x.startsWith('/'))))stop('ASSET_ROUTING_CONFIG_INVALID');
 if(Object.hasOwn(input,'html_handling')&&!['auto-trailing-slash','force-trailing-slash','drop-trailing-slash','none'].includes(input.html_handling))stop('ASSET_ROUTING_CONFIG_INVALID');
 if(Object.hasOwn(input,'not_found_handling')&&!['none','404-page','single-page-application'].includes(input.not_found_handling))stop('ASSET_ROUTING_CONFIG_INVALID');
 if(Object.hasOwn(input,'base_path')&&(typeof input.base_path!=='string'||!input.base_path.startsWith('/')))stop('ASSET_ROUTING_CONFIG_INVALID');
 return structuredClone(input); // Omitted optional fields remain omitted.
}
function snapshotBinding(v){
 const assets=v.resources?.bindings?.filter(b=>b.type==='assets')??[];
 if(assets.length!==1||assets[0].name!=='ASSETS')stop('ASSET_ROUTING_BINDING_MISMATCH');
}
export function validateAssetEvidence(proof,v){
 snapshotBinding(v);
 if(proof?.assetEvidenceSchema!==1||proof.account!==ACCOUNT||proof.worker!==WORKER||proof.versionId!==v.id||proof.binding!=='ASSETS')stop('ASSET_ROUTING_EVIDENCE_IDENTITY_MISMATCH');
 if(Object.keys(proof).some(k=>!['assetEvidenceSchema','account','worker','versionId','binding','config','specifiedFields','source','recordedAt'].includes(k)))stop('ASSET_ROUTING_SOURCE_UNVERIFIED');
 const kind=proof.source?.kind;
 if(Object.keys(proof.source||{}).some(k=>!['kind','endpoint','bindingEvidence','recordPath','recordVersionId','proof','configPath','screen','confirmedAt'].includes(k)))stop('ASSET_ROUTING_SOURCE_UNVERIFIED');
 if(kind==='cloudflare_version_api'){
  if(proof.source.endpoint!==endpoint(v))stop('ASSET_ROUTING_SOURCE_UNVERIFIED');
 }else if(kind==='deployment_record'){
  if(!path.isAbsolute(proof.source.recordPath||'')||proof.source.recordVersionId!==v.id||!['embedded_uploaded_assets','digest_bound_config'].includes(proof.source.proof))stop('ASSET_ROUTING_SOURCE_UNVERIFIED');
 }else if(kind==='dashboard_confirmation'){
  if(!proof.source.screen||!proof.source.confirmedAt)stop('ASSET_ROUTING_SOURCE_UNVERIFIED');
 }else stop('ASSET_ROUTING_SOURCE_UNVERIFIED');
 checkedAssetConfig(proof.config);
 if(v.resources?.assets?.config&&!isDeepStrictEqual(v.resources.assets.config,proof.config))stop('ASSET_ROUTING_EVIDENCE_CONFLICT');
 return proof;
}
const proofFor=(v,config,source)=>({assetEvidenceSchema:1,account:ACCOUNT,worker:WORKER,versionId:v.id,binding:'ASSETS',config:checkedAssetConfig(config),specifiedFields:keys.filter(k=>Object.hasOwn(config,k)),source,recordedAt:new Date().toISOString()});
export function evidenceFromVersionAPI(body,v){
 if(body?.id!==v.id)stop('ASSET_ROUTING_VERSION_MISMATCH');
 snapshotBinding(v);
 if(body.bindings!==undefined){
  if(!Array.isArray(body.bindings))stop('ASSET_ROUTING_BINDING_MISMATCH');
  const assets=body.bindings.filter(b=>b.type==='assets');if(assets.length!==1||assets[0].name!=='ASSETS')stop('ASSET_ROUTING_BINDING_MISMATCH');
 }
 if(!body.assets?.config)return null;
 if(!Object.hasOwn(body.assets.config,'run_worker_first'))stop('ASSET_ROUTING_CONFIG_MISSING');
 // assets.jwt, author data, modules, Secret bindings and all other values ignored.
 return proofFor(v,body.assets.config,{kind:'cloudflare_version_api',endpoint:endpoint(v),bindingEvidence:body.bindings?'version_api':'validated_live_version_snapshot'});
}
export async function evidenceFromDeployRecord(row,file,v,root=path.dirname(file)){
 if(row?.type!=='deploy'||row.worker_name!==WORKER||row.version_id!==v.id||row.dry_run===true||row.wrangler_environment||row.status&& !['success','ready','deployed'].includes(row.status))return null;
 if(row.assets?.binding==='ASSETS'&&row.assets.config){
  return proofFor(v,row.assets.config,{kind:'deployment_record',recordPath:file,recordVersionId:row.version_id,proof:'embedded_uploaded_assets'});
 }
 // A mutable config file or CLI command alone is not deployment evidence.
 if(typeof row.config_path!=='string'||!/^[a-f0-9]{64}$/.test(row.config_sha256||''))return null;
 const configPath=path.resolve(path.dirname(file),row.config_path);
 if(!configPath.startsWith(path.resolve(root)+path.sep)||['ready.jsonc','.env','.dev.vars'].includes(path.basename(configPath)))return null;
 if(!(await realpath(configPath)).startsWith(path.resolve(root)+path.sep))return null;
 const meta=await lstat(configPath);if(!meta.isFile()||meta.isSymbolicLink()||meta.size>2*1024*1024)return null;
 const raw=await readFile(configPath),c=parseConfig(raw.toString());
 if(c.name!==WORKER||c.account_id&&c.account_id!==ACCOUNT||c.env||c.build?.command||c.unsafe||c.define||c.secrets||Object.keys(c.vars||{}).some(k=>/TOKEN|SECRET|PASSWORD|API_KEY|PRIVATE_KEY/i.test(k)))return null;
 if(createHash('sha256').update(raw).digest('hex')!==row.config_sha256)return null;
 if(c.assets?.binding!=='ASSETS')return null;
 const config=Object.fromEntries(keys.filter(k=>Object.hasOwn(c.assets,k)).map(k=>[k,c.assets[k]]));
 return proofFor(v,config,{kind:'deployment_record',recordPath:file,recordVersionId:row.version_id,proof:'digest_bound_config',configPath});
}
export async function searchDeployRecords(v,roots=PROJECTS){
 const files=new Map(),summary={rootsChecked:roots.length,existingRoots:0,recordFiles:0,matchingDeployRecords:0,unboundConfigs:0},proofs=[];
 async function visit(dir,depth,root){
  if(depth>4)return;
  let rows;try{rows=await readdir(dir,{withFileTypes:true});}catch(e){if(['ENOENT','EACCES','ENOTDIR'].includes(e.code))return;throw e;}
  for(const row of rows){
   if(row.isSymbolicLink())continue;const file=path.join(dir,row.name);
   if(row.isDirectory()&&!['.git','node_modules','.generated','images','assets','bundle'].includes(row.name))await visit(file,depth+1,root);
   else if(row.isFile()&&/(deploy|release|receipt|provenance|wrangler-output)/i.test(row.name)&&/\.(json|jsonc|jsonl|ndjson)$/.test(row.name)){files.set(file,root);if(files.size>1000)stop('ASSET_ROUTING_RECORD_SCAN_LIMIT');}
  }
 }
 for(const root of roots){let actual;try{actual=await realpath(root);}catch(e){if(e.code==='ENOENT')continue;throw e;}summary.existingRoots++;for(const sub of ['production','.wrangler','dev/.state'])await visit(path.join(actual,sub),0,actual);}
 for(const [file,root] of files){
  const meta=await lstat(file);if(!meta.isFile()||meta.size>2*1024*1024)continue;
  const text=await readFile(file,'utf8');let rows;try{rows=[parseConfig(text)];}catch{rows=text.split('\n').filter(x=>x.trim()).flatMap(line=>{try{return [JSON.parse(line)];}catch{return [];}});}
  summary.recordFiles++;
  for(const row of rows){
   if(row?.type!=='deploy'||row.worker_name!==WORKER||row.version_id!==v.id)continue;
   summary.matchingDeployRecords++;
   let proof;try{proof=await evidenceFromDeployRecord(row,file,v,root);}catch(e){if(['ENOENT','INVALID_JSONC'].includes(e.code||e.message)){summary.unboundConfigs++;continue;}throw e;}
   if(proof)proofs.push(proof);else summary.unboundConfigs++;
  }
 }
 if(proofs.some(p=>!isDeepStrictEqual(p.config,proofs[0].config)))stop('ASSET_ROUTING_EVIDENCE_CONFLICT');
 return {proof:proofs[0]??null,summary};
}
async function persist(file,proof){
 const dir=path.dirname(file);try{await mkdir(dir,{mode:0o700});}catch(e){if(e.code!=='EEXIST')throw e;}
 const meta=await lstat(dir);if(!meta.isDirectory()||meta.isSymbolicLink()||process.getuid&&meta.uid!==process.getuid())stop('ASSET_ROUTING_CACHE_UNSAFE');await chmod(dir,0o700);
 try{const old=await lstat(file);if(!old.isFile()||old.isSymbolicLink()||process.getuid&&old.uid!==process.getuid())stop('ASSET_ROUTING_CACHE_UNSAFE');}catch(e){if(e.code!=='ENOENT')throw e;}
 const temp=path.join(dir,'assets-'+randomUUID()+'.json');
 try{await writeFile(temp,JSON.stringify(proof)+'\n',{flag:'wx',mode:0o600});await chmod(temp,0o600);await rename(temp,file);}finally{try{await unlink(temp);}catch(e){if(e.code!=='ENOENT')throw e;}}
}
export async function resolveAssetRouting(v,{cacheDirectory,get,roots=PROJECTS,onStage=()=>{}}){
 snapshotBinding(v);const file=path.join(cacheDirectory,'asset-routing-'+v.id+'.json');
 onStage('asset_routing_cache_read');
 try{const parent=await lstat(cacheDirectory);if(!parent.isDirectory()||parent.isSymbolicLink()||process.getuid&&parent.uid!==process.getuid())stop('ASSET_ROUTING_CACHE_UNSAFE');await chmod(cacheDirectory,0o700);}catch(e){if(e.code!=='ENOENT')throw e;}
 try{const meta=await lstat(file);if(!meta.isFile()||meta.isSymbolicLink()||meta.size>2*1024*1024||process.getuid&&meta.uid!==process.getuid())stop('ASSET_ROUTING_CACHE_UNSAFE');let proof;try{proof=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e instanceof SyntaxError)stop('ASSET_ROUTING_CACHE_INVALID');throw e;}validateAssetEvidence(proof,v);await chmod(file,0o600);return {proof,file,reused:true};}catch(e){if(e.code!=='ENOENT')throw e;}
 onStage('asset_routing_version_api');let body,readFailure;
 try{body=await get(endpoint(v));}catch(e){readFailure={field:'asset_routing',endpoint:endpoint(v),http:Number.isInteger(e.http)?e.http:null,codes:Array.isArray(e.codes)?e.codes.filter(Number.isInteger):[]};}
 let proof=body===undefined?null:evidenceFromVersionAPI(body,v),search;
 if(!proof){onStage('asset_routing_deployment_records');search=await searchDeployRecords(v,roots);proof=search.proof;}
 if(!proof){
  const e=Error('ASSET_ROUTING_EVIDENCE_UNAVAILABLE');
  e.diagnostic={stage:'asset_routing_resolve',code:e.message,missing:['asset_routing'],...(readFailure?{readFailures:[readFailure]}:{}),localRecords:search?.summary,dashboard:'Workers & Pages > yasoya-honten-payments > Deployments > active Version details > Settings/Assets: confirm Version ID, ASSETS binding, run_worker_first, html_handling, not_found_handling, base_path together. Do not infer unshown values.'};throw e;
 }
 onStage('asset_routing_deployment_verify');const deployed=await get('/accounts/'+ACCOUNT+'/workers/scripts/'+WORKER+'/deployments?page=1&per_page=1'),active=deployed?.deployments?.[0]?.versions;
 if(active?.length!==1||active[0].version_id!==v.id||active[0].percentage!==100)stop('LIVE_VERSION_CHANGED');
 validateAssetEvidence(proof,v);onStage('asset_routing_cache_write');await persist(file,proof);return {proof,file,reused:false};
}
export function sameAssetRouting(assets,proof){
 if(assets?.binding!=='ASSETS'||Object.keys(assets).some(k=>!['binding','directory',...keys].includes(k)))return false;
 return isDeepStrictEqual(Object.fromEntries(keys.filter(k=>Object.hasOwn(assets,k)).map(k=>[k,assets[k]])),proof.config);
}
