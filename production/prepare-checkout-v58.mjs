// Local-only opt-in preparation. Never imports an example profile, reads Secrets,
// calls APIs, changes the OFF input, deploys, or overwrites any existing output.
import {readFile,writeFile,lstat,realpath} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const fail=code=>{throw Error(code);};
export function parseConfig(source){
 // Strip JSONC comments/trailing commas outside quoted strings; URLs and escapes
 // inside strings remain byte-for-byte intact before JSON parsing.
 let clean='',quoted=false,escaped=false;
 for(let i=0;i<source.length;i++){
  const c=source[i],n=source[i+1];
  if(quoted){clean+=c;if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
  if(c==='"'){quoted=true;clean+=c;continue;}
  if(c==='/'&&n==='/'){while(i<source.length&&source[i]!=='\n')i++;clean+='\n';continue;}
  if(c==='/'&&n==='*'){i+=2;while(i<source.length&&!(source[i]==='*'&&source[i+1]==='/'))i++;if(i>=source.length)fail('INVALID_JSONC');i++;clean+=' ';continue;}
  clean+=c;
 }
 let json='';quoted=false;escaped=false;
 for(let i=0;i<clean.length;i++){
  const c=clean[i];if(quoted){json+=c;if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
  if(c==='"')quoted=true;
  if(c===','){let j=i+1;while(/\s/.test(clean[j]||'')&&j<clean.length)j++;if(clean[j]===']'||clean[j]==='}')continue;}
  json+=c;
 }
 try{return JSON.parse(json);}catch{fail('INVALID_JSONC');}
}
export function validateBase(c){
 const v=c?.vars;
 if(c?.name!=='yasoya-honten-payments'||c.keep_vars!==true||!v||v.RUNTIME_TIER!=='production'||v.SQUARE_ENVIRONMENT!=='production'||v.SQUARE_LOCATION_ID!=='LQ693S4H2NBZ8'||v.PRODUCTION_WORKER_NAME!==c.name||v.PRODUCTION_PURCHASE_PROTOCOL!=='durable-v1'||v.SITE_URL!=='https://yasoyahonten.awaiaune.com')fail('PRODUCTION_IDENTITY_INVALID');
 if(!c.main?.endsWith('storefront-worker.js')||!c.assets?.directory||c.assets.binding!=='ASSETS'||c.assets.run_worker_first!==true)fail('STOREFRONT_ENTRY_INVALID');
 if(!c.routes?.some(r=>r.pattern==='yasoyahonten.awaiaune.com'&&r.custom_domain===true))fail('EXISTING_CUSTOM_DOMAIN_REQUIRED');
 if(!c.d1_databases?.some(b=>b.binding==='ORDERS_DB'&&b.database_name==='yasoya-orders'&&b.database_id==='442fa9fd-25d3-4c01-bcc3-04be7b420cf5'))fail('EXISTING_D1_REQUIRED');
 if(!c.durable_objects?.bindings?.some(b=>b.name==='PURCHASE_COORDINATOR'&&b.class_name==='PurchaseCoordinator'&&(!b.script_name||b.script_name===c.name)))fail('EXISTING_DO_REQUIRED');
 if(!c.r2_buckets?.some(b=>b.binding==='PRODUCT_IMAGES'&&b.bucket_name==='yasoya-honten-product-images'))fail('EXISTING_R2_REQUIRED');
 if(v.MANAGEMENT_ENABLED!=='1'||v.PRODUCTION_MANAGEMENT_SCHEMA_READY!=='1'||v.PRODUCTION_MANAGEMENT_READ_ENABLED!=='1'||v.PRODUCTION_STOREFRONT_ENABLED!=='1')fail('EXISTING_MANAGEMENT_REQUIRED');
 if(v.PRODUCTION_UNIFIED_PUBLISH_ENABLED!=='1'||v.PRODUCTION_STOREFRONT_PUBLISH_ENABLED!=='1')fail('SALES_VERIFICATION_PROFILE_REQUIRED');
 if(v.PRODUCTION_INVENTORY_WRITER_APPROVAL!=='shared-purchase-do-single-writer-v1')fail('EXISTING_INVENTORY_APPROVAL_REQUIRED');
 if(v.PRODUCTION_MANAGEMENT_CATALOG_ENABLED!=='0'||v.PRODUCTION_MANAGEMENT_INVENTORY_ENABLED!=='1'||v.STOREFRONT_RETIRE_GOLDENROD!=='1')fail('CATALOG_INVENTORY_OR_RETIREMENT_GUARD_INVALID');
 if(!['0','1'].includes(v.PRODUCTION_MANAGED_CHECKOUT_ENABLED))fail('MANAGED_CHECKOUT_FLAG_INVALID');
 if(Object.keys(v).some(k=>k.startsWith('SQUARE_SANDBOX'))||v.LOCAL_TEST_MODE)fail('SANDBOX_OR_LOCAL_BINDING_FORBIDDEN');
 return c;
}
export function onConfig(input){
 validateBase(input);if(input.vars.PRODUCTION_CHECKOUT_ENABLED!=='0')fail('CHECKOUT_OFF_INPUT_REQUIRED');
 const output=structuredClone(input);
 output.vars.PRODUCTION_CHECKOUT_ENABLED='1';output.vars.PRODUCTION_MANAGED_CHECKOUT_ENABLED='1';
 return output;
}
export async function writeOnConfig(input,output){
 const a=path.resolve(input),b=path.resolve(output);if(a===b)fail('INPUT_MUST_NOT_BE_OVERWRITTEN');
 let meta;try{meta=await lstat(a);}catch{fail('EXISTING_OFF_PROFILE_NOT_FOUND');}if(!meta.isFile()||meta.isSymbolicLink())fail('INPUT_MUST_BE_REGULAR_FILE');
 if(path.dirname(await realpath(a))!==await realpath(path.dirname(b)))fail('OUTPUT_MUST_SHARE_CONFIG_DIRECTORY');
 const next=onConfig(parseConfig(await readFile(a,'utf8')));
 try{await writeFile(b,JSON.stringify(next,null,2)+'\n',{flag:'wx',mode:0o600});}catch(e){if(e.code==='EEXIST')fail('OUTPUT_EXISTS_NOT_OVERWRITTEN');throw Error('OUTPUT_WRITE_FAILED');}
 return {changedSettings:['PRODUCTION_CHECKOUT_ENABLED','PRODUCTION_MANAGED_CHECKOUT_ENABLED']};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 const input=process.argv[2]||'production/release/ready-inventory.local.jsonc';
 const output=process.argv[3]||'production/release/ready-checkout-v58.local.jsonc';
 try{await writeOnConfig(input,output);console.log('V58 local ON profile prepared; OFF source and all other settings retained. No deployment.');}
 catch(error){const allowed=['INVALID_JSONC','PRODUCTION_IDENTITY_INVALID','STOREFRONT_ENTRY_INVALID','EXISTING_CUSTOM_DOMAIN_REQUIRED','EXISTING_D1_REQUIRED','EXISTING_DO_REQUIRED','EXISTING_R2_REQUIRED','EXISTING_MANAGEMENT_REQUIRED','SALES_VERIFICATION_PROFILE_REQUIRED','EXISTING_INVENTORY_APPROVAL_REQUIRED','CATALOG_INVENTORY_OR_RETIREMENT_GUARD_INVALID','MANAGED_CHECKOUT_FLAG_INVALID','SANDBOX_OR_LOCAL_BINDING_FORBIDDEN','CHECKOUT_OFF_INPUT_REQUIRED','INPUT_MUST_NOT_BE_OVERWRITTEN','EXISTING_OFF_PROFILE_NOT_FOUND','INPUT_MUST_BE_REGULAR_FILE','OUTPUT_MUST_SHARE_CONFIG_DIRECTORY','OUTPUT_EXISTS_NOT_OVERWRITTEN'];console.error('STOP: '+(allowed.includes(error.message)?error.message:'PROFILE_PREPARATION_FAILED'));process.exitCode=1;}
}
