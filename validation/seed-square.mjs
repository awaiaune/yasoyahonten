// Offline by default. No token is read by the `plan` command.
import { CATALOG, SHIPPING } from '../worker/src/catalog.js';
import { readFile, readdir, mkdir, open, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
const BASE = 'https://connect.squareupsandbox.com';
const VERSION = '2026-07-15';
const PREFIX = 'yasoya-sandbox-v1:';
export class SeedError extends Error {}
function need(ok, message) { if (!ok) throw new SeedError(message); }
function hash(v) { return createHash('sha256').update(JSON.stringify(v)).digest('hex'); }
export async function productPlan(root = fileURLToPath(new URL('../', import.meta.url))) {
    const groups=[]; const seen=new Set();
    for (const file of (await readdir(path.join(root,'products'))).filter(f=>f.endsWith('.html')).sort()) {
        const html=await readFile(path.join(root,'products',file),'utf8');
        const ids=[...new Set([...html.matchAll(/data-product-id="([^"]+)"/g)].map(m=>m[1]))];
        if (!ids.length) continue;
        const docs=[...html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
        const group=docs.find(d=>['Product','ProductGroup'].includes(d['@type']));
        need(group?.name,'Product page lacks an unambiguous product name');
        const variations=ids.map(id=>{
            need(CATALOG[id] && !seen.has(id),'Missing or duplicate product definition');seen.add(id);
            const p=CATALOG[id];need(Number.isSafeInteger(p.price)&&p.price>0,'Invalid catalog price');
            const ld=group['@type']==='ProductGroup' ? group.hasVariant.find(v=>v.name===p.name) : group;
            need(ld?.name===p.name && Number(ld.offers?.price)===p.price && ld.offers?.priceCurrency==='JPY','Page/catalog price or name mismatch');
            return {id,name:p.name,price:p.price,currency:'JPY',sku:PREFIX+id};
        });
        groups.push({key:file.slice(0,-5),name:group.name,variations});
    }
    need(seen.size===Object.keys(CATALOG).length,'Not all catalog products have a page');
    return {schema:1,source:'worker/src/catalog.js + products/*.html JSON-LD',groups,shipping:SHIPPING};
}
export function settingsCheck(s) {
    need(s && Object.keys(s).sort().join() === ['applicationId','environment','locationId'].sort().join(),'Only Sandbox environment/Application ID/Location ID may be configured');
    need(s.environment==='sandbox' && /^sandbox-sq0idb-[A-Za-z0-9_-]+$/.test(s.applicationId) && !/REPLACE|CHANGEME/i.test(s.applicationId),'Sandbox Application ID required');
    need(typeof s.locationId==='string' && /^[A-Z0-9]{8,64}$/.test(s.locationId) && s.locationId!=='LQ693S4H2NBZ8' && !/REPLACE|CHANGEME/i.test(s.locationId),'Sandbox Location ID required');
    return s;
}
export class SandboxCatalogClient {
    constructor(settings, token, {transport=fetch,genericTokenPresent=false}={}) {
        this.settings=Object.freeze({...settingsCheck(settings)});
        need(!genericTokenPresent,'Generic/production token binding must not be present');
        need(typeof token==='string' && token.length>0 && token===token.trim() && !/REPLACE|CHANGEME|^sq0atp-/i.test(token),'Dedicated Sandbox token required');
        this.transport=transport; this.token=token; this.verified=false;
    }
    async request(route, method='GET', body) {
        const url=new URL(route,BASE);
        need(url.origin===BASE && !url.username && !url.password && /^\/v2\/(locations|catalog\/list|catalog\/batch-upsert|inventory\/counts\/batch-retrieve|inventory\/changes\/batch-create|inventory\/changes\/batch-retrieve)$/.test(url.pathname),'Non-Sandbox or unknown destination refused');
        need(this.verified || method==='GET' && url.pathname==='/v2/locations','Validate Sandbox location before catalog/inventory requests');
        let response;
        try { response=await this.transport(url.href,{method,redirect:'manual',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${this.token}`,'Square-Version':VERSION,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}); }
        catch { throw new SeedError('Sandbox request failed; review pending journal before any retry'); }
        need(response.status>=200 && response.status<300,'Sandbox rejected request or redirect; response details suppressed');
        let data;try { data=await response.json(); } catch { throw new SeedError('Sandbox returned invalid JSON'); }
        need(!data.errors?.length,'Sandbox API reported errors; response details suppressed');
        return data;
    }
    async preflight() {
        const result=await this.request('/v2/locations');
        const locations=(result.locations||[]).filter(l=>l.id===this.settings.locationId);
        need(locations.length===1 && locations[0].status==='ACTIVE' && locations[0].country==='JP' && locations[0].currency==='JPY','Sandbox token/Location/Japan/JPY check failed');
        this.verified=true;
    }
    async catalog() {
        const byId=new Map();let cursor;const cursors=new Set();
        const add=o=>{ const previous=byId.get(o.id);need(!previous||JSON.stringify(previous)===JSON.stringify(o),'Inconsistent catalog snapshot');byId.set(o.id,o);for(const v of o.item_data?.variations||[])add(v); };
        for(let page=0;page<500;page++) {
            const query=new URLSearchParams({types:'ITEM,ITEM_VARIATION'});if(cursor)query.set('cursor',cursor);
            const data=await this.request('/v2/catalog/list?'+query);for(const o of data.objects||[])add(o);
            cursor=data.cursor;if(!cursor)return [...byId.values()];need(!cursors.has(cursor),'Repeated catalog cursor');cursors.add(cursor);
        }
        throw new SeedError('Catalog scan incomplete; no creation permitted');
    }
}
function ownedMarker(group) { return PREFIX+'item:'+group.key; }
function validVariationId(id) { return typeof id==='string' && /^[A-Z0-9]{8,64}$/.test(id) && !Object.values(CATALOG).some(p=>p.squareVariationId===id); }
function atLocation(o,location) { return o.present_at_all_locations===false && o.present_at_location_ids?.length===1 && o.present_at_location_ids[0]===location; }
export function inspectCatalog(plan,objects,settings) {
    const missing=[];const variations={};const items={};
    for(const group of plan.groups) {
        const matches=objects.filter(o=>o.type==='ITEM'&&o.item_data?.description===ownedMarker(group));
        need(matches.length<=1,'Duplicate managed items; manual review required');
        const item=matches[0];
        if(!item) {
            need(!objects.some(o=>o.type==='ITEM'&&o.item_data?.name===group.name || o.type==='ITEM_VARIATION'&&group.variations.some(v=>v.sku===o.item_variation_data?.sku)),'Existing unowned item/SKU collision; refuse automatic adoption');
            missing.push(group);continue;
        }
        need(!item.is_deleted && item.item_data.name===group.name && atLocation(item,settings.locationId),'Existing managed item differs or has another location');
        need(item.item_data.variations?.length===group.variations.length,'Existing managed item has missing/extra variations');
        items[group.key]=item.id;
        for(const v of group.variations) {
            const candidates=objects.filter(o=>o.type==='ITEM_VARIATION'&&o.item_variation_data?.sku===v.sku);
            need(candidates.length===1,'Missing/duplicate managed variation');const o=candidates[0],d=o.item_variation_data;
            need(validVariationId(o.id)&&!o.is_deleted&&d.item_id===item.id&&d.name===v.name&&d.pricing_type==='FIXED_PRICING'&&Number(d.price_money?.amount)===v.price&&d.price_money?.currency===v.currency&&d.track_inventory===true&&atLocation(o,settings.locationId),'Existing variation differs; no automatic overwrite');
            variations[v.id]=o.id;
        }
    }
    need(new Set(Object.values(variations)).size===Object.keys(variations).length,'Variation mapping collision');
    return {missing,variations,items};
}
export function batchBody(groups,locationId,key=randomUUID()) {
    return {idempotency_key:key,batches:[{objects:groups.map(g=>({type:'ITEM',id:'#item-'+g.key,present_at_all_locations:false,present_at_location_ids:[locationId],item_data:{name:g.name,description:ownedMarker(g),variations:g.variations.map(v=>({type:'ITEM_VARIATION',id:'#var-'+v.id,present_at_all_locations:false,present_at_location_ids:[locationId],item_variation_data:{item_id:'#item-'+g.key,name:v.name,sku:v.sku,pricing_type:'FIXED_PRICING',price_money:{amount:v.price,currency:v.currency},track_inventory:true}}))}}))}]};
}
export async function seedCatalog(client,plan,store) {
    await client.preflight();const identity=hash({settings:client.settings,plan});
    const previous=await store.read('catalog-journal');
    need(!previous||previous.identity===identity,'Seed source/account changed; review old journal');
    let found=inspectCatalog(plan,await client.catalog(),client.settings);
    if(found.missing.length) {
        need(!previous,'Previous create outcome is pending or objects were changed/deleted; never create again blindly');
        const body=batchBody(found.missing,client.settings.locationId,'yasoya-catalog-v1-'+hash({identity,groups:found.missing}));
        // Durable write BEFORE sending, so a crash cannot produce a fresh request/key.
        await store.write('catalog-journal',{schema:1,identity,phase:'pending',body});
        await client.request('/v2/catalog/batch-upsert','POST',body);
        found=inspectCatalog(plan,await client.catalog(),client.settings);
        need(!found.missing.length,'Created catalog not fully visible; retain pending journal');
    }
    const mapping={schema:1,applicationId:client.settings.applicationId,locationId:client.settings.locationId,sourceDigest:hash(plan),variations:found.variations,items:found.items};
    await store.write('square-variations',mapping);
    await store.write('catalog-journal',{schema:1,identity,phase:'verified',mapping});
    return mapping;
}
export function inventoryQuantities(plan,input) {
    const ids=plan.groups.flatMap(g=>g.variations.map(v=>v.id));
    need(input && Object.keys(input).sort().join()===ids.sort().join(),'Explicit quantity for every existing product ID required');
    need(Object.values(input).every(v=>Number.isSafeInteger(v)&&v>=0&&v<=1000),'Test stock must be an explicit integer from 0 to 1000');
    return input;
}
export async function initializeInventory(client,plan,quantities,store) {
    inventoryQuantities(plan,quantities);await client.preflight();
    const mapping=await store.read('square-variations');need(mapping,'Create and verify Sandbox catalog first');
    need(mapping.locationId===client.settings.locationId && mapping.applicationId===client.settings.applicationId && mapping.sourceDigest===hash(plan),'Mapping account/source mismatch');
    const current=inspectCatalog(plan,await client.catalog(),client.settings);
    need(!current.missing.length&&JSON.stringify(current.variations)===JSON.stringify(mapping.variations),'Catalog/mapping changed');
    const identity=hash({mapping,quantities});const previous=await store.read('inventory-journal');
    if(previous) {
        need(previous.identity===identity,'Inventory initialization inputs changed; never reset existing stock');
        need(previous.phase==='verified','Inventory outcome unknown; inspect history manually, never resend/reset');
        return {alreadyInitialized:true};
    }
    const ids=Object.values(mapping.variations);
    const data=await client.request('/v2/inventory/counts/batch-retrieve','POST',{catalog_object_ids:ids,location_ids:[client.settings.locationId]});
    need(!(data.counts||[]).length&&!data.cursor,'Existing inventory or incomplete snapshot; initialization refused');
    const history=await client.request('/v2/inventory/changes/batch-retrieve','POST',{catalog_object_ids:ids,location_ids:[client.settings.locationId]});
    need(!(history.changes||[]).length&&!history.cursor,'Inventory history exists or is incomplete; initialization refused');
    const key='yasoya-inventory-v1-'+identity,occurredAt=new Date().toISOString();
    const body={idempotency_key:key,changes:Object.entries(quantities).map(([id,quantity])=>({type:'PHYSICAL_COUNT',physical_count:{reference_id:PREFIX+key,catalog_object_id:mapping.variations[id],location_id:client.settings.locationId,state:'IN_STOCK',quantity:String(quantity),occurred_at:occurredAt}}))};
    await store.write('inventory-journal',{schema:1,identity,phase:'pending',body});
    await client.request('/v2/inventory/changes/batch-create','POST',body);
    const result=await client.request('/v2/inventory/counts/batch-retrieve','POST',{catalog_object_ids:ids,location_ids:[client.settings.locationId],states:['IN_STOCK']});
    need(!result.cursor,'Incomplete post-initialization counts');
    const counts=result.counts||[];
    for(const [id,quantity] of Object.entries(quantities)) {
        const match=counts.filter(c=>c.catalog_object_id===mapping.variations[id]&&c.location_id===client.settings.locationId&&c.state==='IN_STOCK');
        need(match.length===1&&Number(match[0].quantity)===quantity,'Initial counts not confirmed; retain pending journal');
    }
    await store.write('inventory-journal',{schema:1,identity,phase:'verified',body});return {alreadyInitialized:false};
}
export function diskStore(directory) {
    const file=name=>{need(/^[a-z-]+$/.test(name),'Invalid journal name');return path.join(directory,name+'.local.json');};
    return {
        async read(name) { try{return JSON.parse(await readFile(file(name),'utf8'));}catch(error){if(error.code==='ENOENT')return null;throw new SeedError('Journal unreadable; do not overwrite');} },
        async write(name,value) {
            await mkdir(directory,{recursive:true,mode:0o700});const target=file(name),tmp=target+'.'+randomUUID()+'.tmp';
            const handle=await open(tmp,'wx',0o600);try{await handle.writeFile(JSON.stringify(value,null,2)+'\n');await handle.sync();}finally{await handle.close();}
            await rename(tmp,target);const dir=await open(directory,'r');try{await dir.sync();}finally{await dir.close();}
        },
        async lock(action) {
            await mkdir(directory,{recursive:true,mode:0o700});const lock=path.join(directory,'square-seed.lock');let handle;
            try{handle=await open(lock,'wx',0o600);}catch{throw new SeedError('Another operation or stale lock exists; manual review required');}
            try{return await action();}finally{await handle.close();await unlink(lock);}
        }
    };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
    try {
        const command=process.argv[2]||'plan';const plan=await productPlan();
        if(command==='plan') {need(process.argv.length<=3,'Plan accepts no token/URL arguments');console.log(JSON.stringify(plan,null,2));}
        else {
            need(['catalog','inventory'].includes(command)&&process.argv.length===4&&process.argv[3]==='--approve-sandbox-write','Explicit Sandbox write approval flag required');
            const here=fileURLToPath(new URL('.',import.meta.url));
            const settings=JSON.parse(await readFile(path.join(here,'square-seed.local.json'),'utf8'));
            const client=new SandboxCatalogClient(settings,process.env.SQUARE_SANDBOX_ACCESS_TOKEN,{genericTokenPresent:'SQUARE_ACCESS_TOKEN' in process.env});
            const store=diskStore(path.join(here,'.generated'));
            await store.lock(async()=>{
                if(command==='catalog') await seedCatalog(client,plan,store);
                else {const quantities=JSON.parse(await readFile(path.join(here,'square-stock.local.json'),'utf8'));await initializeInventory(client,plan,quantities,store);}
            });
            console.log('Sandbox operation verified. Mapping/journal saved under ignored .generated; no secret values saved.');
        }
    } catch(error) {console.error(error instanceof SeedError?error.message:'Preparation failed; details suppressed to protect credentials. No automatic retry.');process.exitCode=1;}
}
