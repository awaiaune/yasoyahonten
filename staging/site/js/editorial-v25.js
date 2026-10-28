(()=>{
 const frames=[...document.querySelectorAll('.hero-right,.v18-feature-frame,.v20-film-frame')];
 const zoom=frame=>frame.classList.add('v25-pressed');
 frames.forEach(frame=>{
  frame.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')zoom(frame)},{passive:true});
  frame.addEventListener('pointerdown',()=>zoom(frame),{passive:true});
 });
 // Reset only when the entire image frame has exited the viewport.
 // Scrolling while any portion remains visible never resets the zoom.
 const observer=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
   if(!entry.isIntersecting)entry.target.classList.remove('v25-pressed');
  });
 },{threshold:0});
 frames.forEach(frame=>observer.observe(frame));
})();
