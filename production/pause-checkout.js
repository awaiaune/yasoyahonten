// Loaded only by the temporary old checkout page during an approved cutover.
// It never reads card/contact fields and does not block status-query buttons.
(()=>{
 const pause=()=>{const button=document.getElementById('paymentButton');if(button&&!button.disabled)button.disabled=true;};
 document.addEventListener('click',event=>{if(event.target.closest?.('#paymentButton')){event.preventDefault();event.stopImmediatePropagation();}},true);
 document.addEventListener('submit',event=>{if(event.target.matches?.('.checkout-form')||event.target.querySelector?.('#paymentButton')){event.preventDefault();event.stopImmediatePropagation();}},true);
 const start=()=>{const form=document.querySelector('.checkout-form');if(form&&!document.getElementById('productionCutoverNotice')){const notice=document.createElement('p');notice.id='productionCutoverNotice';notice.setAttribute('role','status');notice.textContent='ただいま本番切替のため、新規購入受付を停止しています。お支払いを送信済みの場合は、同じ注文の状態確認をご利用ください。再度決済しないでください。';form.prepend(notice);}pause();new MutationObserver(pause).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
