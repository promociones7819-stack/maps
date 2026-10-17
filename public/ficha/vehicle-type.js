(() => {
  const DBKEY='traza-bizkaia-ficha-autoescuela-v2';
  const ACTIVE_KEY='traza-bizkaia-ficha-active-student';

  const style=document.createElement('style');
  style.textContent=`
    .vehicleTypeBox{margin-top:12px;padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:#f8fbfc;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
    .vehicleTypeBox label{margin:0;min-width:150px;color:var(--ink);font-weight:800}
    .vehicleTypeBox select{max-width:280px;min-width:220px}
    .vehicleTypeStatus{font-size:12px;color:var(--muted)}
    @media(max-width:620px){.vehicleTypeBox{align-items:stretch;flex-direction:column}.vehicleTypeBox select{max-width:none;width:100%}}
  `;
  document.head.appendChild(style);

  function readDb(){try{return JSON.parse(localStorage.getItem(DBKEY)||'{"students":{}}')}catch{return{students:{}}}}
  function activeContext(){
    const db=readDb();
    const permitText=document.querySelector('.permitChip.active')?.textContent?.trim();
    const permit=Object.keys(window.DGT_DATA||{}).find(k=>window.DGT_DATA[k].label===permitText);
    if(!permit)return null;
    let student=null;
    const id=localStorage.getItem(ACTIVE_KEY);
    if(id&&db.students?.[id])student=db.students[id];
    if(!student){
      const title=document.querySelector('#studentTitle')?.textContent?.trim();
      if(title)student=Object.values(db.students||{}).find(s=>(s.name||'').trim()===title)||null;
    }
    if(!student||!student.permits?.[permit])return null;
    return {db,student,permit,pdata:student.permits[permit]};
  }
  function saveVehicle(value){
    const ctx=activeContext(); if(!ctx)return;
    ctx.pdata.vehicleType=value;
    ctx.student.updatedAt=new Date().toISOString();
    localStorage.setItem(DBKEY,JSON.stringify(ctx.db));
    const status=document.querySelector('.vehicleTypeStatus');
    if(status){status.textContent='Guardado';setTimeout(()=>{if(status)status.textContent='';},1200)}
  }
  function render(){
    const host=document.querySelector('.permitManager');
    if(!host)return;
    const ctx=activeContext();
    if(!ctx){host.querySelector('.vehicleTypeBox')?.remove();return;}
    let box=host.querySelector('.vehicleTypeBox');
    if(!box){
      box=document.createElement('div');box.className='vehicleTypeBox';
      box.innerHTML=`<label for="vehicleTypeSelect">Tipo de vehículo</label><select id="vehicleTypeSelect"><option value="">Seleccionar…</option><option value="manual">Manual</option><option value="automatico">Automático</option><option value="adaptado">Adaptado</option></select><span class="vehicleTypeStatus"></span>`;
      host.append(box);
      box.querySelector('select').addEventListener('change',e=>saveVehicle(e.target.value));
    }
    box.querySelector('select').value=ctx.pdata.vehicleType||'';
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('.permitChip,[data-open],#navFicha'))setTimeout(render,0);
  });
  new MutationObserver(render).observe(document.body,{childList:true,subtree:true});
  render();
})();