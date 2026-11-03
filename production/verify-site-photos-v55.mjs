// Read-only preflight for the adopted YASOYA site + image-selection release.
// No credentials, remote API, database reads/writes, or deployment.
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=async file=>readFile(path.join(root,file),'utf8');
function ok(condition,message){if(!condition)throw Error('BLOCKED: '+message);console.log('OK: '+message);}
async function checkConfig(file,worker,checks){
 const full=path.join(root,file),meta=await stat(full);
 ok(meta.isFile(),file+' is a regular file');
 const value=await read(file);
 ok(new RegExp('"name"\\s*:\\s*"'+worker+'"').test(value),file+' targets '+worker);
 ok(/"keep_vars"\s*:\s*true/.test(value),'Preserve existing Worker variables and Secrets');
 for(const [key,expected] of checks){
  ok(new RegExp('"'+key+'"\\s*:\\s*"'+expected+'"').test(value),'Setting '+key+' = '+expected);
 }
 return value;
}
try{
 const home=await read('production/.generated/v53/index.html');
 const shop=await read('production/.generated/v53/products.html');
 const admin=await read('production/.generated/admin/js/admin-management.js');
 const imageCode=await read('worker/src/management/v53-render.js');
 const domain=await read('worker/src/management/domain.js');
 ok(home.includes('css/tea-fullbleed-v54.css'),'Full-width TEA with centered captions and progress');
 ok(home.includes('images/tea-cup-preview.jpg')&&home.includes('images/tea-pour-preview.jpg')&&home.includes('images/tea-leaves-preview.jpg'),'All three local TEA photos included');
 ok(shop.includes('css/shop-allview-center-v55.css'),'Centered ALL VIEW on SHOP');
 ok(admin.includes('植物の代表にする')&&admin.includes('featuredImageId'),'Separate botanical representative selector');
 ok(imageCode.includes('presentationImageUrl')&&domain.includes('featuredImageId'),'Production renderer and draft validation included');
 for(const name of ['tea-cup-preview.jpg','tea-pour-preview.jpg','tea-leaves-preview.jpg']){
  const [a,b]=await Promise.all([readFile(path.join(root,'staging/site/images',name)),readFile(path.join(root,'production/.generated/v53/images',name))]);
  ok(createHash('sha256').update(a).digest('hex')===createHash('sha256').update(b).digest('hex'),'Packaged '+name+' unchanged');
 }
 await checkConfig('production/release/ready-inventory.local.jsonc','yasoya-honten-payments',[
   ['PRODUCTION_CHECKOUT_ENABLED','0'],
   ['PRODUCTION_MANAGED_CHECKOUT_ENABLED','0'],
   ['PRODUCTION_STOREFRONT_ENABLED','1'],
   ['PRODUCTION_STOREFRONT_PUBLISH_ENABLED','1'],
   ['PRODUCTION_MANAGEMENT_DRAFT_ENABLED','1'],
   ['PRODUCTION_MANAGEMENT_IMAGES_ENABLED','1']
 ]);
 await checkConfig('production/release/admin-domain.local.jsonc','yasoya-honten-admin',[]);
 console.log('PREFLIGHT PASS: sources/assets/config checked locally. No deployment. Live settings, active Worker, D1/DO, and access policy still need separate confirmation.');
}catch(error){console.error(String(error.message||error));process.exitCode=1;}
