
(()=>{const stage=document.getElementById('botanicalTrack');if(!stage)return;
const slides=[...stage.querySelectorAll('.v19-slide')],bars=[...document.querySelectorAll('.v19-progress span')];let current=0,sx=0,sy=0,mx=null;if(!slides.length)return;
const show=n=>{current=(n+slides.length)%slides.length;slides.forEach((el,i)=>{const active=i===current;el.classList.toggle('v24-active',active);el.setAttribute('aria-hidden',String(!active))});bars.forEach((el,i)=>el.classList.toggle('active',i===current))};
stage.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY},{passive:true});
stage.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.2)show(current+(dx<0?1:-1))},{passive:true});
stage.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')mx=e.clientX});
stage.addEventListener('pointerup',e=>{if(mx===null)return;const dx=e.clientX-mx;mx=null;if(Math.abs(dx)>45)show(current+(dx<0?1:-1))});
stage.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();show(current+(e.key==='ArrowRight'?1:-1))}});
show(0);
})();
