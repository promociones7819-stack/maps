(() => {
  const DBKEY = 'traza-bizkaia-ficha-autoescuela-v2';
  const RETURN_KEY = 'ficha-autoescuela-open-student';
  const ACTIVE_KEY = 'traza-bizkaia-ficha-active-student';

  const style = document.createElement('style');
  style.textContent = `
    .primaryNav{display:flex;gap:8px;max-width:1500px;margin:14px auto 0;padding:0 18px}.primaryNav button{background:#fff;color:var(--blue2);border:1px solid var(--line)}.primaryNav button.active{background:var(--blue);color:#fff;border-color:var(--blue)}
    .studentsView{max-width:1500px;margin:0 auto;padding:18px}.studentsToolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}.studentsToolbar h2{margin:0}.studentsSearch{max-width:440px}
    .studentsGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}.studentCard2{background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px}.studentCard2 h3{margin:0 0 6px;font-size:18px}.studentCard2 .meta{font-size:13px;color:var(--muted);line-height:1.45}.studentCard2 .cardActions{display:flex;gap:8px;margin-top:12px}.studentCard2 .cardActions button{flex:1}
    .studentFormWrap{max-width:760px;margin:0 auto}.studentFormGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.studentFormGrid .fullSpan{grid-column:1/-1}.studentFormActions{display:flex;gap:10px;margin-top:16px}.studentFormActions button{flex:1}
    .formIntro{color:var(--muted);margin-top:-4px}.required::after{content:' *';color:#b23a3a}.permitHint{font-size:12px;color:var(--muted);margin-top:5px}
    @media(max-width:700px){.primaryNav{padding:0 10px}.studentsView{padding:10px}.studentsToolbar{align-items:stretch;flex-direction:column}.studentsSearch{max-width:none}.studentFormGrid{grid-template-columns:1fr}.studentFormGrid .fullSpan{grid-column:auto}}
  `;
  document.head.appendChild(style);

  const app = document.querySelector('main.app');
  if (!app) return;

  const nav = document.createElement('nav');
  nav.className = 'primaryNav';
  nav.innerHTML = '<button type="button" id="navStudents">Alumnos</button><button type="button" id="navFicha" class="active">Ficha del alumno</button>';
  app.parentNode.insertBefore(nav, app);

  const studentsView = document.createElement('section');
  studentsView.id = 'studentsView';
  studentsView.className = 'studentsView hidden';
  app.parentNode.insertBefore(studentsView, app.nextSibling);

  const navStudents = document.querySelector('#navStudents');
  const navFicha = document.querySelector('#navFicha');
  const legacyNew = document.querySelector('#newStudent');

  function readDb(){
    try { return JSON.parse(localStorage.getItem(DBKEY) || '{"students":{}}'); }
    catch { return {students:{}}; }
  }
  function writeDb(db){ localStorage.setItem(DBKEY, JSON.stringify(db)); }
  function esc(v){return String(v ?? '').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
  function uid(){return crypto.randomUUID ? crypto.randomUUID() : Date.now()+'-'+Math.random().toString(16).slice(2)}
  function today(){const d=new Date();const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
  function newPermitData(key){return {key,started:today(),theory:{},practical:{},history:[],notes:''}}

  function showStudents(){
    navStudents.classList.add('active'); navFicha.classList.remove('active');
    app.classList.add('hidden'); studentsView.classList.remove('hidden');
    renderList();
  }
  function showFicha(){
    navStudents.classList.remove('active'); navFicha.classList.add('active');
    studentsView.classList.add('hidden'); app.classList.remove('hidden');
  }

  function renderList(){
    const db = readDb();
    const rows = Object.values(db.students || {}).sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    studentsView.innerHTML = `
      <div class="panel">
        <div class="studentsToolbar">
          <div><h2>Alumnos</h2><div class="help">Busca un alumno, abre su ficha o crea una nueva matrícula.</div></div>
          <button type="button" id="createStudentMain">＋ Nuevo alumno</button>
        </div>
        <input id="studentsMainSearch" class="studentsSearch" type="search" placeholder="Buscar por nombre, apellidos, DNI o teléfono">
        <div id="studentsMainGrid" class="studentsGrid" style="margin-top:14px"></div>
      </div>`;
    const grid = studentsView.querySelector('#studentsMainGrid');
    const search = studentsView.querySelector('#studentsMainSearch');
    const draw = () => {
      const q = search.value.trim().toLowerCase();
      const filtered = rows.filter(s => [s.firstName,s.lastName,s.name,s.dni,s.phone].some(v => String(v||'').toLowerCase().includes(q)));
      grid.innerHTML = '';
      if (!filtered.length) { grid.innerHTML = '<div class="help">No hay alumnos que coincidan.</div>'; return; }
      filtered.forEach(s => {
        const permits = Object.keys(s.permits || {});
        const card = document.createElement('article'); card.className='studentCard2';
        card.innerHTML = `<h3>${esc(s.name || [s.firstName,s.lastName].filter(Boolean).join(' ') || 'Sin nombre')}</h3>
          <div class="meta">${s.dni ? 'DNI: '+esc(s.dni)+'<br>' : ''}${s.phone ? 'Tel.: '+esc(s.phone)+'<br>' : ''}Permiso${permits.length===1?'':'s'}: ${esc(permits.join(', ') || 'Sin permiso')}</div>
          <div class="cardActions"><button type="button" data-open="${esc(s.id)}">Abrir ficha</button><button type="button" class="secondary" data-edit="${esc(s.id)}">Editar</button></div>`;
        grid.append(card);
      });
    };
    search.addEventListener('input', draw); draw();
    studentsView.querySelector('#createStudentMain').addEventListener('click',()=>renderForm());
    grid.addEventListener('click',e=>{
      const open=e.target.closest('[data-open]'); if(open){openStudent(open.dataset.open);return;}
      const edit=e.target.closest('[data-edit]'); if(edit){renderForm(edit.dataset.edit);}
    });
  }

  function renderForm(id=null){
    const db=readDb(); const s=id?db.students?.[id]:null;
    const currentPermits=Object.keys(s?.permits||{});
    const primary=currentPermits[0]||'B';
    studentsView.innerHTML = `
      <div class="panel studentFormWrap">
        <div class="panelTitle"><div><h2>${s?'Editar alumno':'Nuevo alumno'}</h2><p class="formIntro">Introduce los datos básicos de matrícula. Después podrás añadir más permisos desde su ficha.</p></div></div>
        <div class="studentFormGrid">
          <label><span class="required">Nombre</span><input id="sfFirst" type="text" autocomplete="given-name" value="${esc(s?.firstName || splitName(s?.name).first)}"></label>
          <label><span class="required">Apellidos</span><input id="sfLast" type="text" autocomplete="family-name" value="${esc(s?.lastName || splitName(s?.name).last)}"></label>
          <label><span class="required">DNI / NIE</span><input id="sfDni" type="text" autocapitalize="characters" value="${esc(s?.dni||'')}"></label>
          <label><span class="required">Teléfono</span><input id="sfPhone" type="tel" inputmode="tel" autocomplete="tel" value="${esc(s?.phone||'')}"></label>
          <label class="fullSpan"><span class="required">Permiso en el que se matricula</span><select id="sfPermit"></select><div class="permitHint">Este será el permiso inicial. Podrás añadir otros después.</div></label>
        </div>
        <div id="sfError" class="help" style="color:#a83d3d;margin-top:8px"></div>
        <div class="studentFormActions"><button type="button" class="secondary" id="sfCancel">Cancelar</button><button type="button" id="sfSave">${s?'Guardar cambios':'Crear alumno y abrir ficha'}</button></div>
      </div>`;
    const sel=studentsView.querySelector('#sfPermit');
    Object.keys(window.DGT_DATA||{}).forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=window.DGT_DATA[k].label;o.selected=k===primary;sel.append(o)});
    studentsView.querySelector('#sfCancel').addEventListener('click',renderList);
    studentsView.querySelector('#sfSave').addEventListener('click',()=>saveForm(id));
    setTimeout(()=>studentsView.querySelector('#sfFirst')?.focus(),0);
  }

  function splitName(name=''){
    const parts=String(name).trim().split(/\s+/).filter(Boolean); if(!parts.length)return{first:'',last:''};
    return {first:parts.shift(),last:parts.join(' ')};
  }

  function saveForm(id){
    const first=studentsView.querySelector('#sfFirst').value.trim();
    const last=studentsView.querySelector('#sfLast').value.trim();
    const dni=studentsView.querySelector('#sfDni').value.trim().toUpperCase();
    const phone=studentsView.querySelector('#sfPhone').value.trim();
    const permit=studentsView.querySelector('#sfPermit').value;
    const err=studentsView.querySelector('#sfError');
    if(!first||!last||!dni||!phone||!permit){err.textContent='Completa nombre, apellidos, DNI/NIE, teléfono y permiso.';return;}
    const db=readDb(); const now=new Date().toISOString();
    const s=id && db.students[id] ? db.students[id] : {id:uid(),teacher:'',school:'',notes:'',permits:{},updatedAt:now};
    s.firstName=first; s.lastName=last; s.name=`${first} ${last}`.trim(); s.dni=dni; s.phone=phone; s.updatedAt=now; s.permits=s.permits||{};
    if(!s.permits[permit]) s.permits[permit]=newPermitData(permit);
    db.students[s.id]=s; writeDb(db);
    openStudent(s.id);
  }

  function openStudent(id){
    localStorage.setItem(ACTIVE_KEY,id);
    sessionStorage.setItem(RETURN_KEY,id);
    location.reload();
  }

  window.RutasFicha.create=()=>{showStudents();renderForm();};window.RutasFicha.edit=id=>{showStudents();renderForm(id);};
  navStudents.addEventListener('click',showStudents); navFicha.addEventListener('click',showFicha);
  legacyNew?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();showStudents();renderForm();},true);

  // After reload from the management screen, automatically open the student just created/selected.
  const wanted=sessionStorage.getItem(RETURN_KEY) || localStorage.getItem(ACTIVE_KEY);
  if(wanted){
    sessionStorage.removeItem(RETURN_KEY);
    localStorage.setItem(ACTIVE_KEY,wanted);
    setTimeout(()=>{
      const db=readDb(); const target=db.students?.[wanted]; if(!target)return;
      const buttons=[...document.querySelectorAll('#studentList .studentBtn')];
      const btn=buttons.find(b=>b.dataset.studentId===wanted);
      btn?.click();
      showFicha();
    },0);
  }
})();