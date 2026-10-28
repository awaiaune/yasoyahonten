
(()=>{const track=document.getElementById('botanicalTrack');if(!track)return;
const slides=[...track.children],bars=[...document.querySelectorAll('.v19-progress span')];
let current=0;
function update(){const next=Math.max(0,Math.min(slides.length-1,Math.round(track.scrollLeft/track.clientWidth)));current=next;bars.forEach((b,i)=>b.classList.toggle('active',i===next));}
function go(delta){current=(current+delta+slides.length)%slides.length;track.scrollTo({left:current*track.clientWidth,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});bars.forEach((b,i)=>b.classList.toggle('active',i===current));}
document.getElementById('v19Prev')?.addEventListener('click',()=>go(-1));
document.getElementById('v19Next')?.addEventListener('click',()=>go(1));
let raf=0;track.addEventListener('scroll',()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(update)},{passive:true});
track.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();go(1)}if(e.key==='ArrowLeft'){e.preventDefault();go(-1)}});
window.addEventListener('resize',()=>track.scrollLeft=current*track.clientWidth);
})();
