import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { assertReviewIdentity, assertReviewInputs, REVIEW_TARGET } from '../validation/actions-review.mjs';
import { productPlan } from '../validation/seed-square.mjs';
const sha='a'.repeat(40);
const identity={GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REPOSITORY:'awaiaune/yasoyahonten',GITHUB_REF:'refs/heads/dev/local-isolation',EXPECTED_SHA:sha};
test('Actions review rejects automatic events, main, other repositories and a different commit',()=>{
    assert.doesNotThrow(()=>assertReviewIdentity(identity,sha));
    for(const patch of [{GITHUB_EVENT_NAME:'push'},{GITHUB_EVENT_NAME:'pull_request'},{GITHUB_REF:'refs/heads/main'},{GITHUB_REPOSITORY:'other/repository'},{EXPECTED_SHA:'b'.repeat(40)},{EXPECTED_SHA:'$(echo unsafe)'}]) assert.throws(()=>assertReviewIdentity({...identity,...patch},sha));
});
const plan=await productPlan();
function bundle(){
    const variations={'lemonbalm-10g':'OFFLINEVAR001','yomogi-10g':'OFFLINEVAR002','goldenrod-leaf-10g':'OFFLINEVAR003'};
    const manifest={...REVIEW_TARGET,workerName:'yasoya-payments-validation',databaseName:'yasoya-validation-orders',variations,notificationEmail:'test@example.invalid'};
    const settings={environment:'sandbox',applicationId:manifest.squareApplicationId,locationId:manifest.squareLocationId};
    const mapping={schema:1,applicationId:settings.applicationId,locationId:settings.locationId,sourceDigest:createHash('sha256').update(JSON.stringify(plan)).digest('hex'),variations:{...variations},items:Object.fromEntries(plan.groups.map((g,i)=>[g.key,'OFFLINEITEM00'+i]))};
    return {manifest,settings,mapping};
}
test('Actions inputs require the reviewed account, marker, database, Access, sender and origin',()=>{
    assert.doesNotThrow(()=>assertReviewInputs(bundle(),plan));
    for(const [key,value] of Object.entries({accountId:'b'.repeat(32),databaseId:'11111111-1111-4111-8111-111111111111',instanceId:'22222222-2222-4222-8222-222222222222',workerOrigin:'https://yasoya-payments-validation.other.workers.dev',squareLocationId:'OTHERLOCATION',accessAudience:'a'.repeat(64),accessTeamDomain:'other.cloudflareaccess.com',resendFrom:'other@example.invalid'})){
        const input=bundle();input.manifest[key]=value;assert.throws(()=>assertReviewInputs(input,plan));
    }
});
test('Actions inputs reject embedded credentials, stale catalog and remapped variation IDs',()=>{
    for(const mutate of [x=>x.token='not-a-real-secret',x=>x.manifest.SQUARE_SANDBOX_ACCESS_TOKEN='not-a-real-secret',x=>x.settings.token='not-a-real-secret',x=>x.mapping.secret='not-a-real-secret',x=>x.mapping.sourceDigest='stale',x=>x.mapping.variations['lemonbalm-10g']='OTHERID001']){
        const input=bundle();mutate(input);assert.throws(()=>assertReviewInputs(input,plan));
    }
});
