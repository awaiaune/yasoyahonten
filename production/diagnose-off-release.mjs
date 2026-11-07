// Standalone stdin-compatible diagnostic launcher. Local Git/worktree only;
// Cloudflare access is delegated to the existing read-only preparer if needed.
import {execFile} from 'node:child_process';
import {promisify,isDeepStrictEqual} from 'node:util';
import {readFile,readdir,lstat,mkdtemp,writeFile,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const exec=promisify(execFile);
const git=async(args,cwd=process.cwd())=>(await exec('git',args,{cwd,encoding:'utf8',maxBuffer:2*1024*1024})).stdout.trim();
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
 let stage='git_head_read',journal,module,diagnostic;
 const events=[],report=(phase,status='started',extra={})=>{stage=phase;const event={stage:phase,status,...extra};events.push(event);};
 try{
  report('git_head_read');const remote=await git(['remote','get-url','origin']);if(!/^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)awaiaune\/yasoyahonten(?:\.git)?$/.test(remote))throw Error('REPOSITORY_MISMATCH');const target=await git(['rev-parse','FETCH_HEAD']);if(!/^[a-f0-9]{40}$/.test(target))throw Error('FETCH_HEAD_INVALID');
  report('source_worktree');const listing=await git(['worktree','list','--porcelain','-z']);let source;
  for(const block of listing.split('\0\0')){
   const fields=block.split('\0'),candidate=fields.find(x=>x.startsWith('worktree '))?.slice(9),head=fields.find(x=>x.startsWith('HEAD '))?.slice(5);
   if(candidate&&head===target&&!await git(['status','--porcelain','--untracked-files=no'],candidate)){source=candidate;break;}
  }
  if(!source){const dir=await mkdtemp(path.join(tmpdir(),'yasoya-off-source-'));source=path.join(dir,'source');await git(['worktree','add','--detach',source,target]);}
  journal=await mkdtemp(path.join(tmpdir(),'yasoya-off-diagnostic-'));
  module=await import(pathToFileURL(path.join(source,'production/prepare-off-from-version.mjs')));
  diagnostic=await import(pathToFileURL(path.join(source,'production/release-diagnostics.mjs')));
  const recovery=await import(pathToFileURL(path.join(source,'production/recover-live-version.mjs')));
  report('version_cache_location');const common=await realpath(path.resolve(await git(['rev-parse','--git-common-dir'])));
  if(common===tmpdir()||common.startsWith(tmpdir()+path.sep))throw Error('VERSION_PERSISTENT_CACHE_UNAVAILABLE');
  let reader;const get=async endpoint=>{reader??=await module.authenticatedMetadataReader();return reader(endpoint);};
  const {version:v,versionFile}=await recovery.recoverLiveVersion({cacheDirectory:path.join(common,'yasoya-release-private')},{get,inspect:module.inspectVersion,onStage:phase=>report(phase)});
  report('previous_output_search');
  const profile=await newest('yasoya-off-from-version-','release/off.local.jsonc');
  if(profile){
   // Resume only an unchanged tracked runtime from this same repository history.
   // Do not rewrite either the old profile or its copied assets.
   report('resume_source_validate');const c=JSON.parse(await readFile(profile,'utf8'));
   const receipt=JSON.parse(await readFile(path.join(path.dirname(profile),'../evidence.json'),'utf8'));
   if(receipt.rollbackVersion!==v.id)throw Error('RESUME_VERSION_MISMATCH');
   if(!isDeepStrictEqual(c.vars,module.inspectVersion(v).vars))throw Error('RESUME_VARIABLES_MISMATCH');
   await validateResumeRuntime(c,target,source);
   report('wrangler_dry_run');await diagnostic.runOffDryRun(profile,path.join(journal,'dry-run'));
  }else{
   report('previous_metadata_search');const evidenceFile=await newest('yasoya-off-evidence-','evidence.json',async file=>JSON.parse(await readFile(file,'utf8')).versionId===v.id);
   const retained=evidenceFile??await newest('yasoya-off-from-version-','metadata.json',async file=>JSON.parse(await readFile(file,'utf8')).versionId===v.id);
   await module.prepareFromVersion({versionFile,evidenceFile:retained,collect:!retained,assets:'/workspaces/yasoya-v60-csp/production/.generated/v53',dryRun:true},{get,onStage:phase=>report(phase)});
  }
  report('complete','passed',{exitCode:0});await writeFile(path.join(journal,'events.json'),JSON.stringify(events)+'\n',{mode:0o600});console.log(JSON.stringify({status:'SUCCESS',stage:'wrangler_dry_run',exitCode:0}));
 }catch(error){
  let safe=diagnostic?.safeReleaseDiagnostic(stage,error);
  // The preparer/runner supply a sanitized diagnostic. Unknown startup errors
  // expose only a fixed phase/code and OS exit status, never Git stderr.
  safe=error.diagnostic??safe??{stage,code:'DIAGNOSTIC_STEP_FAILED',...(Number.isInteger(error.code)?{exitCode:error.code}:{})};
  console.error(JSON.stringify(safe));if(journal)await writeFile(path.join(journal,'events.json'),JSON.stringify([...events,safe])+'\n',{mode:0o600});process.exitCode=1;
 }
}
if(!process.argv[1]||pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await diagnose();
