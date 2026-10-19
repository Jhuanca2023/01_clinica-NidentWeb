(() => {
 const track=document.querySelector('.reviews-track');
 if(track){
  const cards=[...track.children],counter=document.querySelector('.reviews-counter');
  const previous=document.querySelector('[data-review-prev]'),next=document.querySelector('[data-review-next]'),play=document.querySelector('[data-review-play]');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let index=0,visible=1,transition=null,timer=null,playing=true,direction=1,pointer=null,inView=false;
  const allowed=()=>!reduced.matches&&document.documentElement.dataset.motion!=='off';
  function sync(){
   const width=cards[0].getBoundingClientRect().width,gap=parseFloat(getComputedStyle(track).gap)||24;
   visible=Math.max(1,Math.round((track.clientWidth+gap)/(width+gap)));
   index=Math.min(index,Math.max(0,cards.length-visible));
   cards.forEach((card,i)=>{card.inert=i<index||i>=index+visible;card.setAttribute('aria-hidden',String(card.inert));});
   counter.textContent=visible===1?`Reseña ${index+1} de ${cards.length}`:`Reseñas ${index+1}–${Math.min(index+visible,cards.length)} de ${cards.length}`;
   previous.disabled=index===0;next.disabled=index>=cards.length-visible;
   return -index*(width+gap);
  }
  function position(animate){
   transition?.kill();const x=sync();
   if(window.gsap&&allowed()&&animate)transition=gsap.to(track,{x,duration:.55,ease:'power3.out',overwrite:true});
   else if(window.gsap)gsap.set(track,{x});else track.style.transform=`translateX(${x}px)`;
  }
  function schedule(){
   clearInterval(timer);
   play.textContent=playing&&allowed()?'Pausar':'Reproducir';
   play.setAttribute('aria-pressed',String(playing&&allowed()));
   play.setAttribute('aria-label',playing&&allowed()?'Pausar reseñas':'Reproducir reseñas');
   play.disabled=!allowed();
   if(playing&&allowed()&&inView&&!document.hidden&&!track.parentElement.matches(':hover')&&!track.parentElement.contains(document.activeElement)){
    timer=setInterval(()=>{if(index>=cards.length-visible)direction=-1;if(index===0)direction=1;index+=direction;position(true);},8000);
   }
  }
  function move(amount,animate=true){index=Math.max(0,Math.min(cards.length-visible,index+amount));position(animate);}
  previous.addEventListener('click',event=>{playing=false;move(-1,event.detail!==0);schedule();});
  next.addEventListener('click',event=>{playing=false;move(1,event.detail!==0);schedule();});
  play.addEventListener('click',()=>{playing=!playing;schedule();});
  track.addEventListener('keydown',event=>{
   if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
   event.preventDefault();playing=false;
   if(event.key==='Home')index=0;else if(event.key==='End')index=cards.length-visible;else index+=event.key==='ArrowRight'?1:-1;
   index=Math.max(0,Math.min(cards.length-visible,index));position(false);schedule();
  });
  track.addEventListener('pointerdown',event=>{pointer={x:event.clientX,y:event.clientY};});
  track.addEventListener('pointerup',event=>{
   if(!pointer)return;const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;pointer=null;
   if(Math.abs(dx)>45&&Math.abs(dy)<50){playing=false;move(dx<0?1:-1);schedule();}
  });
  track.addEventListener('pointercancel',()=>pointer=null);
  const viewport=track.parentElement;
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;schedule();},{threshold:.1}).observe(viewport);
  else inView=true;
  viewport.addEventListener('mouseenter',()=>clearInterval(timer));viewport.addEventListener('mouseleave',schedule);
  viewport.addEventListener('focusin',()=>clearInterval(timer));viewport.addEventListener('focusout',()=>setTimeout(schedule,0));
  window.addEventListener('resize',()=>{position(false);schedule();});
  window.addEventListener('nident-motion-change',()=>{position(false);schedule();});
  reduced.addEventListener('change',()=>{position(false);schedule();});
  document.addEventListener('visibilitychange',schedule);window.addEventListener('pagehide',()=>clearInterval(timer));
  window.addEventListener('pageshow',schedule);position(false);schedule();
 }
 const form=document.querySelector('#inquiry-form');
 if(form){
  const error=document.querySelector('#inquiry-error'),result=document.querySelector('#inquiry-result');
  form.addEventListener('submit',event=>{
   event.preventDefault();const invalid=[...form.querySelectorAll('input,select,textarea')].find(i=>!i.checkValidity()||(i.required&&!i.value.trim()));
   if(invalid){error.textContent=invalid.validationMessage||'Completa los campos obligatorios.';error.hidden=false;invalid.focus();invalid.reportValidity();return;}
   error.hidden=true;result.replaceChildren();
   const heading=document.createElement('h3');heading.textContent='Tu consulta de ejemplo está preparada.';
   const note=document.createElement('p');note.textContent='No se ha enviado ni almacenado. El canal de recepción real está pendiente de configurar.';
   const message=document.createElement('blockquote');message.textContent=form.elements.mensaje.value.trim();
   result.append(heading,note,message);result.hidden=false;result.tabIndex=-1;result.focus();
  });
 }
})();
