// Release operations only. Prepare never deploys; --deploy requires --approved.
// Worker source SHA is fixed independently of this preparation tool's revision.
import {readFile,writeFile,readdir,lstat,stat,realpath,mkdir,mkdtemp,chmod,cp,symlink} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify,isDeepStrictEqual as same} from 'node:util';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {inspectVersion,profileFromEvidence,apiReader,identity} from './prepare-off-from-version.mjs';
import {validatedVersion,normalizeD1Binding} from './recover-live-version.mjs';
import {validateAssetEvidence,sameAssetRouting} from './asset-routing-evidence.mjs';
import {validatePlacementEvidence} from './placement-evidence.mjs';
import {checkProfile} from './prepare-checkout-v58.mjs';
export const SOURCE_SHA='ce5ad8786df6643c6380f091c4dfbbb72559c6ff';
export const ROLLBACK='36ab2dba-dd44-4f39-bc69-6db729bd24d5';
const DEFAULT_ROOT='/tmp/yasoya-off-from-version-vGRUEf',here=path.dirname(fileURLToPath(import.meta.url)),exec=promisify(execFile);
const TOOL_FILES=['prepare-prebuilt-off-release.mjs','prepare-off-from-version.mjs','release-diagnostics.mjs','asset-routing-evidence.mjs','placement-evidence.mjs','recover-live-version.mjs','prepare-checkout-v58.mjs','prepare-off-live-assets.mjs','confirmed-production-resources.json'];
let phase='artifact_input';
const stop=code=>{throw Error(code);},hash=b=>createHash('sha256').update(b).digest('hex');
const json=async f=>JSON.parse(await readFile(f,'utf8'));
const git=async(args,cwd)=>(await exec('git',args,{cwd,encoding:'utf8',maxBuffer:8*1024*1024})).stdout.trim();
const quote=s=>"'"+s.replaceAll("'","'\\''")+"'";
async function regular(file){const s=await lstat(file);if(!s.isFile()||s.isSymbolicLink()||process.getuid&&s.uid!==process.getuid())stop('LOCAL_FILE_UNSAFE');return s;}
async function privateDir(dir){await mkdir(dir,{recursive:true,mode:0o700});const m=await lstat(dir);if(!m.isDirectory()||m.isSymbolicLink()||process.getuid&&m.uid!==process.getuid())stop('PRIVATE_DIRECTORY_UNSAFE');await chmod(dir,0o700);}
async function save(file,value){await writeFile(file,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});await chmod(file,0o600);}
async function inventory(dir,prefix='',skipRuntime=false){
 const out={};for(const d of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name<b.name?-1:1)){
  if(skipRuntime&&!prefix&&d.name==='runtime')continue;
  const rel=prefix+d.name,file=path.join(dir,d.name);if(d.isSymbolicLink())stop('ARTIFACT_LINK_REJECTED');
  if(d.isDirectory())Object.assign(out,await inventory(file,rel+'/'));else if(d.isFile())out[rel]=hash(await readFile(file));else stop('ARTIFACT_SPECIAL_FILE_REJECTED');
 }return out;
}
async function copyPrivate(from,to){await cp(from,to,{recursive:true,errorOnExist:true,force:false});async function modes(p){const s=await lstat(p);if(s.isSymbolicLink())stop('ARTIFACT_LINK_REJECTED');await chmod(p,s.isDirectory()?0o700:0o600);if(s.isDirectory())for(const n of await readdir(p))await modes(path.join(p,n));}await modes(to);}
function comparable(c){const n=structuredClone(c);delete n.main;delete n.assets.directory;return n;}
function bindList(b){return b.map(x=>normalizeD1Binding(x)).sort((a,b)=>a.name.localeCompare(b.name));}
function assertProfile(c){
 if(c.name!==identity.worker||c.account_id!==identity.account||c.keep_vars!==true||c.migrations?.length!==0||!Array.isArray(c.migrations)||c.vars.PRODUCTION_CHECKOUT_ENABLED!=='0'||c.vars.PRODUCTION_MANAGED_CHECKOUT_ENABLED!=='0'||c.vars.PRODUCTION_MANAGEMENT_CATALOG_ENABLED!=='0'||c.vars.PRODUCTION_MANAGEMENT_INVENTORY_ENABLED!=='1')stop('OFF_PROFILE_UNSAFE');
 if(['build','env','define','unsafe','secrets','secrets_file'].some(k=>Object.hasOwn(c,k))||Object.keys(c.vars).some(k=>/TOKEN|SECRET|PASSWORD|API_KEY|PRIVATE_KEY/i.test(k)))stop('INLINE_CREDENTIAL_OR_HOOK_REJECTED');
 if(!path.isAbsolute(c.main)||!path.isAbsolute(c.assets.directory))stop('RELATIVE_RELEASE_PATH_REJECTED');
}
async function parseBundle(bundle){
 // Parse/link only. Never evaluate the Worker or instantiate a Durable Object.
 const code=await readFile(bundle,'utf8');if(/\bimport\s*(?:(?:\/\*[\s\S]*?\*\/|\/\/[^\n]*\n)\s*)*[.(]/.test(code))stop('DYNAMIC_IMPORT_REQUIRES_REVIEW');
 const script=`import vm from 'node:vm';import{readFile}from'node:fs/promises';try{const m=new vm.SourceTextModule(await readFile(process.argv[1],'utf8'));if(m.dependencySpecifiers.length)throw 0;await m.link(()=>{throw 0});const x=Reflect.ownKeys(m.namespace).filter(x=>typeof x==='string').sort();if(JSON.stringify(x)!==JSON.stringify(['PurchaseCoordinator','default']))throw 0;console.log('PARSED_SINGLE_MODULE');}catch{console.log('BUNDLE_MODULE_REJECTED');process.exitCode=1;}`;
 try{const r=await exec(process.execPath,['--no-warnings','--experimental-vm-modules','--input-type=module','-e',script,bundle],{encoding:'utf8',maxBuffer:4096});if(r.stdout.trim()!=='PARSED_SINGLE_MODULE')stop('BUNDLE_MODULE_REJECTED');}catch{stop('BUNDLE_MODULE_REJECTED');}
}
async function sourceProof(bundle,c,repository){
 if(await git(['rev-parse',SOURCE_SHA+'^{commit}'],repository)!==SOURCE_SHA)stop('SOURCE_SHA_MISSING');
 const source=path.dirname(path.dirname(c.main)); // map origin only; original worktree may already be gone.
 const map=await json(bundle+'.map');if(map.version!==3||!Array.isArray(map.sources)||!Array.isArray(map.sourcesContent)||map.sources.length!==map.sourcesContent.length||!map.sources.length)stop('SOURCE_MAP_PROOF_MISSING');
 const seen=new Set();for(let i=0;i<map.sources.length;i++){
  const full=path.resolve(path.dirname(bundle),map.sourceRoot||'',map.sources[i]);if(!full.startsWith(source+path.sep))stop('UNTRACKED_BUNDLE_SOURCE');
  const rel=path.relative(source,full).split(path.sep).join('/');seen.add(rel);
  const content=(await exec('git',['show',SOURCE_SHA+':'+rel],{cwd:repository,encoding:'utf8',maxBuffer:8*1024*1024})).stdout;
  if(content!==map.sourcesContent[i])stop('BUNDLE_SOURCE_SHA_MISMATCH');
 }
 if(['production/storefront-worker.js','worker/src/index.js','worker/src/purchase-ledger.js','worker/src/order-mail-outbox.js'].some(f=>!seen.has(f)))stop('SOURCE_MAP_ENTRY_MISSING');
 if(!(await readFile(bundle,'utf8')).endsWith('//# sourceMappingURL=storefront-worker.js.map\n'))stop('SOURCE_MAP_REFERENCE_MISMATCH');
 return {sha:SOURCE_SHA,sourceFiles:map.sources.length,method:'supplied successful artifact plus source-map contents matched to immutable Git objects; no rebuild'};
}
async function reader(directory){
 await privateDir(directory);const sink=path.join(directory,'discard.log');try{await symlink('/dev/null',sink);}catch(e){if(e.code!=='EEXIST')throw e;}if(await realpath(sink)!=='/dev/null')stop('LOG_SINK_UNSAFE');
 const env={...process.env,WRANGLER_LOG_PATH:sink,WRANGLER_LOG:'error',WRANGLER_LOG_SANITIZE:'true',WRANGLER_SEND_METRICS:'false'};
 let result;try{result=await exec('npx',['--yes','wrangler@4.155.0','auth','token','--json'],{env,encoding:'utf8',timeout:120000,maxBuffer:1024*1024});}catch{stop('AUTH_READ_FAILED');}
 let auth;try{auth=JSON.parse(result.stdout);}catch{stop('AUTH_RESPONSE_INVALID');}result=undefined;return {get:await apiReader(auth),env};
}
async function current(get){const d=await get(`/accounts/${identity.account}/workers/scripts/${identity.worker}/deployments?page=1&per_page=1`),a=d?.deployments?.[0]?.versions;if(a?.length!==1||a[0].version_id!==ROLLBACK||a[0].percentage!==100)stop('LIVE_VERSION_CHANGED');return {worker:identity.worker,versionId:ROLLBACK,percentage:100,checkedAt:new Date().toISOString()};}
async function liveMatches(get,v,e,c){
 phase='live_version';const rollback=await current(get),a='/accounts/'+identity.account,w=a+'/workers/scripts/'+identity.worker;
 phase='live_version_bindings';const fresh=validatedVersion(await get(w+'/versions/'+ROLLBACK),inspectVersion);if(!same(v,fresh))stop('LIVE_VERSION_CONTENT_CHANGED');
 phase='live_settings_routes';const [settings,routes,domains,subdomain,schedules]=await Promise.all([get(w+'/settings'),get(w+'/routes'),get(a+'/workers/domains?service='+identity.worker+'&per_page=100'),get(w+'/subdomain'),get(w+'/schedules')]);
 if(settings.bindings&&!same(bindList(settings.bindings),bindList(v.resources.bindings)))stop('LIVE_SETTINGS_CHANGED');
 if(!Array.isArray(domains))stop('DOMAIN_RESPONSE_INVALID');
 const next={...e,activeVersionId:ROLLBACK,traffic:100,routes,domains:domains.filter(x=>x.service===identity.worker),subdomain,schedules:schedules?.schedules,settings:Object.fromEntries(['observability','limits','placement','tail_consumers','usage_model'].filter(k=>settings[k]!==undefined).map(k=>[k,settings[k]]))};
 if(settings.assets?.config&&!same(settings.assets.config,e.assetConfig))stop('LIVE_ASSET_ROUTING_CHANGED');
 if(!same(comparable(profileFromEvidence(v,next,c.assets.directory).config),comparable(c)))stop('LIVE_CONFIGURATION_CHANGED');
 // Keep the historical D1 identity/read-failure proof. Do not retry the denied
 // D1 endpoint, query customer data, recover a payment, or touch Square.
 return {rollback,evidence:next};
}
export async function preparePrebuilt({root=DEFAULT_ROOT,repository=process.cwd(),output},deps={}){
 phase='repository';const remote=await git(['remote','get-url','origin'],repository);if(!/^(?:https:\/\/github\.com\/|git@github\.com:)awaiaune\/yasoyahonten(?:\.git)?$/.test(remote))stop('REPOSITORY_MISMATCH');
 phase='artifact_input';const bundle=path.join(root,'dry-run/bundle/storefront-worker.js'),input=path.join(root,'release/off.local.jsonc'),assets=path.join(root,'release/site');
 const success=await json(path.join(root,'dry-run/diagnostic.json'));if(success.status!=='passed'||success.exitCode!==0)stop('SUCCESSFUL_DRY_RUN_REQUIRED');
 await regular(bundle);await regular(bundle+'.map');await regular(input);const originalBundle=await inventory(path.dirname(bundle)),inputHash=hash(await readFile(input));const c=await checkProfile(input,'off');assertProfile(c);if(await realpath(c.assets.directory)!==await realpath(assets))stop('ASSET_PATH_MISMATCH');
 if((await stat(bundle)).mtimeMs>(await stat(path.join(root,'dry-run/diagnostic.json'))).mtimeMs)stop('BUNDLE_CHANGED_AFTER_DRY_RUN');
 const additional=(await readdir(path.dirname(bundle))).filter(x=>!['storefront-worker.js','storefront-worker.js.map','README.md'].includes(x));if(additional.length)stop('ADDITIONAL_MODULES_REQUIRE_REVIEW');
 phase='bundle_parse_and_source_sha';await parseBundle(bundle);const source=await sourceProof(bundle,c,repository),receipt=await json(path.join(root,'evidence.json'));
 if(receipt.worker!==identity.worker||receipt.rollbackVersion!==ROLLBACK||receipt.namespaceId!==identity.namespace)stop('RECEIPT_IDENTITY_MISMATCH');
 const common=path.resolve(repository,await git(['rev-parse','--git-common-dir'],repository)),cache=path.join(common,'yasoya-release-private');
 phase='version_cache';const v=validatedVersion(await json(deps.versionFile??path.join(cache,'live-version.json')),inspectVersion);if(v.id!==ROLLBACK)stop('VERSION_CACHE_MISMATCH');
 if(!same(receipt.secretNames,inspectVersion(v).secrets))stop('SECRET_NAMES_MISMATCH');
 const routing=receipt.assetRoutingEvidence??await json(path.join(cache,'asset-routing-'+ROLLBACK+'.json'));validateAssetEvidence(routing,v);if(!sameAssetRouting(c.assets,routing))stop('ASSET_ROUTING_MISMATCH');
 const placement=receipt.placementEvidence??await json(path.join(cache,'placement-'+ROLLBACK+'.json'));validatePlacementEvidence(placement,v);
 phase='saved_metadata';let e;const metadataFiles=[deps.metadataFile??path.join(root,'metadata.json')];if(!deps.metadataFile){for(const d of await readdir('/tmp',{withFileTypes:true}))if(d.isDirectory()&&d.name.startsWith('yasoya-off-evidence-'))metadataFiles.push(path.join('/tmp',d.name,'evidence.json'));}
 for(const file of metadataFiles){try{const candidate=await json(file);if(candidate.account!==identity.account||candidate.worker!==identity.worker||candidate.versionId!==ROLLBACK)continue;candidate.assetConfig=routing.config;candidate.assetRoutingEvidence=routing;candidate.placementEvidence=placement;
   if(!same(comparable(profileFromEvidence(v,candidate,assets).config),comparable(c))){if(file===metadataFiles[0])stop('OFF_CONFIG_METADATA_MISMATCH');continue;}e=candidate;break;
  }catch(err){if(file===metadataFiles[0]&&err.code!=='ENOENT')throw err;}}
 phase='asset_manifest';const assembly=await json(path.join(root,'release/assembly.json')),tree=await inventory(assets);
 if(assembly.mode!=='OFF'||!same(assembly.changedAssets,['js/checkout-v1.js'])||!same(Object.keys(tree).sort(),Object.keys(assembly.assetSha256).sort()))stop('ASSET_MANIFEST_MISMATCH');
 for(const [file,digest]of Object.entries(tree)){
  const expected=file==='js/checkout-v1.js'?hash((await exec('git',['show',SOURCE_SHA+':js/checkout-v1.js'],{cwd:repository,maxBuffer:8*1024*1024})).stdout):assembly.assetSha256[file];
  if(digest!==expected)stop('ASSET_BYTES_CHANGED');
 }
 phase='private_output';if(output&&(path.resolve(output)===path.resolve(root)||path.resolve(output).startsWith(path.resolve(root)+path.sep)||path.resolve(root).startsWith(path.resolve(output)+path.sep)))stop('OUTPUT_OVERLAPS_INPUT');
 if(output){try{await lstat(output);stop('OUTPUT_EXISTS');}catch(e){if(e.code!=='ENOENT')throw e;}await privateDir(output);}else{await privateDir(cache);output=await mkdtemp(path.join(cache,'prebuilt-off-'));await chmod(output,0o700);}
 await privateDir(path.join(output,'runtime'));phase='authentication_read';const connection=deps.get?{get:deps.get}:await reader(path.join(output,'runtime'));
 if(!e){
  phase='namespace_metadata';const namespace=await connection.get(`/accounts/${identity.account}/workers/durable_objects/namespaces/${identity.namespace}`);
  if(!receipt.databaseEvidence)stop('RECORDED_DATABASE_EVIDENCE_REQUIRED');
  e={account:identity.account,worker:identity.worker,versionId:ROLLBACK,database:{uuid:identity.database,name:'yasoya-orders'},databaseEvidence:receipt.databaseEvidence,namespace,
   metadataFailures:receipt.databaseEvidence.failedRead?[receipt.databaseEvidence.failedRead]:[],assetConfig:routing.config,assetRoutingEvidence:routing,placementEvidence:placement,
   localEvidenceReconstruction:{databaseNameSource:'production/confirmed-production-resources.json: user Dashboard identity confirmation plus exact Version binding',namespaceSource:'Cloudflare namespace metadata GET',scope:'current settings/routes fetched next; D1 API not retested'}};
 }
 const observed=await liveMatches(connection.get,v,e,c),rollback=observed.rollback;e=observed.evidence;
 phase='freeze_artifacts';await copyPrivate(path.dirname(bundle),path.join(output,'bundle'));await copyPrivate(assets,path.join(output,'site'));
 const frozen=structuredClone(c);frozen.main=path.join(output,'bundle/storefront-worker.js');frozen.assets.directory=path.join(output,'site');frozen.no_bundle=true;frozen.find_additional_modules=false;
 await save(path.join(output,'off.deploy.jsonc'),frozen);await save(path.join(output,'version.json'),v);await save(path.join(output,'metadata.json'),e);await save(path.join(output,'original-off.json'),c);await save(path.join(output,'rollback.json'),rollback);
 await privateDir(path.join(output,'tools/production'));for(const name of TOOL_FILES){await cp(path.join(here,name),path.join(output,'tools/production',name),{force:false,errorOnExist:true});await chmod(path.join(output,'tools/production',name),0o600);}
 if(!same(await inventory(path.join(output,'site')),tree)||!same(await inventory(assets),tree)||!same(await inventory(path.join(output,'bundle')),originalBundle)||!same(await inventory(path.dirname(bundle)),originalBundle)||hash(await readFile(input))!==inputHash)stop('COPY_CHANGED');
 phase='freeze_manifest';const files=await inventory(output,'',true);const manifest={schema:1,worker:identity.worker,source,rollbackVersion:ROLLBACK,createdAt:new Date().toISOString(),bundleSha256:originalBundle['storefront-worker.js'],secretNames:receipt.secretNames,files};await save(path.join(output,'manifest.json'),manifest);
 const manifestSha256=hash(await readFile(path.join(output,'manifest.json')));
 const runner=path.join(output,'tools/production/prepare-prebuilt-off-release.mjs');
 return {status:'PREPARED_NOT_DEPLOYED',releaseSha:SOURCE_SHA,bundleSha256:manifest.bundleSha256,config:path.join(output,'off.deploy.jsonc'),assets:path.join(output,'site'),current:rollback,manifest:path.join(output,'manifest.json'),manifestSha256,deployCommand:`node ${quote(runner)} --deploy ${quote(path.join(output,'manifest.json'))} --manifest-sha ${manifestSha256} --approved`,rollbackCommand:`npx wrangler@4.155.0 rollback ${ROLLBACK} --name ${identity.worker} --config ${quote(path.join(output,'off.deploy.jsonc'))} --message 'OFF release rollback' --yes`};
}
export async function deployPrepared(manifestFile,approved,deps={}){
 phase='approval_and_manifest';if(!approved)stop('EXPLICIT_APPROVAL_REQUIRED');if(!/^[a-f0-9]{64}$/.test(deps.expectedManifestHash||'')||hash(await readFile(manifestFile))!==deps.expectedManifestHash)stop('MANIFEST_HASH_MISMATCH');const directory=path.dirname(await realpath(manifestFile)),m=await json(manifestFile);
 if(m.schema!==1||m.worker!==identity.worker||m.source?.sha!==SOURCE_SHA||m.rollbackVersion!==ROLLBACK)stop('MANIFEST_IDENTITY_MISMATCH');
 // runtime/ holds only the pre-created /dev/null log sink; never payload files.
 const verifyPayload=async()=>{for(const [file,digest]of Object.entries(m.files)){if(file.startsWith('/')||file.split('/').includes('..'))stop('MANIFEST_PATH_UNSAFE');await regular(path.join(directory,file));if(hash(await readFile(path.join(directory,file)))!==digest)stop('FROZEN_ARTIFACT_CHANGED');}for(const d of ['site','bundle','tools']){const files=await inventory(path.join(directory,d));const expected=Object.fromEntries(Object.entries(m.files).filter(([f])=>f.startsWith(d+'/')).map(([f,h])=>[f.slice(d.length+1),h]));if(!same(files,expected))stop('FROZEN_ARTIFACT_CHANGED');}const found=await inventory(directory,'',true);for(const file of Object.keys(found))if(!Object.hasOwn(m.files,file)&&!['manifest.json','deploy-started.json','deployed.json'].includes(file))stop('UNEXPECTED_PACKET_FILE');for(const f of ['.env','.env.local','.dev.vars','.wrangler/deploy/config.json'])try{await lstat(path.join(directory,f));stop('UNEXPECTED_LOCAL_OVERRIDE');}catch(e){if(e.code!=='ENOENT')throw e;}};
 phase='frozen_artifacts';await verifyPayload();try{await lstat(path.join(directory,'deploy-started.json'));stop('PREVIOUS_DEPLOY_REQUIRES_REVIEW');}catch(e){if(e.code!=='ENOENT')throw e;}
 const v=validatedVersion(await json(path.join(directory,'version.json')),inspectVersion),e=await json(path.join(directory,'metadata.json')),original=await checkProfile(path.join(directory,'original-off.json'),'off'),c=await json(path.join(directory,'off.deploy.jsonc'));assertProfile(c);
 const expected={...original,main:path.join(directory,'bundle/storefront-worker.js'),assets:{...original.assets,directory:path.join(directory,'site')},no_bundle:true,find_additional_modules:false};if(!same(expected,c))stop('DEPLOY_CONFIG_CHANGED');
 phase='authentication_read';const connection=deps.get?{get:deps.get,env:process.env}:await reader(path.join(directory,'runtime')),observed=await liveMatches(connection.get,v,e,original),rollback=observed.rollback;await verifyPayload();
 // Save the last read-only check and an exclusive one-shot marker before upload.
 phase='publication';await save(path.join(directory,'deploy-started.json'),{worker:identity.worker,rollback,startedAt:new Date().toISOString()});
 try{await (deps.run??exec)('npx',['--yes','wrangler@4.155.0','deploy','--config',path.join(directory,'off.deploy.jsonc'),'--name',identity.worker,'--no-bundle'],{cwd:directory,env:connection.env,encoding:'utf8',timeout:180000,maxBuffer:8*1024*1024});}catch{stop('DEPLOY_RESULT_REQUIRES_READONLY_REVIEW');}
 // Never auto-repeat a publication whose follow-up observation is unavailable.
 phase='publication_readback';const result=await connection.get(`/accounts/${identity.account}/workers/scripts/${identity.worker}/deployments?page=1&per_page=1`),active=result?.deployments?.[0]?.versions;if(active?.length!==1||active[0].percentage!==100||active[0].version_id===ROLLBACK)stop('DEPLOY_RESULT_REQUIRES_READONLY_REVIEW');
 const done={status:'OFF_DEPLOYED',worker:identity.worker,versionId:active[0].version_id,percentage:100,requestedCheckoutEnabled:false,rollbackVersion:ROLLBACK};await save(path.join(directory,'deployed.json'),done);return done;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 try{let result;const args=process.argv.slice(2);if(args[0]==='--deploy'&&args.length===5&&args[2]==='--manifest-sha'&&args[4]==='--approved')result=await deployPrepared(args[1],true,{expectedManifestHash:args[3]});else if(args[0]==='--prepare'&&args.length===1)result=await preparePrebuilt({});else stop('USAGE_PREPARE_OR_EXPLICIT_APPROVED_DEPLOY');console.log(JSON.stringify(result,null,2));}
 catch(e){console.error(JSON.stringify({status:'STOP',stage:phase,...(['ENOENT','EACCES','EPERM','ENOSPC'].includes(e.code)?{errno:e.code}:{}),code:/^[A-Z_]+$/.test(e.message)?e.message:'LOCAL_PREPARATION_FAILED',...(Number.isInteger(e.http)?{http:e.http}:{}),...(Array.isArray(e.codes)?{cloudflareCodes:e.codes.filter(Number.isInteger)}:{})}));process.exitCode=1;}
}
