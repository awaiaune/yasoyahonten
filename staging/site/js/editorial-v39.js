/* v41: Native click navigation, cancel only deliberate horizontal swipes. */
(()=>{const stage=document.getElementById('botanicalTrack');if(!stage)return;
let x=0,y=0,swiped=false;
stage.addEventListener('touchstart',e=>{x=e.touches[0].clientX;y=e.touches[0].clientY;swiped=false},{passive:true});
stage.addEventListener('touchmove',e=>{const dx=e.touches[0].clientX-x,dy=e.touches[0].clientY-y;if(Math.abs(dx)>30&&Math.abs(dx)>Math.abs(dy)*1.2)swiped=true},{passive:true});
stage.addEventListener('click',e=>{if(swiped&&e.target.closest('.v39-botanical-link')){e.preventDefault();e.stopImmediatePropagation();swiped=false}},true);
})();