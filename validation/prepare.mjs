// Offline preparation only. Deliberately provides no deploy command.
import { readFile, writeFile, mkdir, readdir, lstat, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertManifest, assertConfig, environmentVars, WORKER, DATABASE } from './safety.js';
import { assertSavedMapping } from './mapping.mjs';
import { productPlan } from './seed-square.mjs';
import { SANDBOX_CATALOG, RETIRED_SANDBOX_ID } from './catalog.js';
export function makeConfig(m) {
    assertManifest(m);
    return { name: WORKER, account_id: m.accountId, main: './sandbox-worker.js', compatibility_date: '2026-08-04', workers_dev: true, preview_urls: false, routes: [],
        assets: {directory:'./.generated/site',binding:'ASSETS',run_worker_first:true}, vars: environmentVars(m),
        d1_databases: [{binding:'ORDERS_DB',database_name:DATABASE,database_id:m.databaseId}],
        durable_objects: {bindings:[{name:'PURCHASE_COORDINATOR',class_name:'SandboxPurchaseCoordinator'}]},
        migrations: [{tag:'v1-validation',new_sqlite_classes:['SandboxPurchaseCoordinator']}] };
}
export function storefrontConfig(m) {
    assertManifest(m);
    return `window.YASOYA_STORE_CONFIG=Object.freeze(${JSON.stringify({environment:'sandbox',squareApplicationId:m.squareApplicationId,squareLocationId:m.squareLocationId,workerBaseUrl:m.workerOrigin,currency:'JPY'})});\n`;
}
export function renderHtml(html) {
    // Transform only the generated validation copy, never the production HTML.
    html = html.replace(/<label\b[^>]*>[\s\S]*?<\/label>/g, label =>
        label.includes(`data-product-id="${RETIRED_SANDBOX_ID}"`) ? '' : label);
    html = html.replace(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g, (tag, json) => {
        const data = JSON.parse(json);
        if (data['@type'] === 'ProductGroup' && data.productGroupID === 'goldenrod') {
            const leaf = data.hasVariant.find(v => v.sku === 'goldenrod-leaf-10g');
            if (!leaf) throw new Error('Missing leaf structured data');
            return `<script type="application/ld+json">${JSON.stringify({...leaf, '@context':'https://schema.org', name:SANDBOX_CATALOG['goldenrod-leaf-10g'].name})}</script>`;
        }
        if (data.mainEntity?.['@type'] === 'ItemList') {
            for (const entry of data.mainEntity.itemListElement || []) {
                if (entry.url?.endsWith('/products/goldenrod.html')) entry.name = SANDBOX_CATALOG['goldenrod-leaf-10g'].name;
            }
            return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
        }
        return tag;
    });
    html = html.replaceAll(`goldenrod-leaf-10g,${RETIRED_SANDBOX_ID}`, 'goldenrod-leaf-10g')
        .replaceAll('乾燥セイタカアワダチソウ 葉 10g', SANDBOX_CATALOG['goldenrod-leaf-10g'].name)
        .replace('セイタカアワダチソウ 乾燥葉・葉と茎', SANDBOX_CATALOG['goldenrod-leaf-10g'].name)
        .replace('葉はハーブティーに、葉と茎は薬草風呂やフェイシャルスチームに。', '葉はハーブティーやフェイシャルスチームに。')
        .replace('用途に合わせて、葉のみ、または葉と茎をお選びいただけます。', '葉10gをお届けします。')
        .replace(/<(h2|h3)>\s*セイタカアワダチソウ\s*<\/\1>/g, (_, tag) => `<${tag}>${SANDBOX_CATALOG['goldenrod-leaf-10g'].name}</${tag}>`)
        .replace(/<h2>\s*乾燥セイタカアワダチソウ\s*<\/h2>/g, `<h2>${SANDBOX_CATALOG['goldenrod-leaf-10g'].name}</h2>`);
    if (html.includes(RETIRED_SANDBOX_ID) || html.includes('20g') || html.includes('葉と茎')) throw new Error('Retired product remains in validation HTML');
    return html.replace('https://web.squarecdn.com/v1/square.js','https://sandbox.web.squarecdn.com/v1/square.js')
        .replace(/<head\b[^>]*>/i,'$&<script src="/js/store-config.js"></script>');
}
export function renderCartScript(script) {
    // A fresh Sandbox cart avoids loading previously stored retired products.
    const ids = JSON.stringify(Object.keys(SANDBOX_CATALOG));
    if (!script.includes('yasoya_honten_cart_v1') || !script.includes('if (!id || !name')) throw new Error('Cart source contract changed');
    return script.replace('yasoya_honten_cart_v1', 'yasoya_sandbox_cart_v2')
        .replace('if (!id || !name', `if (!${ids}.includes(id) || !id || !name`);
}
export function markerSql(m) {
    assertManifest(m);
    return `-- ONLY on the separately created validation D1; verify its UUID first.\nCREATE TABLE IF NOT EXISTS validation_environment (id INTEGER PRIMARY KEY CHECK(id=1), instance_id TEXT NOT NULL);\nINSERT INTO validation_environment (id,instance_id) VALUES (1,'${m.instanceId}');\n`;
}
async function copyPublic(source, dest, m) {
    const stat = await lstat(source);
    if (stat.isSymbolicLink()) throw new Error('Symlinks are not allowed in validation assets');
    if (stat.isDirectory()) {
        await mkdir(dest,{recursive:true});
        for (const name of await readdir(source)) await copyPublic(path.join(source,name),path.join(dest,name),m);
    } else if (source.endsWith('.html')) await writeFile(dest,renderHtml(await readFile(source,'utf8')));
    else if (path.basename(source)==='store-config.js') await writeFile(dest,storefrontConfig(m));
    else if (path.basename(source)==='cart.js') await writeFile(dest,renderCartScript(await readFile(source,'utf8')));
    else await copyFile(source,dest);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        const here = fileURLToPath(new URL('.',import.meta.url));
        const m = assertManifest(JSON.parse(await readFile(path.join(here,'manifest.local.json'),'utf8')));
        const mapping = JSON.parse(await readFile(path.join(here,'.generated/square-variations.local.json'),'utf8'));
        const settings = JSON.parse(await readFile(path.join(here,'square-seed.local.json'),'utf8'));
        assertSavedMapping(m,mapping,settings,await productPlan());
        if (process.argv[2] === 'check') {
            const config = JSON.parse(await readFile(path.join(here,'wrangler.local.json'),'utf8')); assertConfig(config,m);
            console.log('Offline configuration check passed. Secret provenance and remote bindings NOT verified. Deployment still requires approval.');
        } else if (process.argv[2] === 'prepare') {
            const config=makeConfig(m); assertConfig(config,m);
            const root=path.resolve(here,'..'), site=path.join(here,'.generated/site'); await mkdir(site,{recursive:true});
            // Explicit public roots; never copy worker, dev, docs, .git, CNAME or credential files.
            for (const dir of ['admin','products','css','js','images']) await copyPublic(path.join(root,dir),path.join(site,dir),m);
            for (const name of await readdir(root)) if (name.endsWith('.html')) await copyPublic(path.join(root,name),path.join(site,name),m);
            await writeFile(path.join(site,'robots.txt'),'User-agent: *\nDisallow: /\n');
            await writeFile(path.join(here,'wrangler.local.json'),JSON.stringify(config,null,2)+'\n');
            await writeFile(path.join(here,'.generated/validation-marker.sql'),markerSql(m));
            console.log('Ignored validation artifacts prepared; no network request or deployment performed.');
        } else throw new Error('Use prepare or check. No deployment is performed by this tool.');
    } catch { console.error('Validation preparation refused. Check the local manifest/config; no deployment was attempted.'); process.exitCode=1; }
}
