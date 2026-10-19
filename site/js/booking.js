(() => {
 const form=document.querySelector('#booking-form');if(!form)return;
 const fields=[...form.querySelectorAll('[data-book-step]')],progress=[...document.querySelectorAll('.booking-progress li')];
 const next=document.querySelector('#booking-next'),back=document.querySelector('#booking-back'),confirm=document.querySelector('#booking-confirm'),error=document.querySelector('#booking-error');
 const control=name=>form.elements.namedItem(name);
 const doctors={adriana:'Dra. Adriana Solís',paula:'Dra. Paula Vega',daniela:'Dra. Daniela León',sebastian:'Dr. Sebastián Reyes'};
 const branches={'la-esperanza':'La Esperanza',trujillo:'Trujillo Centro','el-porvenir':'El Porvenir','mall-plaza':'Mall Plaza'};
 const branch=()=>form.querySelector('[name=sede]:checked')?.value||'';
 const keys=Object.keys(doctors),owner=crypto.randomUUID(),storageKey='nident-agenda-demo-v1';
 const lease=5*60*1000;let step=0,held=null,confirmed=null,busy=false,packName='';
 const dateKey=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
 const today=dateKey(new Date()),maximum=new Date(today+'T12:00:00-05:00');maximum.setDate(maximum.getDate()+90);
 control('fecha').min=today;control('fecha').max=dateKey(maximum);
 const params=new URLSearchParams(location.search);
 if([...control('tratamiento').options].some(o=>o.value===params.get('tratamiento')))control('tratamiento').value=params.get('tratamiento');
 if(branches[params.get('sede')])form.querySelector(`[name=sede][value="${params.get('sede')}"]`).checked=true;
 const photo={7:'contacto/pexels-19879741.webp',2:'infantil/nident-kids-revision.webp',1:'infantil/nident-kids-ortodoncia.webp',3:'ilustraciones/endodoncia-nident-3d.webp',4:'contacto/pexels-8413334.webp',0:'tratamientos/implant-guide-new.webp',5:'tratamientos/shade-close.webp',6:'contacto/pexels-16430838.webp'};
 function format(value){return value?new Date(value+'T12:00:00-05:00').toLocaleDateString('es-PE',{timeZone:'America/Lima',weekday:'short',day:'numeric',month:'long'}):'';}
 function fail(message,element){error.textContent=message;error.hidden=false;element?.focus();return false;}
 function read(){const now=Date.now(),value=JSON.parse(localStorage.getItem(storageKey)||'{}');return Object.fromEntries(Object.entries(value).filter(([,v])=>v&&Number(v.expires)>now));}
 async function transaction(action){
  if(!navigator.locks?.request)throw new Error('Este navegador no permite un bloqueo local seguro. Prueba con un navegador actualizado.');
  return navigator.locks.request('nident-agenda-demo',()=>{const agenda=read(),result=action(agenda);localStorage.setItem(storageKey,JSON.stringify(agenda));return result;});
 }
 // Professionals are shared across the network: their slot remains exclusive across all four branches.
 const slotKey=(doctor,date,time)=>`trujillo|${doctor}|${date}|${time}`;
 function chosenDoctor(agenda,date,time){return control('profesional').value==='equipo'?keys.find(key=>!agenda[slotKey(key,date,time)]||(agenda[slotKey(key,date,time)].owner===owner&&agenda[slotKey(key,date,time)].status==='held')):control('profesional').value;}
 function validDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&value>=dateKey(new Date())&&value<=control('fecha').max;}
 function timePassed(date,time){return new Date(date+'T'+time+':00-05:00').getTime()<=Date.now();}
 function summary(){
  document.querySelector('#summary-branch').textContent=branch()?'Nident '+branches[branch()]:'Elige tu sede';
  document.querySelector('#summary-service').textContent=packName||control('tratamiento').selectedOptions[0].textContent;
  document.querySelector('#summary-doctor').textContent=held?doctors[held.doctor]:control('profesional').selectedOptions[0].textContent;
  document.querySelector('#summary-time').textContent=control('fecha').value?format(control('fecha').value)+(held?' · '+held.time:' · Elige horario'):'Por seleccionar';
 }
 function guardian(){const minor=control('edad').value!==''&&Number(control('edad').value)<18;document.querySelector('#guardian-label').hidden=!minor;control('tutor').required=minor;}
 function holdStatus(){
  const status=document.querySelector('#hold-status'),release=document.querySelector('#release-slot');status.hidden=!held;release.hidden=!held;
  if(held){const remaining=Math.max(0,Math.ceil((held.expires-Date.now())/1000));status.textContent=`${held.time} con ${doctors[held.doctor]} · Apartado para ti ${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}. Duración de ejemplo: 60 minutos.`;}
 }
 async function release(){
  const old=held;held=null;control('hora').value='';holdStatus();summary();
  if(old)await transaction(agenda=>{if(agenda[old.key]?.owner===owner&&agenda[old.key]?.status==='held')delete agenda[old.key];});
 }
 function render(){
  const container=document.querySelector('#time-slots');container.replaceChildren();const value=control('fecha').value;
  if(!value||!validDate(value)){const p=document.createElement('p');p.textContent='Selecciona una fecha dentro de los próximos 90 días.';container.append(p);summary();return;}
  const day=new Date(value+'T12:00:00-05:00').getDay();
  if(day===0){const p=document.createElement('p');p.textContent='Los domingos no hay atención. Elige otra fecha.';container.append(p);return;}
  let agenda;try{agenda=read();}catch{fail('El navegador no permite guardar la agenda local. Habilita el almacenamiento para probar los bloqueos.');return;}
  const times=day===6?['09:00','10:00','11:00','12:00','13:00']:['09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00','18:00'];
  times.forEach(time=>{
   const doctor=chosenDoctor(agenda,value,time),record=doctor?agenda[slotKey(doctor,value,time)]:null;
   const own=record?.owner===owner&&record.status==='held';const blocked=timePassed(value,time)||!doctor||!!record&&!own;
   const button=document.createElement('button');button.type='button';button.textContent=time;button.dataset.time=time;button.disabled=blocked||busy;button.setAttribute('aria-pressed',String(own));button.setAttribute('aria-label',`${time}, ${blocked?'ocupado':own?'apartado para ti':'disponible en la agenda de ejemplo'}`);
   button.addEventListener('click',()=>select(time));container.append(button);
  });
  if([...container.children].every(b=>b.disabled)){const p=document.createElement('p');p.textContent='No quedan horarios disponibles. Elige otro día o profesional.';container.append(p);}
  holdStatus();summary();
 }
 async function select(time){
  if(busy)return;busy=true;error.hidden=true;
  try{
   const date=control('fecha').value;if(!validDate(date)||timePassed(date,time))throw new Error('Elige una fecha y horario futuros.');
   const result=await transaction(agenda=>{
    const doctor=chosenDoctor(agenda,date,time),key=doctor&&slotKey(doctor,date,time),record=agenda[key];
    if(!doctor||record&&record.owner!==owner||record?.status==='confirmed')return null;
    if(held&&agenda[held.key]?.owner===owner&&agenda[held.key]?.status==='held')delete agenda[held.key];
    const hold={key,doctor,date,time,sede:branch(),owner,status:'held',expires:Date.now()+lease};agenda[key]=hold;return hold;
   });
   if(!result){fail('Ese horario acaba de ocuparse. Elige otro; tus datos siguen aquí.');return;}
   held=result;control('hora').value=time;
  }catch(problem){fail(problem.message||'No pudimos apartar el horario. Intenta otra vez.');}
  finally{busy=false;render();}
 }
 function show(number){step=number;fields.forEach((field,i)=>field.hidden=i!==step);progress.forEach((item,i)=>{item.classList.toggle('active',i===step);if(i===step)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');});back.hidden=step===0;next.hidden=step===3;confirm.hidden=step!==3;error.hidden=true;const legend=fields[step].querySelector('legend');legend.tabIndex=-1;legend.focus({preventScroll:true});if(step===3)render();summary();}
 function validate(){
  if(step===0&&!branches[branch()])return fail('Selecciona una de nuestras cuatro sedes.',form.querySelector('[name=sede]'));
  if(step===1&&!control('tratamiento').value)return fail('Selecciona un tratamiento.',control('tratamiento'));
  if(step===2){
   if(control('nombre').value.trim().length<3)return fail('Escribe el nombre del paciente.',control('nombre'));
   if(control('edad').value===''||!control('edad').checkValidity())return fail('Introduce una edad entre 0 y 110 años.',control('edad'));
   if(control('telefono').value.replace(/\D/g,'').length<7)return fail('Introduce un teléfono válido.',control('telefono'));
   if(!control('correo').checkValidity())return fail('Introduce un correo válido.',control('correo'));
   if(control('tutor').required&&control('tutor').value.trim().length<3)return fail('Añade el adulto acompañante.',control('tutor'));
  }
  if(step===3&&(!held||held.expires<=Date.now()))return fail('Elige un horario para apartarlo antes de confirmar.',document.querySelector('#time-slots button:not(:disabled)'));
  return true;
 }
 next.addEventListener('click',()=>{if(validate())show(step+1);});
 back.addEventListener('click',async()=>{try{await release();show(step-1);}catch(problem){fail(problem.message);}});
 document.querySelector('#release-slot').addEventListener('click',async()=>{try{await release();render();}catch(problem){fail(problem.message);}});
 form.addEventListener('input',()=>{guardian();error.hidden=true;summary();});
 form.addEventListener('change',async event=>{
  if(['sede','profesional','fecha','tratamiento'].includes(event.target.name)){
   try{await release();render();}catch(problem){fail(problem.message);}
   if(event.target.name==='tratamiento'){packName='';const image=document.querySelector('.booking-service-photo img');image.src='assets/img/'+(photo[control('tratamiento').value]||'contacto/pexels-8413334.webp');image.alt=control('tratamiento').selectedOptions[0].textContent;}
  }summary();
 });
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(step<3){if(validate())show(step+1);return;}if(!validate()||busy)return;
  busy=true;confirm.disabled=true;confirm.textContent='Comprobando horario…';
  try{
   const candidate=held;
   const booked=await transaction(agenda=>{const record=agenda[candidate.key];if(!record||record.owner!==owner||record.status!=='held'||record.expires<=Date.now()||timePassed(candidate.date,candidate.time))return null;record.status='confirmed';record.expires=new Date(candidate.date+'T23:59:59-05:00').getTime()+86400000;record.code='CITA-'+crypto.randomUUID().slice(0,8).toUpperCase();return {...record};});
   if(!booked){held=null;control('hora').value='';fail('El apartado venció o el horario ya no está disponible. Elige uno nuevo sin volver a escribir tus datos.');render();return;}
   confirmed=booked;held=null;const box=document.querySelector('#booking-confirmation');box.replaceChildren();const dl=document.createElement('dl');
   for(const [label,value] of [['Código',booked.code],['Sede','Nident '+branches[booked.sede]],['Paciente',control('nombre').value.trim()],['Servicio',packName||control('tratamiento').selectedOptions[0].textContent],['Profesional',doctors[booked.doctor]],['Fecha',format(booked.date)],['Horario',booked.time+' · 60 minutos']]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;dl.append(dt,dd);}box.append(dl);
   form.hidden=true;document.querySelector('.booking-progress').hidden=true;const success=document.querySelector('#booking-success');success.hidden=false;success.tabIndex=-1;success.focus();form.reset();
  }catch(problem){fail(problem.message||'No pudimos confirmar el horario. Reintenta.');}
  finally{busy=false;confirm.disabled=false;confirm.textContent='Confirmar cita de ejemplo';}
 });
 document.querySelector('#booking-cancel').addEventListener('click',async event=>{
  if(!confirmed)return;try{await transaction(agenda=>{if(agenda[confirmed.key]?.owner===owner)delete agenda[confirmed.key];});confirmed=null;event.target.disabled=true;document.querySelector('#booking-success>p').textContent='Cita de ejemplo cancelada. El horario vuelve a estar disponible.';}catch(problem){document.querySelector('#booking-success>p').textContent=problem.message;}
 });
 document.querySelector('#booking-restart').addEventListener('click',()=>{form.reset();held=null;confirmed=null;guardian();form.hidden=false;document.querySelector('.booking-progress').hidden=false;document.querySelector('#booking-success').hidden=true;document.querySelector('#booking-cancel').disabled=false;document.querySelector('#booking-success>p').textContent='Este horario queda bloqueado en la agenda local de ejemplo. No se ha enviado una cita a la clínica.';show(0);});
 window.addEventListener('storage',event=>{if(event.key===storageKey&&step===3&&!form.hidden)render();});
 const tick=setInterval(()=>{if(!held)return;if(held.expires<=Date.now()){held=null;control('hora').value='';render();fail('Tu apartado de 5 minutos venció. Selecciona un horario de nuevo; tus datos siguen aquí.');}else holdStatus();},1000);
 window.addEventListener('pagehide',()=>{if(held)release().catch(()=>{});});
 // The deadline is rechecked on return; pages suspended by the browser cannot extend it.
 window.addEventListener('pageshow',event=>{if(event.persisted){if(held?.expires<=Date.now()){held=null;control('hora').value='';}render();}});
 if(params.get('pack'))fetch('assets/packs.json').then(r=>r.json()).then(packs=>{const pack=packs.find(p=>p.slug===params.get('pack'));if(pack){packName=pack.name;control('tratamiento').value=String(pack.service);summary();}}).catch(()=>{});
 guardian();show(0);
})();
