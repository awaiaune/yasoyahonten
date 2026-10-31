import test from 'node:test';
import assert from 'node:assert/strict';
import {validateDashboard,releaseArtifacts} from '../production/prepare-release.mjs';
import {fixture} from './production-fixture.mjs';
import {build} from 'esbuild';
const d={accountId:'a'.repeat(32),workerName:'yasoya-honten-payments',activeVersionId:'11111111-1111-4111-8111-111111111111',legacyApiOrigin:'https://yasoya-honten-payments.offline.workers.dev',databaseName:'yasoya-orders',databaseId:'442fa9fd-25d3-4c01-bcc3-04be7b420cf5',doNamespaceId:'6802cc5abc6d440285ec19c9e7c82103',doClass:'PurchaseCoordinator',doMigrationTag:'v1-purchase-coordinator',doObjectName:'yasoya-honten-global-purchase-lock',productionImageBucket:'yasoya-production-images',squareEnvironment:'production',squareLocationId:'LQ693S4H2NBZ8',squareApplicationId:'sq0idp-offline',adminOrigin:'https://admin.awaiaune.com',accessTeamDomain:'offline-team.cloudflareaccess.com',accessAudience:'a'.repeat(64),adminEmail:'owner@example.invalid',accessProtectsAdmin:true,publicAccessNotRequired:true,workersBuildsDisabled:false,previewBuildsDisabled:false,buildControlsReviewed:true,pagesSourceConfirmed:'main/(root)',publicRoutingReviewed:true,timeTravelAvailable:true};
test('reviewed release profiles keep checkout OFF and original DB/DO; Access values stay out of versioned config',async()=>{const r=await releaseArtifacts(d,'33333333-3333-4333-8333-333333333333');for(const c of [r.bootstrap,r.ready]){assert.equal(c.keep_vars,true);for(const key of ['RESEND_FROM_EMAIL','ORDER_NOTIFICATION_EMAIL','REPLY_TO_EMAIL'])assert.equal(c.vars[key],undefined);assert.equal(c.vars.PRODUCTION_CHECKOUT_ENABLED,'0');assert.equal(c.d1_databases[0].database_id,d.databaseId);assert.equal(c.durable_objects.bindings[0].class_name,d.doClass);assert(!JSON.stringify(c).includes(d.adminEmail));assert(!JSON.stringify(c).includes('REPLACE'));assert.equal(c.vars.PRODUCTION_LEGACY_API_ORIGIN,d.legacyApiOrigin);}assert.equal(r.bootstrap.vars.PRODUCTION_MANAGEMENT_CATALOG_ENABLED,'0');assert.equal(r.ready.vars.PRODUCTION_UNIFIED_PUBLISH_ENABLED,'1');assert(r.sql.includes('recorded Time Travel checkpoint'));assert(!/\b(?:DELETE|DROP|ALTER|UPDATE)\b/i.test(r.sql));assert.equal(r.manifest.needsFinalApproval,true);assert.equal(r.manifest.timeTravelCheckpoint,null);assert(r.manifest.beforeExecutionRequired.includes('Disable Workers Builds'));});
test('admin deployment is private and cannot change public DNS before the approved domain cutover',async()=>{
 const r=await releaseArtifacts(d,'33333333-3333-4333-8333-333333333333');
 for(const c of [r.bootstrap,r.ready,r.admin])assert.equal(c.routes,undefined);
 assert.equal(r.admin.name,'yasoya-honten-admin');assert.equal(r.admin.keep_vars,true);
 assert.equal(r.admin.workers_dev,false);assert.equal(r.admin.preview_urls,false);
 assert.equal(r.admin.main,'../admin-worker.js');assert.equal(r.admin.assets.directory,'../.generated/admin');
 assert.deepEqual(r.admin.services,[{binding:'PAYMENTS_SERVICE',service:d.workerName}]);
 assert.deepEqual(r.admin.vars,{PRODUCTION_ADMIN_ORIGIN:d.adminOrigin});
 assert(!JSON.stringify(r.admin).includes('REPLACE'));assert(!JSON.stringify(r.admin).includes(d.adminEmail));
 assert.equal(r.manifest.domainCutover.mode,'MANUAL_DASHBOARD_AFTER_READY');
 assert.equal(r.manifest.domainCutover.publicHost,'yasoyahonten.awaiaune.com');
 assert.deepEqual(r.manifest.domainCutover.oldDns,{type:'CNAME',target:'awaiaune.github.io',proxied:false});
 assert.equal(r.manifest.domainCutover.preserveLegacyApiOrigin,d.legacyApiOrigin);
});
for(const [key,value]of [['databaseId','d16c9e56-076a-4470-8d78-4fcfbe32b4dd'],['squareEnvironment','sandbox'],['squareApplicationId','sandbox-sq0idb-wrong'],['productionImageBucket','yasoya-v53-staging-images'],['doNamespaceId','wrong'],['buildControlsReviewed',false],['previewBuildsDisabled','unknown'],['publicRoutingReviewed',false]])test('release preparation rejects '+key,()=>assert.throws(()=>validateDashboard({...d,[key]:value})));
test('legacy Worker URL retains status/capabilities while new charges and public admin remain blocked',async t=>{
 const {outputFiles}=await build({entryPoints:[new URL('../production/storefront-worker.js',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'browser'});
 const f=await fixture(t,{PRODUCTION_LEGACY_API_ORIGIN:d.legacyApiOrigin,PRODUCTION_CHECKOUT_ENABLED:'0',PRODUCTION_PURCHASE_PROTOCOL:'durable-v1'},true,{backendScript:outputFiles[0].text});
 const send=(path,body)=>f.mf.dispatchFetch(d.legacyApiOrigin+path,{method:body?'POST':'GET',headers:{Origin:f.env.SITE_URL,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const c=await send('/api/v1/checkout-capabilities');assert.equal(c.status,200);assert.equal((await c.json()).checkoutEnabled,false);
 const s=await send('/api/v1/payments/status',{attemptId:crypto.randomUUID()});assert(![403,503].includes(s.status));assert.equal((await send('/api/v1/payments',{attemptId:crypto.randomUUID()})).status,503);assert.equal((await send('/api/admin/products')).status,403);assert.equal(f.fake.payments.size,0);
});
