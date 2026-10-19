import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { CATALOG } from '../worker/src/catalog.js';
import { productPlan, SandboxCatalogClient, seedCatalog, initializeInventory, inspectCatalog, inventoryQuantities, diskStore } from '../validation/seed-square.mjs';
const settings={environment:'sandbox',applicationId:'sandbox-sq0idb-offline-test',locationId:'SANDBOXLOC001'};
const token='offline-sandbox-token-not-real';
const plan=await productPlan();
class MemoryStore {
    data=new Map();
    async read(key){return structuredClone(this.data.get(key)||null);}
    async write(key,value){this.data.set(key,structuredClone(value));}
}
class SquareDouble {
    objects=[];counts=[];history=[];posts=0;inventoryPosts=0;requests=[];loseCatalog=false;loseInventory=false;country='JP';
    transport=async (url,options)=>{
        const u=new URL(url);this.requests.push({url,method:options.method});
        assert.equal(u.origin,'https://connect.squareupsandbox.com');assert.equal(options.redirect,'manual');
        assert.equal(options.headers.Authorization,'Bearer '+token);
        if(u.pathname==='/v2/locations')return Response.json({locations:[{id:settings.locationId,status:'ACTIVE',country:this.country,currency:'JPY'}]});
        if(u.pathname==='/v2/catalog/list') {
            const offset=Number(u.searchParams.get('cursor')||0);const data={objects:this.objects.slice(offset,offset+2)};
            if(offset+2<this.objects.length)data.cursor=String(offset+2);return Response.json(data);
        }
        const body=JSON.parse(options.body);
        if(u.pathname==='/v2/catalog/batch-upsert') {
            this.posts++;
            for(const source of body.batches[0].objects) {
                const item=structuredClone(source);item.id='TESTITEM'+String(this.objects.filter(o=>o.type==='ITEM').length+1).padStart(4,'0');
                for(const v of item.item_data.variations){v.id='TESTVAR'+String(this.objects.filter(o=>o.type==='ITEM_VARIATION').length+1).padStart(4,'0');v.item_variation_data.item_id=item.id;this.objects.push(structuredClone(v));}
                this.objects.push(item);
            }
            if(this.loseCatalog)throw new Error('Secret '+token+' should never be surfaced');
            return Response.json({id_mappings:[]});
        }
        if(u.pathname==='/v2/inventory/changes/batch-retrieve')return Response.json({changes:this.history});
        if(u.pathname==='/v2/inventory/counts/batch-retrieve')return Response.json({counts:this.counts});
        assert.equal(u.pathname,'/v2/inventory/changes/batch-create');this.inventoryPosts++;
        this.counts=body.changes.map(({physical_count:p})=>({catalog_object_id:p.catalog_object_id,location_id:p.location_id,state:p.state,quantity:p.quantity}));
        if(this.loseInventory)throw new Error('Response lost after stock initialization');return Response.json({});
    };
    client(){return new SandboxCatalogClient(settings,token,{transport:this.transport});}
}
const quantities=Object.fromEntries(Object.keys(CATALOG).map(id=>[id,1]));

