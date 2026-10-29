// Reserve room for dynamic names/variants while preserving v53's normal offsets.
(()=>{for(const root of document.querySelectorAll('.v53-managed-product')){
 const gallery=root.querySelector('.v30-gallery'),purchase=root.querySelector('.v30-purchase'),title=root.querySelector('.v30-top'),ui=root.querySelector('.v30-slide-ui');
 if(!gallery||!purchase||!title||!ui)continue;
 let queued=false;
 const fit=()=>{queued=false;ui.style.removeProperty('bottom');const baseline=parseFloat(getComputedStyle(ui).bottom);const g=gallery.getBoundingClientRect(),t=title.getBoundingClientRect();
  const max=Math.max(110,g.bottom-t.bottom-72)+'px';if(purchase.style.maxHeight!==max)purchase.style.maxHeight=max;
  const bottom=Math.max(baseline,purchase.getBoundingClientRect().height+16)+'px';if(ui.style.bottom!==bottom)ui.style.setProperty('bottom',bottom,'important');
 };
 const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(fit);}};
 const observer=new ResizeObserver(schedule);for(const e of [gallery,purchase,title])observer.observe(e);document.fonts?.ready.then(schedule);schedule();
}})();
