/* Shared gallery controller, reusable on other editorial pages */
window.YasoyaGallery={init(root,{onChange}={}){const slides=[...root.querySelectorAll('.v30-slide')],dots=[...root.querySelectorAll('[data-go]')];let current=0,x=0,y=0,mouse=null;
function show(index){current=(index+slides.length)%slides.length;slides.forEach((s,i)=>{s.classList.toggle('is-active',i===current);s.setAttribute('aria-hidden',String(i!==current))});dots.forEach((d,i)=>d.setAttribute('aria-current',String(i===current)));onChange?.(current)}
root.addEventListener('touchstart',e=>{x=e.touches[0].clientX;y=e.touches[0].clientY},{passive:true});
root.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-x,dy=e.changedTouches[0].clientY-y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.25)show(current+(dx<0?1:-1))},{passive:true});
root.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')mouse=e.clientX});
root.addEventListener('pointerup',e=>{if(mouse===null)return;const dx=e.clientX-mouse;mouse=null;if(Math.abs(dx)>45)show(current+(dx<0?1:-1))});
root.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();show(current+(e.key==='ArrowRight'?1:-1))}});
dots.forEach(d=>d.addEventListener('click',()=>show(Number(d.dataset.go))));show(0);return{show}}};
