import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm,cp,mkdir,stat,lstat,symlink} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {assembleOff} from '../production/prepare-off-live-assets.mjs';
const root=new URL('../',import.meta.url),generated=new URL('production/.generated/v53/',root);
const manifest=JSON.parse(await readFile(new URL('production/live-design-manifest.json',root),'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
async function fixture(t){
 const dir=await mkdtemp(path.join(tmpdir(),'yasoya-live-assets-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const source=path.join(dir,'operational-assets');await cp(generated,source,{recursive:true});
 const c=JSON.parse(await readFile(new URL('production/release/ready.jsonc',root),'utf8'));
 c.routes=[{pattern:'yasoyahonten.awaiaune.com',custom_domain:true}];c.assets.directory='./operational-assets';
 Object.assign(c.vars,{PRODUCTION_CHECKOUT_ENABLED:'0',PRODUCTION_MANAGED_CHECKOUT_ENABLED:'0',PRODUCTION_MANAGEMENT_CATALOG_ENABLED:'0',PRODUCTION_MANAGEMENT_INVENTORY_ENABLED:'1',PRODUCTION_UNIFIED_PUBLISH_ENABLED:'0'});
 const profile=path.join(dir,'actual.off.local.jsonc');await writeFile(profile,JSON.stringify(c));
 return {dir,source,c,profile,out:path.join(dir,'isolated'),save:()=>writeFile(profile,JSON.stringify(c))};
}
test('Production templates match supplied live transaction pages and unchanged cart/CSS/scripts',async()=>{
 for(const [file,expected]of Object.entries(manifest.exactLiveFiles))assert.equal(hash(await readFile(new URL(file,generated))),expected,file);
 assert.equal(hash(await readFile(new URL('index.html',generated))),manifest.homepageTemplateSha256);
 const html=await readFile(new URL('index.html',generated),'utf8');assert(!html.includes('/api/media/'));assert(!html.includes('lemonbalm10'));assert(html.includes('id="botanicalTrack"'));
 const js=await readFile(new URL('js/checkout-v1.js',generated));assert.notEqual(hash(js),manifest.checkoutJsLiveSha256);assert.deepEqual(js,await readFile(new URL('js/checkout-v1.js',root)));
});
test('only reviewed payment JS changes; all operational images/product/admin assets and source config remain exact',async t=>{
 const f=await fixture(t),original=await readFile(f.profile);
 const sentinels=['images/current-live-only.bin','products/current-live-only.html','admin/current-live-only.css'];
 for(const rel of sentinels){await mkdir(path.dirname(path.join(f.source,rel)),{recursive:true});await writeFile(path.join(f.source,rel),'offline-current-bytes:'+rel);}
 await writeFile(path.join(f.source,'js/checkout-v1.js'),'/* older live SDK caller */');
 const result=await assembleOff(f.profile,f.out);assert.deepEqual(result.changedAssets,['js/checkout-v1.js']);assert(result.preservedAssets>100);
 for(const rel of [...sentinels,...Object.keys(manifest.exactLiveFiles),'js/store-config.js'])assert.deepEqual(await readFile(path.join(f.out,'site',rel)),await readFile(path.join(f.source,rel)),rel);
 assert.deepEqual(await readFile(path.join(f.out,'site/js/checkout-v1.js')),await readFile(new URL('js/checkout-v1.js',root)));
 assert.deepEqual(await readFile(f.profile),original);
 const assembled=JSON.parse(await readFile(path.join(f.out,'off.local.jsonc'),'utf8'));
 assert.deepEqual(assembled.vars,f.c.vars);for(const key of ['routes','durable_objects','migrations','r2_buckets','services'])assert.deepEqual(assembled[key],f.c[key],key);
 assert.equal(assembled.d1_databases[0].database_id,f.c.d1_databases[0].database_id);assert.equal(assembled.main,new URL('production/storefront-worker.js',root).pathname);
 assert.equal((await stat(path.join(f.out,'off.local.jsonc'))).mode&0o777,0o600);assert.equal((await stat(f.out)).mode&0o777,0o700);
 await assert.rejects(()=>assembleOff(f.profile,f.out),/OUTPUT_EXISTS/);
});
for(const [label,change,expected]of [
 ['checkout ON',f=>{f.c.vars.PRODUCTION_CHECKOUT_ENABLED='1';},/CHECKOUT_OFF/],
 ['managed ON',f=>{f.c.vars.PRODUCTION_MANAGED_CHECKOUT_ENABLED='1';},/MANAGED_CHECKOUT_OFF/],
 ['Catalog ON',f=>{f.c.vars.PRODUCTION_MANAGEMENT_CATALOG_ENABLED='1';},/CATALOG_INVENTORY/],
 ['inline credential',f=>{f.c.vars.SQUARE_ACCESS_TOKEN='offline-test-sentinel';},/INLINE_CREDENTIAL/],
 ['build hook',f=>{f.c.build={command:'echo unreviewed'};},/BUILD_HOOK/],
 ['altered live template',f=>writeFile(path.join(f.source,'checkout.html'),'unknown design'),/LIVE_ASSET_MISMATCH/],
 ['static runtime configuration',f=>writeFile(path.join(f.source,'js/store-config.js'),'window.config={};'),/DYNAMIC_STORE_CONFIG/],
 ['incomplete snapshot',f=>rm(path.join(f.source,'css/checkout-editorial-v56.css')),/CURRENT_PAGE_RESOURCE_MISSING/],
 ['asset symlink',f=>symlink(f.profile,path.join(f.source,'unexpected-link')),/ASSET_LINK/]
])test('fail closed: '+label,async t=>{const f=await fixture(t);await change(f);await f.save();await assert.rejects(()=>assembleOff(f.profile,f.out),expected);await assert.rejects(()=>lstat(f.out));});
test('source/output overlap is rejected before creating or overwriting anything',async t=>{
 const f=await fixture(t);await assert.rejects(()=>assembleOff(f.profile,path.join(f.source,'nested')),/OVERLAPS/);assert.equal(await readFile(path.join(f.source,'js/store-config.js'),'utf8'),'throw new Error("Production runtime configuration must be served by the Worker");');
});
