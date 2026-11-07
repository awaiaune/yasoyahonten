import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm,readdir,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {safeReleaseDiagnostic,runOffDryRun} from '../production/release-diagnostics.mjs';
import {prepareFromVersion} from '../production/prepare-off-from-version.mjs';
import {validateResumeRuntime} from '../production/diagnose-off-release.mjs';
export function syntheticOffProfile(){return {name:'yasoya-honten-payments',keep_vars:true,main:new URL('../production/storefront-worker.js',import.meta.url).pathname,compatibility_date:'2026-08-04',assets:{directory:new URL('../production/.generated/v53/',import.meta.url).pathname,binding:'ASSETS',run_worker_first:true},routes:[{pattern:'yasoyahonten.awaiaune.com',custom_domain:true}],d1_databases:[{binding:'ORDERS_DB',database_name:'yasoya-orders',database_id:'442fa9fd-25d3-4c01-bcc3-04be7b420cf5'}],durable_objects:{bindings:[{name:'PURCHASE_COORDINATOR',class_name:'PurchaseCoordinator'}]},r2_buckets:[{binding:'PRODUCT_IMAGES',bucket_name:'yasoya-honten-product-images'}],migrations:[],vars:{RUNTIME_TIER:'production',SQUARE_ENVIRONMENT:'production',SQUARE_LOCATION_ID:'LQ693S4H2NBZ8',PRODUCTION_WORKER_NAME:'yasoya-honten-payments',PRODUCTION_PURCHASE_PROTOCOL:'durable-v1',SITE_URL:'https://yasoyahonten.awaiaune.com',MANAGEMENT_ENABLED:'1',PRODUCTION_MANAGEMENT_SCHEMA_READY:'1',PRODUCTION_MANAGEMENT_READ_ENABLED:'1',PRODUCTION_STOREFRONT_ENABLED:'1',PRODUCTION_UNIFIED_PUBLISH_ENABLED:'0',PRODUCTION_STOREFRONT_PUBLISH_ENABLED:'1',PRODUCTION_INVENTORY_WRITER_APPROVAL:'shared-purchase-do-single-writer-v1',PRODUCTION_MANAGEMENT_CATALOG_ENABLED:'0',PRODUCTION_MANAGEMENT_INVENTORY_ENABLED:'1',STOREFRONT_RETIRE_GOLDENROD:'1',PRODUCTION_CHECKOUT_ENABLED:'0',PRODUCTION_MANAGED_CHECKOUT_ENABLED:'0'}};}
async function fixture(t){const dir=await mkdtemp(path.join(tmpdir(),'yasoya-diagnostics-test-'));t.after(()=>rm(dir,{recursive:true,force:true}));const profile=path.join(dir,'off.local.jsonc');await writeFile(profile,JSON.stringify(syntheticOffProfile()));return {dir,profile};}
test('failure summary retains stage and safe code, never arbitrary error/stack/header/token/card content',()=>{
 const e=Object.assign(Error('PRIVATE_SECRET_SENTINEL'),{stderr:'Authorization: Bearer PRIVATE_SECRET_SENTINEL\nCould not resolve offline-module',stdout:'PRIVATE_CUSTOMER_SENTINEL',code:1});
 const d=safeReleaseDiagnostic('wrangler_dry_run',e);assert.equal(d.exitCode,1);assert.deepEqual(d.rules,['BUNDLE_DEPENDENCY_MISSING']);const s=JSON.stringify(d);assert(!s.includes('PRIVATE'));assert(!s.includes('Bearer'));assert(!s.includes('stack'));
 assert.equal(safeReleaseDiagnostic('asset_assembly',Error('LIVE_ASSET_MISMATCH:checkout.html')).code,'LIVE_ASSET_MISMATCH');
});
test('JSON and filesystem failures are distinct and do not echo input values or paths',()=>{
 assert.equal(safeReleaseDiagnostic('version_json_read',new SyntaxError('PRIVATE_INPUT')).code,'INVALID_JSON');
 const d=safeReleaseDiagnostic('version_json_read',Object.assign(Error('PRIVATE_PATH'),{code:'ENOENT'}));assert.equal(d.errno,'ENOENT');assert(!JSON.stringify(d).includes('PRIVATE'));
});
test('npm cache ENOENT, Node version and subprocess timeout have separate safe signatures',()=>{
 assert.deepEqual(safeReleaseDiagnostic('wrangler_dry_run',{stderr:'npm error code ENOENT',code:1}).rules,['NPM_LOCAL_PATH_MISSING']);
 assert.deepEqual(safeReleaseDiagnostic('wrangler_dry_run',{stderr:'requires at least Node 20',code:1}).rules,['NODE_VERSION_UNSUPPORTED']);
 assert(safeReleaseDiagnostic('wrangler_dry_run',{killed:true,signal:'SIGTERM'}).rules.includes('SUBPROCESS_TIMEOUT'));
});
test('successful dry-run logs status only and always supplies --dry-run to pinned Wrangler',async t=>{
 const f=await fixture(t),calls=[],before=await readFile(f.profile);
 await runOffDryRun(f.profile,path.join(f.dir,'build'),{run:async(cmd,args)=>{calls.push({cmd,args});return {stdout:'PRIVATE_OUTPUT',stderr:'PRIVATE_OUTPUT'};}});
 assert.equal(calls.length,1);assert.equal(calls[0].cmd,'npx');assert(calls[0].args.includes('wrangler@4.155.0'));assert(calls[0].args.includes('--dry-run'));assert(!calls[0].args.includes('--remote'));
 const s=await readFile(path.join(f.dir,'build/diagnostic.json'),'utf8');assert(!s.includes('PRIVATE'));assert.equal(JSON.parse(s).exitCode,0);assert.deepEqual(await readFile(f.profile),before);
});
test('exit 1 is preserved and classified; failed command never becomes success or a raw output log',async t=>{
 const f=await fixture(t),out=path.join(f.dir,'build');let err;
 try{await runOffDryRun(f.profile,out,{run:async()=>{throw Object.assign(Error('PRIVATE_PROCESS_MESSAGE'),{code:1,stderr:'Could not resolve offline-module\nPRIVATE_TOKEN',stdout:'PRIVATE_CARD'});}});}catch(e){err=e;}
 assert.equal(err.message,'WRANGLER_DRY_RUN_FAILED');assert.equal(err.diagnostic.exitCode,1);assert.deepEqual(err.diagnostic.rules,['BUNDLE_DEPENDENCY_MISSING']);assert.equal(err.directory,out);
 const s=await readFile(path.join(out,'diagnostic.json'),'utf8');assert(!s.includes('PRIVATE'));assert(!JSON.parse(s).status);assert.deepEqual(await readdir(out),['diagnostic.json']);
});
for(const [label,mutate]of [['checkout ON',c=>{c.vars.PRODUCTION_CHECKOUT_ENABLED='1';}],['managed checkout ON',c=>{c.vars.PRODUCTION_MANAGED_CHECKOUT_ENABLED='1';}],['Catalog ON',c=>{c.vars.PRODUCTION_MANAGEMENT_CATALOG_ENABLED='1';}],['build hook',c=>{c.build={command:'unapproved'};}],['inline credential',c=>{c.vars.SQUARE_ACCESS_TOKEN='PRIVATE_TOKEN';}]])test('resume safety blocks '+label+' before subprocess',async t=>{
 const f=await fixture(t),c=syntheticOffProfile();mutate(c);await writeFile(f.profile,JSON.stringify(c));let called=false;
 await assert.rejects(()=>runOffDryRun(f.profile,path.join(f.dir,'build'),{run:()=>{called=true;}}));assert.equal(called,false);
});
test('preparer attaches exact missing-file phase without reaching auth, metadata, asset copy or Wrangler',async t=>{
 const f=await fixture(t),stages=[];await assert.rejects(()=>prepareFromVersion({versionFile:path.join(f.dir,'not-there.json'),collect:true,dryRun:true},{onStage:s=>stages.push(s),get:()=>{throw Error('MUST_NOT_CALL');},run:()=>{throw Error('MUST_NOT_CALL');}}),err=>err.diagnostic.stage==='version_json_read'&&err.diagnostic.errno==='ENOENT');assert.deepEqual(stages,['version_json_read']);
});
test('resume checks an unchanged runtime using only local Git reads',async()=>{
 const calls=[],git=async args=>{calls.push(args);if(args.includes('--show-toplevel'))return '/offline/source';if(args.includes('HEAD'))return 'a'.repeat(40);return '';};
 await validateResumeRuntime({main:'/offline/source/production/storefront-worker.js'},'b'.repeat(40),'/offline/current',git);
 assert(calls.some(x=>x[0]==='diff'));assert(calls.every(x=>['rev-parse','status','diff'].includes(x[0])));
});
for(const mode of ['dirty','runtime-diff','unexpected-main'])test('resume refuses '+mode+' without rewriting any worktree/profile',async()=>{
 const git=async args=>args.includes('--show-toplevel')?'/offline/source':args[0]==='status'?(mode==='dirty'?' M worker/src/index.js':''):args[0]==='diff'?(mode==='runtime-diff'?'worker/src/index.js':''):'a'.repeat(40);
 await assert.rejects(()=>validateResumeRuntime({main:'/offline/source/production/'+(mode==='unexpected-main'?'another.js':'storefront-worker.js')},'b'.repeat(40),'/offline/current',git),/RESUME_SOURCE_UNVERIFIED|RESUME_RUNTIME_DIFFERS/);
});
test('asset assembly failure retains the private OFF input and safe stage diagnostic for reuse',async t=>{
 const f=await fixture(t),c=syntheticOffProfile(),versionId='36ab2dba-dd44-4f39-bc69-6db729bd24d5',account='fcf37e462257810df77e8fbc0e7f4317';
 const v={id:versionId,resources:{script_runtime:{compatibility_date:c.compatibility_date},bindings:[...Object.entries(c.vars).map(([name,text])=>({name,text,type:'plain_text'})),...['ADMIN_TOKEN','SQUARE_ACCESS_TOKEN','RESEND_API_KEY'].map(name=>({type:'secret_text',name})),{name:'ORDERS_DB',type:'d1',id:c.d1_databases[0].database_id},{name:'PURCHASE_COORDINATOR',type:'durable_object_namespace',class_name:'PurchaseCoordinator'},{name:'PRODUCT_IMAGES',type:'r2_bucket',bucket_name:'yasoya-honten-product-images'},{name:'ASSETS',type:'assets'}]}};
 const e={account,worker:c.name,versionId,activeVersionId:versionId,traffic:100,routes:[],domains:[{hostname:'yasoyahonten.awaiaune.com',service:c.name,zone_id:'a'.repeat(32)}],subdomain:{enabled:true,previews_enabled:false},database:{uuid:c.d1_databases[0].database_id,name:'yasoya-orders'},namespace:{id:'6802cc5abc6d440285ec19c9e7c82103',class:'PurchaseCoordinator',script:c.name,use_sqlite:true},schedules:[],assetConfig:{run_worker_first:true}};
 const versionFile=path.join(f.dir,'version.json'),evidenceFile=path.join(f.dir,'metadata.json'),assets=path.join(f.dir,'incomplete-assets'),output=path.join(f.dir,'release');await mkdir(assets);await writeFile(versionFile,JSON.stringify(v));await writeFile(evidenceFile,JSON.stringify(e));
 await assert.rejects(()=>prepareFromVersion({versionFile,evidenceFile,assets,output,dryRun:true}),err=>err.diagnostic.stage==='asset_assembly'&&err.diagnostic.code==='LIVE_ASSET_MISMATCH');
 assert.equal(JSON.parse(await readFile(path.join(output,'failure.json'),'utf8')).stage,'asset_assembly');assert.equal(JSON.parse(await readFile(path.join(output,'recovered-off.local.jsonc'),'utf8')).vars.PRODUCTION_CHECKOUT_ENABLED,'0');
});
