// Pure request guard tests: no remote APIs, storage or payment processing.
import test from 'node:test';
import assert from 'node:assert/strict';
import {checkoutRecipientGuard} from '../staging/checkout-recipient.js';
const env={RUNTIME_TIER:'staging',SQUARE_ENVIRONMENT:'sandbox',SITE_URL:'https://staging.awaiaune.com',STAGING_ADMIN_EMAIL:'test@example.invalid',SQUARE_ACCESS_MODE:'READ_WRITE',VALIDATION_CHECKOUT_ENABLED:'1',VALIDATION_MAIL_ENABLED:'0',VALIDATION_CRON_ENABLED:'0'};
const req=(path,body,patch={})=>new Request(env.SITE_URL+path,{method:'POST',headers:{Origin:env.SITE_URL,'Content-Type':'application/json',...patch},body:typeof body==='string'?body:JSON.stringify(body)});
for(const prefix of ['/api','/api/v1']){
 test(prefix+' preflight admits only the approved recipient and discloses no address',async()=>{
  const r=await checkoutRecipientGuard(req(prefix+'/checkout-preflight',{email:env.STAGING_ADMIN_EMAIL}),env);assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'no-store');assert.deepEqual(await r.json(),{ok:true,recipientAllowed:true});
  for(const email of ['wrong@example.invalid','',null,{},'x'.repeat(321)]){const r=await checkoutRecipientGuard(req(prefix+'/checkout-preflight',{email}),env);assert.equal(r.status,400);const text=await r.text();assert(!text.includes(env.STAGING_ADMIN_EMAIL));const d=JSON.parse(text);assert.equal(d.currentRequestForwarded,false);assert.equal(d.retryAllowed,false);}
 });
 test(prefix+' payment refuses a mismatched email before the application and never consumes the accepted body',async()=>{
  const request=req(prefix+'/payments',{attemptId:crypto.randomUUID(),contact:{email:env.STAGING_ADMIN_EMAIL}});assert.equal(await checkoutRecipientGuard(request,env),null);assert.equal((await request.json()).contact.email,env.STAGING_ADMIN_EMAIL);
  const denied=await checkoutRecipientGuard(req(prefix+'/payments',{contact:{email:'other@example.invalid'}}),env);assert.equal(denied.status,400);assert.equal((await denied.json()).error.code,'STAGING_RECIPIENT_NOT_ALLOWED');
 });
}
test('preflight cannot bypass staging identity, purchase OFF, origin or method restrictions',async()=>{
 for(const patch of [{RUNTIME_TIER:'production'},{SQUARE_ENVIRONMENT:'production'},{VALIDATION_CHECKOUT_ENABLED:'0'},{SQUARE_ACCESS_MODE:'READ_ONLY'}])assert((await checkoutRecipientGuard(req('/api/v1/checkout-preflight',{email:env.STAGING_ADMIN_EMAIL}),{...env,...patch})).status>=400);
 assert.equal((await checkoutRecipientGuard(req('/api/v1/checkout-preflight',{email:env.STAGING_ADMIN_EMAIL},{Origin:'https://other.invalid'}),env)).status,403);
 assert.equal((await checkoutRecipientGuard(new Request(env.SITE_URL+'/api/v1/checkout-preflight'),env)).status,405);
 assert.equal((await checkoutRecipientGuard(req('/api/v1/checkout-preflight','{'),env)).status,400);
});
test('status and recovery paths are not intercepted or changed by the recipient guard',async()=>{
 for(const path of ['/api/v1/payments/status','/api/payments/status','/api/admin/payment-attempts'])assert.equal(await checkoutRecipientGuard(req(path,{attemptId:crypto.randomUUID()}),env),null);
});
