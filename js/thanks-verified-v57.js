// Thank-you receipt verification. Never accept URL values alone as proof of payment.
// Existing status/recovery API only; never submits a new charge or reloads checkout.
// Pending orders may continue their original recovery (such as stock projection/email).
(()=>{
 'use strict';
 const RECEIPT_KEY='yasoya_verified_checkout_v1';
 const RECEIPT_MAX_AGE=24*60*60*1000;
 const ATTEMPT_ID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const text=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
 const toggle=(id,visible)=>{const el=document.getElementById(id);if(el)el.hidden=!visible;};
 const retry=document.getElementById('retryOrderStatus');
 const cfg=window.YASOYA_STORE_CONFIG;
 const params=new URLSearchParams(location.search);
 let proof=null,busy=false;
 function neutral(message,canRetry=false){
  text('thankYouHeading','Order status.');
  text('orderVerificationMessage',message);
  toggle('verifiedOrderReference',false);
  toggle('verifiedOrderReferenceRow',false);
  toggle('retryOrderStatus',canRetry);
 }
 function loadProof(){
  if(!cfg||!['production','sandbox'].includes(cfg.environment))return null;
  const base=new URL(cfg.workerBaseUrl||'',location.href);
  // Verification is performed only against this trusted storefront's own API.
  if(base.origin!==location.origin)return null;
  let found;
  try{found=JSON.parse(sessionStorage.getItem(RECEIPT_KEY)||'null');}catch{return null;}
  if(!found||!ATTEMPT_ID.test(found.attemptId||''))return null;
  if(typeof found.paymentId!=='string'||!found.paymentId||found.paymentId.length>255)return null;
  if(typeof found.orderReference!=='string'||!found.orderReference||found.orderReference.length>100)return null;
  if(!Number.isFinite(found.createdAt)||found.createdAt>Date.now()+60_000||Date.now()-found.createdAt>RECEIPT_MAX_AGE)return null;
  if(params.get('payment')!==found.paymentId||params.get('order')!==found.orderReference)return null;
  return found;
 }
 async function verify(){
  if(busy||!proof)return;
  busy=true;toggle('retryOrderStatus',false);
  text('orderVerificationMessage','決済と注文の状態を確認しています…');
  try{
   const response=await fetch('/api/v1/payments/status',{
    method:'POST',cache:'no-store',credentials:'same-origin',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({contractVersion:1,attemptId:proof.attemptId}),
    signal:AbortSignal.timeout(12000)
   });
   const data=await response.json().catch(()=>null);
   const valid=response.ok&&data?.ok===true&&data.status==='COMPLETED'&&data.orderState==='stored'&&
    data.attemptId===proof.attemptId&&data.paymentId===proof.paymentId&&data.orderReference===proof.orderReference;
   if(valid){
    text('thankYouHeading','Thank you.');
    text('orderVerificationMessage','ご注文の受付を確認しました。ご注文内容は確認メールをご確認ください。');
    text('verifiedOrderReference',proof.orderReference);
    toggle('verifiedOrderReference',true);
    toggle('verifiedOrderReferenceRow',true);
    toggle('retryOrderStatus',false);
   }else if(data?.ok===true){
    neutral('注文情報の照合が一致しませんでした。再購入せず、お問い合わせください。',false);
   }else{
    neutral('注文結果をまだ確認できません。再購入せず、処理状況を再確認するかお問い合わせください。',true);
   }
  }catch{
   neutral('現在、注文結果を確認できません。再購入せず、処理状況を再確認してください。',true);
  }finally{busy=false;}
 }
 document.addEventListener('DOMContentLoaded',()=>{
  proof=loadProof();
  if(!proof){
   neutral('この画面を開いただけでは注文成立を確認できません。ご注文済みの場合は、確認メールをご確認いただくかお問い合わせください。');
   return;
  }
  retry?.addEventListener('click',verify);
  void verify();
 });
})();