// Synthetic metadata only. These tests neither authenticate nor call Cloudflare.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,lstat,mkdir,rm,symlink} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {normalizePlacement,placementFromEvidence,evidenceFromPlacementVersion,resolvePlacementEvidence,validatePlacementEvidence,prepareResumePlacement} from '../production/placement-evidence.mjs';
import {safeReleaseDiagnostic} from '../production/release-diagnostics.mjs';
const id='36ab2dba-dd44-4f39-bc69-6db729bd24d5',v={id},worker='yasoya-honten-payments';
const active=()=>({deployments:[{versions:[{version_id:id,percentage:100}]}]});
async function temp(t){const dir=await mkdtemp(path.join(tmpdir(),'yasoya-placement-'));t.after(()=>rm(dir,{recursive:true,force:true}));return dir;}
for(const raw of [undefined,{}])test('absence/empty means omit only with exact Version confirmation: '+JSON.stringify(raw),()=>{
 const p=evidenceFromPlacementVersion({id},v);assert.equal(placementFromEvidence(raw,p,v),undefined);
 if(raw)assert.throws(()=>placementFromEvidence(raw,undefined,v),/EVIDENCE_REQUIRED/);
 assert.throws(()=>placementFromEvidence(raw,evidenceFromPlacementVersion({id,placement:{mode:'smart'}},v),v),/EVIDENCE_CONFLICT/);
});
for(const [raw,expected]of [
 [{mode:'smart'},{mode:'smart'}],[{mode:'off'},{mode:'off'}],[{mode:'smart',hint:'aws:ap-northeast-1'},{mode:'smart',hint:'aws:ap-northeast-1'}],
 [{region:'aws:ap-northeast-1'},{mode:'targeted',region:'aws:ap-northeast-1'}],[{host:'example.com:443'},{mode:'targeted',host:'example.com:443'}],[{hostname:'example.com'},{mode:'targeted',hostname:'example.com'}],
 [{mode:'targeted',region:'aws:ap-northeast-1'},{mode:'targeted',region:'aws:ap-northeast-1'}],
 [{mode:'targeted',target:[{hostname:'example.com'}]},{mode:'targeted',hostname:'example.com'}]
])test('preserve explicit placement semantics: '+Object.keys(raw).join(','),()=>{
 const before=structuredClone(raw),proof=evidenceFromPlacementVersion({id,placement:raw},v);assert.deepEqual(placementFromEvidence(raw,proof,v),expected);assert.deepEqual(raw,before);
});
for(const raw of [null,[],{mode:null},{mode:'invented'},{hint:'aws:example'},{mode:'targeted'},{mode:'smart',region:'aws:example'},{region:'a',host:'b'},{mode:'off',hint:'aws:example'},{mode:'smart',unknown:'PRIVATE_VALUE'},{mode:'targeted',target:[]},{mode:'targeted',target:[{region:'a'},{host:'b'}]},{mode:'targeted',target:[{unknown:'PRIVATE_VALUE'}]},{hostname:''}])test('unknown/invalid/conflicting placement stops without value output: '+Object.keys(raw??{}).join(','),()=>{
 assert.throws(()=>normalizePlacement(raw),e=>{const safe=safeReleaseDiagnostic('placement_settings_read',e);assert(safe.code.startsWith('PLACEMENT_'));assert(!JSON.stringify(safe).includes('PRIVATE_VALUE'));return true;});
});
test('exact Version id, source and proof shape are mandatory',()=>{
 assert.throws(()=>evidenceFromPlacementVersion({id:'other',placement:{}},v),/VERSION_MISMATCH/);
 const p=evidenceFromPlacementVersion({id,placement:{}},v);for(const change of [{worker:'other'},{versionId:'other'},{source:{kind:'historical_config'}},{config:null,versionShape:'configured'},{config:undefined,versionShape:'configured'},{rawSecret:'PRIVATE_VALUE'}])assert.throws(()=>validatePlacementEvidence({...p,...change},v));
});
test('same-version private cache contains only placement proof and is reused without re-fetch',async t=>{
 const dir=await temp(t),calls=[],cacheDirectory=path.join(dir,'private');
 const first=await resolvePlacementEvidence(v,{cacheDirectory,get:async p=>{calls.push(p);return p.includes('/deployments?')?active():{id,placement:{},assets:{jwt:'PRIVATE_UPLOAD'},author_email:'PRIVATE_CUSTOMER'};}});
 assert.equal(calls.length,2);assert.equal(first.proof.versionShape,'empty');assert.equal((await lstat(cacheDirectory)).mode&511,448);assert.equal((await lstat(first.file)).mode&511,384);assert(!(await readFile(first.file,'utf8')).includes('PRIVATE'));
 const reused=await resolvePlacementEvidence(v,{cacheDirectory,get:async()=>assert.fail('unexpected refetch')});assert(reused.reused);assert.deepEqual(reused.proof,first.proof);
});
test('API failures and active-Version change do not create evidence or get treated as default placement',async t=>{
 const dir=await temp(t),cacheDirectory=path.join(dir,'private');
 await assert.rejects(()=>resolvePlacementEvidence(v,{cacheDirectory,get:async()=>{throw Object.assign(Error('METADATA_HTTP_ERROR'),{http:401,codes:[10000]});}}),e=>e.http===401&&e.codes[0]===10000);
 await assert.rejects(()=>resolvePlacementEvidence(v,{cacheDirectory,get:async p=>p.includes('/deployments?')?{deployments:[{versions:[{version_id:'other',percentage:100}]}]}:{id,placement:{}}}),/LIVE_VERSION_CHANGED/);
 assert.deepEqual(await import('node:fs/promises').then(fs=>fs.readdir(cacheDirectory)),[]);
});
test('malformed cache, symlinks and unknown fields cannot bypass validation',async t=>{
 const dir=await temp(t),cacheDirectory=path.join(dir,'private');await mkdir(cacheDirectory);const file=path.join(cacheDirectory,'placement-'+id+'.json');await writeFile(file,'invalid');await assert.rejects(()=>resolvePlacementEvidence(v,{cacheDirectory,get:async()=>assert.fail()}),/EVIDENCE_INVALID/);await rm(file);await symlink(path.join(dir,'missing'),file);await assert.rejects(()=>resolvePlacementEvidence(v,{cacheDirectory,get:async()=>assert.fail()}),/CACHE_UNSAFE/);
});

test('Version reports empty placement and Settings reports empty: omission is explicitly proved, not inferred from an error',()=>{
 const proof=evidenceFromPlacementVersion({id,placement:{}},v);assert.equal(proof.versionShape,'empty');assert.equal(placementFromEvidence({},proof,v),undefined);
});
