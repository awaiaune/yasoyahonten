// Filesystem-only fixtures. No input contents, auth, Cloudflare, build or upload.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,symlink,readFile} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {ARTIFACT_INPUTS,inspectArtifactInputs,requireArtifactInputs,preparePrebuilt} from '../production/prepare-prebuilt-off-release.mjs';
async function fixture(t){const root=await mkdtemp(path.join(tmpdir(),'yasoya-input-probe-'));t.after(()=>rm(root,{recursive:true,force:true}));for(const [,rel,type]of ARTIFACT_INPUTS){const f=path.join(root,rel);await mkdir(path.dirname(f),{recursive:true});if(type==='directory')await mkdir(f);else await writeFile(f,'PRIVATE_FILE_CONTENT_SENTINEL');}return root;}
test('probe enumerates exactly the seven known inputs and reports kinds without reading contents',async t=>{
 const root=await fixture(t),rows=await inspectArtifactInputs(root);assert.equal(rows.length,7);assert(rows.every(r=>r.type===r.expectedType&&!r.issue));assert(!JSON.stringify(rows).includes('PRIVATE_FILE_CONTENT_SENTINEL'));await requireArtifactInputs(root);assert.equal(await readFile(path.join(root,'release/off.local.jsonc'),'utf8'),'PRIVATE_FILE_CONTENT_SENTINEL');
});
for(const [role,rel]of ARTIFACT_INPUTS)test('ENOENT attribution: '+role,async t=>{const root=await fixture(t);await rm(path.join(root,rel),{recursive:true});await assert.rejects(()=>requireArtifactInputs(root),e=>{assert.equal(e.message,'ARTIFACT_INPUT_MISSING');assert.equal(e.code,'ENOENT');assert.deepEqual(e.artifactIssues.map(r=>r.role),[role]);assert.equal(e.artifactIssues[0].path,path.join(root,rel));assert.equal(e.artifactIssues[0].type,'missing');return true;});});
test('multiple missing files are reported together, not misattributed to the source map',async t=>{
 const root=await fixture(t);for(const rel of ['dry-run/diagnostic.json','release/off.local.jsonc'])await rm(path.join(root,rel));await assert.rejects(()=>requireArtifactInputs(root),e=>{assert.deepEqual(e.artifactIssues.map(r=>r.role),['dry_run_status','off_config']);assert(!e.artifactIssues.some(r=>r.role==='source_map'));return true;});
});
test('directory or symlink in place of a map stops without following it',async t=>{
 const root=await fixture(t),file=path.join(root,'dry-run/bundle/storefront-worker.js.map');await rm(file);await mkdir(file);await assert.rejects(()=>requireArtifactInputs(root),e=>e.message==='ARTIFACT_INPUT_UNSAFE'&&e.artifactIssues[0].type==='directory');await rm(file,{recursive:true});await symlink(path.join(root,'release/off.local.jsonc'),file);await assert.rejects(()=>requireArtifactInputs(root),e=>e.message==='ARTIFACT_INPUT_UNSAFE'&&e.artifactIssues[0].type==='symbolic_link'&&!JSON.stringify(e.artifactIssues).includes('PRIVATE_FILE_CONTENT_SENTINEL'));
});
test('missing map stops actual preparation before JSON decoding, auth, output generation or deployment',async t=>{
 const root=await fixture(t);await rm(path.join(root,'dry-run/bundle/storefront-worker.js.map'));let called=false;await assert.rejects(()=>preparePrebuilt({root,repository:new URL('../',import.meta.url).pathname},{get:()=>{called=true;throw Error('MUST_NOT_CALL');}}),e=>e.message==='ARTIFACT_INPUT_MISSING'&&e.artifactIssues[0].role==='source_map');assert.equal(called,false);
});
