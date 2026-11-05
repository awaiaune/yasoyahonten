// Actual production router/DO/D1, all Square/Resend transports replaced locally.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,body,advance,products} from './production-native-fixture.mjs';
import {SquarePaymentFailure, paymentFailureEvidence} from '../worker/src/payment-failure.js';
const flags={PRODUCTION_UNIFIED_PUBLISH_ENABLED:'0',PRODUCTION_STOREFRONT_PUBLISH_ENABLED:'1',
    PRODUCTION_CHECKOUT_ENABLED:'1',PRODUCTION_MANAGED_CHECKOUT_ENABLED:'1',
    PRODUCTION_MANAGEMENT_CATALOG_ENABLED:'0',PRODUCTION_MANAGEMENT_INVENTORY_ENABLED:'1'};
async function setup(t){return fixture(t,{env:flags,stocks:{'yomogi-10g':3,'lemonbalm-10g':1}});}
function refuse(f,{status=400,code='CARD_DECLINED',mode}={}){
    const fetch=f.fake.fetch.bind(f.fake);let posts=0;
    f.fake.fetch=async request=>{
        if(new URL(request.url).pathname==='/v2/payments'&&request.method==='POST'){
            posts++;
            if(mode==='timeout')throw new DOMException('private provider information','TimeoutError');
            if(mode==='malformed')return new Response('invalid response',{status:200});
            return Response.json({errors:[{code,detail:'private provider information'}]}, {status});
        }
        return fetch(request);
    };
    return ()=>posts;
}
for(const [status,code,outcome] of [[400,'CARD_DECLINED','rejected'],[400,'INVALID_VALUE','rejected'],
    [401,'UNAUTHORIZED','rejected'],[403,'INSUFFICIENT_PERMISSIONS','rejected'],
    [500,'INTERNAL_SERVER_ERROR','unknown'],[503,'SERVICE_UNAVAILABLE','unknown'],
    [400,'IDEMPOTENCY_KEY_REUSED','unknown'],[409,'IDEMPOTENCY_KEY_REUSED','unknown']]){
    test(`V59 Square ${status}/${code}: durable ${outcome}, no recharge or automatic release`,async t=>{
        const f=await setup(t),posts=refuse(f,{status,code}),b=body();
        const r=await f.call('/api/v1/payments',b),result=await r.json();
        assert.equal(r.status,202);assert.equal(result.paymentOutcome,outcome);
        assert.deepEqual(result.paymentFailure,paymentFailureEvidence(status,{errors:[{code}]}));
        assert.equal(result.paymentFailure.outcome,outcome);
        assert.equal(result.retryAllowed,false);assert.equal(result.recoveryRequired,true);
        assert.equal(result.ok,false);assert.equal(result.inventoryAdjusted,false);
        assert.equal(result.pausedVariations.length,1);
        for(let i=0;i<3;i++)await f.call('/api/v1/payments/status',{contractVersion:1,attemptId:b.attemptId});
        await f.call('/api/v1/payments',b);advance(f);await f.coordinator.alarm();
        assert.equal(posts(),1);assert.equal(f.fake.payments.size,0);
        assert.equal(f.fake.counts.get(products[1].variationId),3);
        assert.equal(f.native.prepare('SELECT COUNT(*) n FROM orders').get().n,2);
        assert.equal(f.mails.length,0);
        assert((await f.storage.get('sku-holds'))[f.env.SQUARE_LOCATION_ID+':'+products[1].variationId]?.includes(b.attemptId));
        const journal=JSON.stringify([...f.storage.data]);
        assert(!journal.includes('private provider information'));assert(!journal.includes(b.sourceId));
        const second=await f.call('/api/v1/payments',body());assert.equal(second.status,503);
        assert.equal(posts(),1);
    });
}
for(const mode of ['timeout','malformed'])test(`V59 ${mode}: unknown retained across repeated status calls`,async t=>{
    const f=await setup(t),posts=refuse(f,{mode}),b=body();
    const result=await (await f.call('/api/v1/payments',b)).json();
    assert.equal(result.paymentOutcome,'unknown');assert.equal(result.retryAllowed,false);
    await f.call('/api/v1/payments',b);advance(f);await f.coordinator.alarm();assert.equal(posts(),1);
    assert.equal(f.fake.counts.get(products[1].variationId),3);
});
test('V59 lost acceptance recovers while checkout OFF: one payment/debit/order, independent mail',async t=>{
    const f=await setup(t),b=body();f.fake.loseAfter='/v2/payments';f.fake.lookupFails=true;
    assert.equal((await (await f.call('/api/v1/payments',b)).json()).ok,false);
    f.env.PRODUCTION_CHECKOUT_ENABLED='0';f.env.PRODUCTION_MANAGED_CHECKOUT_ENABLED='0';
    f.fake.lookupFails=false;advance(f);await f.coordinator.alarm();await f.drain();
    for(let i=0;i<3;i++){
        const r=await (await f.call('/api/v1/payments/status',{contractVersion:1,attemptId:b.attemptId})).json();
        assert.equal(r.ok,true);assert.equal(r.paymentOutcome,'paid');assert.equal(r.paymentFailure,null);
    }
    assert.equal(f.fake.payments.size,1);assert.equal(f.fake.counts.get(products[1].variationId),2);
    assert.equal(f.native.prepare('SELECT COUNT(*) n FROM orders').get().n,3);
    assert.equal(f.mails.length,2);assert.equal(f.receipts.size,2);
    assert.equal(f.squareCalls.filter(c=>c.path==='/v2/payments'&&c.method==='POST').length,1);
    assert(!f.squareCalls.some(c=>c.path.startsWith('/v2/catalog/')&&c.method==='POST'));
    assert.equal((await f.call('/api/v1/payments',body())).status,503);
});
test('V59 matched FAILED payment is the only rejection evidence that permits a new attempt',async t=>{
    const f=await setup(t),b=body(),fetch=f.fake.fetch.bind(f.fake);let posts=0;
    f.fake.fetch=async request=>{
        if(new URL(request.url).pathname==='/v2/payments'&&request.method==='POST'){
            posts++;const v=await request.json();
            const p={id:'offline-failed',status:'FAILED',reference_id:v.reference_id,
                amount_money:v.amount_money,location_id:v.location_id};
            f.fake.payments.set(p.id,p);
            return Response.json({payment:p,errors:[{code:'CARD_DECLINED'}]},{status:400});
        }
        return fetch(request);
    };
    const r=await (await f.call('/api/v1/payments',b)).json();
    assert.equal(r.status,'declined');assert.equal(r.retryAllowed,true);assert.equal(r.paymentOutcome,'failed');
    assert.deepEqual(await f.storage.get('sku-holds'),{});
    await f.call('/api/v1/payments',b);assert.equal(posts,1);
    assert.equal(f.native.prepare('SELECT COUNT(*) n FROM orders').get().n,2);
    assert.equal(f.fake.counts.get(products[1].variationId),3);assert.equal(f.mails.length,0);
});
test('V59 mismatched failed-payment reference cannot release a hold',async t=>{
    const f=await setup(t),b=body(),fetch=f.fake.fetch.bind(f.fake);
    f.fake.fetch=async request=>new URL(request.url).pathname==='/v2/payments'&&request.method==='POST'
        ?Response.json({payment:{id:'wrong-order',status:'FAILED',reference_id:'not-this-order',
            amount_money:{amount:1330,currency:'JPY'},location_id:f.env.SQUARE_LOCATION_ID}},{status:400}):fetch(request);
    const r=await (await f.call('/api/v1/payments',b)).json();
    assert.equal(r.retryAllowed,false);assert.equal(r.recoveryRequired,true);assert.equal(r.pausedVariations.length,1);
});
test('V59 no evidence is fabricated for legacy unknown attempts',async t=>{
    const f=await setup(t),b=body();refuse(f,{mode:'timeout'});
    await f.call('/api/v1/payments',b);const r=await f.coordinator.ledger.read(b.attemptId);
    delete r.paymentFailure;await f.coordinator.ledger.write(r);advance(f);
    const status=await (await f.call('/api/v1/payments/status',{attemptId:b.attemptId,contractVersion:1})).json();
    assert.equal(status.paymentFailure,null);assert.equal(status.paymentOutcome,'unknown');assert.equal(status.retryAllowed,false);
});
test('V59 unrecognized provider fields and error codes never enter evidence',()=>{
    const error=new SquarePaymentFailure(400,{errors:[{code:'private provider information',detail:'secret'}]});
    assert.equal(error.evidence.httpStatus,400);assert.deepEqual(error.evidence.codes,[]);assert.equal(error.evidence.classification,'unknown');assert.equal(error.evidence.unrecognizedCode,true);assert.equal(error.evidence.outcome,'unknown');
    assert(!JSON.stringify(error).includes('secret'));
});

