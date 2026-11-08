// Recovery/preparation only. This module has no deployment/upload operation.
import {readFile,writeFile,readdir,lstat,realpath,mkdir,mkdtemp,chmod,rename,unlink} from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify,isDeepStrictEqual as same} from 'node:util';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {recoverLiveVersion} from './recover-live-version.mjs';
import {resolveAssetRouting} from './asset-routing-evidence.mjs';
import {resolvePlacementEvidence} from './placement-evidence.mjs';
import {inspectVersion,identity,confirmedDatabaseIdentity} from './prepare-off-from-version.mjs';
const exec=promisify(execFile),here=path.dirname(fileURLToPath(import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex');
const stop=c=>{throw Error(c);},json=async p=>JSON.parse(await readFile(p,'utf8'));
export const OPERATIONAL_ASSETS='/workspaces/yasoya-v60-csp/production/.generated/v53'; // supplied by operator, not a fresh candidate build
// Shared /tmp is a trust boundary, not a user-owned release artifact.
// These checks never change the shared directory's ownership or permissions.
export function validateDiscoveryRoot(info,{shared=false,uid=process.getuid?.()}={}){
 const directory=!info.isSymbolicLink()&&info.isDirectory(),mode=info.mode&0o7777;
 if(shared){
  const reasons=[];if(info.isSymbolicLink())reasons.push('SYMLINK');if(!info.isDirectory())reasons.push('NOT_DIRECTORY');if(![0,uid].includes(info.uid))reasons.push('OWNER_NOT_ROOT_OR_CURRENT');if(!(mode&0o1000))reasons.push('STICKY_BIT_MISSING');if(mode!==0o1777)reasons.push('PERMISSIONS_UNEXPECTED');
  if(reasons.length){const e=Error('RECOVERY_SHARED_ROOT_UNSAFE');e.reasons=reasons;throw e;}
 }
 else if(!directory||uid!==undefined&&info.uid!==uid||mode!==0o700)stop('RECOVERY_PRIVATE_ROOT_UNSAFE');
 return info;
}
function validateOwned(info,kind){if(info.isSymbolicLink()||process.getuid&&info.uid!==process.getuid()||info.mode&0o022||kind==='dir'&&!info.isDirectory()||kind==='file'&&!info.isFile())stop('RECOVERY_PATH_UNSAFE');return info;}
async function owned(p,kind){return validateOwned(await lstat(p),kind);}
async function privateDir(p){await mkdir(p,{recursive:true,mode:0o700});const info=await owned(p,'dir');if((info.mode&0o7777)!==0o700)stop('RECOVERY_PRIVATE_ROOT_UNSAFE');}
async function secureTree(p){const info=await lstat(p);if(info.isSymbolicLink()&&path.basename(p)==='wrangler-discard.log'&&await realpath(p)==='/dev/null')return;await owned(p,info.isDirectory()?'dir':'file');await chmod(p,info.isDirectory()?0o700:0o600);if(info.isDirectory())for(const n of await readdir(p))await secureTree(path.join(p,n));}
async function writePrivate(p,data){await writeFile(p,JSON.stringify(data,null,2)+'\n',{mode:0o600,flag:'wx'});await chmod(p,0o600);}
async function optional(p){try{await owned(p,'file');return await json(p);}catch(e){if(e.code==='ENOENT')return null;throw e;}}
async function childDirs(root,prefix,{shared=false,missingIsError=false,io={lstat,readdir}}={}){
 try{
  validateDiscoveryRoot(await io.lstat(root),{shared});const found=[];
  for(const entry of await io.readdir(root,{withFileTypes:true})){
   if(!entry.name.startsWith(prefix))continue;const candidate=path.join(root,entry.name);
   try{validateOwned(await io.lstat(candidate),'dir');found.push(candidate);}
   catch(e){if(e.message==='RECOVERY_PATH_UNSAFE'||['ENOENT','ENOTDIR','EACCES','EPERM'].includes(e.code))continue;throw e;}
  }
  return found;
 }catch(e){if(e.code==='ENOENT'&&!missingIsError)return [];throw e;}
}
export async function discoverReleaseRoots(cache,tmpDirectory='/tmp',io={lstat,readdir}){
 let temporary=[],temporarySearch;
 // Only this historical temporary-artifact search is optional. Cache ownership,
 // permissions and payload validation are outside this catch and remain fatal.
 try{temporary=await childDirs(tmpDirectory,'yasoya-off-from-version-',{shared:path.resolve(tmpDirectory)==='/tmp',missingIsError:true,io});temporarySearch={status:'searched'};}
 catch(e){
  if(!['RECOVERY_SHARED_ROOT_UNSAFE','RECOVERY_PRIVATE_ROOT_UNSAFE'].includes(e.message)&&!['ENOENT','ENOTDIR','EACCES','EPERM','ELOOP'].includes(e.code))throw e;
  temporarySearch={status:'skipped',code:e.message==='RECOVERY_SHARED_ROOT_UNSAFE'||e.message==='RECOVERY_PRIVATE_ROOT_UNSAFE'?e.message:e.code,...(e.reasons?{reasons:e.reasons}:{})};
 }
 const roots=[...temporary,...await childDirs(path.join(cache,'builds'),'release-build-',{io})],packets=await childDirs(cache,'prebuilt-off-',{io});
 return {roots,packets,temporarySearch};
}
async function remember(cache,result){
 const pointer=path.join(cache,'current-prepared-off.json');await optional(pointer);const temp=path.join(cache,'pointer-'+randomUUID()+'.json');
 try{await writePrivate(temp,{schema:1,worker:identity.worker,releaseSha:result.releaseSha,manifest:result.manifest,manifestSha256:result.manifestSha256});await rename(temp,pointer);}finally{try{await unlink(temp);}catch(e){if(e.code!=='ENOENT')throw e;}}
}
function descriptor(m){return m?.schema===1&&m.worker===identity.worker;}
export async function validateExistingAssets(dir,inventory){
 await owned(dir,'dir');const manifest=await json(path.join(here,'live-design-manifest.json')),tree=await inventory(dir);
 for(const [name,digest]of Object.entries({...manifest.exactLiveFiles,'index.html':manifest.homepageTemplateSha256}))if(tree[name]!==digest)stop('OPERATIONAL_ASSET_HASH_MISMATCH');
 if((await readFile(path.join(dir,'js/store-config.js'),'utf8'))!=='throw new Error("Production runtime configuration must be served by the Worker");')stop('DYNAMIC_STORE_CONFIG_STUB_REQUIRED');
 return {directory:dir,tree,sha256:hash(JSON.stringify(tree)),scope:'operator-confirmed operational directory / known live hashes / full local copy; not a full remote ASSETS parity claim'};
}
export async function selectOperationalAssets({trustedDirectory=OPERATIONAL_ASSETS,roots=[]},ops){
 try{return {...await validateExistingAssets(trustedDirectory,ops.inventory),source:'operator_confirmed_directory'};}catch(e){if(e.code!=='ENOENT')throw e;}
 const candidates=[];
 for(const root of roots){
  try{
   const receipt=await optional(path.join(root,'evidence.json')),status=await optional(path.join(root,'dry-run/diagnostic.json'));
   if(receipt?.worker!==identity.worker||receipt.rollbackVersion!==ops.ROLLBACK||receipt.namespaceId!==identity.namespace||status?.status!=='passed'||status.exitCode!==0)continue;
   const a=await json(path.join(root,'release/assembly.json')),dir=path.join(root,'release/site'),asset=await validateExistingAssets(dir,ops.inventory);
   if(a.mode!=='OFF'||!same(a.changedAssets,['js/checkout-v1.js'])||!same(Object.keys(a.assetSha256).sort(),Object.keys(asset.tree).sort()))continue;
   if(Object.entries(asset.tree).some(([file,h])=>file!=='js/checkout-v1.js'&&h!==a.assetSha256[file]))continue;
   candidates.push({...asset,source:'recorded_successful_release_assets'});
  }catch(e){if(['ENOENT','ENOTDIR'].includes(e.code)||['OPERATIONAL_ASSET_HASH_MISMATCH','DYNAMIC_STORE_CONFIG_STUB_REQUIRED'].includes(e.message))continue;throw e;}
 }
 if(!candidates.length)stop('OPERATIONAL_ASSETS_REQUIRED');
 if(candidates.some(c=>c.sha256!==candidates[0].sha256))stop('OPERATIONAL_ASSETS_AMBIGUOUS');return candidates[0];
}
async function liveEvidence(v,routing,placement,get){
 const a='/accounts/'+identity.account,w=a+'/workers/scripts/'+identity.worker;
 const [settings,routes,domains,subdomain,schedules,namespace]=await Promise.all([get(w+'/settings'),get(w+'/routes'),get(a+'/workers/domains?service='+identity.worker+'&per_page=100'),get(w+'/subdomain'),get(w+'/schedules'),get(a+'/workers/durable_objects/namespaces/'+identity.namespace)]);
 if(!Array.isArray(domains))stop('DOMAIN_RESPONSE_INVALID');
 if(settings.assets?.config&&!same(settings.assets.config,routing.config))stop('LIVE_ASSET_ROUTING_CHANGED');
 return {account:identity.account,worker:identity.worker,versionId:v.id,activeVersionId:v.id,traffic:100,routes,domains:domains.filter(d=>d.service===identity.worker),subdomain,schedules:schedules?.schedules,namespace,
  ...confirmedDatabaseIdentity(v),metadataFailures:[],settings:Object.fromEntries(['observability','limits','placement','tail_consumers','usage_model'].filter(k=>settings[k]!==undefined).map(k=>[k,settings[k]])),assetConfig:routing.config,assetRoutingEvidence:routing,placementEvidence:placement,
  localEvidenceReconstruction:{source:'current read-only metadata + recorded Dashboard D1 identity + exact Version binding',databaseApiRetested:false}};
}
export async function recoverOffRelease(options,ops,deps={}){
 const stage=ops.onStage??(()=>{});stage('recovery_repository');
 const repository=options.repository??process.cwd(),common=path.resolve(repository,(await exec('git',['rev-parse','--git-common-dir'],{cwd:repository,encoding:'utf8'})).stdout.trim()),cache=options.cacheDirectory??path.join(common,'yasoya-release-private');
 await privateDir(cache);stage('recovery_authentication');const connection=deps.get?{get:deps.get}:await ops.reader(path.join(cache,'recovery-runtime'));
 // Share a full Version-specific GET within this invocation, never credentials
 // or raw API bodies on disk. Latest-deployment reads are never memoized.
 const beta='/accounts/'+identity.account+'/workers/workers/'+identity.worker+'/versions/'+ops.ROLLBACK;let betaResult;
 const get=p=>p===beta?(betaResult??=connection.get(p)):connection.get(p);
 const recovered=await recoverLiveVersion({cacheDirectory:cache,temporaryFile:options.versionTemporaryFile??'/tmp/yasoya-live-version.json'},{get,inspect:inspectVersion,onStage:stage}),v=recovered.version;stage('persistent_artifacts');
 const pointer=await optional(path.join(cache,'current-prepared-off.json'));
 if(pointer){if(!descriptor(pointer)||pointer.releaseSha!==ops.SOURCE_SHA)stop('PERSISTENT_POINTER_IDENTITY_MISMATCH');
  if(await optional(pointer.manifest)){const result=await ops.inspectPreparedPacket(pointer.manifest,pointer.manifestSha256,get);await remember(cache,result);return {...result,recovery:{mode:'persistent_packet_reused',regenerated:false}};}
 }
 stage('artifact_discovery');const found=await discoverReleaseRoots(cache,options.tmpDirectory??'/tmp',deps.discoveryIO);
 for(const packet of found.packets){const manifestFile=path.join(packet,'manifest.json'),m=await optional(manifestFile);if(!m||!descriptor(m)||m.source?.sha!==ops.SOURCE_SHA||m.rollbackVersion!==ops.ROLLBACK)continue;
  const result=await ops.inspectPreparedPacket(manifestFile,hash(await readFile(manifestFile)),get);await remember(cache,result);return {...result,recovery:{mode:'persistent_packet_reused',regenerated:false,temporarySearch:found.temporarySearch}};
 }
 const rejected=[];
 for(const root of found.roots){
  // Incomplete/missing-map inputs are not considered proven artifacts. They
  // remain untouched; only a new fixed-source build may replace their role.
  let c;try{c=await optional(path.join(root,'dry-run/diagnostic.json'));}catch(e){rejected.push({code:'INPUT_RECORD_UNREADABLE'});continue;}
  if(c?.status!=='passed'||c.exitCode!==0)continue;
  try{
   const result=await ops.preparePrebuilt({root,repository},{get,artifactOrigin:{kind:'reused_successful_release',sourceRoot:root}});await remember(cache,result);return {...result,recovery:{mode:'successful_artifacts_reused',regenerated:false,temporarySearch:found.temporarySearch}};
  }catch(e){
   if(e.http||/^(LIVE_|AUTH_|WRANGLER_AUTH|PREVIOUS_DEPLOY|VERSION_)/.test(e.message))throw e;
   const eligible=/^(ARTIFACT_|SOURCE_MAP_|BUNDLE_|UNTRACKED_BUNDLE|ADDITIONAL_MODULES|ASSET_|RECEIPT_IDENTITY|OFF_CONFIG_METADATA|SUCCESSFUL_DRY_RUN)/.test(e.message)||['ENOENT','ENOTDIR'].includes(e.code);if(!eligible)throw e;
   rejected.push({code:/^[A-Z_]+$/.test(e.message)?e.message:'INPUT_UNAVAILABLE'});
  }
 }
 stage('asset_routing');const routing=await resolveAssetRouting(v,{cacheDirectory:cache,get,onStage:stage}),placement=await resolvePlacementEvidence(v,{cacheDirectory:cache,get,onStage:stage});
 stage('operational_assets');const asset=await selectOperationalAssets({trustedDirectory:options.operationalAssets??OPERATIONAL_ASSETS,roots:found.roots},ops),e=await liveEvidence(v,routing.proof,placement.proof,get);
 stage('fixed_source_worktree');await privateDir(path.join(cache,'builds'));const buildParent=await mkdtemp(path.join(cache,'builds','release-source-'));await chmod(buildParent,0o700);const sourceRoot=path.join(buildParent,'source');
 // Never switch, reset, prune or delete a user's worktree. The source tree is
 // detached at the specified immutable application SHA before any compilation.
 if(deps.checkoutSource)await deps.checkoutSource({repository,sourceRoot,sha:ops.SOURCE_SHA});else await exec('git',['worktree','add','--detach',sourceRoot,ops.SOURCE_SHA],{cwd:repository,encoding:'utf8',maxBuffer:1024*1024});
 if((await exec('git',['rev-parse','HEAD'],{cwd:sourceRoot,encoding:'utf8'})).stdout.trim()!==ops.SOURCE_SHA)stop('REBUILD_SOURCE_SHA_MISMATCH');
 const state=path.join(buildParent,'state');await privateDir(state);await writePrivate(path.join(state,'metadata.json'),e);await writePrivate(path.join(state,'version.json'),v);await writePrivate(path.join(state,'routing.json'),routing.proof);await writePrivate(path.join(state,'placement.json'),placement.proof);
 // Run the preparer from the pinned source tree: it resolves the Worker
 // entrypoint there, never from the downloaded release-tool directory.
 const pinned=deps.loadPreparer?await deps.loadPreparer(sourceRoot):await import(pathToFileURL(path.join(sourceRoot,'production/prepare-off-from-version.mjs')));
 const output=path.join(cache,'builds','release-build-'+randomUUID());
 const run=async(cmd,args,opts)=>{if(cmd!=='npx'||args[1]!=='wrangler@4.155.0'||!args.includes('--dry-run')||args.some(a=>['--var','--env','--secrets-file'].includes(a)))stop('UNSAFE_REBUILD_COMMAND');return (deps.runBuild??exec)(cmd,[...args,'--upload-source-maps'],opts);};
 stage('regeneration_dry_run');const build=await pinned.prepareFromVersion({versionFile:path.join(state,'version.json'),evidenceFile:path.join(state,'metadata.json'),assetSettingsFile:path.join(state,'routing.json'),placementEvidenceFile:path.join(state,'placement.json'),assets:asset.directory,output,dryRun:true},{get,run});
 if(build.dryRun!==true||path.resolve(build.directory)!==path.resolve(output))stop('REBUILD_SUCCESS_RECORD_INVALID');
 await writePrivate(path.join(output,'metadata.json'),e);await secureTree(output); // collect=false: old pinned preparer does not save this itself.
 const origin={kind:'regenerated_fixed_source',sourceSha:ops.SOURCE_SHA,wranglerVersion:'4.155.0',sourceMapRequested:true,temporarySearch:found.temporarySearch,previousBundleComparison:'unavailable; past input artifacts were not reused',assetsSource:asset.source,assetsFingerprint:asset.sha256,assetIdentityScope:asset.scope};
 stage('freeze_regenerated_artifacts');const result=await ops.preparePrebuilt({root:output,repository},{get,artifactOrigin:origin});await remember(cache,result);return {...result,recovery:{mode:'regenerated_fixed_source',regenerated:true,previousBundleComparison:'unavailable',rejectedArtifacts:rejected,temporarySearch:found.temporarySearch}};
}
