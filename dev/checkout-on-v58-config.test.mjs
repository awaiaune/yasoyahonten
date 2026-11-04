import test from 'node:test';import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm,stat,lstat,symlink} from 'node:fs/promises';import {tmpdir} from 'node:os';
import {parseConfig,onConfig,writeOnConfig} from '../production/prepare-checkout-v58.mjs';
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
