(() => {
 const hero=document.querySelector('.n-hero');if(!hero)return;
 const slides=[...hero.querySelectorAll('.hero-slide')],dots=[...hero.querySelectorAll('[data-go-slide]')];
 const pause=hero.querySelector('.carousel-pause'),progress=hero.querySelector('.hero-timing i');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),duration=2000;
 let current=0,request=0,timer=null,transition=null,camera=null,meter=null,manuallyPaused=false,inView=true;
 const motion=()=>!reduced.matches&&document.documentElement.dataset.motion!=='off';
 const running=()=>motion()&&!manuallyPaused&&inView&&!document.hidden&&!hero.matches(':hover')&&!hero.contains(document.activeElement);
 if(window.gsap)hero.classList.add('hero-motion-ready');
 function stop(){clearTimeout(timer);meter?.kill();camera?.pause();hero.dataset.playstate='paused';}
 function playback(){
  stop();pause.disabled=!motion();
  pause.textContent=manuallyPaused?'Reanudar':'Pausar';
  pause.setAttribute('aria-label',manuallyPaused?'Reanudar banners':'Pausar banners');
  if(!running())return;
  hero.dataset.playstate='playing';camera?.resume();
  if(window.gsap)meter=gsap.fromTo(progress,{scaleX:0},{scaleX:1,duration:duration/1000,ease:'none'});
  timer=setTimeout(()=>show(current+1,true),duration);
 }
 function normalize(){
  slides.forEach((slide,i)=>{
   slide.classList.toggle('active',i===current);slide.inert=i!==current;
   slide.setAttribute('aria-hidden',String(i!==current));
   slide.style.removeProperty('z-index');slide.style.removeProperty('pointer-events');
   if(window.gsap)gsap.set([slide,slide.querySelector('img'),slide.querySelector('.slide-shade'),...slide.querySelectorAll('.hero-line-content,.slide-copy>p,.slide-copy>.row')],{clearProps:'opacity,transform,clipPath'});
  });
 }
 function settle(){transition?.progress(1).kill();transition=null;camera?.kill();camera=null;normalize();}
 function animate(next,previous,initial=false){
  if(!window.gsap||!motion()){normalize();return;}
  const photo=next.querySelector('img'),shade=next.querySelector('.slide-shade');
  const lines=next.querySelectorAll('.hero-line-content'),support=next.querySelectorAll('.slide-copy>p,.slide-copy>.row');
  const finish=()=>{
   slides.forEach((slide,i)=>{if(i!==current){slide.classList.remove('active');slide.style.removeProperty('opacity');}});
   next.style.removeProperty('z-index');hero.classList.remove('is-changing');
  };
  next.style.zIndex='2';hero.classList.add('is-changing');
  transition=gsap.timeline({defaults:{ease:'power3.out'},onComplete:finish});
  if(previous&&previous!==next){
   previous.style.zIndex='1';previous.style.pointerEvents='none';
   transition.to(previous,{opacity:0,duration:.55},0);
  }
  transition.fromTo(photo,{clipPath:initial?'inset(0 5% 0 5%)':'inset(0 0 0 100%)'},{clipPath:'inset(0 0 0 0)',duration:.75,clearProps:'clipPath'},0)
   .fromTo(shade,{opacity:.5},{opacity:1,duration:.45,clearProps:'opacity'},0)
   .fromTo(lines,{yPercent:108},{yPercent:0,stagger:.07,duration:.56,clearProps:'transform'},.2)
   .fromTo(support,{y:12,opacity:0},{y:0,opacity:1,stagger:.07,duration:.4,clearProps:'opacity,transform'},.42);
  camera=gsap.fromTo(photo,{scale:1.055,xPercent:.45},{scale:1,xPercent:0,duration:2,ease:'power1.out'});
 }
 async function show(index,animateChange=true){
  const nextIndex=(index+slides.length)%slides.length;if(nextIndex===current)return;
  const ticket=++request;stop();settle();
  const next=slides[nextIndex],photo=next.querySelector('img');
  hero.setAttribute('aria-busy','true');
  try{await photo.decode();}catch{
   if(ticket===request){hero.removeAttribute('aria-busy');manuallyPaused=true;playback();}
   return;
  }
  if(ticket!==request)return;
  const previous=slides[current];current=nextIndex;
  next.classList.add('active');
  slides.forEach((slide,i)=>{slide.inert=i!==current;slide.setAttribute('aria-hidden',String(i!==current));});
  dots.forEach((dot,i)=>dot.setAttribute('aria-pressed',String(i===current)));
  hero.querySelector('.slide-counter').textContent=`0${current+1} / 0${slides.length}`;
  hero.dataset.current=String(current);hero.removeAttribute('aria-busy');
  if(animateChange&&motion())animate(next,previous);else normalize();
  playback();
 }
 dots.forEach((dot,i)=>dot.addEventListener('click',event=>show(i,event.detail!==0)));
 pause.addEventListener('click',()=>{manuallyPaused=!manuallyPaused;if(manuallyPaused)transition?.progress(1);playback();});
 hero.addEventListener('keydown',event=>{
  if(event.target!==hero&&!event.target.matches('[data-go-slide]'))return;
  let target;if(event.key==='ArrowRight')target=current+1;if(event.key==='ArrowLeft')target=current-1;
  if(event.key==='Home')target=0;if(event.key==='End')target=slides.length-1;
  if(target!==undefined){event.preventDefault();manuallyPaused=true;show(target,false);}
 });
 hero.addEventListener('mouseenter',stop);hero.addEventListener('mouseleave',playback);
 hero.addEventListener('focusin',stop);hero.addEventListener('focusout',()=>setTimeout(playback,0));
 document.addEventListener('visibilitychange',playback);
 if('IntersectionObserver' in window)new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;playback();},{threshold:.15}).observe(hero);
 const preferences=()=>{if(!motion())settle();playback();};
 reduced.addEventListener('change',preferences);window.addEventListener('nident-motion-change',preferences);
 window.addEventListener('pagehide',stop);window.addEventListener('pageshow',playback);
 hero.querySelector('.slide-counter').textContent=`01 / ${String(slides.length).padStart(2,'0')}`;
 normalize();animate(slides[0],null,true);playback();
})();
