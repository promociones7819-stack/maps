(() => {
const blocks=['Preparación y mandos','Observación','Posición y trayectoria','Velocidad y control','Intersecciones','Señalización y maniobras','Seguridad y convivencia','Autonomía'];
const levels=['No trabajado','Necesita intervención','Con ayuda','Casi autónomo','Autónomo y seguro'];
const outcomes=['Pendiente','Logrado','Parcialmente','No logrado'];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=v=>JSON.parse(JSON.stringify(v));
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const display=d=>String(d||'').split('-').reverse().join('-');
const sorted=h=>[...h].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.createdAt||'').localeCompare(a.createdAt||''));
function parseDate(v){const m=/^(\d{2})-(\d{2})-(\d{4})$/.exec(v);if(!m)return null;const [day,month,year]=m.slice(1).map(Number),d=new Date(year,month-1,day);return year>=1900&&d.getFullYear()===year&&d.getMonth()===month-1&&d.getDate()===day?`${m[3]}-${m[2]}-${m[1]}`:null}
window.ReducedModel={blocks,levels,parseDate,sorted};
window.renderReduced=({container,p,student,save,uid,entryId})=>{
 const existing=entryId?p.history.find(e=>e.id===entryId):null;
 if(entryId&&!existing)return;
 const previous=existing?null:sorted(p.history||[])[0];
 let draft=existing?{...clone(existing.reduced||{}),id:existing.id,date:existing.date,minutes:existing.minutes,route:existing.route,vehicleType:existing.vehicleType}:p.reducedDraft;
 if(!draft){draft={id:uid(),date:today(),minutes:60,route:'',vehicleType:'manual',goals:{},ratings:{},results:{},observations:{},fields:{},confirmed:false,previous:previous?clone(previous):null};p.reducedDraft=draft;save()}
 draft.fields||={};draft.goals||={};draft.results||={};draft.observations||={};draft.ratings||={};
 const prior=draft.previous;
 const persist=()=>{if(!existing){p.reducedDraft=draft;save()}};
 const options=(items,value)=>items.map(x=>`<option${x===value?' selected':''}>${esc(x)}</option>`).join('');
 const smart=(label,key,choices,value)=>`<label>${esc(label)}<select data-choice="${key}">${options(['Seleccionar…',...choices,'Escribir…'],choices.includes(value)?value:value?'Escribir…':'Seleccionar…')}</select><textarea data-custom="${key}" ${!value||choices.includes(value)?'hidden':''} placeholder="Escribe tu respuesta" aria-label="${esc(label)}: respuesta personalizada">${esc(value&&!choices.includes(value)?value:'')}</textarea></label>`;
 container.innerHTML=`<div class="reduced"><section class="panel"><h2>${existing?'Editar':'Nueva'} clase · Ficha reducida</h2><div class="help">${esc(student.name)} · ${esc(student.dni||'')} · ${esc(student.phone||'')}</div><div class="rgrid">
 <label>Fecha<input type="date" data-field="date" value="${esc(draft.date)}"></label><label>Duración (min)<input type="number" min="1" data-field="minutes" value="${Number(draft.minutes)||60}"></label><label>Vehículo<select data-field="vehicleType"><option value="manual">Manual</option><option value="automatico">Automático</option><option value="adaptado">Adaptado</option></select></label><label>Itinerario / zona<input data-field="route" value="${esc(draft.route)}"></label></div></section>
 <details class="panel" id="rGoals" ${draft.confirmed?'':'open'}><summary>Objetivo del día · <span id="rSummary"></span></summary><p class="help">${prior?'Referencia: última clase del '+display(prior.date):'Primera clase: elige los objetivos iniciales.'}</p><div id="rGoalList"></div><button type="button" id="rConfirm">Confirmar objetivos y cerrar</button></details>
 <section class="panel"><h2>Valoración de la clase</h2><div id="rRatings"></div></section>
 <section class="panel"><h2>Cierre de clase</h2><div class="rgrid" id="rFields"></div><div class="rAbsences"><h3>Días que ha faltado</h3><label>Fecha DD-MM-AAAA<input id="rAbsenceDate" placeholder="DD-MM-AAAA" inputmode="numeric" maxlength="10"></label><button type="button" id="rAddAbsence">Añadir falta</button><div id="rAbsences"></div></div><p id="rMessage" role="status"></p><button type="button" id="rFinish">${existing?'Guardar cambios':'Guardar y finalizar clase'}</button></section></div>`;
 const root=container.querySelector('.reduced');
 root.querySelector('[data-field="vehicleType"]').value=draft.vehicleType||'manual';
 root.querySelectorAll('[data-field]').forEach(el=>el.addEventListener('input',()=>{draft[el.dataset.field]=el.type==='number'?Number(el.value):el.value;persist()}));
 const priorText=i=>{if(!prior)return 'Sin valoración previa';if(prior.reduced)return `${levels[prior.reduced.ratings?.[i]||0]} · ${prior.reduced.results?.[i]||'Sin objetivo valorado'}${prior.reduced.observations?.[i]?' · '+prior.reduced.observations[i]:''}`;return 'Última clase en ficha completa: consultar detalle debajo.'};
 blocks.forEach((name,i)=>{
   const row=document.createElement('div');row.className='rgoal';
   row.innerHTML=`<label><input type="checkbox" data-goal="${i}" ${draft.goals[i]?'checked':''}> ${esc(name)}</label><div class="help">${esc(priorText(i))}</div><label>Ajuste para hoy<select data-adjust="${i}">${options(['Aumentar','Mantener','Bajar'],draft.goals[i]||'Mantener')}</select></label>`;
   root.querySelector('#rGoalList').append(row);
   const check=row.querySelector('input'),adjust=row.querySelector('select');adjust.disabled=!check.checked;
   check.addEventListener('change',()=>{if(check.checked)draft.goals[i]=adjust.value;else delete draft.goals[i];adjust.disabled=!check.checked;draft.confirmed=false;persist();sync()});
   adjust.addEventListener('change',()=>{draft.goals[i]=adjust.value;draft.confirmed=false;persist();sync()});
   const rating=document.createElement('article');rating.className='rblock';
   rating.innerHTML=`<h3>${esc(name)}</h3><div class="rrating">${levels.map((l,n)=>`<button type="button" data-rating="${n}" aria-pressed="${Number(draft.ratings[i]||0)===n}" class="rlevel rlevel${n}">${esc(l)}</button>`).join('')}</div><div data-linked="${i}"><p class="rbadge">Objetivo del día · <span data-adjust-label="${i}"></span></p><div class="rgrid"><label>¿Se ha logrado?<select data-result="${i}">${options(outcomes,draft.results[i]||'Pendiente')}</select></label>${smart('Observación del objetivo','goal-'+i,['Lo realiza sin ayuda','Mejora, pero necesita indicaciones','Necesita seguir practicando','No se ha podido trabajar hoy'],draft.observations[i])}</div></div>`;
   root.querySelector('#rRatings').append(rating);
   rating.querySelectorAll('[data-rating]').forEach(b=>b.addEventListener('click',()=>{draft.ratings[i]=Number(b.dataset.rating);rating.querySelectorAll('[data-rating]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));persist()}));
   rating.querySelector('[data-result]').addEventListener('change',e=>{draft.results[i]=e.target.value;persist()});
 });
 if(prior&&!prior.reduced){const details=document.createElement('details');details.innerHTML='<summary>Valoraciones de la última ficha completa (escala 1–5)</summary>'+Object.entries(prior.ratings||{}).filter(([,v])=>v>0).map(([k,v])=>`<p>${esc(k)}: ${v}/5</p>`).join('')+`<p>${esc(prior.notes||'Sin observaciones')}</p>`;root.querySelector('#rGoalList').append(details)}
 const fields=[['Punto fuerte','strength',['Buena observación y uso de espejos','Buen control de mandos','Buena anticipación','Maniobras seguras','Conducción autónoma']],['Aspecto a mejorar','improve',['Adaptar antes la velocidad','Mirar más los espejos','Mejorar la posición','Anticipar prioridades','Señalizar con más tiempo']],['Objetivo para la próxima clase','next',['Glorietas con más tráfico','Incorporaciones','Estacionamientos','Intersecciones y prioridades','Conducción autónoma']],['Conexión / feeling','feeling',['Muy buena: comunicación y confianza','Buena: clase fluida','Correcta: necesita confianza','Difícil: nervios o bloqueo','Poca conexión durante la clase']],['Observaciones','notes',['Sin observaciones','Ha mejorado respecto a la clase anterior','Necesita repetir estos contenidos','Clase condicionada por nervios','Tráfico o meteorología adversos']]];
 root.querySelector('#rFields').innerHTML=fields.map(([label,key,choices])=>smart(label,key,choices,draft.fields[key])).join('');
 root.querySelectorAll('[data-choice]').forEach(select=>{const key=select.dataset.choice,input=root.querySelector(`[data-custom="${key}"]`);const put=v=>{if(key.startsWith('goal-'))draft.observations[key.slice(5)]=v;else draft.fields[key]=v;persist()};select.addEventListener('change',()=>{input.hidden=select.value!=='Escribir…';put(select.value==='Escribir…'?input.value:select.value==='Seleccionar…'?'':select.value);if(!input.hidden)input.focus()});input.addEventListener('input',()=>put(input.value))});
 function sync(){root.querySelector('#rSummary').textContent=Object.keys(draft.goals).map(i=>blocks[i]+' · '+draft.goals[i]).join(' / ')||'Seleccionar bloques';root.querySelectorAll('[data-linked]').forEach(el=>el.hidden=!draft.goals[el.dataset.linked]);root.querySelectorAll('[data-adjust-label]').forEach(el=>el.textContent=draft.goals[el.dataset.adjustLabel]||'')}
 root.querySelector('#rConfirm').addEventListener('click',()=>{if(!Object.keys(draft.goals).length){alert('Selecciona al menos un objetivo.');return}draft.confirmed=true;persist();root.querySelector('#rGoals').open=false});sync();
 function drawAbsences(){root.querySelector('#rAbsences').innerHTML=(student.absences||[]).slice().sort().map(d=>`<span class="rabsence"><i aria-hidden="true"></i>${display(d)}</span>`).join('')+`<p class="help">${(student.absences||[]).length} faltas acumuladas</p>`}
 root.querySelector('#rAddAbsence').addEventListener('click',()=>{const input=root.querySelector('#rAbsenceDate'),date=parseDate(input.value.trim());if(!date){alert('Introduce una fecha válida DD-MM-AAAA.');return}student.absences||=[];if(student.absences.includes(date)){alert('Ese día ya está registrado.');return}student.absences.push(date);save();input.value='';drawAbsences()});drawAbsences();
 root.querySelector('#rFinish').addEventListener('click',()=>{
   if(!draft.date||!(draft.minutes>0)){alert('Indica fecha y duración válida.');return}
   if(!draft.confirmed||!Object.keys(draft.goals).length){alert('Confirma los objetivos del día.');root.querySelector('#rGoals').open=true;return}
   if(Object.keys(draft.goals).some(i=>!draft.results[i]||draft.results[i]==='Pendiente')){alert('Indica si se ha logrado cada objetivo.');return}
   const now=new Date().toISOString();const reduced=clone(draft);delete reduced.previous;reduced.previous=draft.previous?{id:draft.previous.id,date:draft.previous.date,ratings:draft.previous.ratings,notes:draft.previous.notes,reduced:draft.previous.reduced?{ratings:draft.previous.reduced.ratings,results:draft.previous.reduced.results,observations:draft.previous.reduced.observations}:undefined}:null;
   const entry={...(existing||{}),id:draft.id,date:draft.date,minutes:draft.minutes,route:draft.route,vehicleType:draft.vehicleType,notes:draft.fields.notes||'',ratings:existing?.ratings||{},reduced,createdAt:existing?.createdAt||now,updatedAt:now};
   if(existing)p.history[p.history.findIndex(e=>e.id===entry.id)]=entry;else {p.history.push(entry);delete p.reducedDraft}
   save();root.querySelector('#rFinish').disabled=true;root.querySelector('#rMessage').textContent='Clase guardada en el histórico.';
   const next=document.createElement('button');next.type='button';next.textContent='Nueva clase';next.addEventListener('click',()=>window.renderReduced({container,p,student,save,uid}));root.querySelector('#rMessage').after(next);
 });
};
})();
