/* Product-detail link follows the selected botanical. */
(()=>{const root=document.querySelector('.v33-shop');if(!root)return;
const urls=['products/lemonbalm.html','products/yomogi.html','products/goldenrod.html'];
const tiles=[...root.querySelectorAll('.v33-tile')];const view=root.querySelector('.v34-view');if(!view)return;
const sync=()=>{const index=Math.max(0,tiles.findIndex(tile=>tile.classList.contains('is-active')));view.href=urls[index]};
const observer=new MutationObserver(sync);tiles.forEach(tile=>observer.observe(tile,{attributes:true,attributeFilter:['class']}));sync();
const wipe=document.createElement('div');wipe.className='v34-page-wipe';document.body.append(wipe);
view.addEventListener('click',e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button!==0||matchMedia('(prefers-reduced-motion: reduce)').matches)return;e.preventDefault();const href=view.href;wipe.classList.add('is-active');try{sessionStorage.setItem('yasoya:editorial-transition','1')}catch{}setTimeout(()=>{location.href=href},420)});
})();
