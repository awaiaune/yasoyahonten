import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {semanticSplitSql} from '../production/prepare-d1-semantic.mjs';

const root=new URL('../production/release/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
const schema=await readFile(new URL('additive.sql',root),'utf8');
const original=await readFile(new URL('checks/semantic.sql',root),'utf8');
const parts=await semanticSplitSql(manifest.instanceId);
const compare=(ddl=schema,extra='')=>{
 const result=JSON.parse(execFileSync('python3',['-c',String.raw`
import sqlite3,json,sys
d=json.load(sys.stdin)
def check(sql):
 c=sqlite3.connect(':memory:');c.row_factory=sqlite3.Row
 c.executescript("CREATE TABLE orders(id TEXT PRIMARY KEY,value TEXT); INSERT INTO orders VALUES('test-1','keep'),('test-2','keep');")
 c.executescript(d['ddl']);c.executescript(d['extra']);before='\n'.join(c.iterdump())
 c.execute('PRAGMA query_only=ON')
 rows=[dict(r) for r in c.execute(sql)]
 assert before=='\n'.join(c.iterdump()),'Check changed database contents'
 c.close();return rows
print(json.dumps(dict(original=check(d['original']),parts=[check(sql) for sql in d['parts']])))
`],{input:JSON.stringify({ddl,extra,original,parts:parts.map(p=>p.sql)}),encoding:'utf8',timeout:20000}));
 const stages=new Map(),other=[];
 for(const row of result.parts.flat()){
  const m=row.check_name.match(/^(columns|indexes|checks|extras):(.+)$/);
  if(!m){other.push(row);continue;}
  if(!stages.has(m[2]))stages.set(m[2],{});stages.get(m[2])[m[1]]=row.result;
 }
 const combined=[...other,...[...stages].map(([name,values])=>({check_name:'table:'+name,result:['columns','indexes','checks','extras'].map(k=>values[k]).find(v=>v!=='MATCH')||'MATCH'}))];
 const ordered=rows=>rows.map(r=>[r.check_name,r.result]).sort(([a],[b])=>a<b?-1:a>b?1:0);
 assert.deepEqual(ordered(combined),ordered(result.original));
 return result;
};

test('12 saved independent SELECTs preserve the original 19 results and stay short',async()=>{
 assert.equal(parts.length,12);
 for(const [i,p]of parts.entries()){
  assert(p.file.startsWith(String(i+1).padStart(2,'0')));
  assert.equal(await readFile(new URL('checks/semantic-parts/'+p.file,root),'utf8'),p.sql);
  assert(Buffer.byteLength(p.sql)<=2250);
 }
 const r=compare();assert.equal(r.original.length,19);
 assert(r.original.every(v=>v.check_name==='orders_count'?v.result==='2':v.result==='MATCH'));
 assert.deepEqual(r.parts.map(p=>p.length),[5,5,5,5,5,5,15,15,2,1,1,0]);
});
test('hand-formatted SQL retains identical judgments across all independent checks',()=>{
 const ddl=schema.replace(/^--.*$/mg,'').replace(/CREATE TABLE/g,'create table').replace(/CREATE INDEX/g,'create index').replace(/\n/g,' ').replace(/, /g,',\n\t  ').replace(/\(/g,'( \n').replace(/\)/g,'\n )');
 compare(ddl);
});
for(const [name,change]of [
 ['column type',s=>s.replace('slug TEXT','slug INTEGER')],
 ['column order',s=>s.replace('mg_variants (id TEXT PRIMARY KEY, product_id TEXT NOT NULL)','mg_variants (product_id TEXT NOT NULL, id TEXT PRIMARY KEY)')],
 ['NOT NULL',s=>s.replace('slug TEXT NOT NULL','slug TEXT')],
 ['default',s=>s.replace("DEFAULT 'draft'","DEFAULT 'published'")],
 ['primary key',s=>s.replace('variant_id TEXT PRIMARY KEY, job_id','variant_id TEXT, job_id')],
 ['SKU UNIQUE',s=>s.replace('sku TEXT NOT NULL UNIQUE','sku TEXT NOT NULL')],
 ['CHECK value',s=>s.replace("CHECK(environment='production')","CHECK(environment='sandbox')")],
 ['literal whitespace',s=>s.replace("CHECK(environment='production')","CHECK(environment='pro duction')")],
 ['CHECK removal',s=>s.replace("CHECK(environment='production')",'')],
 ['index order',s=>s.replace('mg_jobs_due ON mg_jobs(state,next_due)','mg_jobs_due ON mg_jobs(next_due,state)')],
 ['index DESC',s=>s.replace('mg_jobs_due ON mg_jobs(state,next_due)','mg_jobs_due ON mg_jobs(state,next_due DESC)')],
 ['partial index',s=>s.replace('mg_jobs_due ON mg_jobs(state,next_due);',"mg_jobs_due ON mg_jobs(state,next_due) WHERE state='retry';")],
 ['IGNORE conflict',s=>s.replace('slug TEXT NOT NULL UNIQUE','slug TEXT NOT NULL UNIQUE ON CONFLICT IGNORE')],
 ['foreign key',s=>s.replace('mg_variants (id TEXT PRIMARY KEY, product_id TEXT NOT NULL)','mg_variants (id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES mg_products(id))')],
 ['multiple mismatches',s=>s.replace('slug TEXT NOT NULL UNIQUE','slug INTEGER UNIQUE').replace("CHECK(environment='production')",'')],
])test('split and original agree on '+name,()=>compare(change(schema)));
for(const [name,extra]of [
 ['trigger',"CREATE TRIGGER extra_trigger AFTER INSERT ON mg_products BEGIN UPDATE orders SET value='bad'; END;"],
 ['environment mismatch',"UPDATE production_environment SET instance_id='11111111-1111-4111-8111-111111111111';"],
 ['unexpected table','CREATE TABLE mg_unexpected(id TEXT);'],
 ['missing table','DROP TABLE mg_products;'],
 ['missing named index','DROP INDEX mg_jobs_due;'],
])test('independent checks also agree on '+name,()=>compare(schema,extra));
