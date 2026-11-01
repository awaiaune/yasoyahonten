// Offline configuration/SQL preparation. Never calls Cloudflare or deploys.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {migrationBundle,migrationChecks} from './prepare-migration.mjs';
import {semanticSql} from './prepare-d1-semantic.mjs';
const need=(ok,label)=>{if(!ok)throw Error(label);};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export function validateDashboard(d){
 const fields=new Set(['accountId','workerName','activeVersionId','legacyApiOrigin','databaseName','databaseId','doNamespaceId','doClass','doMigrationTag','doObjectName','productionImageBucket','squareEnvironment','squareLocationId','squareApplicationId','adminOrigin','accessTeamDomain','accessAudience','adminEmail','accessProtectsAdmin','publicAccessNotRequired','workersBuildsDisabled','previewBuildsDisabled','pagesSourceConfirmed','publicRoutingReviewed','timeTravelAvailable','buildControlsReviewed']);
 need(Object.keys(d).every(k=>fields.has(k)),'未定義の入力項目があります。Secret値を入力しないでください。');
 need(/^[a-f0-9]{32}$/.test(d.accountId),'Account ID未確認');
 need(d.workerName==='yasoya-honten-payments'&&/^[a-f0-9-]{36}$/.test(d.activeVersionId),'本番Worker/完全Version ID未確認');
 need(/^https:\/\/yasoya-honten-payments\.[a-z0-9-]+\.workers\.dev$/.test(d.legacyApiOrigin),'既存API origin未確認');
 need(d.databaseName==='yasoya-orders'&&d.databaseId==='442fa9fd-25d3-4c01-bcc3-04be7b420cf5','本番D1不一致');
 need(d.doNamespaceId==='6802cc5abc6d440285ec19c9e7c82103'&&d.doClass==='PurchaseCoordinator'&&d.doObjectName==='yasoya-honten-global-purchase-lock'&&d.doMigrationTag==='v1-purchase-coordinator','DO識別子/migration不一致。新namespaceを作らず個別確認');
 need(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(d.productionImageBucket)&&!/staging|sandbox|validation|replace/i.test(d.productionImageBucket),'本番専用R2未確認');
 need(d.squareEnvironment==='production'&&d.squareLocationId==='LQ693S4H2NBZ8'&&/^sq0idp-/.test(d.squareApplicationId),'Production Square不一致');
 need(d.adminOrigin==='https://admin.awaiaune.com'&&/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(d.accessTeamDomain)&&/^[a-f0-9]{64}$/.test(d.accessAudience)&&(d.adminEmail===undefined||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.adminEmail)),'管理Access設定未確認');
 need(typeof d.workersBuildsDisabled==='boolean'&&typeof d.previewBuildsDisabled==='boolean','Build/Preview現在値未確認');
 for(const key of ['accessProtectsAdmin','publicAccessNotRequired','buildControlsReviewed','publicRoutingReviewed','timeTravelAvailable'])need(d[key]===true,key+'未確認');
 need(d.pagesSourceConfirmed==='main/(root)','Pages公開経路未確認');
 return d;
}
export function maintenanceCheckout(html){need(html.includes('id="paymentButton"'),'旧画面の支払ボタンを確認できません');return html.replace('</body>','<script src="/production/pause-checkout.js" defer></script></body>');}
export async function releaseArtifacts(d,instanceId){
 validateDashboard(d);need(uuid.test(instanceId)&&instanceId!=='853e7e9a-fbf1-4d88-94b6-16506a9f09a3','本番専用instanceが必要');
 const base=JSON.parse(await readFile(new URL('v53.candidate.jsonc',import.meta.url),'utf8'));
 base.account_id=d.accountId;base.main='../storefront-worker.js';base.assets.directory='../.generated/v53';base.d1_databases[0].migrations_dir='../../worker/migrations-production';base.r2_buckets[0].bucket_name=d.productionImageBucket;
 Object.assign(base.vars,{PRODUCTION_INSTANCE_ID:instanceId,PRODUCTION_LEGACY_API_ORIGIN:d.legacyApiOrigin,SQUARE_PRODUCTION_APPLICATION_ID:d.squareApplicationId,PRODUCTION_ADMIN_ORIGIN:d.adminOrigin,MANAGEMENT_ENABLED:'1',PRODUCTION_MANAGEMENT_SCHEMA_READY:'1',PRODUCTION_MANAGEMENT_READ_ENABLED:'1',PRODUCTION_MANAGEMENT_DRAFT_ENABLED:'1',PRODUCTION_MANAGEMENT_IMAGES_ENABLED:'1',PRODUCTION_STOREFRONT_PUBLISH_ENABLED:'1',STOREFRONT_FEATURED_ENABLED:'1',STOREFRONT_RETIRE_GOLDENROD:'1'});
 // Public Access configuration is reviewed; the private email stays in Dashboard.
 Object.assign(base.vars,{PRODUCTION_ACCESS_TEAM_DOMAIN:d.accessTeamDomain,PRODUCTION_ACCESS_AUDIENCE:d.accessAudience});
 delete base.vars.PRODUCTION_ADMIN_EMAIL;
 // Domains are a separate approved Dashboard cutover, never a bootstrap side effect.
 const admin=JSON.parse(await readFile(new URL('admin.example.jsonc',import.meta.url),'utf8'));
 admin.account_id=d.accountId;admin.main='../admin-worker.js';admin.assets.directory='../.generated/admin';
 delete admin.routes;
 admin.vars={PRODUCTION_ADMIN_ORIGIN:d.adminOrigin,PRODUCTION_ACCESS_TEAM_DOMAIN:d.accessTeamDomain,PRODUCTION_ACCESS_AUDIENCE:d.accessAudience};
 const bootstrap=structuredClone(base),ready=structuredClone(base);
 bootstrap.main='../api-worker.js';delete bootstrap.assets;
 Object.assign(ready.vars,{PRODUCTION_STOREFRONT_ENABLED:'1',PRODUCTION_MANAGED_CHECKOUT_ENABLED:'1',PRODUCTION_UNIFIED_PUBLISH_ENABLED:'1',PRODUCTION_MANAGEMENT_CATALOG_ENABLED:'1',PRODUCTION_CATALOG_CUTOVER_APPROVAL:'verified-storefront-and-pricing-v1',PRODUCTION_MANAGEMENT_INVENTORY_ENABLED:'1',MANAGEMENT_STOCK_WRITES:'single-writer',PRODUCTION_INVENTORY_WRITER_APPROVAL:'shared-purchase-do-single-writer-v1'});
 // Checkout stays OFF in both. Reopening is a separate, explicit approval.
 return {bootstrap,ready,admin,sql:await migrationBundle(instanceId),manifest:{state:'REVIEW_ONLY_NOT_DEPLOYED',worker:d.workerName,databaseId:d.databaseId,doNamespaceId:d.doNamespaceId,rollbackVersionId:d.activeVersionId,instanceId,protection:'Time Travel checkpoint + additive-only migration; no orders deletion',checkoutEnabled:false,domainCutover:{mode:'MANUAL_DASHBOARD_AFTER_READY',publicHost:'yasoyahonten.awaiaune.com',publicWorker:d.workerName,oldDns:{type:'CNAME',target:'awaiaune.github.io',proxied:false},adminHost:new URL(d.adminOrigin).hostname,adminWorker:admin.name,preserveLegacyApiOrigin:d.legacyApiOrigin},timeTravelCheckpoint:null,needsFinalApproval:true,beforeExecutionRequired:[...(!d.workersBuildsDisabled?['Disable Workers Builds']:[]),...(!d.previewBuildsDisabled?['Disable Preview Builds']:[]),'Set PRODUCTION_ADMIN_EMAIL on both Workers to the approved Access policy email','Record immediate pre-cutover Time Travel point']}};
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const path=process.argv[2];need(path,'Usage: node production/prepare-release.mjs production/dashboard.local.json');
 const d=JSON.parse(await readFile(path,'utf8')),out=new URL('release/',import.meta.url);await mkdir(out,{recursive:true});
 let instanceId;try{instanceId=JSON.parse(await readFile(new URL('manifest.json',out),'utf8')).instanceId;}catch{instanceId=randomUUID();}
 const result=await releaseArtifacts(d,instanceId);
 const oldHtml=execFileSync('git',['show','origin/main:checkout.html'],{cwd:new URL('../',import.meta.url),encoding:'utf8'});
 await writeFile(new URL('maintenance-checkout.html',out),maintenanceCheckout(oldHtml));
 for(const k of ['bootstrap','ready','admin','manifest'])await writeFile(new URL(k+(k==='manifest'?'.json':'.jsonc'),out),JSON.stringify(result[k],null,2)+'\n');
 await writeFile(new URL('additive.sql',out),result.sql);
 const checks=await migrationChecks(instanceId);await mkdir(new URL('checks/',out),{recursive:true});
 for(const [name,key]of [['before','before'],['existing-marker','existingMarker'],['after','after']])await writeFile(new URL('checks/'+name+'.sql',out),checks[key]);
 await writeFile(new URL('checks/semantic.sql',out),await semanticSql(instanceId));
 const statements=result.sql.replace(/^--.*$/mg,'').split(';').map(s=>s.trim()).filter(Boolean);await mkdir(new URL('console/',out),{recursive:true});
 await writeFile(new URL('console/all.sql',out),statements.join(';\n')+';\n');
 for(const [i,sql]of statements.entries())await writeFile(new URL('console/'+String(i+1).padStart(2,'0')+'.sql',out),sql+';\n');
 console.log('Review-only configurations and Console SQL prepared. No remote operations.');
}
