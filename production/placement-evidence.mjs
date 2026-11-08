// Placement serialization only. No deploy, defaults, credential reads or writes
// to original profiles. Version GETs use the existing authenticated reader.
import {readFile,writeFile,lstat,mkdir,chmod,rename,unlink} from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {isDeepStrictEqual as same} from 'node:util';
import {checkProfile} from './prepare-checkout-v58.mjs';
const account='fcf37e462257810df77e8fbc0e7f4317',worker='yasoya-honten-payments';
const stop=code=>{throw Error(code);};
const endpoint=v=>`/accounts/${account}/workers/workers/${worker}/versions/${v.id}`;
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const text=v=>typeof v==='string'&&v.trim().length>0&&!/[\r\n]/.test(v);
export function normalizePlacement(raw){
 if(raw===undefined)return undefined;
 if(!plain(raw))stop('PLACEMENT_INVALID');
 if(Object.keys(raw).some(k=>!['mode','hint','region','host','hostname','target'].includes(k)))stop('PLACEMENT_FIELDS_UNSUPPORTED');
 if(!Object.keys(raw).length)return undefined; // Only applied with matching Version evidence below.
 const has=k=>Object.hasOwn(raw,k),targets=['region','host','hostname'].filter(has);
 if(has('target')){
  if(raw.mode!=='targeted'||has('hint')||targets.length||!Array.isArray(raw.target)||raw.target.length!==1||!plain(raw.target[0]))stop('PLACEMENT_CONFLICT');
  const [entry]=raw.target,keys=Object.keys(entry);
  if(keys.length!==1||!['region','host','hostname'].includes(keys[0]))stop('PLACEMENT_FIELDS_UNSUPPORTED');
  return normalizePlacement({mode:'targeted',...entry});
 }
 if(targets.length){
  if(targets.length!==1||has('hint')||has('mode')&&raw.mode!=='targeted')stop('PLACEMENT_CONFLICT');
  if(!text(raw[targets[0]]))stop('PLACEMENT_INVALID');
  return {mode:'targeted',[targets[0]]:raw[targets[0]]};
 }
 if(!has('mode'))stop('PLACEMENT_MODE_REQUIRED');
 if(!['smart','off'].includes(raw.mode))stop(raw.mode==='targeted'?'PLACEMENT_TARGET_REQUIRED':'PLACEMENT_INVALID');
 if(has('hint')&&(typeof raw.hint!=='string'||/[\r\n]/.test(raw.hint)||raw.mode!=='smart'&&raw.hint!==''))stop('PLACEMENT_CONFLICT');
 return {mode:raw.mode,...(has('hint')?{hint:raw.hint}:{})};
}
export function validatePlacementEvidence(proof,v){
 if(proof?.placementEvidenceSchema!==1||proof.account!==account||proof.worker!==worker||proof.versionId!==v.id||proof.source?.kind!=='cloudflare_version_api'||proof.source.endpoint!==endpoint(v))stop('PLACEMENT_EVIDENCE_IDENTITY_MISMATCH');
 if(Object.keys(proof).some(k=>!['placementEvidenceSchema','account','worker','versionId','config','versionShape','source'].includes(k))||Object.keys(proof.source).some(k=>!['kind','endpoint'].includes(k)))stop('PLACEMENT_EVIDENCE_INVALID');
 if(proof.config===undefined)stop('PLACEMENT_EVIDENCE_INVALID');
 if(proof.config===null){if(!['absent','empty'].includes(proof.versionShape))stop('PLACEMENT_EVIDENCE_INVALID');}
 else if(proof.versionShape!=='configured'||!same(normalizePlacement(proof.config),proof.config))stop('PLACEMENT_EVIDENCE_INVALID');
 return proof;
}
export function placementFromEvidence(raw,proof,v){
 const normalized=normalizePlacement(raw);
 if(proof){validatePlacementEvidence(proof,v);if(!same(normalized??null,proof.config))stop('PLACEMENT_EVIDENCE_CONFLICT');}
 else if(raw!==undefined&&!normalized)stop('PLACEMENT_EVIDENCE_REQUIRED');
 return normalized;
}
export function evidenceFromPlacementVersion(body,v){
 if(body?.id!==v.id)stop('PLACEMENT_VERSION_MISMATCH');
 const raw=body.placement,config=normalizePlacement(raw);
 // Only exact Version config is retained; no author, modules, JWT or Secrets.
 return validatePlacementEvidence({placementEvidenceSchema:1,account,worker,versionId:v.id,config:config??null,versionShape:raw===undefined?'absent':config?'configured':'empty',source:{kind:'cloudflare_version_api',endpoint:endpoint(v)}},v);
}
async function safeDirectory(dir){
 try{await mkdir(dir,{mode:0o700});}catch(e){if(e.code!=='EEXIST')throw e;}
 const m=await lstat(dir);if(!m.isDirectory()||m.isSymbolicLink()||process.getuid&&m.uid!==process.getuid())stop('PLACEMENT_CACHE_UNSAFE');await chmod(dir,0o700);
}
export async function resolvePlacementEvidence(v,{cacheDirectory,get,onStage=()=>{}}){
 onStage('placement_cache_read');await safeDirectory(cacheDirectory);const file=path.join(cacheDirectory,'placement-'+v.id+'.json');
 try{
  const m=await lstat(file);if(!m.isFile()||m.isSymbolicLink()||m.size>65536||process.getuid&&m.uid!==process.getuid())stop('PLACEMENT_CACHE_UNSAFE');
  let proof;try{proof=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e instanceof SyntaxError)stop('PLACEMENT_EVIDENCE_INVALID');throw e;}
  validatePlacementEvidence(proof,v);await chmod(file,0o600);return {proof,file,reused:true};
 }catch(e){if(e.code!=='ENOENT')throw e;}
 onStage('placement_version_read');const proof=evidenceFromPlacementVersion(await get(endpoint(v)),v);
 // The launcher already checked active Version before cache reuse; check again
 // after acquiring new evidence to close the acquisition/rollout race.
 onStage('placement_deployment_verify');const d=await get(`/accounts/${account}/workers/scripts/${worker}/deployments?page=1&per_page=1`),active=d?.deployments?.[0]?.versions;
 if(active?.length!==1||active[0].version_id!==v.id||active[0].percentage!==100)stop('LIVE_VERSION_CHANGED');
 const temp=path.join(cacheDirectory,'placement-'+randomUUID()+'.json');
 try{await writeFile(temp,JSON.stringify(proof)+'\n',{mode:0o600,flag:'wx'});await chmod(temp,0o600);await rename(temp,file);}finally{try{await unlink(temp);}catch(e){if(e.code!=='ENOENT')throw e;}}
 return {proof,file,reused:false};
}
export async function prepareResumePlacement(profile,proof,v){
 // The caller has also validated the prior receipt, vars, tracked runtime and
 // routing. Keep the same directory so every relative local path still works.
 const c=await checkProfile(profile,'off');
 if(c.vars.PRODUCTION_MANAGED_CHECKOUT_ENABLED!=='0'||c.build?.command||['env','define','unsafe','secrets'].some(k=>Object.hasOwn(c,k))||Object.keys(c.vars).some(k=>/(TOKEN|SECRET|PASSWORD|API_KEY|PRIVATE_KEY)/i.test(k)))stop('UNSAFE_DRY_RUN_PROFILE');
 const placement=placementFromEvidence(c.placement,proof,v),next=structuredClone(c);
 if(placement===undefined)delete next.placement;else next.placement=placement;
 const resolution={inputShape:c.placement===undefined?'absent':Object.keys(c.placement).length?'configured':'empty',versionShape:proof.versionShape};
 if(same(c,next))return {profile,action:'unchanged',...resolution};
 const hash=createHash('sha256').update(JSON.stringify(next)).digest('hex'),file=path.join(path.dirname(profile),'off-placement-'+hash+'.local.jsonc');
 try{
  const m=await lstat(file);if(!m.isFile()||m.isSymbolicLink()||process.getuid&&m.uid!==process.getuid())stop('PLACEMENT_CACHE_UNSAFE');
  if(!same(await checkProfile(file,'off'),next))stop('PLACEMENT_EVIDENCE_CONFLICT');await chmod(file,0o600);
 }catch(e){if(e.code!=='ENOENT'&&e.message!=='EXISTING_OFF_PROFILE_NOT_FOUND')throw e;await writeFile(file,JSON.stringify(next,null,2)+'\n',{mode:0o600,flag:'wx'});await chmod(file,0o600);}
 return {profile:file,action:placement===undefined?'omit_version_confirmed_unconfigured':'normalize_explicit_target',...resolution};
}
