// Standalone stdin-compatible diagnostic launcher. Local Git/worktree only;
// Cloudflare access is delegated to the existing read-only preparer if needed.
import {execFile} from 'node:child_process';
import {promisify,isDeepStrictEqual} from 'node:util';
import {readFile,readdir,lstat,mkdtemp,writeFile,realpath,access} from 'node:fs/promises';
import {constants} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const exec=promisify(execFile);
const git=async(args,cwd=process.cwd())=>(await exec('git',args,{cwd,encoding:'utf8',maxBuffer:2*1024*1024})).stdout.trim();
const releaseFiles=['placement-evidence.mjs','asset-routing-evidence.mjs','prepare-off-from-version.mjs','release-diagnostics.mjs','recover-live-version.mjs','confirmed-production-resources.json','prepare-checkout-v58.mjs','prepare-off-live-assets.mjs'];
export function worktreeFailure(stage,code,cause={}){
 const diagnostic={stage,code};
 if(Number.isInteger(cause.code))diagnostic.exitCode=cause.code;
 if(['ENOENT','EACCES','EPERM','ENOSPC','ENOTDIR'].includes(cause.code))diagnostic.errno=cause.code;
 if(['ERR_MODULE_NOT_FOUND','ERR_UNSUPPORTED_ESM_URL_SCHEME'].includes(cause.code))diagnostic.moduleCode=cause.code;
 const stderr=String(cause.stderr||'');
 if(/index\.lock|could not lock|another git process/i.test(stderr))diagnostic.reason='GIT_LOCK_BUSY';
 else if(/invalid reference|not a valid object|bad object/i.test(stderr))diagnostic.reason='GIT_TARGET_UNAVAILABLE';
 else if(/permission denied|unable to create|could not create/i.test(stderr))diagnostic.reason='GIT_PATH_UNAVAILABLE';
 const error=Error(code);error.diagnostic=diagnostic;return error;
}
export function parseWorktrees(listing){
 if(typeof listing!=='string')return [];
 return listing.split('\0\0').map(block=>{
  const fields=block.split('\0');return {path:fields.find(x=>x.startsWith('worktree '))?.slice(9),head:fields.find(x=>x.startsWith('HEAD '))?.slice(5),blocked:fields.some(x=>/^locked(?: |$)|^prunable(?: |$)/.test(x))};
 }).filter(x=>x.path&&/^[a-f0-9]{40}$/.test(x.head||''));
}
export async function selectSourceWorktree(target,{readGit=git,stat=lstat,readable=file=>access(file,constants.R_OK),makeTemp=mkdtemp,onStage=()=>{}}={}){
 if(!/^[a-f0-9]{40}$/.test(target))throw worktreeFailure('source_worktree_list','FETCH_HEAD_INVALID');
 const skipped=[];let entries=[];
 onStage('source_worktree_list');
 try{entries=parseWorktrees(await readGit(['worktree','list','--porcelain','-z']));}
 catch(cause){skipped.push(worktreeFailure('source_worktree_list','SOURCE_WORKTREE_LIST_FAILED',cause).diagnostic);}
 const probe=async candidate=>{
  try{
   const info=await stat(candidate);if(!info.isDirectory()||info.isSymbolicLink())return 'WORKTREE_PATH_UNSAFE';
   if(await readGit(['rev-parse','--verify','HEAD'],candidate)!==target)return 'WORKTREE_HEAD_MISMATCH';
   if(await readGit(['status','--porcelain','--untracked-files=no'],candidate))return 'WORKTREE_TRACKED_CHANGES';
   for(const name of releaseFiles){const file=path.join(candidate,'production',name),meta=await stat(file);if(!meta.isFile()||meta.isSymbolicLink())return 'WORKTREE_RELEASE_FILE_UNSAFE';await readable(file);}
   // Recheck after filesystem access; do not trust only the listed HEAD.
   if(await readGit(['rev-parse','--verify','HEAD'],candidate)!==target)return 'WORKTREE_HEAD_MISMATCH';
   if(await readGit(['status','--porcelain','--untracked-files=no'],candidate))return 'WORKTREE_TRACKED_CHANGES';
   return null;
  }catch(cause){return worktreeFailure('source_worktree_probe','WORKTREE_PROBE_FAILED',cause).diagnostic;}
 };
 for(const entry of entries){
  if(entry.head!==target)continue;
  if(entry.blocked){skipped.push({code:'WORKTREE_LOCKED_OR_PRUNABLE'});continue;}
  onStage('source_worktree_probe');const problem=await probe(entry.path);
  if(problem){skipped.push(typeof problem==='string'?{code:problem}:problem);continue;}
  onStage('source_worktree_reuse');return {source:entry.path,mode:'reused',skipped};
 }
 onStage('source_worktree_create_directory');let directory;
 try{directory=await makeTemp(path.join(tmpdir(),'yasoya-off-source-'));}
 catch(cause){throw worktreeFailure('source_worktree_create_directory','SOURCE_WORKTREE_TEMP_CREATE_FAILED',cause);}
 const source=path.join(directory,'source');onStage('source_worktree_create');
 try{await readGit(['worktree','add','--detach',source,target]);}
 catch(cause){throw worktreeFailure('source_worktree_create','SOURCE_WORKTREE_CREATE_FAILED',cause);}
 onStage('source_worktree_validate');const problem=await probe(source);
 if(problem){const e=worktreeFailure('source_worktree_validate','SOURCE_WORKTREE_VALIDATION_FAILED');if(typeof problem==='object')Object.assign(e.diagnostic,problem,{stage:'source_worktree_validate',code:'SOURCE_WORKTREE_VALIDATION_FAILED'});e.diagnostic.reason=typeof problem==='string'?problem:problem.reason??problem.code;throw e;}
 return {source,mode:'created',skipped};
}
async function newest(prefix,suffix,predicate=()=>true){
 const found=[];
 for(const name of await readdir(tmpdir())){
  if(!name.startsWith(prefix))continue;
  const directory=path.join(tmpdir(),name),info=await lstat(directory);
  if(!info.isDirectory()||info.isSymbolicLink()||(process.getuid&&info.uid!==process.getuid()))continue;
  const file=path.join(directory,suffix);
  try{const meta=await lstat(file);if(meta.isFile()&&!meta.isSymbolicLink()&&await predicate(file))found.push({file,time:meta.mtimeMs});}catch{}
 }
 return found.sort((a,b)=>b.time-a.time)[0]?.file;
}
export async function validateResumeRuntime(config,target,source,readGit=git){
 const priorRoot=await readGit(['rev-parse','--show-toplevel'],path.dirname(config.main));
 if(path.resolve(config.main)!==path.join(priorRoot,'production/storefront-worker.js')||await readGit(['status','--porcelain','--untracked-files=no'],priorRoot))throw Error('RESUME_SOURCE_UNVERIFIED');
 const prior=await readGit(['rev-parse','HEAD'],priorRoot);
 if(await readGit(['diff','--name-only',prior,target,'--','worker','js','production/storefront-worker.js','production/api-worker.js','production/access.js'],source))throw Error('RESUME_RUNTIME_DIFFERS');
}
export async function diagnose(){
 let stage='git_head_read',journal,module,diagnostic,placementResolution;
 const events=[],report=(phase,status='started',extra={})=>{stage=phase;const event={stage:phase,status,...extra};events.push(event);};
 try{
  report('git_head_read');const remote=await git(['remote','get-url','origin']);if(!/^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)awaiaune\/yasoyahonten(?:\.git)?$/.test(remote))throw Error('REPOSITORY_MISMATCH');const target=await git(['rev-parse','FETCH_HEAD']);if(!/^[a-f0-9]{40}$/.test(target))throw Error('FETCH_HEAD_INVALID');
  const selected=await selectSourceWorktree(target,{onStage:phase=>report(phase)}),{source}=selected;
  report('source_worktree_ready','passed',{mode:selected.mode,skipped:selected.skipped});
  report('diagnostic_journal_create');try{journal=await mkdtemp(path.join(tmpdir(),'yasoya-off-diagnostic-'));}catch(cause){throw worktreeFailure(stage,'DIAGNOSTIC_JOURNAL_CREATE_FAILED',cause);}
  report('release_module_load');let recovery,routing,placement;
  try{
   module=await import(pathToFileURL(path.join(source,'production/prepare-off-from-version.mjs')));
   diagnostic=await import(pathToFileURL(path.join(source,'production/release-diagnostics.mjs')));
   recovery=await import(pathToFileURL(path.join(source,'production/recover-live-version.mjs')));
   routing=await import(pathToFileURL(path.join(source,'production/asset-routing-evidence.mjs')));
   placement=await import(pathToFileURL(path.join(source,'production/placement-evidence.mjs')));
  }catch(cause){throw worktreeFailure(stage,'RELEASE_MODULE_LOAD_FAILED',cause);}
  report('version_cache_location');const common=await realpath(path.resolve(await git(['rev-parse','--git-common-dir'])));
  if(common===tmpdir()||common.startsWith(tmpdir()+path.sep))throw Error('VERSION_PERSISTENT_CACHE_UNAVAILABLE');
  let reader;const get=async endpoint=>{reader??=await module.authenticatedMetadataReader();return reader(endpoint);};
  const {version:v,versionFile}=await recovery.recoverLiveVersion({cacheDirectory:path.join(common,'yasoya-release-private')},{get,inspect:module.inspectVersion,onStage:phase=>report(phase)});
  const assetEvidence=await routing.resolveAssetRouting(v,{cacheDirectory:path.join(common,'yasoya-release-private'),get,onStage:phase=>report(phase)});
  const placementEvidence=await placement.resolvePlacementEvidence(v,{cacheDirectory:path.join(common,'yasoya-release-private'),get,onStage:phase=>report(phase)});
  report('previous_output_search');
  const profile=await newest('yasoya-off-from-version-','release/off.local.jsonc',async file=>routing.sameAssetRouting(JSON.parse(await readFile(file,'utf8')).assets,assetEvidence.proof));
  if(profile){
   // Resume only an unchanged tracked runtime from this same repository history.
   // Do not rewrite either the old profile or its copied assets.
   report('resume_source_validate');const c=JSON.parse(await readFile(profile,'utf8'));
   const receipt=JSON.parse(await readFile(path.join(path.dirname(profile),'../evidence.json'),'utf8'));
   if(receipt.rollbackVersion!==v.id)throw Error('RESUME_VERSION_MISMATCH');
   if(!isDeepStrictEqual(c.vars,module.inspectVersion(v).vars))throw Error('RESUME_VARIABLES_MISMATCH');
   await validateResumeRuntime(c,target,source);
   report('placement_profile_validate');const adjusted=await placement.prepareResumePlacement(profile,placementEvidence.proof,v);placementResolution={inputShape:adjusted.inputShape,versionShape:adjusted.versionShape,action:adjusted.action};report('placement_profile_validate','passed',placementResolution);
   report('wrangler_dry_run');await diagnostic.runOffDryRun(adjusted.profile,path.join(journal,'dry-run'));
  }else{
   report('previous_metadata_search');const evidenceFile=await newest('yasoya-off-evidence-','evidence.json',async file=>JSON.parse(await readFile(file,'utf8')).versionId===v.id);
   const retained=evidenceFile??await newest('yasoya-off-from-version-','metadata.json',async file=>JSON.parse(await readFile(file,'utf8')).versionId===v.id);
   const prepared=await module.prepareFromVersion({versionFile,placementEvidenceFile:placementEvidence.file,assetSettingsFile:assetEvidence.file,evidenceFile:retained,collect:!retained,assets:'/workspaces/yasoya-v60-csp/production/.generated/v53',dryRun:true},{get,onStage:phase=>report(phase)});placementResolution=prepared.placementResolution;
  }
  report('complete','passed',{exitCode:0});await writeFile(path.join(journal,'events.json'),JSON.stringify(events)+'\n',{mode:0o600});console.log(JSON.stringify({status:'SUCCESS',stage:'wrangler_dry_run',exitCode:0,placement:placementResolution}));
 }catch(error){
  let safe=diagnostic?.safeReleaseDiagnostic(stage,error);
  // The preparer/runner supply a sanitized diagnostic. Unknown startup errors
  // expose only a fixed phase/code and OS exit status, never Git stderr.
  safe=error.diagnostic??safe??{stage,code:'DIAGNOSTIC_STEP_FAILED',...(Number.isInteger(error.code)?{exitCode:error.code}:{})};
  console.error(JSON.stringify(safe));if(journal)await writeFile(path.join(journal,'events.json'),JSON.stringify([...events,safe])+'\n',{mode:0o600});process.exitCode=1;
 }
}
if(!process.argv[1]||pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await diagnose();
