// Offline-only assembly from the *current* operational assets. No remote reads,
// deployments, build hooks, ON-profile generation or credential copying.
import {readFile,writeFile,mkdir,readdir,lstat,realpath,cp,rm} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {checkProfile} from './prepare-checkout-v58.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const stop=code=>{throw Error(code);};
const within=(a,b)=>b===a||b.startsWith(a+path.sep);
async function files(dir,prefix=''){
 const result=[];
 for(const e of await readdir(dir,{withFileTypes:true})){
  const rel=prefix+e.name,full=path.join(dir,e.name);
  if(e.isSymbolicLink()||(!e.isDirectory()&&!e.isFile()))stop('ASSET_LINK_OR_SPECIAL_FILE');
  if(e.isDirectory())result.push(...await files(full,rel+'/'));else result.push(rel);
 }
 return result.sort();
}
export async function assembleOff(input,output){
 const profilePath=await realpath(input),config=await checkProfile(input,'off');
 if(config.vars.PRODUCTION_MANAGED_CHECKOUT_ENABLED!=='0')stop('MANAGED_CHECKOUT_OFF_REQUIRED');
 // Secret bindings stay remote. Never serialize inline credentials/defines or
 // alternate environment profiles into a new file.
 if(['env','define','secrets','unsafe'].some(k=>Object.hasOwn(config,k))||Object.keys(config.vars).some(k=>/(TOKEN|SECRET|PASSWORD|API_KEY|PRIVATE_KEY)/i.test(k)))stop('INLINE_CREDENTIAL_OR_ALTERNATE_PROFILE');
 const base=path.dirname(profilePath),source=await realpath(path.resolve(base,config.assets.directory));
 if(!(await lstat(source)).isDirectory())stop('EXISTING_ASSETS_REQUIRED');
 const target=path.join(await realpath(path.dirname(path.resolve(output))),path.basename(output));
 if(within(source,target)||within(target,source)||within(target,profilePath))stop('OUTPUT_OVERLAPS_EXISTING_INPUT');
 try{await lstat(target);stop('OUTPUT_EXISTS');}catch(e){if(e.code!=='ENOENT')throw e;}
 const manifest=JSON.parse(await readFile(path.join(here,'live-design-manifest.json'),'utf8'));
 const originalFiles=await files(source);
 for(const [rel,expected]of Object.entries({...manifest.exactLiveFiles,'index.html':manifest.homepageTemplateSha256})){
  if(!originalFiles.includes(rel)||hash(await readFile(path.join(source,rel)))!==expected)stop('LIVE_ASSET_MISMATCH:'+rel);
 }
 const stub=await readFile(path.join(source,'js/store-config.js'),'utf8');
 if(stub!=='throw new Error("Production runtime configuration must be served by the Worker");')stop('DYNAMIC_STORE_CONFIG_STUB_REQUIRED');
 // Check local page resources without fetching the site or trusting an
 // incomplete 20-file snapshot as the entire asset directory.
 for(const page of ['index.html','checkout.html','thanks.html']){
  const html=await readFile(path.join(source,page),'utf8');
  for(const m of html.matchAll(/(?:src|href)=["']([^"']+\.(?:css|js)(?:\?[^"']*)?)["']/g)){
   if(/^(?:https?:)?\/\//.test(m[1]))continue;
   const rel=m[1].split('?')[0].replace(/^\//,'');
   if(!originalFiles.includes(rel))stop('CURRENT_PAGE_RESOURCE_MISSING:'+rel);
  }
 }
 const originalHashes=new Map(await Promise.all(originalFiles.map(async rel=>[rel,hash(await readFile(path.join(source,rel)))])));
 const next=structuredClone(config);
 next.main=path.join(here,'storefront-worker.js');next.assets.directory=path.join(target,'site');
 // Rebase relative local paths; do not change remote bindings or migrations.
 for(const b of next.d1_databases||[])if(b.migrations_dir)b.migrations_dir=path.resolve(base,b.migrations_dir);
 for(const key of ['tsconfig'])if(next[key])next[key]=path.resolve(base,next[key]);
 if(next.build?.command)stop('CUSTOM_BUILD_HOOK_REQUIRES_REVIEW');
 await mkdir(target,{mode:0o700});
 try{
  await cp(source,next.assets.directory,{recursive:true,errorOnExist:true,force:false});
  await writeFile(path.join(next.assets.directory,'js/checkout-v1.js'),await readFile(path.join(here,'../js/checkout-v1.js')));
  for(const rel of originalFiles){
   if(rel==='js/checkout-v1.js')continue;
   if(hash(await readFile(path.join(next.assets.directory,rel)))!==originalHashes.get(rel))stop('COPIED_ASSET_CHANGED');
  }
  // Also ensure the inputs did not change while assembling.
  for(const rel of originalFiles)if(hash(await readFile(path.join(source,rel)))!==originalHashes.get(rel))stop('SOURCE_ASSETS_CHANGED_DURING_COPY');
  await writeFile(path.join(target,'off.local.jsonc'),JSON.stringify(next,null,2)+'\n',{flag:'wx',mode:0o600});
  await writeFile(path.join(target,'assembly.json'),JSON.stringify({mode:'OFF',changedAssets:['js/checkout-v1.js'],preservedAssets:originalFiles.length-1,assetSha256:Object.fromEntries(originalHashes)},null,2)+'\n',{flag:'wx',mode:0o600});
 }catch(e){await rm(target,{recursive:true,force:true});throw e;}
 return {preservedAssets:originalFiles.length-1,changedAssets:['js/checkout-v1.js']};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 try{
  if(process.argv.length!==4)stop('USAGE_EXISTING_OFF_PROFILE_AND_NEW_OUTPUT_REQUIRED');
  const r=await assembleOff(process.argv[2],process.argv[3]);
  console.log('OFF assembly verified: '+r.preservedAssets+' assets preserved; only js/checkout-v1.js replaced. No deployment.');
 }catch(e){const safe=/^(?:LIVE_ASSET_MISMATCH|CURRENT_PAGE_RESOURCE_MISSING):[a-zA-Z0-9/._-]+$|^[A-Z_]+$/;console.error('STOP: '+(safe.test(e.message)?e.message:'LOCAL_ASSEMBLY_FAILED'));process.exitCode=1;}
}
