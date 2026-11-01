import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fixture} from './production-fixture.mjs';
import {migrationBundle,migrationChecks} from '../production/prepare-migration.mjs';

const read=p=>readFile(new URL('../production/release/'+p,import.meta.url),'utf8');
const sql=await read('additive.sql'),manifest=JSON.parse(await read('manifest.json'));
const checks=await migrationChecks(manifest.instanceId);
const statements=s=>s.replace(/^--.*$/mg,'').split(';').map(s=>s.trim()).filter(Boolean);
const apply=async(db,items)=>{for(const s of items)await db.prepare(s).run();};
const schema=async db=>(await db.prepare(checks.before).all()).results.filter(r=>r.check_name.startsWith('schema:')).map(r=>({name:r.check_name.slice(7),schema_status:r.result}));
async function snapshot(db){
 const tables=(await db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND (name='orders' OR name='production_environment' OR name GLOB 'mg_*') ORDER BY name").all()).results;
 const result={};for(const {name}of tables)result[name]=(await db.prepare('SELECT * FROM '+name+' ORDER BY rowid').all()).results;return result;
}
test('saved Console files and readonly checks exactly match the reviewed resumable bundle',async()=>{
 assert.equal(sql,await migrationBundle(manifest.instanceId));
 assert.equal(statements(sql).length,18);
 assert.equal((await read('console/all.sql')),statements(sql).join(';\n')+';\n');
 for(const [i,s]of statements(sql).entries())assert.equal(await read('console/'+String(i+1).padStart(2,'0')+'.sql'),s+';\n');
 for(const [file,key]of [['before','before'],['existing-marker','existingMarker'],['after','after']])assert.equal(await read('checks/'+file+'.sql'),checks[key]);
 assert.equal(statements(checks.before).length,1);assert.equal(statements(checks.after).length,1);
 assert(!/\b(?:DROP|DELETE|ALTER|UPDATE|REPLACE)\b/i.test(sql));
 assert.equal(manifest.timeTravelCheckpoint,null);
});
test('every interruption point resumes without altering existing orders',async t=>{
 for(let completed=0;completed<=18;completed++)await t.test('resume after '+completed+' statements',async t=>{
  const f=await fixture(t,{},false);
  const before=(await f.db.prepare('SELECT * FROM orders').all()).results;
  await apply(f.db,statements(sql).slice(0,completed));
  await assert.rejects(()=>f.db.prepare('SELECT * FROM simulated_interruption').all());
  assert((await schema(f.db)).every(r=>['MATCH','MISSING'].includes(r.schema_status)));
  await apply(f.db,statements(sql));await apply(f.db,statements(sql));
  assert.deepEqual((await f.db.prepare('SELECT * FROM orders').all()).results,before);
  assert.equal((await schema(f.db)).length,17);
  assert((await schema(f.db)).every(r=>r.schema_status==='MATCH'));
  assert.equal((await f.db.prepare(checks.existingMarker).first()).environment_status,'MATCH');
  const after=(await f.db.prepare(checks.after).all()).results;
  assert.equal(after.find(r=>r.check_name==='environment').result,'MATCH');
  assert.equal(after.find(r=>r.check_name==='orders_count').result,String(before.length));
 });
});
test('rerun keeps populated management records and exact identity rather than resetting them',async t=>{
 const f=await fixture(t,{},false);await apply(f.db,statements(sql));
 await f.db.prepare("INSERT INTO mg_products VALUES('keep','keep',0,'draft',1,1,NULL,'local-test','local-test')").run();
 await f.db.prepare("INSERT INTO mg_stock_snapshot VALUES('keep',5,'local-test')").run();
 await f.db.prepare("INSERT INTO mg_locks VALUES('keep','existing-job')").run();
 const before=await snapshot(f.db);await apply(f.db,statements(sql));assert.deepEqual(await snapshot(f.db),before);
});
test('a foreign environment marker fails without replacing it or changing existing rows',async t=>{
 const f=await fixture(t,{},false);await apply(f.db,statements(sql));
 await f.db.prepare("UPDATE production_environment SET instance_id='11111111-1111-4111-8111-111111111111'").run();
 const before=await snapshot(f.db);
 assert.equal((await f.db.prepare(checks.existingMarker).first()).environment_status,'MISMATCH');
 await assert.rejects(()=>apply(f.db,statements(sql)));
 assert.deepEqual(await snapshot(f.db),before);
});
test('readonly precheck identifies incompatible existing schema and leaves its data intact',async t=>{
 const f=await fixture(t,{},false);
 await f.db.prepare('CREATE TABLE mg_products(id TEXT PRIMARY KEY)').run();
 await f.db.prepare("INSERT INTO mg_products VALUES('keep')").run();
 assert.equal((await schema(f.db)).find(r=>r.name==='mg_products').schema_status,'MISMATCH');
 assert.equal((await f.db.prepare('SELECT id FROM mg_products').first()).id,'keep');
});
