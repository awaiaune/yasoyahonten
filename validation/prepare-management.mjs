// Offline only. Generates a separate opt-in config; never edits production config.
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {makeConfig} from './prepare.mjs';
import {assertConfig,VALIDATION_ORIGIN} from './safety.js';
import {assertReviewInputs} from './actions-review.mjs';
import {productPlan} from './seed-square.mjs';
export function managementConfig(manifest){
 const c=makeConfig(manifest);if(manifest.workerOrigin!==VALIDATION_ORIGIN)throw Error('Exact Access-protected host required');
 c.vars.MANAGEMENT_ENABLED='1';c.vars.MANAGEMENT_STOCK_WRITES='disabled';c.vars.MANAGEMENT_CHECKOUT_PAUSED='0';
 c.r2_buckets=[{binding:'PRODUCT_IMAGES',bucket_name:'yasoya-validation-images'}];
 c.d1_databases[0].migrations_dir='../worker/migrations';return c;
}
export function checkManagementConfig(c,m){
 const base=structuredClone(c);if(JSON.stringify(base.r2_buckets)!==JSON.stringify([{binding:'PRODUCT_IMAGES',bucket_name:'yasoya-validation-images'}]))throw Error('Dedicated image bucket required');
 if(!['0','1'].includes(base.vars.MANAGEMENT_CHECKOUT_PAUSED)||base.vars.MANAGEMENT_ENABLED!=='1'||base.vars.MANAGEMENT_STOCK_WRITES!=='disabled')throw Error('Reviewed management mode required');
 if(base.d1_databases[0].migrations_dir!=='../worker/migrations')throw Error('Additive migration directory required');
 delete base.r2_buckets;delete base.vars.MANAGEMENT_CHECKOUT_PAUSED;delete base.vars.MANAGEMENT_ENABLED;delete base.vars.MANAGEMENT_STOCK_WRITES;delete base.d1_databases[0].migrations_dir;assertConfig(base,m);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{
 const load=async p=>JSON.parse(await readFile(new URL(p,import.meta.url),'utf8'));
 const input=assertReviewInputs({manifest:await load('manifest.local.json'),mapping:await load('.generated/square-variations.local.json'),settings:await load('square-seed.local.json')},await productPlan());
 const c=managementConfig(input.manifest);checkManagementConfig(c,input.manifest);
 await writeFile(new URL('wrangler-management.local.json',import.meta.url),JSON.stringify(c,null,2)+'\n',{mode:0o600});
 console.log('Separate management config prepared offline; no resources or migrations applied. Stock writes remain disabled.');
}catch{console.error('Management preparation refused. No remote action was attempted.');process.exitCode=1;}}
