// Generates a review artifact only. No remote DB, deploy or environment credentials.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
export async function migrationBundle(instanceId){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(instanceId)||instanceId==='853e7e9a-fbf1-4d88-94b6-16506a9f09a3')throw Error('A dedicated Production instance UUID is required');
 const files=['0001_management.sql','0002_management_supervision.sql'];
 const parts=await Promise.all(files.map(f=>readFile(new URL('../worker/migrations-production/'+f,import.meta.url),'utf8')));
 return '-- REVIEW ONLY. Target: yasoya-orders / 442fa9fd-25d3-4c01-bcc3-04be7b420cf5\n-- Requires verified real backup and explicit approval. Never apply to staging.\n'+parts.join('\n')+"\nINSERT INTO production_environment(id,instance_id,database_id,location_id) VALUES(1,'"+instanceId+"','442fa9fd-25d3-4c01-bcc3-04be7b420cf5','LQ693S4H2NBZ8');\n";
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 if(process.argv[2]!=='--prepare')throw Error('Use --prepare for offline artifact generation only');
 const instanceId=randomUUID(),out=new URL('.generated/migration/',import.meta.url);await mkdir(out,{recursive:true});
 await writeFile(new URL('additive.sql',out),await migrationBundle(instanceId));
 await writeFile(new URL('manifest.json',out),JSON.stringify({status:'NOT_APPROVED_FOR_EXECUTION',database:'yasoya-orders',databaseId:'442fa9fd-25d3-4c01-bcc3-04be7b420cf5',instanceId,ordersChange:'none',realBackupVerified:false},null,2)+'\n');
 console.log('Review-only additive migration prepared. No remote operations.');
}
