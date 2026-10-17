(() => {
  const DBKEY='traza-bizkaia-ficha-autoescuela-v2';
  const ACTIVE_KEY='traza-bizkaia-ficha-active-student';
  const XCOLS=[424,444,464,484,503];
  // Coordenadas calibradas sobre la ficha oficial (página práctica inicial).
  // Centro visual de las casillas Manual / Automático / Adaptado.
  const VEHICLE_X={manual:284,automatico:342,adaptado:416};
  const VEHICLE_Y=638;

  const LAYOUTS={
    'B':{fields:{pages:[3,8],xName:78,xTeacher:240,xDate:408},groups:{
      'Aprendizaje a motor parado':{page:3,ys:[399,423,447,591,615,639,672]},
      'Automatismos básicos':{page:4,ys:[357,378,396,417,438,456,477]},
      'Dominio de mandos':{page:4,ys:[579,603,627,648,672]},
      'Circulación':{page:5,ys:[264,288,309,333,354,378,399,423,447,468,492]},
      'Condiciones especiales':{page:6,ys:[234,255,279,300,324,348,366,396]},
      'Valoración global':{page:6,ys:[483,504,528,549]}
    },itineraryPage:7,summary:{page:8,groups:{
      'Aprendizaje a motor parado':{xs:[57,57,57,58,58,58,58],ys:[292,311,329,455,474,502,531]},
      'Automatismos básicos':{xs:[234,234,234,234,234,234,234],ys:[279,298,316,335,353,372,390]},
      'Dominio de mandos':{xs:[234,234,234,234,234],ys:[465,484,502,521,539]},
      'Circulación':{xs:[404,404,404,404,404,404,404,404,404,404,404],ys:[291,319,348,376,395,413,432,451,469,488,507]},
      'Condiciones especiales':{xs:[404,404,404,404,404,404,404,404],ys:[582,601,619,638,656,675,693,722]}
    }}},
    'A1/A2':{fields:{pages:[3,8],xName:78,xTeacher:240,xDate:408},groups:{
      'Aprendizaje a motor parado':{page:3,ys:[399,423,447,471,495,591,615,639,663]},
      'Automatismos básicos':{page:4,ys:[357,378,396,417,438,456,477]},
      'Dominio de mandos':{page:4,ys:[585,606,630,654,675]},
      'Maniobras específicas':{page:5,ys:[234,258,282,306,330,354,378]},
      'Circulación':{page:5,ys:[507,531,552,573,594,624,648,669,693,714,735]},
      'Condiciones especiales':{page:6,ys:[222,246,270,294,318,342,366]},
      'Valoración global':{page:6,ys:[453,477,501,525]}
    },itineraryPage:7},
    'AM':{fields:{pages:[3,6],xName:78,xTeacher:240,xDate:408},groups:{
      'Aprendizaje a motor parado':{page:3,ys:[399,423,447,471,495,591,615,639,663]},
      'Automatismos básicos':{page:4,ys:[357,378,396,417,438,456,477]},
      'Dominio de mandos':{page:4,ys:[582,606,627,651]},
      'Maniobras específicas':{page:5,ys:[231,255,279,303]},
      'Valoración global':{page:5,ys:[429,462,486,510,534,558,582]}
    }},
    'C1/C':{fields:{pages:[3,8],xName:78,xTeacher:240,xDate:408},groups:{
      'Aprendizaje a motor parado':{page:3,ys:[399,423,447,471,591,615,651,687]},
      'Maniobras específicas':{page:4,ys:[300,321,342,363,381,402]},
      'Automatismos básicos':{page:4,ys:[594,615,639,666,690,711,735]},
      'Dominio de mandos':{page:5,ys:[249,270,294,315,339,363]},
      'Circulación':{page:5,ys:[513,552,570,591,609,639,657,675,693,711,729,750]},
      'Condiciones especiales':{page:6,ys:[234,255,279,300,324,348,366,396,420]},
      'Valoración global':{page:6,ys:[504,525,549,573]}
    },itineraryPage:7},
    'D1/D':{fields:{pages:[3,8],xName:78,xTeacher:240,xDate:408},groups:{
      'Aprendizaje a motor parado':{page:3,ys:[399,423,447,471,591,615,651,687]},
      'Maniobras específicas':{page:4,ys:[297,318,339,360,378,399]},
      'Automatismos básicos':{page:4,ys:[594,615,639,666,690,711,735]},
      'Dominio de mandos':{page:5,ys:[249,270,294,315,339,363]},
      'Circulación':{page:5,ys:[513,552,570,591,609,639,657,675,693,711,729,750]},
      'Condiciones especiales':{page:6,ys:[234,255,279,300,324,348,366,396,420]},
      'Valoración global':{page:6,ys:[504,525,549,573]}
    },itineraryPage:7}
  };
  const ITINERARY_TOPS=[176,198,218,238,259,279,298,316,335,353,371,390,408,427,445,464,482,500,519,537,556,574,593,611,629,648,666,685,703,722];

  function readDb(){try{return JSON.parse(localStorage.getItem(DBKEY)||'{"students":{}}')}catch{return{students:{}}}}
  function getContext(){
    const db=readDb();
    const permitText=document.querySelector('.permitChip.active')?.textContent?.trim();
    const permit=Object.keys(window.DGT_DATA||{}).find(k=>window.DGT_DATA[k].label===permitText);
    if(!permit)return null;
    let student=null;
    const id=localStorage.getItem(ACTIVE_KEY);
    if(id&&db.students?.[id])student=db.students[id];
    if(!student){const title=document.querySelector('#studentTitle')?.textContent?.trim();if(title)student=Object.values(db.students||{}).find(s=>(s.name||'').trim()===title)||null;}
    if(!student||!student.permits?.[permit])return null;
    return{student,permit,pdata:student.permits[permit]};
  }
  function proxyUrl(permit){return`./pdf/${permit.replaceAll("/","-")}.pdf`}
  function download(bytes,name){const blob=new Blob([bytes],{type:'application/pdf'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500)}
  function stampIdentity(pages,font,student,pdata,layout){for(const pi of layout.fields.pages||[]){const page=pages[pi];if(!page)continue;const top=pi===3?151:143,y=page.getHeight()-top;if(student.name)page.drawText(String(student.name).slice(0,42),{x:layout.fields.xName,y,size:8,font});if(student.teacher)page.drawText(String(student.teacher).slice(0,38),{x:layout.fields.xTeacher,y,size:8,font});if(pdata.started)page.drawText(String(pdata.started),{x:layout.fields.xDate,y,size:8,font});}}
  function stampVehicle(pages,font,vehicleType){const page=pages[3];if(!page)return;const x=VEHICLE_X[vehicleType];if(x==null)return;page.drawText('X',{x:x-3.6,y:VEHICLE_Y-3,size:9,font});}
  function stampRatings(pages,font,ratings,permit,layout){for(const[group,cfg]of Object.entries(layout.groups||{})){const items=window.DGT_DATA?.[permit]?.practical?.[group]||[],page=pages[cfg.page];if(!page)continue;const h=page.getHeight();items.forEach((item,i)=>{const value=Number(ratings?.[item])||0;if(value<1||value>5||cfg.ys[i]==null)return;page.drawText('X',{x:XCOLS[value-1]-2.5,y:h-(cfg.ys[i]+8),size:9,font});});}}
  function stampSummary(pages,font,ratings,permit,layout){if(!layout.summary)return;const page=pages[layout.summary.page];if(!page)return;const h=page.getHeight();for(const[group,cfg]of Object.entries(layout.summary.groups||{})){const items=window.DGT_DATA?.[permit]?.practical?.[group]||[];items.forEach((item,i)=>{const value=Number(ratings?.[item])||0;if(!value||cfg.xs[i]==null||cfg.ys[i]==null)return;page.drawText('X',{x:cfg.xs[i]-3,y:h-(cfg.ys[i]+4),size:9,font});});}}
  function historyUpTo(pdata,selected=null){const history=[...(pdata.history||[])].sort((a,b)=>{const d=(a.date||'').localeCompare(b.date||'');return d||(a.createdAt||'').localeCompare(b.createdAt||'')});if(!selected)return history;const idx=history.findIndex(e=>e.id===selected.id);return idx>=0?history.slice(0,idx+1):history}
  function niceRoute(value){let s=String(value||'').replace(/\s+/g,' ').trim();if(!s)return'';return s.charAt(0).toUpperCase()+s.slice(1)}
  function stampItinerary(pages,font,pdata,layout,selected=null){if(layout.itineraryPage==null)return;const page=pages[layout.itineraryPage];if(!page)return;const h=page.getHeight();historyUpTo(pdata,selected).slice(0,30).forEach((entry,i)=>{const route=niceRoute(entry.route);if(!route)return;const yTop=ITINERARY_TOPS[i];page.drawText(route.slice(0,68),{x:154,y:h-(yTop+8),size:7.5,font});});}
  function cumulativeRatings(pdata,selected=null){const result={};for(const entry of historyUpTo(pdata,selected)){for(const[item,value]of Object.entries(entry.ratings||{})){const n=Number(value)||0;if(n>=1&&n<=5)result[item]=n}}return result}
  function latestVehicleType(pdata,selected=null){const hist=historyUpTo(pdata,selected).filter(e=>e.vehicleType);return hist.length?hist[hist.length-1].vehicleType:(pdata.vehicleType||'')}

  async function generate(mode='cumulative',classId=null){
    const ctx=getContext();if(!ctx)return alert('No se ha podido identificar el alumno o el permiso activo. Vuelve a abrir la ficha desde Alumnos.');
    if(!window.PDFLib)return alert('No se ha cargado el motor PDF.');
    const layout=LAYOUTS[ctx.permit];if(!layout)return alert('Este permiso todavía no tiene plantilla calibrada.');
    const selected=classId?(ctx.pdata.history||[]).find(e=>e.id===classId):null;if(mode==='class'&&!selected)return alert('Selecciona una clase.');
    const vehicleType=mode==='class'?(selected.vehicleType||ctx.pdata.vehicleType||''):latestVehicleType(ctx.pdata);
    if(!vehicleType)return alert('Esta clase no tiene tipo de vehículo guardado. Edita o vuelve a crear la clase indicando Manual, Automático o Adaptado.');
    try{
      const response=await fetch(proxyUrl(ctx.permit),{cache:'no-store'});if(!response.ok)throw new Error(`PDF ${response.status}`);
      const doc=await PDFLib.PDFDocument.load(await response.arrayBuffer()),font=await doc.embedFont(PDFLib.StandardFonts.Helvetica),pages=doc.getPages();
      const ratings=mode==='class'?(selected.ratings||{}):cumulativeRatings(ctx.pdata);
      stampIdentity(pages,font,ctx.student,ctx.pdata,layout);stampVehicle(pages,font,vehicleType);stampRatings(pages,font,ratings,ctx.permit,layout);stampSummary(pages,font,ratings,ctx.permit,layout);stampItinerary(pages,font,ctx.pdata,layout,mode==='class'?selected:null);
      const safe=(ctx.student.name||'alumno').replace(/[^\p{L}\p{N}_-]+/gu,'_'),permit=ctx.permit.replace('/','-'),suffix=mode==='class'?`-${selected.date||'clase'}`:'-acumulado';
      download(await doc.save(),`Ficha-${safe}-${permit}${suffix}.pdf`);
    }catch(err){console.error(err);alert('No se ha podido obtener el PDF oficial desde Cloudflare. Recarga la aplicación e inténtalo de nuevo.');}
  }

  document.addEventListener('click',e=>{
    const target=e.target.closest('#pdfFilled,#pdfBase,#pdfClassDownload');if(!target)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const ctx=getContext();if(!ctx)return alert('No se ha podido identificar el alumno o el permiso activo. Vuelve a abrir la ficha desde Alumnos.');
    if(target.id==='pdfBase'){window.open(proxyUrl(ctx.permit),'_blank');return;}
    if(target.id==='pdfClassDownload'){const id=document.querySelector('#pdfClassSelect')?.value;generate('class',id);return;}
    generate('cumulative');
  },true);
})();