// Schema: square/connect-api-specification@0689c901bdfe1ff73f47aa28b17ccd6e0c40bf2d
// CreatePaymentResponse.errors, Payment.card_details.errors, Error.code/category.
for(const [http,status,code,field] of [[200,'FAILED','CARD_DECLINED','card'],[200,'CANCELED','CARD_TOKEN_EXPIRED','top'],[400,'FAILED','CARD_DECLINED_VERIFICATION_REQUIRED','both'],[403,'FAILED','INSUFFICIENT_PERMISSIONS','top'],[500,'CANCELED',null,'none']]){
 test(`diagnosis ${http}/${status}/${code||'missing'}: preserves safe evidence, snapshot and read-only failed history`,async t=>{
  const f=await setup(t),b=body(),fetch=f.fake.fetch.bind(f.fake);let posts=0;
  f.fake.fetch=async request=>{
   if(new URL(request.url).pathname==='/v2/payments'&&request.method==='POST'){
    posts++;const sent=await request.json();
    const error={code,category:'PAYMENT_METHOD_ERROR',detail:'PRIVATE_RESPONSE',field:'PRIVATE_FIELD'};
    const p={id:'offline-failed-diagnostic',status,reference_id:sent.reference_id,
     amount_money:{...sent.amount_money,unexpected:'PRIVATE_MONEY'},location_id:sent.location_id,
     card_details:{status:status==='CANCELED'?'VOIDED':'FAILED',verification_results:'FAILURE',card:{last_4:'PRIVATE_CARD',fingerprint:'PRIVATE_FINGERPRINT'},...(field==='card'||field==='both'?{errors:[error]}:{})},verification_token:'PRIVATE_TOKEN'};
    return Response.json({payment:p,...(field==='top'||field==='both'?{errors:[error]}:{})},{status:http});
   }
   return fetch(request);
  };
  const result=await (await f.call('/api/v1/payments',b)).json();
  assert.equal(result.status,'declined');assert.equal(result.retryAllowed,true);assert.equal(result.squarePaymentStatus,status);
  const evidence=result.paymentFailure;
  assert.equal(evidence.httpStatus,http);assert.equal(evidence.source,'create');
  assert.deepEqual(evidence.codes,code?[code]:[]);assert.deepEqual(evidence.categories,code?['PAYMENT_METHOD_ERROR']:[]);
  assert.equal(evidence.classification,code==='CARD_DECLINED_VERIFICATION_REQUIRED'?'three_ds_required':code==='CARD_DECLINED'?'card_declined':code==='CARD_TOKEN_EXPIRED'?'token_invalid':code==='INSUFFICIENT_PERMISSIONS'?'authentication':'unknown');
  const saved=await f.coordinator.ledger.read(b.attemptId);assert.deepEqual(saved.payment.failure,evidence);
  assert(!JSON.stringify([...f.storage.data]).includes('PRIVATE_'));assert(!JSON.stringify(saved).includes(b.sourceId));
  f.env.PRODUCTION_CHECKOUT_ENABLED='0';f.env.PRODUCTION_MANAGED_CHECKOUT_ENABLED='0';
  const before=JSON.stringify([...f.storage.data]),calls=f.squareCalls.length;
  const response=await f.call('/api/admin/payment-attempts?include_failed=1');assert.equal(response.status,200);
  const listed=await response.json();assert.equal(listed.attempts.length,0);assert.equal(listed.failures.length,1);
  assert.deepEqual(listed.failures[0].paymentFailure,evidence);assert.equal(JSON.stringify([...f.storage.data]),before);assert.equal(f.squareCalls.length,calls);
  const legacy=await (await f.call('/api/admin/payment-attempts')).json();assert.deepEqual(legacy,{attempts:[]});
  assert([401,403].includes((await f.call('/api/admin/payment-attempts?include_failed=1',undefined,false)).status));
  await f.call('/api/v1/payments/status',{attemptId:b.attemptId,contractVersion:1});
  assert.equal(posts,1);assert.equal(f.fake.counts.get(products[1].variationId),3);
  assert.equal(f.native.prepare('SELECT COUNT(*) n FROM orders').get().n,2);assert.equal(f.mails.length,0);
 });
}
test('read-only reconciliation retains original rejection HTTP and combines safe card error codes',async t=>{
 const f=await setup(t),b=body();refuse(f,{status:400,code:'CARD_DECLINED_VERIFICATION_REQUIRED'});
 const initial=await (await f.call('/api/v1/payments',b)).json();assert.equal(initial.retryAllowed,false);
 const record=await f.coordinator.ledger.read(b.attemptId);
 f.fake.payments.set('offline-final-failure',{id:'offline-final-failure',status:'FAILED',reference_id:record.orderReference,amount_money:{amount:1330,currency:'JPY'},location_id:f.env.SQUARE_LOCATION_ID,
  card_details:{errors:[{code:'CARD_DECLINED',category:'PAYMENT_METHOD_ERROR',detail:'PRIVATE_RESPONSE'}]}});
 advance(f);const r=await (await f.call('/api/v1/payments/status',{attemptId:b.attemptId,contractVersion:1})).json();
 assert.equal(r.status,'declined');assert.equal(r.paymentFailure.httpStatus,400);assert.equal(r.paymentFailure.source,'create');
 assert.deepEqual(r.paymentFailure.codes,['CARD_DECLINED_VERIFICATION_REQUIRED','CARD_DECLINED']);assert.equal(r.paymentFailure.classification,'three_ds_required');
 const saved=await f.coordinator.ledger.read(b.attemptId);assert.equal(saved.payment.failure.httpStatus,200);assert.equal(saved.payment.failure.source,'lookup');
 assert.equal(f.squareCalls.filter(c=>c.method==='POST'&&c.path==='/v2/payments').length,1);
 assert(!JSON.stringify(saved).includes('PRIVATE_RESPONSE'));
});
test('EMV verification_results and unknown fields cannot be interpreted as a 3DS result or saved as a reason',()=>{
 const evidence=paymentFailureEvidence(200,{payment:{status:'FAILED',card_details:{verification_results:'FAILURE',three_ds_result:'PRIVATE_CARD',error:{code:'CARD_DECLINED'}}}});
 assert.deepEqual(evidence.codes,[]);assert.equal(evidence.classification,'unknown');assert.deepEqual(evidence.categories,[]);
 assert(!JSON.stringify(evidence).includes('PRIVATE_'));
});
for(const [code,classification] of [['CARD_DECLINED_VERIFICATION_REQUIRED','three_ds_required'],['CARD_DECLINED_CALL_ISSUER','card_declined'],['VERIFY_AVS_FAILURE','card_invalid'],['ACCESS_TOKEN_REVOKED','authentication'],['LOCATION_MISMATCH','location'],['INVALID_PHONE_NUMBER','request_invalid'],['CARD_TOKEN_USED','token_invalid'],['SERVICE_UNAVAILABLE','provider_unavailable']])test(`official error ${code} has a safe classification`,()=>{
 const evidence=paymentFailureEvidence(400,{errors:[{code,category:'PAYMENT_METHOD_ERROR',detail:'PRIVATE_RESPONSE'}]});
 assert.deepEqual(evidence.codes,[code]);assert.equal(evidence.classification,classification);assert(!JSON.stringify(evidence).includes('PRIVATE_RESPONSE'));
});
