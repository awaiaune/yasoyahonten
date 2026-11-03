// Production transaction-page preflight. Local file reads only; no deploy or API calls.
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
function check(value,message){if(!value)throw Error('BLOCKED: '+message);console.log('OK: '+message);}
try{
 const [home,checkout,thanks,config,checkoutJs,builtJs]=await Promise.all([
  read('production/.generated/v53/index.html'),
  read('production/.generated/v53/checkout.html'),
  read('production/.generated/v53/thanks.html'),
  read('production/release/ready-inventory.local.jsonc'),
  read('js/checkout-v1.js'),
  read('production/.generated/v53/js/checkout-v1.js')
 ]);
 for(const [name,html] of [['CHECKOUT',checkout],['THANK YOU',thanks]]){
  check(html.includes('class="editorial-header" id="editorialHeader"'),name+' shared header');
  check(html.includes('class="v21-footer"'),name+' shared footer');
  check(html.includes('checkout-editorial-v56.css'),name+' adopted stylesheet');
  check(/content="noindex, nofollow"/.test(html),name+' noindex retained');
  check(!/JCB.{0,20}審査|審査中|checkoutNotice|paymentNotice/.test(html),name+' outdated JCB modal removed');
 }
 check(!/審査中|checkoutNotice|paymentNotice/.test(home),'Homepage old JCB notice absent');
 for(const id of ['paymentForm','card-container','paymentButton','paymentStatus','checkoutInventoryAlert','checkoutSummaryItems','checkoutTotal','cardInitializationStatus','checkPaymentStatus','refreshCheckout'])
  check(checkout.includes('id="'+id+'"'),'Checkout anchor #'+id+' retained');
 check(checkout.includes('src="/js/checkout-v1.js"'),'Versioned checkout client preserved');
 check(checkoutJs===builtJs,'Checkout client byte-identical to source');
 check(checkout.includes('https://web.squarecdn.com/v1/square.js'),'Production Square SDK preserved');
 for(const [key,expected] of [
  ['PRODUCTION_CHECKOUT_ENABLED','0'],
  ['PRODUCTION_MANAGED_CHECKOUT_ENABLED','0'],
  ['PRODUCTION_MANAGEMENT_CATALOG_ENABLED','0'],
  ['PRODUCTION_STOREFRONT_ENABLED','1']
 ]){
  check(new RegExp('"'+key+'"\\s*:\\s*"'+expected+'"').test(config),key+' remains '+expected);
 }
 console.log('V56 PREFLIGHT PASS: design package and disabled checkout guard verified; no production changes.');
}catch(e){console.error(String(e.message||e));process.exitCode=1;}
