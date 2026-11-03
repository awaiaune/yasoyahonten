// Only tests static public assets after the existing local packaging scripts run.
// No network, production systems, Square, Secrets, orders or customer data.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const read=async p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const n=async p=>(await read(p)).replace(/\s+/g,' ');
test('Current checkout and thank-you use identical adopted editorial chrome',async()=>{
 const home=await read('staging/site/index.html');
 const checkout=await read('staging/site/checkout.html');
 const thanks=await read('staging/site/thanks.html');
 const header=home.match(/<header class="editorial-header" id="editorialHeader">[\s\S]*?<\/header>/)?.[0];
 const footer=home.match(/<footer class="v21-footer">[\s\S]*?<\/footer>/)?.[0];
 assert(header&&footer);
 for(const page of [checkout,thanks]){
   assert(page.includes(header),'shared header missing');
   assert(page.includes(footer),'shared footer missing');
   assert(page.includes('checkout-editorial-v56.css'));
   assert(page.includes('class="v56-transaction'));
   assert(!page.includes('checkoutNotice'));
   assert(!page.includes('JCB'));
   assert(!page.includes('審査中'));
 }
});
test('Checkout retains all form, cart, Square tokenization and recovery anchors',async()=>{
 const source=await read('staging/site/checkout.html');
 const built=await read('production/.generated/v53/checkout.html');
 for(const id of ['paymentForm','card-container','paymentButton','paymentStatus','checkoutSummaryItems','checkoutSubtotal','checkoutShipping','checkoutTotal','checkoutInventoryAlert','familyName','givenName','postalCode','address1'])
  assert(built.includes('id="'+id+'"'),'missing #'+id);
 for(const id of ['checkPaymentStatus','refreshCheckout','cardInitializationStatus'])
  assert(built.includes('id="'+id+'"'),'missing packaged recovery/control #'+id);
 assert(source.includes('src="js/checkout.js"'),'staging packaging input changed');
 assert(built.includes('src="/js/checkout-v1.js"'),'checkout contract script not packaged');
 assert(built.includes('https://web.squarecdn.com/v1/square.js'),'Production Square SDK missing');
 assert(built.includes('content="noindex, nofollow"'),'checkout should not be indexed');
 assert(!(await read('js/checkout-v1.js')).includes('applePay('),'new payment methods must be a separately approved change');
});
test('Thank-you no longer claims unverified payment success on direct navigation',async()=>{
 const built=await read('production/.generated/v53/thanks.html');
 assert(built.includes('THANK YOU')===false); // editorial sentence-case heading adopted
 assert(built.includes('Thank you.'));
 assert(built.includes('ご注文の受付状況は、確認メールでご案内します。'));
 assert(built.includes('content="noindex, nofollow"'));
 assert(!built.includes('ご注文を受け付けました。'));
});
test('Approved JCB removes both current and old-source notices without altering top hero',async()=>{
 for(const name of ['index.html','checkout.html','staging/site/index.html','staging/site/checkout.html','production/.generated/v53/index.html','production/.generated/v53/checkout.html']){
  const source=await read(name);
  assert(!/審査中|JCBは審査|checkoutNotice|paymentNotice|yasoya_jcb_notice_2026/.test(source),'stale JCB modal in '+name);
 }
 const liveHome=await read('production/.generated/v53/index.html');
 assert(liveHome.includes('id="teaStage"'));
 assert(liveHome.includes('css/tea-fullbleed-v54.css'));
});
