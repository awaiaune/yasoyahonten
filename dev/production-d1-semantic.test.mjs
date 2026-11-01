import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {semanticSql} from '../production/prepare-d1-semantic.mjs';

const root=new URL('../production/release/',import.meta.url);
const schema=await readFile(new URL('additive.sql',root),'utf8');
const sql=await readFile(new URL('checks/semantic.sql',root),'utf8');
const manifest=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
const run=(ddl=schema,extra='')=>JSON.parse(execFileSync('python3',['-c',String.raw`
import sqlite3,json,sys
d=json.load(sys.stdin);c=sqlite3.connect(':memory:');c.row_factory=sqlite3.Row
c.executescript("CREATE TABLE orders(id TEXT PRIMARY KEY,value TEXT); INSERT INTO orders VALUES('test-1','keep'),('test-2','keep');")
c.executescript(d['ddl']);c.executescript(d['extra']);before='\n'.join(c.iterdump())
c.execute('PRAGMA query_only=ON')
rows=[dict(r) for r in c.execute(d['sql'])]
assert before=='\n'.join(c.iterdump()),'Read-only check altered the database'
print(json.dumps(rows))
`],{input:JSON.stringify({ddl,extra,sql}),encoding:'utf8',timeout:10000}));
const result=(rows,name)=>rows.find(r=>r.check_name===name)?.result;
const clean=rows=>assert(rows.every(r=>r.check_name==='orders_count'?r.result==='2':r.result==='MATCH'));

test('readonly PRAGMA check accepts canonical schema and matches the saved artifact',async()=>{
 assert.equal(sql,await semanticSql(manifest.instanceId));
 const rows=run();assert.equal(rows.length,19);clean(rows);
});
test('manual line breaks, indentation, tabs and SQL keyword case do not change the result',()=>{
 const ddl=schema.replace(/^--.*$/mg,'').replace(/CREATE TABLE/g,'create table').replace(/CREATE INDEX/g,'create index').replace(/\n/g,' ').replace(/, /g,',\n\t  ').replace(/\(/g,'( \n').replace(/\)/g,'\n )');
 clean(run(ddl));
});
for(const [name,change,table,reason]of [
 ['wrong column type',s=>s.replace('slug TEXT','slug INTEGER'),'mg_products','COLUMNS'],
 ['missing NOT NULL',s=>s.replace('slug TEXT NOT NULL','slug TEXT'),'mg_products','COLUMNS'],
 ['different default',s=>s.replace("DEFAULT 'draft'","DEFAULT 'published'"),'mg_products','COLUMNS'],
 ['missing primary key',s=>s.replace('variant_id TEXT PRIMARY KEY, job_id','variant_id TEXT, job_id'),'mg_locks','COLUMNS'],
 ['missing SKU uniqueness',s=>s.replace('sku TEXT NOT NULL UNIQUE','sku TEXT NOT NULL'),'mg_mappings','INDEXES'],
 ['Sandbox-only CHECK',s=>s.replace("CHECK(environment='production')","CHECK(environment='sandbox')"),'mg_mappings','CHECK'],
 ['changed literal whitespace',s=>s.replace("CHECK(environment='production')","CHECK(environment='pro duction')"),'mg_mappings','CHECK'],
 ['missing CHECK',s=>s.replace("CHECK(environment='production')",''),'mg_mappings','CHECK'],
 ['reversed due index',s=>s.replace('mg_jobs_due ON mg_jobs(state,next_due)','mg_jobs_due ON mg_jobs(next_due,state)'),'mg_jobs','INDEXES'],
 ['IGNORE conflict policy',s=>s.replace('slug TEXT NOT NULL UNIQUE','slug TEXT NOT NULL UNIQUE ON CONFLICT IGNORE'),'mg_products','EXTRA_CONSTRAINT'],
])test('semantic check rejects '+name,()=>{
 assert.equal(result(run(change(schema)),'table:'+table),'MISMATCH:'+reason);
});
test('unexpected trigger is rejected without firing it or modifying data',()=>{
 const rows=run(schema,"CREATE TRIGGER extra_trigger AFTER INSERT ON mg_products BEGIN UPDATE orders SET value='bad'; END;");
 assert.equal(result(rows,'table:mg_products'),'MISMATCH:EXTRA_CONSTRAINT');
});
test('marker mismatch remains a stop condition',()=>{
 const rows=run(schema,"UPDATE production_environment SET instance_id='11111111-1111-4111-8111-111111111111';");
 assert.equal(result(rows,'environment'),'MISMATCH');
});
test('bootstrap builds without site assets and preserves production identity and disabled write grants',async()=>{
 const c=JSON.parse(await readFile(new URL('bootstrap.jsonc',root),'utf8'));
 const admin=JSON.parse(await readFile(new URL('admin.jsonc',root),'utf8'));
 for(const k of ['PRODUCTION_CHECKOUT_ENABLED','PRODUCTION_MANAGEMENT_CATALOG_ENABLED','PRODUCTION_MANAGEMENT_INVENTORY_ENABLED','PRODUCTION_STOREFRONT_ENABLED','PRODUCTION_UNIFIED_PUBLISH_ENABLED'])assert.equal(c.vars[k],'0');
 assert.equal(c.vars.MANAGEMENT_STOCK_WRITES,'disabled');assert.equal(c.keep_vars,true);
 assert.equal(c.name,'yasoya-honten-payments');assert.equal(c.d1_databases[0].database_id,manifest.databaseId);
 assert.equal(c.vars.PRODUCTION_INSTANCE_ID,manifest.instanceId);assert.equal(c.durable_objects.bindings[0].class_name,'PurchaseCoordinator');
 assert.equal(c.r2_buckets[0].bucket_name,'yasoya-honten-product-images');assert.equal(c.assets,undefined);assert.equal(c.routes,undefined);
 assert.equal(c.vars.PRODUCTION_ACCESS_TEAM_DOMAIN,admin.vars.PRODUCTION_ACCESS_TEAM_DOMAIN);assert.equal(c.vars.PRODUCTION_ACCESS_AUDIENCE,admin.vars.PRODUCTION_ACCESS_AUDIENCE);
 assert.equal(c.vars.PRODUCTION_ADMIN_EMAIL,undefined);assert.equal(manifest.rollbackVersionId,'4ddbd925-2967-4d93-b553-ff4ea4d685a5');
 assert(!Object.keys(c.vars).some(k=>/TOKEN|SECRET|API_KEY/.test(k)));
 const {metafile}=await build({entryPoints:[new URL(c.main,root).pathname],bundle:true,write:false,format:'esm',platform:'browser',metafile:true});
 assert(Object.values(metafile.outputs).some(o=>o.exports.includes('PurchaseCoordinator')));
});
