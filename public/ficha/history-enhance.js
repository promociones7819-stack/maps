(() => {
  const style = document.createElement('style');
  style.textContent = `
    .historyField{display:flex;flex-direction:column;gap:6px}.historyFieldLabel{font-size:12px;font-weight:800;color:var(--muted)}
    .dateField{grid-column:auto}.dateReadable{font-size:12px;color:var(--muted);min-height:18px}
    @media(max-width:900px){.dateField{grid-column:1/-1}}
  `;
  document.head.appendChild(style);

  function pretty(value){
    if(!value) return 'Selecciona la fecha de la clase';
    const [y,m,d]=value.split('-').map(Number);
    return new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(y,m-1,d,12));
  }
  function wrap(input,label,className=''){
    if(input.parentElement?.classList.contains('historyField')) return input.parentElement;
    const box=document.createElement('div'); box.className=`historyField ${className}`.trim();
    const l=document.createElement('div'); l.className='historyFieldLabel'; l.textContent=label;
    input.parentNode.insertBefore(box,input); box.append(l,input); return box;
  }
  function enhance(){
    const form=document.querySelector('.historyForm');
    const date=document.querySelector('#hDate');
    if(!form||!date||form.dataset.enhanced==='1') return;
    form.dataset.enhanced='1';
    const dateBox=wrap(date,'Fecha de la clase','dateField');
    const mins=document.querySelector('#hMinutes'); if(mins){wrap(mins,'Duración (minutos)');mins.placeholder='Ej. 50';}
    const route=document.querySelector('#hRoute'); if(route){wrap(route,'Itinerario / zona');route.placeholder='Ej. Barakaldo, autovía, urbano…';}
    const notes=document.querySelector('#hNotes'); if(notes){wrap(notes,'Observaciones');notes.placeholder='Tráfico, lluvia, aspectos a reforzar…';}
    const readable=document.createElement('div');readable.className='dateReadable';dateBox.append(readable);
    const update=()=>{readable.textContent=pretty(date.value);};date.addEventListener('change',update);update();
  }
  const obs=new MutationObserver(enhance);obs.observe(document.querySelector('#tabContent')||document.body,{childList:true,subtree:true});
  document.addEventListener('click',e=>{if(e.target.closest('.tab[data-tab="history"]')) setTimeout(enhance,0)});
  enhance();
})();