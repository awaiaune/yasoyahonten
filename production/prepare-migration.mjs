// Generates a review artifact only. No remote DB, deploy or environment credentials.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
export async function migrationBundle(instanceId){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(instanceId)||instanceId==='853e7e9a-fbf1-4d88-94b6-16506a9f09a3')throw Error('A dedicated Production instance UUID is required');
 const files=['0001_management.sql','0002_management_supervision.sql'];
 const parts=await Promise.all(files.map(f=>readFile(new URL('../worker/migrations-production/'+f,import.meta.url),'utf8')));
 const schema=parts.join('\n').replace(/\bCREATE (TABLE|INDEX) (?!IF NOT EXISTS)/g,'CREATE $1 IF NOT EXISTS ');
 // The exact same marker is a no-op. A different marker collides on id=1 and fails;
 // never ignore that conflict or overwrite another environment's identity.
 return '-- REVIEW ONLY. Target: yasoya-orders / 442fa9fd-25d3-4c01-bcc3-04be7b420cf5\n-- Requires recorded Time Travel checkpoint and explicit approval. Orders are retained, not reset. Never apply to staging.\n-- Resume only after checking existing definitions with checks/before.sql.\n'+schema+"\nINSERT INTO production_environment(id,instance_id,database_id,location_id)\nSELECT 1,'"+instanceId+"','442fa9fd-25d3-4c01-bcc3-04be7b420cf5','LQ693S4H2NBZ8'\nWHERE NOT EXISTS (SELECT 1 FROM production_environment WHERE id=1 AND instance_id='"+instanceId+"' AND database_id='442fa9fd-25d3-4c01-bcc3-04be7b420cf5' AND location_id='LQ693S4H2NBZ8');\n";
}
export async function migrationChecks(instanceId){
 const sql=await migrationBundle(instanceId);
 const definitions=sql.replace(/^--.*$/mg,'').split(';').map(s=>s.trim()).filter(s=>/^CREATE /.test(s));
 const quote=s=>"'"+s.replaceAll("'","''")+"'";
 // SQLite omits IF NOT EXISTS from its stored CREATE prefix. Compare everything
 // else exactly, including literal case/spaces; formatting differences stop for review.
 const objects=definitions.map(ddl=>{const m=ddl.match(/^CREATE (TABLE|INDEX) IF NOT EXISTS (\w+)/);if(!m)throw Error('Unknown migration object');return {type:m[1].toLowerCase(),name:m[2],ddl:ddl.replace(/^CREATE (TABLE|INDEX) IF NOT EXISTS /,'CREATE $1 ')};});
 const cte="WITH expected(name,type,ddl) AS (VALUES\n"+objects.map(o=>'('+[o.name,o.type,o.ddl].map(quote).join(',')+')').join(',\n')+")\n";
 const schema="SELECT 'schema:'||e.name,CASE WHEN s.name IS NULL THEN 'MISSING' WHEN s.type=e.type AND trim(s.sql)=e.ddl THEN 'MATCH' ELSE 'MISMATCH' END FROM expected e LEFT JOIN sqlite_schema s ON lower(s.name)=e.name";
 const unexpected="SELECT 'unexpected:'||name,type FROM sqlite_schema WHERE (name GLOB 'mg_*' OR name='production_environment') AND name NOT IN (SELECT name FROM expected)";
 const marker="SELECT CASE WHEN COUNT(*)=0 THEN 'EMPTY' WHEN COUNT(*)=1 AND SUM(CASE WHEN id=1 AND instance_id='"+instanceId+"' AND database_id='442fa9fd-25d3-4c01-bcc3-04be7b420cf5' AND location_id='LQ693S4H2NBZ8' THEN 1 ELSE 0 END)=1 THEN 'MATCH' ELSE 'MISMATCH' END AS environment_status FROM production_environment;\n";
 const header="SELECT 'observed_utc' AS check_name,strftime('%Y-%m-%dT%H:%M:%fZ','now') AS result";
 const orders="SELECT 'orders_count',CAST(COUNT(*) AS TEXT) FROM orders";
 const markerRow="SELECT 'environment',environment_status FROM ("+marker.trim().replace(/;$/,'')+")";
 // D1 limits compound SELECT terms. VALUES keeps the row-count report below it.
 const counts=objects.filter(o=>o.type==='table'&&o.name!=='production_environment').map(o=>'('+quote('rows:'+o.name)+',(SELECT CAST(COUNT(*) AS TEXT) FROM '+o.name+'))');
 const afterCte=cte.trimEnd()+', row_counts(check_name,result) AS (VALUES\n'+counts.join(',\n')+')\n';
 const combine=(rows,prefix=cte)=>prefix+rows.join('\nUNION ALL\n')+';\n';
 return {before:combine([header,orders,schema,unexpected]),existingMarker:marker,after:combine([header,orders,schema,markerRow,'SELECT check_name,result FROM row_counts'],afterCte)};
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 if(process.argv[2]!=='--prepare')throw Error('Use --prepare for offline artifact generation only');
 const instanceId=randomUUID(),out=new URL('.generated/migration/',import.meta.url);await mkdir(out,{recursive:true});
 await writeFile(new URL('additive.sql',out),await migrationBundle(instanceId));
 await writeFile(new URL('manifest.json',out),JSON.stringify({status:'NOT_APPROVED_FOR_EXECUTION',database:'yasoya-orders',databaseId:'442fa9fd-25d3-4c01-bcc3-04be7b420cf5',instanceId,ordersChange:'none',protection:'time-travel-and-additive-only',timeTravelCheckpoint:null,needsFinalApproval:true},null,2)+'\n');
 console.log('Review-only additive migration prepared. No remote operations.');
}
