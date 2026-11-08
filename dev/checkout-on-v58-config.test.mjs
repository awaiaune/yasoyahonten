import test from 'node:test';import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm,stat,lstat,symlink} from 'node:fs/promises';import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {parseConfig,onConfig,writeOnConfig,validateOffConfig,validateOnConfig,checkProfile} from '../production/prepare-checkout-v58.mjs';
const ready=JSON.parse(await readFile(new URL('../production/release/ready.jsonc',import.meta.url),'utf8'));
const base=()=>({...structuredClone(ready),routes:[{pattern:'yasoyahonten.awaiaune.com',custom_domain:true}],vars:{...ready.vars,PRODUCTION_CHECKOUT_ENABLED:'0',PRODUCTION_MANAGED_CHECKOUT_ENABLED:'0',PRODUCTION_MANAGEMENT_CATALOG_ENABLED:'0',PRODUCTION_MANAGEMENT_INVENTORY_ENABLED:'1',PRIVATE_SENTINEL:'offline-private-value'}});
test('ON preparation changes only two settings and preserves all identities, bindings, routes, Access, approvals and private values',()=>{
 const a=base(),b=onConfig(a),expected=structuredClone(a);expected.vars.PRODUCTION_CHECKOUT_ENABLED='1';expected.vars.PRODUCTION_MANAGED_CHECKOUT_ENABLED='1';assert.deepEqual(b,expected);assert.equal(a.vars.PRODUCTION_CHECKOUT_ENABLED,'0');assert.equal(a.vars.PRODUCTION_MANAGEMENT_CATALOG_ENABLED,'0');
});
test('JSONC parser accepts comments, URLs, escaped strings and trailing commas without evaluating code',()=>{
 const c=parseConfig('{/* comment */ "url":"https://a.invalid/x//y", "value":"a\\\"b", // comment\n "items":[1,2,],}');assert.equal(c.url,'https://a.invalid/x//y');assert.equal(c.value,'a"b');assert.deepEqual(c.items,[1,2]);assert.throws(()=>parseConfig('/* unterminated'),/INVALID_JSONC/);assert.throws(()=>parseConfig('{bad}'),/INVALID_JSONC/);
});
for(const [key,value]of [['PRODUCTION_MANAGEMENT_CATALOG_ENABLED','1'],['PRODUCTION_MANAGEMENT_INVENTORY_ENABLED','0'],['SQUARE_ENVIRONMENT','sandbox'],['PRODUCTION_CHECKOUT_ENABLED','1'],['STOREFRONT_RETIRE_GOLDENROD','0']])test('unsafe source '+key+' is refused',()=>{const a=base();a.vars[key]=value;assert.throws(()=>onConfig(a));});
for(const key of ['routes','d1_databases','durable_objects','r2_buckets'])test('missing '+key+' is refused without guessing',()=>{const a=base();delete a[key];assert.throws(()=>onConfig(a));});
test('output is private, old profile bytes are unchanged, and rerun never overwrites',async t=>{
 const dir=await mkdtemp(tmpdir()+'/v58-config-');t.after(()=>rm(dir,{recursive:true,force:true}));const a=dir+'/off.local.jsonc',b=dir+'/on.local.jsonc',text=JSON.stringify(base());await writeFile(a,text);await writeOnConfig(a,b);assert.equal(await readFile(a,'utf8'),text);assert.equal((await stat(b)).mode&0o777,0o600);assert.equal(parseConfig(await readFile(b,'utf8')).vars.PRODUCTION_CHECKOUT_ENABLED,'1');await assert.rejects(()=>writeOnConfig(a,b),/OUTPUT_EXISTS/);await assert.rejects(()=>writeOnConfig(a,a),/INPUT_MUST_NOT/);
});
test('missing OFF input does not create an example or output; symbolic input is refused',async t=>{
 const dir=await mkdtemp(tmpdir()+'/v58-missing-');t.after(()=>rm(dir,{recursive:true,force:true}));const a=dir+'/missing.jsonc',b=dir+'/on.jsonc';await assert.rejects(()=>writeOnConfig(a,b),/NOT_FOUND/);await assert.rejects(()=>lstat(b));const source=dir+'/source.jsonc';await writeFile(source,JSON.stringify(base()));await symlink(source,a);await assert.rejects(()=>writeOnConfig(a,b),/REGULAR_FILE/);
});

test('actual unified-OFF production profile is verified without changing the six flags or Catalog approval',()=>{
 const c=base();Object.assign(c.vars,{PRODUCTION_UNIFIED_PUBLISH_ENABLED:'0',PRODUCTION_STOREFRONT_PUBLISH_ENABLED:'1',PRODUCTION_CATALOG_CUTOVER_APPROVAL:'0'});const before=structuredClone(c);assert.equal(validateOffConfig(c),c);const next=onConfig(c);assert.equal(validateOnConfig(next),next);assert.equal(next.vars.PRODUCTION_UNIFIED_PUBLISH_ENABLED,'0');assert.equal(next.vars.PRODUCTION_CATALOG_CUTOVER_APPROVAL,'0');assert.deepEqual(c,before);assert.throws(()=>validateOnConfig(c),/CHECKOUT_ON_PROFILE_REQUIRED/);
});
for(const value of ['2','',undefined])test('unified publication flag '+String(value)+' cannot bypass profile validation',()=>{const c=base();if(value===undefined)delete c.vars.PRODUCTION_UNIFIED_PUBLISH_ENABLED;else c.vars.PRODUCTION_UNIFIED_PUBLISH_ENABLED=value;assert.throws(()=>validateOffConfig(c),/SALES_VERIFICATION_PROFILE_REQUIRED/);});
for(const key of ['PRODUCTION_MANAGEMENT_READ_ENABLED','PRODUCTION_MANAGEMENT_SCHEMA_READY'])test('unified OFF still requires '+key+' for purchase verification',()=>{const c=base();c.vars.PRODUCTION_UNIFIED_PUBLISH_ENABLED='0';c.vars[key]='0';assert.throws(()=>onConfig(c),/EXISTING_MANAGEMENT_REQUIRED/);});
test('read-only OFF validation CLI never creates an ON file or logs private configuration',async t=>{
 const dir=await mkdtemp(tmpdir()+'/v58-check-only-');t.after(()=>rm(dir,{recursive:true,force:true}));const file=dir+'/off.local.jsonc',c=base();c.vars.PRODUCTION_UNIFIED_PUBLISH_ENABLED='0';const source=JSON.stringify(c);await writeFile(file,source);const r=await checkProfile(file,'off');assert.equal(r.vars.PRODUCTION_CHECKOUT_ENABLED,'0');const stdout=execFileSync(process.execPath,[new URL('../production/prepare-checkout-v58.mjs',import.meta.url).pathname,'--check-off',file],{encoding:'utf8'});assert(stdout.includes('OFF profile verified'));assert(!stdout.includes('offline-private-value'));assert.equal(await readFile(file,'utf8'),source);await assert.rejects(()=>checkProfile(file,'on'),/CHECKOUT_ON_PROFILE_REQUIRED/);await assert.rejects(()=>lstat(dir+'/ready-checkout-v58.local.jsonc'));
});
