// Offline only. Generates a separate opt-in config; never edits production config.
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {makeConfig} from './prepare.mjs';
import {assertConfig,VALIDATION_ORIGIN} from './safety.js';
import {assertReviewInputs} from './actions-review.mjs';
import {externalPolicy} from '../worker/src/external-policy.js';
import {productPlan} from './seed-square.mjs';
export function managementConfig(manifest,links){
 const c=makeConfig(manifest);if(manifest.workerOrigin!==VALIDATION_ORIGIN)throw Error('Exact Access-protected host required');
 c.vars.MANAGEMENT_ENABLED='1';c.vars.MANAGEMENT_STOCK_WRITES='disabled';c.vars.MANAGEMENT_CHECKOUT_PAUSED='1';
 c.vars.SQUARE_ACCESS_MODE='READ_ONLY';c.vars.VALIDATION_CHECKOUT_ENABLED='0';c.vars.VALIDATION_MAIL_ENABLED='0';c.vars.VALIDATION_CRON_ENABLED='0';
 if(links)c.vars.SQUARE_EXISTING_LINKS=JSON.stringify(links);
 c.r2_buckets=[{binding:'PRODUCT_IMAGES',bucket_name:'yasoya-validation-images'}];
 c.triggers={crons:[]};
 c.d1_databases[0].migrations_dir='../worker/migrations';return c;
}
export function checkManagementConfig(c,m){
 const base=structuredClone(c);if(base.vars.SQUARE_EXISTING_LINKS){const links=JSON.parse(base.vars.SQUARE_EXISTING_LINKS);if(Object.keys(links).sort().join()!==Object.keys(m.variations).sort().join())throw Error('Exact existing links required');for(const [id,ref] of Object.entries(links)){if(Object.keys(ref).sort().join()!==['itemId','sku','variationId'].sort().join()||ref.variationId!==m.variations[id]||! /^[A-Z0-9]{8,64}$/.test(ref.itemId)||ref.sku!=='yasoya-sandbox-v1:'+id)throw Error('Existing ID/SKU mismatch');}if(new Set(Object.values(links).map(r=>r.itemId)).size!==3)throw Error('Distinct existing Items required');delete base.vars.SQUARE_EXISTING_LINKS;}const policy=externalPolicy(base.vars);if(!policy.readOnly||policy.checkout||policy.mail||policy.cron||base.vars.MANAGEMENT_CHECKOUT_PAUSED!=='1')throw Error('Initial deployment must be read-only');if(JSON.stringify(base.r2_buckets)!==JSON.stringify([{binding:'PRODUCT_IMAGES',bucket_name:'yasoya-validation-images'}]))throw Error('Dedicated image bucket required');
 if(!['0','1'].includes(base.vars.MANAGEMENT_CHECKOUT_PAUSED)||base.vars.MANAGEMENT_ENABLED!=='1'||base.vars.MANAGEMENT_STOCK_WRITES!=='disabled')throw Error('Reviewed management mode required');
 if(base.d1_databases[0].migrations_dir!=='../worker/migrations')throw Error('Additive migration directory required');
 if(JSON.stringify(base.triggers)!==JSON.stringify({crons:[]}))throw Error('Initial deployment must not register Cron');
 delete base.triggers;
 delete base.r2_buckets;delete base.vars.MANAGEMENT_CHECKOUT_PAUSED;delete base.vars.MANAGEMENT_ENABLED;delete base.vars.MANAGEMENT_STOCK_WRITES;delete base.d1_databases[0].migrations_dir;assertConfig(base,m);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{
 const load=async p=>JSON.parse(await readFile(new URL(p,import.meta.url),'utf8'));
 const input=assertReviewInputs({manifest:await load('manifest.local.json'),mapping:await load('.generated/square-variations.local.json'),settings:await load('square-seed.local.json')},await productPlan());
 const plan=await productPlan();const links=Object.fromEntries(plan.groups.flatMap(g=>g.variations.map(v=>[v.id,{itemId:input.mapping.items[g.key],variationId:input.mapping.variations[v.id],sku:v.sku}])));
 const command=process.argv[2]||'prepare';if(!['prepare','check'].includes(command)||process.argv.length>3)throw Error('Use prepare or check');
 const expected=managementConfig(input.manifest,links);
 const c=command==='check'?await load('wrangler-management.local.json'):expected;checkManagementConfig(c,input.manifest);
 if(JSON.stringify(c)!==JSON.stringify(expected))throw Error('Generated settings differ from reviewed inputs');
 if(command==='prepare')await writeFile(new URL('wrangler-management.local.json',import.meta.url),JSON.stringify(c,null,2)+'\n',{mode:0o600});
 console.log(command==='check'?'Management config and existing mappings verified offline; READ_ONLY, checkout/mail/Cron disabled.':'Management config prepared offline; no remote changes. READ_ONLY, checkout/mail/Cron disabled.');
}catch{console.error('Management preparation refused. No remote action was attempted.');process.exitCode=1;}}
