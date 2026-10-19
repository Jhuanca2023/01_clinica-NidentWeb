(() => {
 const root=document.documentElement;
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 let paused=false;
 try{paused=localStorage.getItem('nident-motion')==='off';}catch{}
 let scene=null;
 function permitted(){return !paused&&!preference.matches;}
 function syncControl(){
  root.dataset.motion=permitted()?'on':'off';
  document.querySelectorAll('[data-motion-toggle]').forEach(button=>{
   button.textContent=preference.matches?'Movimiento reducido activo':paused?'Activar movimiento':'Pausar movimiento';
   button.setAttribute('aria-pressed',String(!permitted()));button.disabled=preference.matches;
  });
  window.dispatchEvent(new Event('nident-motion-change'));
 }
 function buildMotion(){
  scene?.revert();scene=null;syncControl();
  if(!window.gsap||!window.ScrollTrigger||!permitted())return;
  gsap.registerPlugin(ScrollTrigger);
  scene=gsap.context(()=>{
   // One focal entrance: the photograph opens like a window onto the subject.
   const hero=document.querySelector('.treatment-hero,.pack-hero,.contact-hero,.about-intro');
   if(hero){
    const visual=hero.querySelector(':scope > img,.about-photo');
    const title=hero.querySelector('h1');
    const intro=gsap.timeline({defaults:{ease:'power3.out'}});
    if(visual)intro.fromTo(visual,{clipPath:'inset(0% 9% 0% 9% round 26px)'},{clipPath:'inset(0% 0% 0% 0% round 26px)',duration:.8,clearProps:'clipPath'},0);
    if(title)intro.from(title,{y:20,opacity:.3,duration:.65,clearProps:'transform,opacity'},.1);
   }
   // Picture/caption share a reveal rather than every page element flying upward.
   gsap.utils.toArray('.studio-panel,.article-opening>img,.pack-inclusions figure,.topic-notes,.spaces-layout>img,.spaces-layout>div>img').forEach(element=>{
    gsap.fromTo(element,{clipPath:'inset(0 0 7% 0 round 22px)'},{clipPath:'inset(0 0 0% 0 round 22px)',duration:.65,ease:'power3.out',clearProps:'clipPath',scrollTrigger:{trigger:element,start:'top 88%',once:true}});
   });
   const columns=document.querySelector('.plans-grid,.pack-catalog');
   if(columns)gsap.from(columns.children,{opacity:.5,y:20,stagger:.075,duration:.5,clearProps:'transform,opacity',scrollTrigger:{trigger:columns,start:'top 86%',once:true}});
   const family=document.querySelector('.family-grid');
   if(family)gsap.fromTo(family.querySelectorAll('.family-card>img'),
    {clipPath:'inset(0 0 14% 0 round 22px)'},
    {clipPath:'inset(0 0 0% 0 round 22px)',duration:.7,stagger:.1,ease:'power3.out',clearProps:'clipPath',scrollTrigger:{trigger:family,start:'top 85%',once:true}});
   const timeline=document.querySelector('.visit-timeline');
   if(timeline){
    gsap.fromTo(timeline.querySelector('.visit-line i'),{scaleY:0},{scaleY:1,ease:'none',scrollTrigger:{trigger:timeline,start:'top 55%',end:'bottom 65%',scrub:.5}});
    timeline.querySelectorAll('.visit-chapter').forEach(chapter=>{
     gsap.fromTo(chapter.querySelector('figure'),{clipPath:'inset(0 0 15% 0 round 24px)',y:18},{clipPath:'inset(0 0 0% 0 round 24px)',y:0,duration:.8,ease:'power3.out',clearProps:'clipPath,transform',scrollTrigger:{trigger:chapter,start:'top 80%',once:true}});
     ScrollTrigger.create({trigger:chapter,start:'top 65%',end:'bottom 35%',toggleClass:'is-reading'});
    });
   }
   const poster=document.querySelector('.care-poster');
   if(poster)gsap.fromTo(poster.querySelector('.poster-tooth'),{y:24,rotation:-6},{y:-20,rotation:4,ease:'none',scrollTrigger:{trigger:poster,start:'top bottom',end:'bottom top',scrub:1}});
   const directory=document.querySelector('.branch-directory-grid');
   if(directory)gsap.from(directory.children,{y:22,opacity:.5,stagger:.08,duration:.6,ease:'power3.out',clearProps:'transform,opacity',scrollTrigger:{trigger:directory,start:'top 86%',once:true}});
   // A small photo displacement follows reading; the copy stays still and usable.
   if(matchMedia('(min-width:900px) and (pointer:fine)').matches){
    gsap.utils.toArray('.article-opening>img,.pack-visit>img').forEach(image=>{
     gsap.fromTo(image,{y:14},{y:-14,ease:'none',scrollTrigger:{trigger:image,start:'top bottom',end:'bottom top',scrub:.7}});
    });
   }
  });
 }
 document.querySelectorAll('[data-motion-toggle]').forEach(button=>button.addEventListener('click',()=>{
  paused=!paused;try{localStorage.setItem('nident-motion',paused?'off':'on');}catch{}
  buildMotion();
 }));
 preference.addEventListener('change',buildMotion);
 buildMotion();

 const tabs=[...document.querySelectorAll('[data-care-topic]')];
 if(tabs.length){
  const panel=document.querySelector('#care-panel'),picture=panel.querySelector('.studio-picture img'),copy=panel.querySelector('.studio-copy');
  const status=document.querySelector('.studio-index');
  let topics=[],selected=0,request=0,transition=null,hoverTimer=null;
  try{topics=JSON.parse(document.querySelector('#care-topics-data')?.textContent||'[]');}catch{}
  const ready=topics.length===tabs.length&&topics.every(topic=>topic.hero&&topic.name&&topic.link);
  if(!ready)status.textContent='No se pudo preparar el contenido de las especialidades. Recarga la página.';
  const settle=()=>{transition?.progress(1).kill();};
  window.addEventListener('nident-motion-change',settle);preference.addEventListener('change',settle);
  async function select(index,focus=false,animate=true){
   if(!ready||(index===selected&&panel.getAttribute('aria-busy')!=='true'))return;
   const ticket=++request,topic=topics[index],preload=new Image();
   transition?.kill();transition=null;
   if(window.gsap)gsap.set([picture,copy],{clearProps:'opacity,transform,clipPath'});
   if(focus)tabs[index].focus();
   panel.setAttribute('aria-busy','true');preload.src='assets/img/'+topic.hero;
   try{await preload.decode();}catch{
    if(ticket===request){panel.removeAttribute('aria-busy');status.textContent='No se pudo cargar esta fotografía. Puedes elegir otra especialidad.';}return;
   }
   if(ticket!==request)return;
   const apply=()=>{
    if(ticket!==request)return;selected=index;
    picture.src=preload.src;picture.alt=topic.heroalt;
    copy.querySelector('h3').textContent=topic.name;copy.querySelector('p').textContent=topic.description;
    const link=copy.querySelector('a');link.href=topic.link;link.setAttribute('aria-label','Conocer '+topic.name);
    tabs.forEach((button,i)=>{button.setAttribute('aria-selected',String(i===index));button.tabIndex=i===index?0:-1;});
    panel.setAttribute('aria-labelledby',tabs[index].id);
    status.textContent=String(index+1).padStart(2,'0')+' / '+String(topics.length).padStart(2,'0')+' · '+topic.name;
    panel.removeAttribute('aria-busy');panel.dataset.topic=String(index);
   };
   if(window.gsap&&permitted()&&animate){
    transition=gsap.timeline().to([picture,copy],{opacity:.4,duration:.1,ease:'power3.out'}).call(apply)
     .fromTo(picture,{clipPath:'inset(0 0 8% 0)',opacity:.6},{clipPath:'inset(0 0 0% 0)',opacity:1,duration:.2,ease:'power3.out',clearProps:'clipPath,opacity'},.1)
     .to(copy,{opacity:1,duration:.16,clearProps:'opacity'},.1);
   }else apply();
  }
  tabs.forEach((button,index)=>{
   button.disabled=false;
   button.addEventListener('click',event=>{clearTimeout(hoverTimer);select(index,false,event.detail!==0);});
   button.addEventListener('pointerenter',event=>{
    if(event.pointerType==='mouse'&&matchMedia('(hover:hover) and (pointer:fine)').matches){clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>select(index),120);}
   });
   button.addEventListener('pointerleave',()=>clearTimeout(hoverTimer));
   button.addEventListener('keydown',event=>{
    let next;if(['ArrowDown','ArrowRight'].includes(event.key))next=(index+1)%tabs.length;
    if(['ArrowUp','ArrowLeft'].includes(event.key))next=(index+tabs.length-1)%tabs.length;
    if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;
    if(next!==undefined){event.preventDefault();clearTimeout(hoverTimer);select(next,true,false);}
   });
  });
 }

 // Reading chapters swap only the photo associated with the current paragraph.
 const chapters=[...document.querySelectorAll('[data-journey]')],photos=[...document.querySelectorAll('[data-journey-photo]')];
 if(chapters.length&&'IntersectionObserver' in window){
  let current=0;
  const observer=new IntersectionObserver(entries=>{
   const entering=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
   if(!entering)return;const next=Number(entering.target.dataset.journey);if(next===current)return;
   const previous=current;current=next;
   chapters.forEach((chapter,i)=>chapter.classList.toggle('reading',i===next));
   photos.forEach((photo,i)=>photo.setAttribute('aria-hidden',String(i!==next)));
   if(window.gsap&&permitted()){
    gsap.killTweensOf(photos);gsap.to(photos[previous],{opacity:0,duration:.25});
    gsap.fromTo(photos[next],{opacity:0,scale:1.035},{opacity:1,scale:1,duration:.5,ease:'power2.out'});
   }else photos.forEach((photo,i)=>photo.style.opacity=i===next?'1':'0');
  },{rootMargin:'-25% 0px -25% 0px',threshold:[0,.35,.7]});
  chapters.forEach(chapter=>observer.observe(chapter));chapters[0].classList.add('reading');
 }
 window.addEventListener('pageshow',()=>window.ScrollTrigger?.refresh());
})();
