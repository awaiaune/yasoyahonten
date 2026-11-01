// Offline SQL generation only. Never connects to Cloudflare or opens an existing DB.
import {execFileSync} from 'node:child_process';
import {migrationBundle} from './prepare-migration.mjs';

const metadata=String.raw`
import sqlite3,json,sys
c=sqlite3.connect(':memory:');c.row_factory=sqlite3.Row;c.executescript(sys.stdin.read())
tables=[];indexes=[]
for r in c.execute("SELECT name,sql FROM sqlite_schema WHERE type='table' ORDER BY name").fetchall():
 t=r['name'];cols=[dict(x) for x in c.execute('PRAGMA table_xinfo('+t+')')];ix=[]
 for i in c.execute('PRAGMA index_list('+t+')').fetchall():
  keys=[dict(x) for x in c.execute('PRAGMA index_xinfo('+i['name']+')') if x['key']]
  key=','.join(x['name']+':'+x['coll']+':'+str(x['desc']) for x in keys)
  ix.append([i['name'] if i['origin']=='c' else '',i['unique'],i['origin'],i['partial'],key])
  if i['origin']=='c':indexes.append([i['name'],t,key])
 tables.append(dict(name=t,sql=r['sql'],columns=cols,indexes=ix))
print(json.dumps(dict(tables=tables,indexes=indexes)))
`;
// Retain quoted literal characters, including whitespace and escaped quotes.
function compact(sql){let quote='',out='';for(const c of sql){if(quote){out+=c;if(c===quote)quote='';}else if(c==="'"||c==='"'||c==='`'||c==='['){quote=c==='['?']':c;out+=c;}else if(!/\s/.test(c))out+=c.toLowerCase();}return out;}
function checkExpressions(sql){
 const s=compact(sql),result=[];let at=0;
 while((at=s.indexOf('check(',at))!==-1){let depth=0,quote='',end=at+5;for(;end<s.length;end++){const c=s[end];if(quote){if(c===quote)quote='';continue;}if(c==="'"){quote=c;continue;}if(c==='(')depth++;if(c===')'&&--depth===0){end++;break;}}result.push(s.slice(at,end));at=end;}
 return result;
}
export async function semanticSql(instanceId){
 const ref=JSON.parse(execFileSync('python3',['-c',metadata],{input:await migrationBundle(instanceId),encoding:'utf8',timeout:10000,maxBuffer:1024*1024}));
 const q=v=>v===null?'NULL':typeof v==='number'?String(v):"'"+String(v).replaceAll("'","''")+"'";
 const values=rows=>rows.map(r=>'('+r.map(q).join(',')+')').join(',\n');
 const tables=ref.tables.map(t=>[t.name,t.columns.length,t.indexes.length,checkExpressions(t.sql).length]);
 const columns=ref.tables.flatMap(t=>t.columns.map(c=>[t.name,c.cid,c.name,c.type.toUpperCase(),c.notnull,c.dflt_value,c.pk,c.hidden]));
 const indexes=ref.tables.flatMap(t=>t.indexes.map(i=>[t.name,...i]));
 const checks=ref.tables.flatMap(t=>checkExpressions(t.sql).map(c=>[t.name,c]));
 return `WITH RECURSIVE
expected_tables(name,columns_count,indexes_count,checks_count) AS (VALUES
${values(tables)}),
expected_columns(table_name,cid,name,type,required,default_value,pk,hidden) AS (VALUES
${values(columns)}),
expected_indexes(table_name,index_name,is_unique,origin,partial,keys) AS (VALUES
${values(indexes)}),
expected_checks(table_name,expression) AS (VALUES
${values(checks)}),
actual_columns AS (
 SELECT t.name AS table_name,p.cid,p.name,upper(trim(p.type)) AS type,p."notnull" AS required,p.dflt_value AS default_value,p.pk,p.hidden
 FROM expected_tables t JOIN pragma_table_xinfo(t.name) p
),
actual_indexes AS (
 SELECT t.name AS table_name,i.name,CASE WHEN i.origin='c' THEN i.name ELSE '' END AS index_name,i."unique" AS is_unique,i.origin,i.partial,
 (SELECT group_concat(v,'') FROM (SELECT x.name||':'||x.coll||':'||x.desc||',' AS v FROM pragma_index_xinfo(i.name) x WHERE x.key=1 ORDER BY x.seqno)) AS raw_keys
 FROM expected_tables t JOIN pragma_index_list(t.name) i
),
index_shapes AS (SELECT *,rtrim(raw_keys,',') AS keys FROM actual_indexes),
scan(name,sql,pos,quote,compact) AS (
 SELECT t.name,s.sql,1,'','' FROM expected_tables t JOIN sqlite_schema s ON s.name=t.name AND s.type='table'
 UNION ALL
 SELECT name,sql,pos+1,
 CASE WHEN quote='' AND substr(sql,pos,1) IN (char(39),char(34),char(96),'[') THEN CASE WHEN substr(sql,pos,1)='[' THEN ']' ELSE substr(sql,pos,1) END
 WHEN quote<>'' AND substr(sql,pos,1)=quote THEN '' ELSE quote END,
 compact||CASE WHEN quote<>'' OR substr(sql,pos,1) IN (char(39),char(34),char(96),'[') THEN substr(sql,pos,1)
 WHEN substr(sql,pos,1) IN (' ',char(9),char(10),char(13)) THEN '' ELSE lower(substr(sql,pos,1)) END
 FROM scan WHERE pos<=length(sql) AND pos<=8192
),
normalized AS (SELECT name,compact FROM scan WHERE pos=length(sql)+1 AND quote=''),
table_results AS (
 SELECT t.name,CASE
 WHEN NOT EXISTS(SELECT 1 FROM sqlite_schema s WHERE s.name=t.name AND s.type='table') THEN 'MISSING'
 WHEN (SELECT COUNT(*) FROM actual_columns a WHERE a.table_name=t.name)<>t.columns_count OR EXISTS(
 SELECT 1 FROM expected_columns e LEFT JOIN actual_columns a ON a.table_name=e.table_name AND a.cid=e.cid
 WHERE e.table_name=t.name AND (a.name IS NULL OR a.name<>e.name OR a.type<>e.type OR a.required<>e.required OR a.default_value IS NOT e.default_value OR a.pk<>e.pk OR a.hidden<>e.hidden)) THEN 'MISMATCH:COLUMNS'
 WHEN (SELECT COUNT(*) FROM index_shapes a WHERE a.table_name=t.name)<>t.indexes_count OR EXISTS(
 SELECT 1 FROM expected_indexes e WHERE e.table_name=t.name AND NOT EXISTS(SELECT 1 FROM index_shapes a WHERE a.table_name=e.table_name AND a.index_name=e.index_name AND a.is_unique=e.is_unique AND a.origin=e.origin AND a.partial=e.partial AND a.keys=e.keys)) THEN 'MISMATCH:INDEXES'
 WHEN NOT EXISTS(SELECT 1 FROM normalized n WHERE n.name=t.name) OR EXISTS(
 SELECT 1 FROM expected_checks e WHERE e.table_name=t.name AND NOT EXISTS(SELECT 1 FROM normalized n WHERE n.name=t.name AND instr(n.compact,e.expression)>0)) OR EXISTS(
 SELECT 1 FROM normalized n WHERE n.name=t.name AND (length(n.compact)-length(replace(n.compact,'check(','')))/6<>t.checks_count) THEN 'MISMATCH:CHECK'
 WHEN EXISTS(SELECT 1 FROM pragma_foreign_key_list(t.name)) OR EXISTS(SELECT 1 FROM sqlite_schema s WHERE s.type='trigger' AND s.tbl_name=t.name) OR EXISTS(
 SELECT 1 FROM normalized n WHERE n.name=t.name AND (instr(n.compact,'onconflict')>0 OR instr(n.compact,'collate')>0 OR instr(n.compact,'autoincrement')>0 OR instr(n.compact,'withoutrowid')>0)) THEN 'MISMATCH:EXTRA_CONSTRAINT'
 ELSE 'MATCH' END AS result FROM expected_tables t
)
SELECT 'table:'||name AS check_name,result FROM table_results
UNION ALL SELECT 'index:'||name,CASE WHEN keys='state:BINARY:0,next_due:BINARY:0' AND is_unique=0 AND partial=0 THEN 'MATCH' ELSE 'MISMATCH' END FROM index_shapes WHERE name IN ('mg_jobs_due','mg_notification_due')
UNION ALL SELECT 'environment',CASE WHEN COUNT(*)=1 AND SUM(CASE WHEN id=1 AND instance_id=${q(instanceId)} AND database_id='442fa9fd-25d3-4c01-bcc3-04be7b420cf5' AND location_id='LQ693S4H2NBZ8' THEN 1 ELSE 0 END)=1 THEN 'MATCH' ELSE 'MISMATCH' END FROM production_environment
UNION ALL SELECT 'orders_count',CAST(COUNT(*) AS TEXT) FROM orders
UNION ALL SELECT 'unexpected:'||name,type FROM sqlite_schema WHERE (name GLOB 'mg_*' OR name='production_environment') AND name NOT IN (SELECT name FROM expected_tables) AND name NOT IN ('mg_jobs_due','mg_notification_due')
ORDER BY check_name;
`;
}
