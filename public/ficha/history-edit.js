(() => {
  const DBKEY='traza-bizkaia-ficha-autoescuela-v2';
  const ACTIVE_KEY='traza-bizkaia-ficha-active-student';
  const RETURN_KEY='ficha-autoescuela-open-student';

  const style=document.createElement('style');
  style.textContent=`
    .historyEditActions{display:flex;gap:8px;align-items:center}.historyEditBtn{background:#fff;color:var(--blue2);border:1px solid var(--line)}
    .historyVehicle{font-size:12px;color:var(--muted);margin-top:3px;font-weight:650}
    .editClassBackdrop{position:fixed;inset:0;background:rgba(0,0,0,.38);z-index:1000;display:flex;align-items:center;justify-content:center;padding:18px}
    .editClassModal{width:min(720px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:18px;padding:18px;box-shadow:0 20px 60px rgba(0,0,0,.25)}
    .editClassModal h2{margin:0 0 6px}.editClassGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.editClassGrid .full{grid-column:1/-1}.editClassActions{display:flex;gap:10px;margin-top:16px}.editClassActions button{flex:1}
    @media(max-width:620px){.editClassGrid{grid-template-columns:1fr}.editClassGrid .full{grid-column:auto}.historyEditActions{flex-direction:column;align-items:stretch}}
  `;
  document.head.appendChild(style);

  function readDb(){try{return JSON.parse(localStorage.getItem(DBKEY)||'{"students":{}}')}catch{return{students:{}}}}
  function permitKey(){const t=document.querySelector('.permitChip.active')?.textContent?.trim();return Object.keys(window.DGT_DATA||{}).find(k=>window.DGT_DATA[k].label===t)||null}
  function activeStudent(db){
    const stored=localStorage.getItem(ACTIVE_KEY);if(stored&&db.students?.[stored])return db.students[stored];
    const title=document.querySelector('#studentTitle')?.textContent?.trim();
    return title?Object.values(db.students||{}).find(s=>(s.name||'').trim()===title)||null:null;
  }
  function vehicleLabel(v){return v==='manual'?'Manual':v==='automatico'?'Automático':v==='adaptado'?'Adaptado':'Sin indicar'}
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}

  function enhanceCards(){
    const list=document.querySelector('#historyList');if(!list)return;
    const cards=[...list.querySelectorAll('.historyCard')];if(!cards.length)return;
    const db=readDb(),student=activeStudent(db),permit=permitKey(),pdata=student&&permit?student.permits?.[permit]:null;if(!pdata)return;
    const entries=[...(pdata.history||[])].sort((a,b)=>{const d=(b.date||'').localeCompare(a.date||'');return d||(b.createdAt||'').localeCompare(a.createdAt||'')});
    cards.forEach((card,i)=>{
      const entry=entries[i];if(!entry)return;
      card.dataset.entryId=entry.id;
      const head=card.querySelector('.historyHead');if(!head)return;
      let edit=head.querySelector('.historyEditBtn');
      if(!edit){
        edit=document.createElement('button');edit.type='button';edit.className='mini historyEditBtn';edit.textContent='Editar';edit.dataset.editClass=entry.id;
        const del=head.querySelector('button.danger');
        if(del){
          let actions=head.querySelector('.historyEditActions');
          if(!actions){actions=document.createElement('div');actions.className='historyEditActions';del.before(actions);actions.append(del)}
          actions.prepend(edit);
        }else head.append(edit);
      }else edit.dataset.editClass=entry.id;
      const meta=card.querySelector('.historyMeta');
      let v=card.querySelector('.historyVehicle');
      if(!v&&meta){v=document.createElement('div');v.className='historyVehicle';meta.insertAdjacentElement('afterend',v)}
      if(v)v.textContent=`Vehículo: ${vehicleLabel(entry.vehicleType)}`;
    });
  }

  function openEditor(entryId){
    const db=readDb(),student=activeStudent(db),permit=permitKey(),pdata=student&&permit?student.permits?.[permit]:null;if(!pdata)return alert('No se ha podido localizar la clase.');
    const entry=(pdata.history||[]).find(e=>e.id===entryId);if(!entry)return alert('No se ha podido localizar la clase.');
    const overlay=document.createElement('div');overlay.className='editClassBackdrop';
    overlay.innerHTML=`<div class="editClassModal" role="dialog" aria-modal="true">
      <h2>Editar clase</h2><p class="help">Puedes corregir los datos de la sesión. Las puntuaciones prácticas de esa clase se conservan.</p>
      <div class="editClassGrid">
        <label>Fecha<input id="ecDate" type="date" value="${esc(entry.date||'')}"></label>
        <label>Duración (minutos)<input id="ecMinutes" type="number" min="0" step="5" value="${Number(entry.minutes)||0}"></label>
        <label>Itinerario / zona<input id="ecRoute" type="text" value="${esc(entry.route||'')}"></label>
        <label>Tipo de vehículo<select id="ecVehicle"><option value="">Seleccionar…</option><option value="manual">Manual</option><option value="automatico">Automático</option><option value="adaptado">Adaptado</option></select></label>
        <label class="full">Observaciones<textarea id="ecNotes">${esc(entry.notes||'')}</textarea></label>
      </div>
      <div class="editClassActions"><button type="button" class="secondary" id="ecCancel">Cancelar</button><button type="button" id="ecSave">Guardar cambios</button></div>
    </div>`;
    document.body.append(overlay);overlay.querySelector('#ecVehicle').value=entry.vehicleType||'';
    overlay.querySelector('#ecCancel').addEventListener('click',()=>overlay.remove());
    overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
    overlay.querySelector('#ecSave').addEventListener('click',()=>{
      const date=overlay.querySelector('#ecDate').value,vehicleType=overlay.querySelector('#ecVehicle').value;
      if(!date)return alert('Indica la fecha de la clase.');
      if(!vehicleType)return alert('Selecciona el tipo de vehículo.');
      entry.date=date;entry.minutes=Number(overlay.querySelector('#ecMinutes').value)||0;entry.route=overlay.querySelector('#ecRoute').value.trim();entry.notes=overlay.querySelector('#ecNotes').value.trim();entry.vehicleType=vehicleType;entry.editedAt=new Date().toISOString();
      student.updatedAt=new Date().toISOString();localStorage.setItem(DBKEY,JSON.stringify(db));sessionStorage.setItem(RETURN_KEY,student.id);localStorage.setItem(ACTIVE_KEY,student.id);location.reload();
    });
  }

  document.addEventListener('click',e=>{
    const edit=e.target.closest('.historyEditBtn,[data-edit-class]');
    if(edit){e.preventDefault();e.stopPropagation();openEditor(edit.dataset.editClass);return;}
    if(e.target.closest('.tab[data-tab="history"]'))setTimeout(enhanceCards,80);
  },true);

  new MutationObserver(()=>setTimeout(enhanceCards,0)).observe(document.querySelector('#tabContent')||document.body,{childList:true,subtree:true});
  setTimeout(enhanceCards,100);
})();