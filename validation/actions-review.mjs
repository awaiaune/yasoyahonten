// Offline GitHub Actions input validation. No API calls or credential reads.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertManifest, VALIDATION_ORIGIN } from './safety.js';
import { assertSavedMapping } from './mapping.mjs';
import { productPlan } from './seed-square.mjs';
export const REVIEW_TARGET = Object.freeze({
    accountId:'fcf37e462257810df77e8fbc0e7f4317',
    databaseId:'df419687-581f-4935-9754-fcd8bff7ba2b',
    instanceId:'735cc795-76ef-4dbf-84f0-f781b1dfb418',
    squareApplicationId:'sandbox-sq0idb-HLcXmwmBqDL1WpF0G5eQEw',
    squareLocationId:'LHD4ZZ1ZYPHD1',
    accessTeamDomain:'white-hill-a411.cloudflareaccess.com',
    accessAudience:'46e44c389e80f8753222dade83963111c4e46330a97c7c9d226369ed7fb7ae40',
    workerOrigin:VALIDATION_ORIGIN,
    resendFrom:'validation@send.awaiaune.com'
});
function need(ok) { if (!ok) throw new Error('Validation Actions review refused'); }
export function assertReviewIdentity(env, head) {
    need(env.GITHUB_EVENT_NAME==='workflow_dispatch');
    need(env.GITHUB_REPOSITORY==='awaiaune/yasoyahonten');
    need(env.GITHUB_REF==='refs/heads/dev/local-isolation');
    need(/^[a-f0-9]{40}$/.test(env.EXPECTED_SHA || '') && env.EXPECTED_SHA===head);
}
export function assertReviewInputs(input, plan) {
    need(input && Object.keys(input).sort().join()===['manifest','mapping','settings'].sort().join());
    const m=assertManifest(input.manifest);
    for (const [key,value] of Object.entries(REVIEW_TARGET)) need(m[key]===value);
    assertSavedMapping(m,input.mapping,input.settings,plan);
    return input;
}
async function save(file, value) { await writeFile(file,JSON.stringify(value,null,2)+'\n',{mode:0o600}); }
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
    try {
        const here=fileURLToPath(new URL('.',import.meta.url));
        if (process.argv[2]==='identity') {
            assertReviewIdentity(process.env,execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim());
            console.log('Manual event, source branch and reviewed SHA match.');
        } else if (process.argv[2]==='restore') {
            const raw=process.env.VALIDATION_REVIEW_INPUTS;
            need(typeof raw==='string' && Buffer.byteLength(raw)<=30000);
            const input=assertReviewInputs(JSON.parse(raw),await productPlan());
            await mkdir(here+'.generated',{recursive:true});
            await save(here+'manifest.local.json',input.manifest);
            await save(here+'square-seed.local.json',input.settings);
            await save(here+'.generated/square-variations.local.json',input.mapping);
            console.log('Reviewed settings restored without logging their contents.');
        } else if (process.argv[2]==='export') {
            const load=async name=>JSON.parse(await readFile(here+name,'utf8'));
            const input=assertReviewInputs({manifest:await load('manifest.local.json'),settings:await load('square-seed.local.json'),mapping:await load('.generated/square-variations.local.json')},await productPlan());
            await save(here+'.generated/validation-review-inputs.local.json',input);
            console.log('Ignored review bundle prepared. It contains identifiers only, no access tokens.');
        } else need(false);
    } catch { console.error('Validation Actions review refused. No remote operation was attempted.');process.exitCode=1; }
}
