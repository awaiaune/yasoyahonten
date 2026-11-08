import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,rm,rename} from 'node:fs/promises';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {parseWorktrees,selectSourceWorktree,worktreeFailure} from '../production/diagnose-off-release.mjs';
import {validatedVersion,EXPECTED_VERSION} from '../production/recover-live-version.mjs';
import {safeReleaseDiagnostic} from '../production/release-diagnostics.mjs';
const exec=promisify(execFile),sha='a'.repeat(40),other='b'.repeat(40);
const listing=(...rows)=>rows.map(([dir,head=sha,extra=''])=>`worktree ${dir}\0HEAD ${head}\0${extra||'detached'}\0\0`).join('');
function fake(options={}){
 const calls=[],stages=[];
 const deps={onStage:s=>stages.push(s),makeTemp:async()=>{if(options.tempError)throw options.tempError;return '/isolated';},stat:async file=>{if(options.missing===file)throw Object.assign(Error('PRIVATE_PATH'),{code:'ENOENT'});return {isDirectory:()=>!file.includes('/production/'),isFile:()=>file.includes('/production/'),isSymbolicLink:()=>false};},readable:async file=>{if(options.unreadable&&file.startsWith(options.unreadable+'/'))throw Object.assign(Error('PRIVATE_PATH'),{code:'EACCES'});},readGit:async(args,cwd)=>{
  calls.push({args,cwd});
  if(args[0]==='worktree'&&args[1]==='list'){if(options.listError)throw options.listError;return options.list??listing(['/old']);}
  if(args[0]==='worktree'&&args[1]==='add'){if(options.addError)throw options.addError;return '';}
  if(args[0]==='rev-parse')return options.headSequences?.[cwd]?.length?options.headSequences[cwd].shift():options.heads?.[cwd]??sha;
  if(args[0]==='status'){if(options.statusErrors?.[cwd])throw options.statusErrors[cwd];return options.status?.[cwd]??'';}
  throw Error('UNEXPECTED_MUTATION');
 }};return {deps,calls,stages};
}
test('NUL porcelain parsing preserves spaces/newlines and detects protected/prunable records',()=>{
 const entries=parseWorktrees(listing(['/space and\nnewline'],['/locked',sha,'locked reason'],['/gone',sha,'prunable path missing']));assert.equal(entries[0].path,'/space and\nnewline');assert.equal(entries[1].blocked,true);assert.equal(entries[2].blocked,true);
});
test('normal existing worktree is verified twice and reused without add/reset/checkout',async()=>{
 const f=fake(),r=await selectSourceWorktree(sha,f.deps);assert.equal(r.source,'/old');assert.equal(r.mode,'reused');assert.equal(f.calls.filter(c=>c.args[0]==='rev-parse').length,2);assert(f.calls.every(c=>['worktree','rev-parse','status'].includes(c.args[0])));assert(!f.calls.some(c=>c.args[1]==='add'));
});
test('missing matching worktree is skipped and a later same-SHA worktree is reused',async()=>{
 const f=fake({list:listing(['/missing'],['/good']),missing:'/missing'}),r=await selectSourceWorktree(sha,f.deps);assert.equal(r.source,'/good');assert.equal(r.skipped[0].errno,'ENOENT');assert(!f.calls.some(c=>c.args[1]==='add'));
});
test('unreadable/status-failing candidate does not prevent a fresh isolated worktree',async()=>{
 const f=fake({statusErrors:{'/old':Object.assign(Error('PRIVATE_GIT_MESSAGE'),{code:128})}}),r=await selectSourceWorktree(sha,f.deps);assert.equal(r.mode,'created');assert.equal(r.source,'/isolated/source');assert.equal(r.skipped[0].code,'WORKTREE_PROBE_FAILED');assert(f.calls.some(c=>c.args[1]==='add'&&c.args.includes('--detach')));
});
test('dirty tracked files remain untouched; a fresh source is created',async()=>{
 const f=fake({status:{'/old':' M worker/src/index.js'}}),r=await selectSourceWorktree(sha,f.deps);assert.equal(r.mode,'created');assert.equal(r.skipped[0].code,'WORKTREE_TRACKED_CHANGES');assert(!f.calls.some(c=>['reset','checkout','clean','prune','remove'].some(x=>c.args.includes(x))));
});
test('multiple same-SHA candidates select a safe clean candidate, not the first dirty one',async()=>{
 const f=fake({list:listing(['/dirty'],['/clean'],['/third']),status:{'/dirty':' M tracked'}}),r=await selectSourceWorktree(sha,f.deps);assert.equal(r.source,'/clean');assert(!f.calls.some(c=>c.cwd==='/third'));assert(!f.calls.some(c=>c.args[1]==='add'));
});
test('actual HEAD must match; a stale listed HEAD is insufficient',async()=>{
 const f=fake({heads:{'/old':other}}),r=await selectSourceWorktree(sha,f.deps);assert.equal(r.mode,'created');assert.equal(r.skipped[0].code,'WORKTREE_HEAD_MISMATCH');
});
test('HEAD changing during a probe invalidates reuse and causes safe isolation',async()=>{
 const f=fake({headSequences:{'/old':[sha,other]}}),r=await selectSourceWorktree(sha,f.deps);assert.equal(r.mode,'created');assert.equal(r.skipped[0].code,'WORKTREE_HEAD_MISMATCH');
});
test('unreadable release files cause fallback without modifying their permissions',async()=>{
 const f=fake({unreadable:'/old'}),r=await selectSourceWorktree(sha,f.deps);assert.equal(r.mode,'created');assert.equal(r.skipped[0].errno,'EACCES');
});
test('locked/prunable entries are not probed or pruned',async()=>{
 const f=fake({list:listing(['/locked',sha,'locked'],['/prunable',sha,'prunable missing'])}),r=await selectSourceWorktree(sha,f.deps);assert.equal(r.mode,'created');assert(!f.calls.some(c=>c.cwd==='/locked'||c.cwd==='/prunable'));
});
test('list failure is independent from creation; a newly created source still must validate',async()=>{
 const f=fake({listError:Object.assign(Error('PRIVATE_STDERR'),{code:129})}),r=await selectSourceWorktree(sha,f.deps);assert.equal(r.mode,'created');assert.equal(r.skipped[0].code,'SOURCE_WORKTREE_LIST_FAILED');assert(f.stages.includes('source_worktree_validate'));
});
test('temporary directory creation error has its own phase and errno, no add attempted',async()=>{
 const f=fake({list:'',tempError:Object.assign(Error('PRIVATE_DIRECTORY'),{code:'EACCES'})});await assert.rejects(()=>selectSourceWorktree(sha,f.deps),e=>e.diagnostic.stage==='source_worktree_create_directory'&&e.diagnostic.code==='SOURCE_WORKTREE_TEMP_CREATE_FAILED'&&e.diagnostic.errno==='EACCES');assert(!f.calls.some(c=>c.args[1]==='add'));
});
test('new worktree creation failure retains stage/exit/reason without raw stderr or paths',async()=>{
 const f=fake({list:'',addError:Object.assign(Error('PRIVATE_ERROR'),{code:128,stderr:'PRIVATE_TOKEN index.lock another git process'})});await assert.rejects(()=>selectSourceWorktree(sha,f.deps),e=>{assert.equal(e.diagnostic.stage,'source_worktree_create');assert.equal(e.diagnostic.code,'SOURCE_WORKTREE_CREATE_FAILED');assert.equal(e.diagnostic.reason,'GIT_LOCK_BUSY');assert.equal(e.diagnostic.exitCode,128);assert(!JSON.stringify(e.diagnostic).includes('PRIVATE'));return true;});
});
test('new worktree with wrong HEAD cannot be used or force-corrected',async()=>{
 const f=fake({list:'',heads:{'/isolated/source':other}});await assert.rejects(()=>selectSourceWorktree(sha,f.deps),e=>e.diagnostic.stage==='source_worktree_validate'&&e.diagnostic.reason==='WORKTREE_HEAD_MISMATCH');assert(!f.calls.some(c=>c.args.includes('--force')||c.args[0]==='checkout'));
});
test('new source status failure is distinct from an existing candidate skip',async()=>{
 const f=fake({list:'',statusErrors:{'/isolated/source':Object.assign(Error('PRIVATE_STATUS'),{code:'EACCES'})}});await assert.rejects(()=>selectSourceWorktree(sha,f.deps),e=>e.diagnostic.code==='SOURCE_WORKTREE_VALIDATION_FAILED'&&e.diagnostic.errno==='EACCES');
});
test('module loading errors are not conflated with worktree creation',()=>{
 const e=worktreeFailure('release_module_load','RELEASE_MODULE_LOAD_FAILED',Object.assign(Error('PRIVATE_MODULE'),{code:'ERR_MODULE_NOT_FOUND'}));assert.equal(e.diagnostic.stage,'release_module_load');assert.equal(e.diagnostic.moduleCode,'ERR_MODULE_NOT_FOUND');assert(!JSON.stringify(e.diagnostic).includes('PRIVATE'));
});
async function repoFixture(t){
 const dir=await mkdtemp(path.join(tmpdir(),'yasoya-worktree-test-')),repo=path.join(dir,'repo');t.after(()=>rm(dir,{recursive:true,force:true}));await exec('git',['init',repo]);const g=async(args,cwd=repo)=>(await exec('git',args,{cwd,encoding:'utf8'})).stdout.trim();await g(['config','user.name','Offline Test']);await g(['config','user.email','offline@example.invalid']);await g(['remote','add','origin','https://github.com/awaiaune/yasoyahonten.git']);await mkdir(path.join(repo,'production'));
 for(const name of ['placement-evidence.mjs','asset-routing-evidence.mjs','prepare-off-from-version.mjs','release-diagnostics.mjs','recover-live-version.mjs','prepare-checkout-v58.mjs','prepare-off-live-assets.mjs'])await writeFile(path.join(repo,'production',name),name==='release-diagnostics.mjs'?'export const safeReleaseDiagnostic=(stage,error)=>({stage,code:error.message});':'export {};');
 await writeFile(path.join(repo,'production/confirmed-production-resources.json'),'{}');await writeFile(path.join(repo,'tracked.txt'),'original');await g(['add','.']);await g(['commit','-m','offline fixture']);const target=await g(['rev-parse','HEAD']);return {dir,repo,g,target};
}
test('real Git creates a detached source while preserving existing changes and local settings',async t=>{
 const f=await repoFixture(t);await writeFile(path.join(f.repo,'tracked.txt'),'user changes');await writeFile(path.join(f.repo,'private.local.jsonc'),'USER_LOCAL_SENTINEL');const result=await selectSourceWorktree(f.target,{readGit:f.g,makeTemp:()=>mkdtemp(path.join(f.dir,'isolate-'))});assert.equal(result.mode,'created');assert.equal(await f.g(['rev-parse','HEAD']),f.target);assert.equal(await f.g(['rev-parse','HEAD'],result.source),f.target);assert.equal(await readFile(path.join(f.repo,'tracked.txt'),'utf8'),'user changes');assert.equal(await readFile(path.join(f.repo,'private.local.jsonc'),'utf8'),'USER_LOCAL_SENTINEL');assert.equal(await readFile(path.join(result.source,'tracked.txt'),'utf8'),'original');
});
test('real Git tolerates a vanished registered worktree without pruning it or deleting its moved files',async t=>{
 const f=await repoFixture(t),gone=path.join(f.dir,'gone'),moved=path.join(f.dir,'moved');await f.g(['worktree','add','--detach',gone,f.target]);await rename(gone,moved);await writeFile(path.join(f.repo,'tracked.txt'),'user changes');
 const result=await selectSourceWorktree(f.target,{readGit:f.g,makeTemp:()=>mkdtemp(path.join(f.dir,'isolate-'))});assert.equal(result.mode,'created');assert(result.skipped.some(x=>x.code==='WORKTREE_LOCKED_OR_PRUNABLE'||x.errno==='ENOENT'));assert((await f.g(['worktree','list','--porcelain','-z'])).includes(gone));assert.equal(await readFile(path.join(moved,'tracked.txt'),'utf8'),'original');assert.equal(await readFile(path.join(f.repo,'tracked.txt'),'utf8'),'user changes');
});
test('stdin launch reaches the next real cache guard after successful worktree preparation, without auth/network',async t=>{
 const f=await repoFixture(t);await writeFile(path.join(f.repo,'.git/FETCH_HEAD'),f.target+'\n');const script=await readFile(new URL('../production/diagnose-off-release.mjs',import.meta.url),'utf8');
 const child=spawn(process.execPath,['--input-type=module'],{cwd:f.repo,stdio:['pipe','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);const done=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve);});child.stdin.end(script);const code=await done;
 assert.equal(code,1);assert.equal(stdout,'');const result=JSON.parse(stderr.trim());assert.equal(result.stage,'version_cache_location');assert.equal(result.code,'VERSION_PERSISTENT_CACHE_UNAVAILABLE');
});
test('unsupported Version binding diagnostics show identifiers only, never names/values; no guessed support',()=>{
 const v={id:EXPECTED_VERSION,resources:{script_runtime:{compatibility_date:'2026-08-04'},bindings:[{type:'d1',name:'PRIVATE_BINDING_NAME',id:'id',internal_env:'PRIVATE_VALUE'}]}};
 let error;try{validatedVersion(v,()=>({vars:{RUNTIME_TIER:'production',SQUARE_ENVIRONMENT:'production',PRODUCTION_WORKER_NAME:'yasoya-honten-payments',SQUARE_LOCATION_ID:'LQ693S4H2NBZ8'}}));}catch(e){error=e;}
 const result=safeReleaseDiagnostic('version_validate',error);assert.equal(result.code,'VERSION_BINDING_FIELDS_UNSUPPORTED');assert.equal(result.bindingType,'d1');assert.deepEqual(result.unsupportedFields,['internal_env']);assert(!JSON.stringify(result).includes('PRIVATE'));
});
