// Offline security regression checks against reviewed Square documentation.
import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url),required=JSON.parse(await readFile(new URL('fixtures/square-csp-origins.json',import.meta.url),'utf8'));
const sources={production:await readFile(new URL('production/storefront-worker.js',root),'utf8'),sandbox:await readFile(new URL('staging/worker.js',root),'utf8')};
const parse=s=>Object.fromEntries(s.split(';').filter(x=>x.trim()).map(d=>{const [key,...values]=d.trim().split(/\s+/);return[key,values];}));
function policy(env){return parse(env==='production'?sources[env].match(/const csp="([^"]+)"/)[1]:sources[env].match(/h.set\('Content-Security-Policy',"([^"]+)"\)/)[1]);}
function matches(values,requirement){
 if(requirement.startsWith("'"))return values.includes(requirement);
 const url=new URL(requirement);
 return values.some(value=>{
  if(value===requirement)return true;
  if(!value.startsWith('https://*.'))return false;
  const domain=value.slice('https://*.'.length);
  return url.protocol==='https:'&&url.hostname.endsWith('.'+domain);
 });
}
for(const env of ['production','sandbox']){
 test(`${env} CSP covers the official Square vendor origins in their documented directives`,()=>{
  const p=policy(env);
  for(const [directive,values]of Object.entries(required[env]))for(const value of values)assert(matches(p[directive],value),`${env} ${directive} missing ${value}`);
 });
 test(`${env} policy retains narrow scripts/frames, TLS and anti-framing safeguards`,()=>{
  const p=policy(env),sdk=env==='production'?'https://web.squarecdn.com':'https://sandbox.web.squarecdn.com';
  const square=env==='production'?'https://*.squareup.com':'https://*.squareupsandbox.com';
  assert.deepEqual(p['script-src'],["'self'","'unsafe-inline'",sdk]);
  assert.deepEqual(p['frame-src'],["'self'",square,sdk]);
  assert.deepEqual(p['frame-ancestors'],["'none'"]);assert.deepEqual(p['form-action'],["'self'"]);assert.deepEqual(p['base-uri'],["'self'"]);
  for(const [directive,values]of Object.entries(p)){assert(!values.some(v=>['*','https:','http:'].includes(v)));if(directive!=='img-src')assert(!values.includes('data:'));}
  assert(!Object.values(p).flat().some(v=>v.startsWith('http://')));
  assert(!p['script-src'].includes("'unsafe-eval'"));assert(!p['script-src'].includes('https://o160250.ingest.sentry.io'));
  assert(!matches(p['frame-src'],'https://bank-acs.example.test'));
 });
}
test('Production and Sandbox payment origins remain separate',()=>{
 const prod=policy('production'),sandbox=policy('sandbox');
 assert(!matches(prod['connect-src'],'https://pci-connect.squareupsandbox.com'));
 assert(!matches(sandbox['connect-src'],'https://pci-connect.squareup.com'));
 assert(!matches(prod['script-src'],'https://sandbox.web.squarecdn.com'));
 assert(!matches(sandbox['script-src'],'https://web.squarecdn.com'));
});
