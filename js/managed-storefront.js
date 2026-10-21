(()=>{'use strict';const config=window.YASOYA_STORE_CONFIG;if(!config||config.environment!=='sandbox'||config.workerBaseUrl!==location.origin)return;
const buttons=[...document.querySelectorAll('.product-cart-button[data-product-id]')];if(!buttons.length)return;
for(const b of buttons)b.disabled=true;
fetch(config.workerBaseUrl+'/api/inventory',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:buttons.map(b=>b.dataset.productId)})}).then(async r=>{if(!r.ok)throw Error();const {inventory}=await r.json();for(const b of buttons){const n=inventory.find(i=>i.id===b.dataset.productId)?.availableQuantity||0;b.disabled=n<1;const q=b.closest('.product-cart-area')?.querySelector('select');if(q){for(const o of [...q.options])if(Number(o.value)>n)o.remove();q.disabled=n<1;}}}).catch(()=>{for(const b of buttons){b.disabled=true;b.textContent='在庫確認できません';}});
})();
