// Metadata-only filesystem tests. Shared-root UID cases are simulated without
// sudo/chown or changing /tmp. The real private-directory test uses owned files.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,symlink,rm,stat,chmod} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {validateDiscoveryRoot,discoverReleaseRoots} from '../production/recover-off-release.mjs';
const uid=process.getuid?.()??1000;
const info=(owner,mode,{directory=true,link=false}={})=>({uid:owner,mode,isDirectory:()=>directory,isSymbolicLink:()=>link});
const privateInfo=()=>info(uid,0o700),sharedInfo=()=>info(0,0o1777);
function simulated(candidates,root=sharedInfo()){
 const entries=new Map(candidates.map(([name,s])=>['/tmp/'+name,s]));
 return {lstat:async p=>{if(p==='/tmp')return root;if(entries.has(p))return entries.get(p);throw Object.assign(Error('missing'),{code:'ENOENT'});},readdir:async()=>candidates.map(([name])=>({name}))};
}
test('root-owned 1777 sticky shared /tmp is readable by a different UID',()=>{assert.equal(validateDiscoveryRoot(sharedInfo(),{shared:true,uid:1000}).uid,0);});
test('shared root requires expected owner, sticky bit and safe exact permissions',()=>{
 for(const s of [info(0,0o777),info(0,0o1770),info(0,0o3777),info(42,0o1777)])assert.throws(()=>validateDiscoveryRoot(s,{shared:true,uid:1000}),/RECOVERY_SHARED_ROOT_UNSAFE/);
});
test('shared root cannot be a symlink or a regular file',()=>{
 for(const s of [info(0,0o1777,{link:true}),info(0,0o1777,{directory:false})])assert.throws(()=>validateDiscoveryRoot(s,{shared:true,uid:1000}),/RECOVERY_SHARED_ROOT_UNSAFE/);
});
test('private discovery roots retain current-owner 0700 requirements',()=>{
 assert.equal(validateDiscoveryRoot(privateInfo()).uid,uid);
 for(const s of [info(uid+10,0o700),info(uid,0o755),info(uid,0o770),info(uid,0o700,{link:true})])assert.throws(()=>validateDiscoveryRoot(s),/RECOVERY_PRIVATE_ROOT_UNSAFE/);
});
test('shared root ownership is separate from current-user candidate ownership',async()=>{
 const root=await discoverReleaseRoots('/missing-cache','/tmp',simulated([['yasoya-off-from-version-owned',privateInfo()]]));assert.deepEqual(root.roots,['/tmp/yasoya-off-from-version-owned']);
});
test('other-user candidates are excluded instead of adopted',async()=>{
 const root=await discoverReleaseRoots('/missing-cache','/tmp',simulated([['yasoya-off-from-version-other',info(uid+10,0o700)]]));assert.deepEqual(root,{roots:[],packets:[]});
});
test('symlink, writable and non-directory candidates are excluded',async()=>{
 const root=await discoverReleaseRoots('/missing-cache','/tmp',simulated([['yasoya-off-from-version-link',info(uid,0o700,{link:true})],['yasoya-off-from-version-writable',info(uid,0o770)],['yasoya-off-from-version-file',info(uid,0o600,{directory:false})],['unrelated',privateInfo()]]));assert.deepEqual(root,{roots:[],packets:[]});
});
test('disappearing candidates do not abort remaining discovery',async()=>{
 const io=simulated([['yasoya-off-from-version-good',privateInfo()]]),read=io.readdir;io.readdir=async()=>[{name:'yasoya-off-from-version-disappeared'},...await read()];assert.deepEqual((await discoverReleaseRoots('/missing-cache','/tmp',io)).roots,['/tmp/yasoya-off-from-version-good']);
});
test('missing discovery directories return no candidate without creating anything',async t=>{
 const dir=await mkdtemp(path.join(tmpdir(),'yasoya-discovery-'));t.after(()=>rm(dir,{recursive:true,force:true}));assert.deepEqual(await discoverReleaseRoots(path.join(dir,'missing-cache'),path.join(dir,'missing-tmp')),{roots:[],packets:[]});
});
test('real owned private storage preserves permissions and rejects links/files',async t=>{
 const dir=await mkdtemp(path.join(tmpdir(),'yasoya-discovery-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const cache=path.join(dir,'private'),temp=path.join(dir,'temporary');await mkdir(cache,{mode:0o700});await mkdir(temp,{mode:0o700});await mkdir(path.join(cache,'builds'),{mode:0o700});
 const packet=path.join(cache,'prebuilt-off-owned'),build=path.join(cache,'builds','release-build-owned'),artifact=path.join(temp,'yasoya-off-from-version-owned');for(const p of [packet,build,artifact])await mkdir(p,{mode:0o700});
 const record=path.join(packet,'record.json');await writeFile(record,'{}',{mode:0o600});await symlink(artifact,path.join(temp,'yasoya-off-from-version-link'));await writeFile(path.join(temp,'yasoya-off-from-version-file'),'x');await mkdir(path.join(temp,'yasoya-off-from-version-writable'),{mode:0o700});await chmod(path.join(temp,'yasoya-off-from-version-writable'),0o770);
 const actual=await discoverReleaseRoots(cache,temp);assert.deepEqual(actual,{roots:[artifact,build],packets:[packet]});assert.equal((await stat(cache)).mode&0o777,0o700);assert.equal((await stat(record)).mode&0o777,0o600);
});