test('catalog plan comes from actual HTML and catalog: 3 groups / 4 variations / exact prices',()=>{
    assert.equal(plan.groups.length,3);assert.equal(plan.groups.flatMap(g=>g.variations).length,4);
    for(const v of plan.groups.flatMap(g=>g.variations)){assert.equal(v.name,CATALOG[v.id].name);assert.equal(v.price,CATALOG[v.id].price);assert.equal(v.currency,'JPY');}
    assert.equal(plan.shipping.flatRate,350);assert.equal(plan.shipping.freeThreshold,3000);
    assert.equal(plan.groups.find(g=>g.key==='goldenrod').variations.length,2);
});
test('HTML/catalog mismatch refuses preparation rather than guessing',async()=>{
    const root=await mkdtemp(path.join(os.tmpdir(),'yasoya-source-test-'));await mkdir(path.join(root,'products'));
    for(const file of ['lemonbalm.html','yomogi.html','goldenrod.html']){
        const html=await readFile(new URL('../products/'+file,import.meta.url),'utf8');
        await writeFile(path.join(root,'products',file),file==='lemonbalm.html'?html.replace('"price": "980"','"price": "981"'):html);
    }
    await assert.rejects(productPlan(root),/mismatch/);
});
test('production settings, tokens, generic bindings and custom API URLs fail before transport',async()=>{
    let calls=0;const transport=()=>{calls++;throw new Error('must not call');};
    for(const patch of [{environment:'production'},{locationId:'LQ693S4H2NBZ8'},{applicationId:'sq0idp-production'},{apiBase:'https://connect.squareup.com'}])assert.throws(()=>new SandboxCatalogClient({...settings,...patch},token,{transport}));
    assert.throws(()=>new SandboxCatalogClient(settings,'',{transport}));
    assert.throws(()=>new SandboxCatalogClient(settings,'sq0atp-production',{transport}));
    assert.throws(()=>new SandboxCatalogClient(settings,token,{transport,genericTokenPresent:true}));
    const client=new SandboxCatalogClient(settings,token,{transport});
    await assert.rejects(client.request('https://connect.squareup.com/v2/locations'));
    await assert.rejects(client.request('/v2/catalog/batch-upsert','POST',{}));assert.equal(calls,0);
});
test('Sandbox preflight rejects wrong country/location and never follows a redirect',async()=>{
    const fake=new SquareDouble();fake.country='US';await assert.rejects(seedCatalog(fake.client(),plan,new MemoryStore()));assert.equal(fake.posts,0);
    const c=new SandboxCatalogClient(settings,token,{transport:async()=>new Response(null,{status:302,headers:{Location:'https://connect.squareup.com'}})});
    await assert.rejects(c.preflight(),/redirect/);
});
test('empty library creates one batch, maps all variations, and repeat is read-only',async()=>{
    const fake=new SquareDouble(),store=new MemoryStore();
    const first=await seedCatalog(fake.client(),plan,store);assert.equal(fake.posts,1);assert.equal(Object.keys(first.variations).length,4);
    assert.deepEqual(await seedCatalog(fake.client(),plan,store),first);assert.equal(fake.posts,1);
    const saved=JSON.stringify([...store.data]);assert(!saved.includes(token));assert(!saved.includes('Authorization'));
    assert(!saved.includes('RRTIT6N4QLIYPUW633WDBG36'));
});
test('unmanaged existing name/SKU collisions are not adopted or duplicated',async()=>{
    const fake=new SquareDouble();fake.objects=[{type:'ITEM',id:'OTHERITEM',item_data:{name:plan.groups[0].name}}];
    await assert.rejects(seedCatalog(fake.client(),plan,new MemoryStore()),/collision/);assert.equal(fake.posts,0);
});
test('managed price change and duplicate managed items fail without overwriting',async()=>{
    const fake=new SquareDouble(),store=new MemoryStore();await seedCatalog(fake.client(),plan,store);
    const original=structuredClone(fake.objects);fake.objects.find(o=>o.type==='ITEM_VARIATION').item_variation_data.price_money.amount=1;
    await assert.rejects(seedCatalog(fake.client(),plan,store));assert.equal(fake.posts,1);
    fake.objects=original;const duplicate=structuredClone(fake.objects.find(o=>o.type==='ITEM'));duplicate.id='DUPLICATEITEM';fake.objects.push(duplicate);
    await assert.rejects(seedCatalog(fake.client(),plan,store),/Duplicate/);assert.equal(fake.posts,1);
});
test('lost catalog response is recovered by complete catalog scan, without second create',async()=>{
    const fake=new SquareDouble(),store=new MemoryStore();fake.loseCatalog=true;
    await assert.rejects(seedCatalog(fake.client(),plan,store),error=>!error.message.includes(token));
    assert.equal((await store.read('catalog-journal')).phase,'pending');
    fake.loseCatalog=false;const map=await seedCatalog(fake.client(),plan,store);
    assert.equal(Object.keys(map.variations).length,4);assert.equal(fake.posts,1);
});
test('unknown or deleted create result never receives a new key/new POST',async()=>{
    const fake=new SquareDouble(),store=new MemoryStore();fake.loseCatalog=true;
    await assert.rejects(seedCatalog(fake.client(),plan,store));fake.objects=[];fake.loseCatalog=false;
    await assert.rejects(seedCatalog(fake.client(),plan,store),/never create again/);assert.equal(fake.posts,1);
});
test('inventory requires explicit quantities and never resets stock on repeat after a sale',async()=>{
    assert.throws(()=>inventoryQuantities(plan,{}));assert.throws(()=>inventoryQuantities(plan,{...quantities,'lemonbalm-10g':null}));
    assert.throws(()=>inventoryQuantities(plan,{...quantities,'lemonbalm-10g':-1}));
    const fake=new SquareDouble(),store=new MemoryStore();await seedCatalog(fake.client(),plan,store);
    await initializeInventory(fake.client(),plan,quantities,store);assert.equal(fake.inventoryPosts,1);
    fake.counts[0].quantity='0';
    assert.equal((await initializeInventory(fake.client(),plan,quantities,store)).alreadyInitialized,true);
    assert.equal(fake.counts[0].quantity,'0');assert.equal(fake.inventoryPosts,1);
    await assert.rejects(initializeInventory(fake.client(),plan,{...quantities,'lemonbalm-10g':20},store),/changed/);
});
test('existing inventory including zero refuses physical count initialization',async()=>{
    const fake=new SquareDouble(),store=new MemoryStore();const map=await seedCatalog(fake.client(),plan,store);
    fake.counts=[{catalog_object_id:Object.values(map.variations)[0],location_id:settings.locationId,state:'IN_STOCK',quantity:'0'}];
    await assert.rejects(initializeInventory(fake.client(),plan,quantities,store),/Existing inventory/);assert.equal(fake.inventoryPosts,0);
});
test('lost inventory response remains pending and cannot reset or double-initialize',async()=>{
    const fake=new SquareDouble(),store=new MemoryStore();await seedCatalog(fake.client(),plan,store);fake.loseInventory=true;
    await assert.rejects(initializeInventory(fake.client(),plan,quantities,store));fake.loseInventory=false;
    await assert.rejects(initializeInventory(fake.client(),plan,quantities,store),/outcome unknown/);assert.equal(fake.inventoryPosts,1);
});
test('disk journals are private, retain state across reopen and reject concurrent/stale locks',async()=>{
    const dir=await mkdtemp(path.join(os.tmpdir(),'yasoya-journal-test-'));const store=diskStore(dir);
    await store.lock(async()=>{await store.write('example',{phase:'pending'});await assert.rejects(store.lock(()=>{}),/lock/);});
    assert.equal((await diskStore(dir).read('example')).phase,'pending');assert.equal((await stat(path.join(dir,'example.local.json'))).mode&0o777,0o600);
    await writeFile(path.join(dir,'square-seed.lock'),'stale');await assert.rejects(store.lock(()=>{}),/lock/);
});
test('offline plan ignores token contents and prints no credential data',()=>{
    const result=spawnSync(process.execPath,['validation/seed-square.mjs','plan'],{cwd:new URL('../',import.meta.url),encoding:'utf8',env:{...process.env,SQUARE_SANDBOX_ACCESS_TOKEN:token}});
    assert.equal(result.status,0);assert.equal(JSON.parse(result.stdout).groups.length,3);assert(!result.stdout.includes(token));assert(!result.stderr.includes(token));
});


test('zero live counts with historical stock changes cannot be re-initialized',async()=>{
    const fake=new SquareDouble(),store=new MemoryStore();await seedCatalog(fake.client(),plan,store);
    fake.history=[{type:'PHYSICAL_COUNT',physical_count:{quantity:'0'}}];
    await assert.rejects(initializeInventory(fake.client(),plan,quantities,store),/history exists/);
    assert.equal(fake.inventoryPosts,0);
});
