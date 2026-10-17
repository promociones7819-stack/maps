(() => {
  const style = document.createElement('style');
  style.textContent = `
    .legacyStudentsPanel{display:none!important}
    .studentNameLegacy{display:none!important}
    .legacyDeleteStudent{display:none!important}
    .sidebar{gap:12px}
    .sidebar .panel{box-shadow:none}
    .sidebar .panel h2{margin-bottom:8px}
    .sidebar .panel .help{margin-bottom:10px}
    .app{grid-template-columns:280px minmax(0,1fr)}
    @media(max-width:900px){.app{grid-template-columns:1fr}.sidebar{order:2}.content{order:1}}
  `;
  document.head.appendChild(style);

  function simplify(){
    const sidebar=document.querySelector('.sidebar');
    if(!sidebar || sidebar.dataset.simplified==='1') return;
    sidebar.dataset.simplified='1';

    const studentList=document.querySelector('#studentList');
    const legacyPanel=studentList?.closest('.panel');
    legacyPanel?.classList.add('legacyStudentsPanel');

    const studentName=document.querySelector('#studentName');
    studentName?.closest('label')?.classList.add('studentNameLegacy');

    const dataPanel=studentName?.closest('.panel');
    if(dataPanel){
      const h2=dataPanel.querySelector('h2');
      if(h2) h2.textContent='Datos de la ficha';
      if(!dataPanel.querySelector('.simplifyHelp')){
        const p=document.createElement('p');
        p.className='help simplifyHelp';
        p.textContent='Nombre, apellidos, DNI, teléfono y permisos se gestionan desde la pestaña Alumnos.';
        h2?.insertAdjacentElement('afterend',p);
      }
    }

    const save=document.querySelector('#saveBtn');
    if(save) save.textContent='Guardar profesor / autoescuela';
    document.querySelector('#deleteStudentBtn')?.classList.add('legacyDeleteStudent');

    const syncPanel=[...sidebar.querySelectorAll('.panel')].find(p=>p.textContent.includes('Sincronización sin servidor'));
    if(syncPanel){
      const h2=syncPanel.querySelector('h2');
      if(h2) h2.textContent='Copia y sincronización';
      const help=syncPanel.querySelector('.help');
      if(help) help.textContent='Exporta o importa una copia para pasar los datos entre iPad y Mac con AirDrop, iCloud Drive o Archivos.';
    }
  }

  simplify();
  new MutationObserver(simplify).observe(document.body,{childList:true,subtree:true});
})();