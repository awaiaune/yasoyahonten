// Candidate boundary: immutable known resource/configuration files and generated
// Production assets. All payment transports in other suites remain mocked.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const root=new URL('../',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('production/payment-rc-manifest.json',root),'utf8'));
test('candidate preserves baseline resources, migration SQL, identities, original designs and images',async()=>{
 for(const [path,hash]of Object.entries(manifest.protectedSha256))assert.equal(createHash('sha256').update(await readFile(new URL(path,root))).digest('hex'),hash,path);
});
test('checkout does not contain the Staging recipient feature and retains the trusted submit stack',async()=>{
 const js=await readFile(new URL('js/checkout-v1.js',root),'utf8');assert(!/STAGING_ADMIN_EMAIL|stagingEmailPreflight|checkout-preflight|checkRecipient/.test(js));
 assert(js.indexOf('tokenResult = await tokenizeCard')<js.indexOf('const previous=await existingResult();'));
});
test('Production packaged checkout/admin/receipt are the reviewed root assets with no Sandbox runtime config',async()=>{
 for(const path of ['js/checkout-v1.js','js/thanks-verified-v57.js','js/admin.js','js/admin-ui.js','js/admin-management.js','admin/index.html','css/admin.css'])assert.deepEqual(await readFile(new URL('production/.generated/v53/'+path,root)),await readFile(new URL(path,root)),path);
 const html=await readFile(new URL('production/.generated/v53/checkout.html',root),'utf8');assert(html.includes('https://web.squarecdn.com/v1/square.js'));assert(!html.includes('sandbox.web.squarecdn.com'));assert(html.includes('/js/checkout-v1.js'));
 const thanks=await readFile(new URL('production/.generated/v53/thanks.html',root),'utf8');assert(thanks.includes('thanks-verified-v57.js'));assert(thanks.includes('Order status.'));assert(!thanks.includes('<h1>THANK YOU</h1>'));
 assert((await readFile(new URL('production/.generated/v53/js/store-config.js',root),'utf8')).includes('throw new Error'));
});
for(const entry of ['production/api-worker.js','production/storefront-worker.js','production/admin-worker.js'])test(entry+' builds without importing Staging-specific new handlers',async()=>{
 const b=await build({entryPoints:[new URL(entry,root).pathname],bundle:true,write:false,metafile:true,format:'esm',platform:'browser',logLevel:'silent'});
 assert(!Object.keys(b.metafile.inputs).some(p=>p.endsWith('staging/checkout-recipient.js')));
 assert(!b.outputFiles[0].text.includes('stagingEmailPreflight'));
});
