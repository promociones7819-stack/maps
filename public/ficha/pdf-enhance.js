(() => {
  const DBKEY = 'traza-bizkaia-ficha-autoescuela-v2';
  const ACTIVE_KEY = 'traza-bizkaia-ficha-active-student';
  const XCOLS = [424, 444, 464, 484, 503];

  const LAYOUTS = {
    'B': { fields:{pages:[3,8],xName:78,xTeacher:240,xDate:408}, groups:{
      'Aprendizaje a motor parado':{page:3,ys:[399,423,447,591,615,639,672]},
      'Automatismos básicos':{page:4,ys:[357,378,396,417,438,456,477]},
      'Dominio de mandos':{page:4,ys:[579,603,627,648,672]},
      'Circulación':{page:5,ys:[264,288,309,333,354,378,399,423,447,468,492]},
      'Condiciones especiales':{page:6,ys:[234,255,279,300,324,348,366,396]},
      'Valoración global':{page:6,ys:[483,504,528,549]}
    }, itineraryPage:7,
    summary:{page:8,groups:{
      'Aprendizaje a motor parado':{xs:[57,57,57,58,58,58,58],ys:[292,311,329,455,474,502,531]},
      'Automatismos básicos':{xs:[234,234,234,234,234,234,234],ys:[279,298,316,335,353,372,390]},
      'Dominio de mandos':{xs:[234,234,234,234,234],ys:[465,484,502,521,539]},
      'Circulación':{xs:[404,404,404,404,404,404,404,404,404,404,404],ys:[291,319,348,376,395,413,432,451,469,488,507]},
      'Condiciones especiales':{xs:[404,404,404,404,404,404,404,404],ys:[582,601,619,638,656,675,693,722]}
    }}},
    'A1/A2': { fields:{pages:[3,8],xName:78,xTeacher:240,xDate:408}, groups:{
      'Aprendizaje a motor parado':{page:3,ys:[399,423,447,471,495,591,615,639,663]},
      'Automatismos básicos':{page:4,ys:[357,378,396,417,438,456,477]},
      'Dominio de mandos':{page:4,ys:[585,606,630,654,675]},
      'Maniobras específicas':{page:5,ys:[234,258,282,306,330,354,378]},
      'Circulación':{page:5,ys:[507,531,552,573,594,624,648,669,693,714,735]},
      'Condiciones especiales':{page:6,ys:[222,246,270,294,318,342,366]},
      'Valoración global':{page:6,ys:[453,477,501,525]}
    }, itineraryPage:7},
    'AM': { fields:{pages:[3,6],xName:78,xTeacher:240,xDate:408}, groups:{
      'Aprendizaje a motor parado':{page:3,ys:[399,423,447,471,495,591,615,639,663]},
      'Automatismos básicos':{page:4,ys:[357,378,396,417,438,456,477]},
      'Dominio de mandos':{page:4,ys:[582,606,627,651]},
      'Maniobras específicas':{page:5,ys:[231,255,279,303]},
      'Valoración global':{page:5,ys:[429,462,486,510,534,558,582]}
    }},
    'C1/C': { fields:{pages:[3,8],xName:78,xTeacher:240,xDate:408}, groups:{
      'Aprendizaje a motor parado':{page:3,ys:[399,423,447,471,591,615,651,687]},
      'Maniobras específicas':{page:4,ys:[300,321,342,363,381,402]},
      'Automatismos básicos':{page:4,ys:[594,615,639,666,690,711,735]},
      'Dominio de mandos':{page:5,ys:[249,270,294,315,339,363]},
      'Circulación':{page:5,ys:[513,552,570,591,609,639,657,675,693,711,729,750]},
      'Condiciones especiales':{page:6,ys:[234,255,279,300,324,348,366,396,420]},
      'Valoración global':{page:6,ys:[504,525,549,573]}
    }, itineraryPage:7},
    'D1/D': { fields:{pages:[3,8],xName:78,xTeacher:240,xDate:408}, groups:{
      'Aprendizaje a motor parado':{page:3,ys:[399,423,447,471,591,615,651,687]},
      'Maniobras específicas':{page:4,ys:[297,318,339,360,378,399]},
      'Automatismos básicos':{page:4,ys:[594,615,639,666,690,711,735]},
      'Dominio de mandos':{page:5,ys:[249,270,294,315,339,363]},
      'Circulación':{page:5,ys:[513,552,570,591,609,639,657,675,693,711,729,750]},
      'Condiciones especiales':{page:6,ys:[234,255,279,300,324,348,366,396,420]},
      'Valoración global':{page:6,ys:[504,525,549,573]}
    }, itineraryPage:7}
  };

  const ITINERARY_TOPS = [176,198,218,238,259,279,298,316,335,353,371,390,408,427,445,464,482,500,519,537,556,574,593,611,629,648,666,685,703,722];

  const style = document.createElement('style');
  style.textContent = `
    .pdfClassBox{margin-top:14px;padding:14px;border:1px solid var(--line);border-radius:14px;background:#fff}
    .pdfClassBox label{margin:0 0 8px}.pdfClassActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
    .pdfClassActions button{flex:1;min-width:220px}.pdfHint{font-size:13px;color:var(--muted);margin-top:8px;line-height:1.45}
  `;
  document.head.appendChild(style);

  function readDb(){
    try { return JSON.parse(localStorage.getItem(DBKEY) || '{"students":{}}'); }
    catch { return {students:{}}; }
  }

  function getActiveContext() {
    const db = readDb();
    const permitText = document.querySelector('.permitChip.active')?.textContent?.trim();
    const permit = Object.keys(window.DGT_DATA || {}).find(k => window.DGT_DATA[k].label === permitText);
    if (!permit) return null;

    let student = null;
    const activeId = localStorage.getItem(ACTIVE_KEY);
    if (activeId && db.students?.[activeId]) student = db.students[activeId];

    if (!student) {
      const title = document.querySelector('#studentTitle')?.textContent?.trim();
      if (title) student = Object.values(db.students || {}).find(s => (s.name || '').trim() === title);
    }

    if (!student) {
      const buttons = [...document.querySelectorAll('#studentList .studentBtn')];
      const active = document.querySelector('#studentList .studentBtn.active');
      if (active) {
        const rows = Object.values(db.students || {}).sort((a,b)=>(a.name||'').localeCompare(b.name||''));
        student = rows[buttons.indexOf(active)] || null;
      }
    }

    if (!student || !student.permits?.[permit]) return null;
    return { student, permit, pdata: student.permits[permit] };
  }

  function proxyUrl(permit) { return `./pdf/${permit.replaceAll("/","-")}.pdf`; }

  function downloadBlob(bytes, name) {
    const blob = new Blob([bytes], {type:'application/pdf'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 2500);
  }

  function stampIdentity(pages,font,student,pdata,layout){
    for (const pi of layout.fields.pages || []) {
      const page = pages[pi]; if (!page) continue;
      const top = pi === 3 ? 151 : 143;
      const y = page.getHeight() - top;
      if (student.name) page.drawText(String(student.name).slice(0,42),{x:layout.fields.xName,y,size:8,font});
      if (student.teacher) page.drawText(String(student.teacher).slice(0,38),{x:layout.fields.xTeacher,y,size:8,font});
      if (pdata.started) page.drawText(String(pdata.started),{x:layout.fields.xDate,y,size:8,font});
    }
  }

  function stampRatings(pages,font,ratings,permit,layout){
    for (const [group,cfg] of Object.entries(layout.groups || {})) {
      const items = window.DGT_DATA?.[permit]?.practical?.[group] || [];
      const page = pages[cfg.page]; if (!page) continue;
      const h = page.getHeight();
      items.forEach((item,i)=>{
        const value = Number(ratings?.[item]) || 0;
        if (value < 1 || value > 5 || cfg.ys[i] == null) return;
        page.drawText('X',{x:XCOLS[value-1]-2.5,y:h-(cfg.ys[i]+8),size:9,font});
      });
    }
  }

  function stampSummary(pages,font,ratings,permit,layout){
    if (!layout.summary) return;
    const page = pages[layout.summary.page]; if (!page) return;
    const h = page.getHeight();
    for (const [group,cfg] of Object.entries(layout.summary.groups || {})) {
      const items = window.DGT_DATA?.[permit]?.practical?.[group] || [];
      items.forEach((item,i)=>{
        const value = Number(ratings?.[item]) || 0;
        if (!value || cfg.xs[i] == null || cfg.ys[i] == null) return;
        page.drawText('X',{x:cfg.xs[i]-3,y:h-(cfg.ys[i]+4),size:9,font});
      });
    }
  }

  function historyUpTo(pdata, selectedEntry=null){
    const history=[...(pdata.history||[])].sort((a,b)=>{
      const d=(a.date||'').localeCompare(b.date||'');
      return d || (a.createdAt||'').localeCompare(b.createdAt||'');
    });
    if (!selectedEntry) return history;
    const idx=history.findIndex(e=>e.id===selectedEntry.id);
    return idx>=0 ? history.slice(0,idx+1) : history;
  }

  function stampItinerary(pages,font,pdata,layout,selectedEntry=null){
    if (layout.itineraryPage == null) return;
    const page = pages[layout.itineraryPage]; if (!page) return;
    const h = page.getHeight();
    historyUpTo(pdata,selectedEntry).slice(0,30).forEach((entry,i)=>{
      const route = String(entry.route || '').trim();
      if (!route) return;
      const yTop = ITINERARY_TOPS[i];
      page.drawText(route.slice(0,78),{x:128,y:h-(yTop+9),size:8,font});
    });
  }

  function cumulativeRatings(pdata, selectedEntry=null){
    const result={};
    for (const entry of historyUpTo(pdata,selectedEntry)) {
      for (const [item,value] of Object.entries(entry.ratings || {})) {
        const n=Number(value)||0;
        if(n>=1&&n<=5) result[item]=n;
      }
    }
    return result;
  }

  async function generate(mode='cumulative', classId=null) {
    const ctx = getActiveContext();
    if (!ctx) return alert('No se ha podido identificar el alumno o el permiso activo. Vuelve a abrir la ficha desde Alumnos.');
    if (!window.PDFLib) return alert('No se ha cargado el motor PDF.');
    const layout = LAYOUTS[ctx.permit];
    if (!layout) return alert('Este permiso todavía no tiene plantilla calibrada.');

    const selectedEntry = classId ? (ctx.pdata.history || []).find(e=>e.id===classId) : null;
    if (mode==='class' && !selectedEntry) return alert('Selecciona una clase.');

    try {
      const response = await fetch(proxyUrl(ctx.permit), {cache:'no-store'});
      if (!response.ok) throw new Error(`PDF oficial no disponible (${response.status})`);
      const doc = await PDFLib.PDFDocument.load(await response.arrayBuffer());
      const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
      const pages = doc.getPages();
      const ratings = mode==='class' ? (selectedEntry.ratings || {}) : cumulativeRatings(ctx.pdata);

      stampIdentity(pages,font,ctx.student,ctx.pdata,layout);
      stampRatings(pages,font,ratings,ctx.permit,layout);
      stampSummary(pages,font,ratings,ctx.permit,layout);
      stampItinerary(pages,font,ctx.pdata,layout,mode==='class'?selectedEntry:null);

      const safeName=(ctx.student.name||'alumno').replace(/[^\p{L}\p{N}_-]+/gu,'_');
      const permit=ctx.permit.replace('/','-');
      const suffix=mode==='class' ? `-${selectedEntry.date||'clase'}` : '-acumulado';
      downloadBlob(await doc.save(), `Ficha-${safeName}-${permit}${suffix}.pdf`);
    } catch (err) {
      console.error(err);
      alert('No se ha podido obtener el PDF oficial desde Cloudflare. Recarga la aplicación e inténtalo de nuevo.');
    }
  }

  function renderPdfControls(){
    const panel=[...document.querySelectorAll('#tabContent .panel')].find(p=>p.querySelector('h2')?.textContent?.includes('PDF oficial'));
    if(!panel || panel.dataset.classPdf==='1') return;
    const ctx=getActiveContext();
    if(!ctx) return;
    panel.dataset.classPdf='1';

    const oldFilled=panel.querySelector('#pdfFilled');
    if(oldFilled){oldFilled.textContent='Generar PDF acumulado'; oldFilled.dataset.mode='cumulative';}

    const box=document.createElement('div');
    box.className='pdfClassBox';
    const history=[...(ctx.pdata.history||[])].sort((a,b)=>{
      const d=(b.date||'').localeCompare(a.date||'');
      return d || (b.createdAt||'').localeCompare(a.createdAt||'');
    });

    box.innerHTML=`<label><strong>PDF de una clase concreta</strong></label>
      <select id="pdfClassSelect" ${history.length?'':'disabled'}></select>
      <div class="pdfClassActions"><button type="button" id="pdfClassDownload" ${history.length?'':'disabled'}>Descargar PDF de la clase seleccionada</button></div>
      <div class="pdfHint">Cada PDF de clase usa exactamente las puntuaciones guardadas en esa sesión. El PDF acumulado muestra el último nivel alcanzado hasta hoy.</div>`;

    const select=box.querySelector('#pdfClassSelect');
    if(!history.length){
      const o=document.createElement('option'); o.textContent='Todavía no hay clases guardadas'; select.append(o);
    }else{
      history.forEach((e,i)=>{
        const o=document.createElement('option');
        o.value=e.id;
        const route=e.route?` · ${e.route}`:'';
        const mins=e.minutes?` · ${e.minutes} min`:'';
        o.textContent=`${e.date||'Sin fecha'}${route}${mins}`;
        if(i===0)o.selected=true;
        select.append(o);
      });
    }
    panel.append(box);
  }

  const observer=new MutationObserver(renderPdfControls);
  observer.observe(document.querySelector('#tabContent')||document.body,{childList:true,subtree:true});
  renderPdfControls();

  document.addEventListener('click', e => {
    const target = e.target.closest('#pdfFilled, #pdfBase, #pdfClassDownload');
    if (!target) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const ctx = getActiveContext();
    if (!ctx) return alert('No se ha podido identificar el alumno o el permiso activo. Vuelve a abrir la ficha desde Alumnos.');

    if (target.id === 'pdfBase') {
      window.open(proxyUrl(ctx.permit),'_blank');
      return;
    }
    if (target.id === 'pdfClassDownload') {
      const id=document.querySelector('#pdfClassSelect')?.value;
      return generate('class',id);
    }
    generate('cumulative');
  }, true);
})();