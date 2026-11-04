// Actual production router/DO/D1, all Square/Resend transports replaced locally.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,body,advance,products} from './production-native-fixture.mjs';
import {SquarePaymentFailure} from '../worker/src/payment-failure.js';
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
        assert.deepEqual(result.paymentFailure,{httpStatus:status,codes:[code],outcome});
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
    assert.deepEqual(error.evidence,{httpStatus:400,codes:[],outcome:'unknown'});
    assert(!JSON.stringify(error).includes('secret'));
});
