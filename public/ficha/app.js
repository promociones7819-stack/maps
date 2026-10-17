(() => {
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const DBKEY="traza-bizkaia-ficha-autoescuela-v2";
let db=JSON.parse(localStorage.getItem(DBKEY)||'{"students":{}}');
let currentStudentId=null,currentPermit=null,currentTab="theory";

const els={name:$("#studentName"),teacher:$("#teacherName"),school:$("#schoolName"),list:$("#studentList"),search:$("#studentSearch"),workspace:$("#workspace"),empty:$("#emptyState"),title:$("#studentTitle"),badge:$("#permitsBadge"),chips:$("#permitChips"),content:$("#tabContent")};
Object.entries(DGT_DATA).forEach(([k,v])=>{const o=document.createElement("option");o.value=k;o.textContent=v.label;$("#newPermitSelect").append(o)});

function uid(){return crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random().toString(16).slice(2)}
function newStudent(){return {id:uid(),name:"",teacher:"",school:"",notes:"",permits:{},updatedAt:new Date().toISOString()}}
function newPermitData(key){return {key,started:new Date().toISOString().slice(0,10),theory:{},practical:{},history:[],notes:""}}
function currentStudent(){return currentStudentId?db.students[currentStudentId]:null}
function currentPermitData(){const s=currentStudent();return s&&currentPermit?s.permits[currentPermit]:null}
function saveDb(){localStorage.setItem(DBKEY,JSON.stringify(db));$("#saveState").textContent="Guardado local";renderStudentList()}
function markDirty(){const s=currentStudent();if(s)s.updatedAt=new Date().toISOString();$("#saveState").textContent="Cambios sin guardar"}

function ensureState(){
 const s=currentStudent(); if(!s||!currentPermit)return;
 const p=s.permits[currentPermit], def=DGT_DATA[currentPermit];
 Object.values(def.theory).flat().forEach(i=>{if(p.theory[i]===undefined)p.theory[i]=false});
 Object.values(def.practical).flat().forEach(i=>{if(p.practical[i]===undefined)p.practical[i]=0});
}
function renderStudentList(){
 const q=els.search.value.trim().toLowerCase(); els.list.innerHTML="";
 const rows=Object.values(db.students).filter(s=>(s.name||"").toLowerCase().includes(q)).sort((a,b)=>(a.name||"").localeCompare(b.name||""));
 rows.forEach(s=>{const b=document.createElement("button");b.dataset.studentId=s.id;b.className="studentBtn"+(s.id===currentStudentId?" active":"");b.type="button";b.innerHTML=`${escapeHtml(s.name||"Sin nombre")}<span class="studentMeta">${Object.keys(s.permits||{}).join(", ")||"Sin permisos"}</span>`;b.addEventListener("click",()=>selectStudent(s.id));els.list.append(b)});
}
function escapeHtml(x){return String(x).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function selectStudent(id){
 currentStudentId=id; const s=currentStudent(); const keys=Object.keys(s.permits||{}); currentPermit=keys[0]||null;
 els.name.value=s.name||"";els.teacher.value=s.teacher||"";els.school.value=s.school||"";
 els.empty.classList.add("hidden");els.workspace.classList.remove("hidden");renderAll();
}
function renderAll(){
 const s=currentStudent(); if(!s){els.workspace.classList.add("hidden");els.empty.classList.remove("hidden");return}
 els.title.textContent=s.name||"Alumno sin nombre"; const keys=Object.keys(s.permits||{});els.badge.textContent=keys.length?`${keys.length} permiso${keys.length>1?"s":""}`:"Sin permisos";renderChips();renderTab();
}
function renderChips(){
 const s=currentStudent();els.chips.innerHTML="";
 Object.keys(s.permits||{}).forEach(k=>{const b=document.createElement("button");b.className="permitChip"+(k===currentPermit?" active":"");b.type="button";b.textContent=DGT_DATA[k].label;b.addEventListener("click",()=>{currentPermit=k;renderAll()});els.chips.append(b)});
}
function renderTab(){
 $$(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===currentTab));
 if(!currentPermit){els.content.innerHTML='<div class="panel emptyState"><h2>Añade un permiso</h2><p>El alumno puede tener varios permisos independientes.</p></div>';return}
 ensureState();
 ({theory:renderTheory,practical:renderPractical,history:renderHistory,evolution:renderEvolution,notes:renderNotes,pdf:renderPdf,reduced:renderReducedTab})[currentTab]();
}
function renderReducedTab(entryId){window.renderReduced({container:els.content,p:currentPermitData(),student:currentStudent(),save:()=>{markDirty();saveDb()},uid,entryId})}
function renderTheory(){
 const p=currentPermitData(), def=DGT_DATA[currentPermit];els.content.innerHTML='<div class="status">Toca cada casilla para validar los contenidos teóricos trabajados.</div>';
 Object.entries(def.theory).forEach(([g,items])=>{const sec=document.createElement("section");sec.className="group";sec.innerHTML=`<div class="groupHeader"><h3>${escapeHtml(g)}</h3><span>${items.length} ítems</span></div>`;items.forEach(text=>{const row=document.createElement("div");row.className="item";const lab=document.createElement("label");lab.className="checkline";const cb=document.createElement("input");cb.type="checkbox";cb.className="bigcheck";cb.checked=!!p.theory[text];cb.addEventListener("change",()=>{p.theory[text]=cb.checked;markDirty()});const sp=document.createElement("span");sp.textContent=text;lab.append(cb,sp);row.append(lab);sec.append(row)});els.content.append(sec)});
}
function renderPractical(){
 const p=currentPermitData(), def=DGT_DATA[currentPermit];els.content.innerHTML='<div class="status">Valora cada aprendizaje del 1 al 5. La valoración se guarda como estado actual y también puede quedar registrada en el histórico de cada clase.</div>';
 Object.entries(def.practical).forEach(([g,items])=>{const sec=document.createElement("section");sec.className="group";sec.innerHTML=`<div class="groupHeader"><h3>${escapeHtml(g)}</h3><span>Progreso 1–5</span></div>`;items.forEach(text=>{const row=document.createElement("div");row.className="item";const label=document.createElement("div");label.textContent=text;const rating=document.createElement("div");rating.className="rating";for(let n=1;n<=5;n++){const b=document.createElement("button");b.type="button";b.textContent=n;b.classList.toggle("selected",p.practical[text]===n);b.addEventListener("click",()=>{p.practical[text]=p.practical[text]===n?0:n;markDirty();renderPractical()});rating.append(b)}row.append(label,rating);sec.append(row)});els.content.append(sec)});
}
function renderHistory(){
 const p=currentPermitData();els.content.innerHTML=`
 <div class="panel"><h2>Nueva clase</h2>
 <div class="historyForm"><input id="hDate" type="date"><input id="hMinutes" type="number" min="0" step="5" placeholder="min"><input id="hRoute" type="text" placeholder="Itinerario / zona"><input id="hNotes" type="text" placeholder="Observaciones de la clase"></div>
 <div class="row"><button id="addClass">Guardar clase y estado actual</button></div></div>
 <div class="historyList" id="historyList"></div>`;
 $("#hDate").value=new Date().toISOString().slice(0,10);
 $("#addClass").addEventListener("click",()=>{const entry={id:uid(),date:$("#hDate").value,minutes:Number($("#hMinutes").value)||0,route:$("#hRoute").value.trim(),notes:$("#hNotes").value.trim(),ratings:JSON.parse(JSON.stringify(p.practical)),theory:JSON.parse(JSON.stringify(p.theory)),createdAt:new Date().toISOString()};p.history.push(entry);markDirty();saveDb();renderHistory()});
 const list=$("#historyList");[...p.history].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).forEach(e=>{const c=document.createElement("div");c.className="historyCard";const valued=Object.values(e.ratings||{}).filter(v=>v>0);const avg=valued.length?(valued.reduce((a,b)=>a+b,0)/valued.length).toFixed(1):"—";c.innerHTML=`<div class="historyHead"><div><strong>${e.date||"Sin fecha"} · ${escapeHtml(e.route||"Sin itinerario")}</strong><div class="historyMeta">${e.minutes||0} min · media práctica ${avg}/5</div></div><button class="danger mini">Eliminar</button></div><div class="historyNotes">${escapeHtml(e.notes||"")}</div>`;c.querySelector("button").addEventListener("click",()=>{if(confirm("¿Eliminar esta clase?")){p.history=p.history.filter(x=>x.id!==e.id);markDirty();saveDb();renderHistory()}});if(e.reduced){const edit=document.createElement("button");edit.textContent="Ver / editar ficha reducida";edit.addEventListener("click",()=>{currentTab="reduced";renderTab();renderReducedTab(e.id)});c.append(edit);c.querySelector(".historyMeta").textContent=`${e.minutes||0} min · Ficha reducida`;const summary=document.createElement("p");summary.textContent=Object.entries(e.reduced.goals||{}).map(([i,a])=>`${window.ReducedModel.blocks[i]}: ${a} · ${e.reduced.results?.[i]||"Pendiente"}`).join(" / ");c.append(summary)}list.append(c)});
}
function renderEvolution(){
 const p=currentPermitData(), def=DGT_DATA[currentPermit]; const all=Object.values(def.practical).flat();
 const hist=[...p.history].sort((a,b)=>(a.date||"").localeCompare(b.date||""));
 const currentVals=Object.values(p.practical).filter(v=>v>0), avg=currentVals.length?(currentVals.reduce((a,b)=>a+b,0)/currentVals.length).toFixed(1):"—";
 const totalMin=hist.reduce((s,e)=>s+(Number(e.minutes)||0),0);
 els.content.innerHTML=`<div class="metricGrid"><div class="metric"><b>${hist.length}</b><span>clases registradas</span></div><div class="metric"><b>${totalMin}</b><span>minutos acumulados</span></div><div class="metric"><b>${avg}</b><span>media actual / 5</span></div></div><div class="panel"><h2>Evolución global por clase</h2><div class="chartWrap"><canvas id="evoChart" width="1000" height="320"></canvas></div><div class="legend">La línea muestra la media de los ítems prácticos valorados en cada sesión.</div></div><div class="panel" style="margin-top:12px"><h2>Evolución por aprendizaje</h2><select id="metricSelect"></select><div class="chartWrap" style="margin-top:10px"><canvas id="metricChart" width="1000" height="320"></canvas></div></div>`;
 const sel=$("#metricSelect");all.forEach(x=>{const o=document.createElement("option");o.value=x;o.textContent=x;sel.append(o)}); drawChart($("#evoChart"),hist.map(e=>({label:e.date,value:avgRatings(e.ratings)})), "Media");
 const rerender=()=>drawChart($("#metricChart"),hist.map(e=>({label:e.date,value:Number((e.ratings||{})[sel.value])||0})), sel.value);sel.addEventListener("change",rerender);rerender();
}
function avgRatings(r){const v=Object.values(r||{}).filter(x=>Number(x)>0).map(Number);return v.length?v.reduce((a,b)=>a+b,0)/v.length:0}
function drawChart(canvas,pts,label){
 const ctx=canvas.getContext("2d"),w=canvas.width,h=canvas.height,pad=46;ctx.clearRect(0,0,w,h);ctx.font="13px -apple-system";ctx.fillStyle="#607786";ctx.fillText(label,12,20);
 ctx.strokeStyle="#cddde5";ctx.lineWidth=1;for(let i=0;i<=5;i++){const y=h-pad-(i/5)*(h-pad*2);ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(w-20,y);ctx.stroke();ctx.fillText(String(i),18,y+4)}
 if(!pts.length){ctx.fillText("Aún no hay clases registradas.",pad,80);return}
 const step=(w-pad-30)/Math.max(1,pts.length-1);ctx.strokeStyle="#0878ad";ctx.lineWidth=4;ctx.beginPath();pts.forEach((p,i)=>{const x=pad+i*step,y=h-pad-(Math.max(0,Math.min(5,p.value))/5)*(h-pad*2);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();
 pts.forEach((p,i)=>{const x=pad+i*step,y=h-pad-(Math.max(0,Math.min(5,p.value))/5)*(h-pad*2);ctx.fillStyle="#0878ad";ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fill();ctx.save();ctx.translate(x,h-16);ctx.rotate(-.45);ctx.fillStyle="#607786";ctx.fillText(p.label||"",0,0);ctx.restore()});
}
function renderNotes(){const p=currentPermitData();els.content.innerHTML='<div class="panel"><h2>Notas del permiso</h2><textarea id="permitNotes" style="min-height:360px" placeholder="Observaciones generales..."></textarea></div>';const ta=$("#permitNotes");ta.value=p.notes||"";ta.addEventListener("input",()=>{p.notes=ta.value;markDirty()})}
function templatePath(key){return `./pdf/${key.replaceAll("/","-")}.pdf`;}
function originalTemplatePath(key){const base="https://www.dgt.es/export/sites/web-DGT/.galleries/downloads/nuestros_servicios/para-colaboradores-y-empresas/autoescuelas/";return {"AM":base+"CUADERNILLO-FORMACION-DGT-AM.pdf","A1/A2":base+"CUADERNILLO-FORMACION-DGT-A1-Y-A2.pdf","B":base+"CUADERNILLO-FORMACION-DGT-B.pdf","C1/C":base+"CUADERNILLO-FORMACION-DGT-C1-C.pdf","D1/D":base+"CUADERNILLO-FORMACION-DGT-PERMISOS-D1-y-D.pdf"}[key]}
function renderPdf(){
 els.content.innerHTML=`<div class="panel"><h2>PDF oficial DGT</h2><p class="help">Se usa el cuadernillo oficial original como plantilla. La app superpone los datos del alumno y genera una copia PDF sin alterar el documento base.</p><div class="pdfActions"><button id="pdfBase">Abrir plantilla oficial</button><button id="pdfFilled" class="secondary">Generar PDF con datos</button></div><div class="pdfPreview"><p>Permiso: <b>${escapeHtml(DGT_DATA[currentPermit].label)}</b></p><p>Alumno: <b>${escapeHtml(currentStudent().name||"")}</b></p><p>Histórico: <b>${currentPermitData().history.length} clases</b></p></div></div>`;
 $("#pdfBase").addEventListener("click",()=>window.open(templatePath(currentPermit),"_blank"));
 $("#pdfFilled").addEventListener("click",generateOfficialPdf);
}
function downloadUrl(url,name){const a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove()}
async function generateOfficialPdf(){
 if(!window.PDFLib){alert("No se ha podido cargar el motor PDF. Conecta una vez a Internet y vuelve a intentarlo.");return}
 try{
   const bytes=await fetch(templatePath(currentPermit)).then(r=>{if(!r.ok)throw new Error("PDF no disponible");return r.arrayBuffer()});
   const doc=await PDFLib.PDFDocument.load(bytes), pages=doc.getPages(), font=await doc.embedFont(PDFLib.StandardFonts.Helvetica);
   const s=currentStudent(), p=currentPermitData();
   const pageIndex=currentPermit==="AM"?6:8; const page=pages[Math.min(pageIndex,pages.length-1)];
   const {height}=page.getSize();
   page.drawText(s.name||"",{x:130,y:height-63,size:9,font});
   page.drawText(s.teacher||"",{x:330,y:height-63,size:9,font});
   page.drawText(p.started||"",{x:500,y:height-63,size:9,font});
   const hist=doc.addPage([595.28,841.89]);hist.drawText("HISTÓRICO DE CLASES - "+(s.name||""),{x:40,y:800,size:16,font});
   hist.drawText(DGT_DATA[currentPermit].label,{x:40,y:778,size:11,font});
   let y=748;
   [...p.history].sort((a,b)=>(a.date||"").localeCompare(b.date||"")).forEach((e,i)=>{if(y<70)return;hist.drawText(`${i+1}. ${e.date||""}  ${e.minutes||0} min  ${e.route||""}`.slice(0,95),{x:40,y,size:9,font});y-=16;if(e.notes){hist.drawText(String(e.notes).slice(0,100),{x:55,y,size:8,font});y-=14}});
   const out=await doc.save();const blob=new Blob([out],{type:"application/pdf"}),url=URL.createObjectURL(blob);downloadUrl(url,`Ficha-${(s.name||"alumno").replace(/[^\w\-]+/g,"_")}-${currentPermit.replace("/","-")}.pdf`);setTimeout(()=>URL.revokeObjectURL(url),2000);
 }catch(e){console.error(e);alert("El navegador ha bloqueado la descarga directa del PDF oficial. Al desplegar en Cloudflare añadiremos un proxy local para que la generación sea fiable en iPad y Mac.");}
}
function mergeImported(obj){
 const incoming=obj.students||{};Object.values(incoming).forEach(s=>{const old=db.students[s.id];if(!old||new Date(s.updatedAt||0)>=new Date(old.updatedAt||0))db.students[s.id]=s});saveDb();renderAll();
}
function exportAll(){
 const payload={format:"FichaAutoescuela",version:2,exportedAt:new Date().toISOString(),students:db.students};const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);downloadUrl(url,`FichaAutoescuela-${new Date().toISOString().slice(0,10)}.json`);setTimeout(()=>URL.revokeObjectURL(url),2000)
}

$("#newStudent").addEventListener("click",()=>{const s=newStudent();db.students[s.id]=s;currentStudentId=s.id;currentPermit=null;saveDb();selectStudent(s.id);els.name.focus()});
$("#saveBtn").addEventListener("click",()=>{const s=currentStudent();if(!s)return;s.name=els.name.value.trim();s.teacher=els.teacher.value.trim();s.school=els.school.value.trim();s.updatedAt=new Date().toISOString();saveDb();renderAll()});
$("#deleteStudentBtn").addEventListener("click",()=>{if(currentStudentId&&confirm("¿Eliminar este alumno y todo su histórico?")){delete db.students[currentStudentId];currentStudentId=null;currentPermit=null;saveDb();renderAll()}});
[els.name,els.teacher,els.school].forEach(x=>x.addEventListener("input",markDirty));els.search.addEventListener("input",renderStudentList);
$("#addPermitBtn").addEventListener("click",()=>$("#addPermitBox").classList.toggle("hidden"));
$("#confirmAddPermit").addEventListener("click",()=>{const s=currentStudent(),k=$("#newPermitSelect").value;if(!s)return;if(!s.permits[k])s.permits[k]=newPermitData(k);currentPermit=k;markDirty();saveDb();$("#addPermitBox").classList.add("hidden");renderAll()});
$$(".tab").forEach(b=>b.addEventListener("click",()=>{currentTab=b.dataset.tab;renderTab()}));
$("#exportAllBtn").addEventListener("click",exportAll);
$("#importAllInput").addEventListener("change",e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const o=JSON.parse(r.result);if(o.format!=="FichaAutoescuela"&&!o.students)throw 0;mergeImported(o);alert("Datos fusionados correctamente.");}catch{alert("Archivo no válido.");}};r.readAsText(f)});
let promptEvt=null;window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();promptEvt=e;$("#installBtn").classList.remove("hidden")});$("#installBtn").addEventListener("click",async()=>{if(promptEvt){await promptEvt.prompt();promptEvt=null;$("#installBtn").classList.add("hidden")}});

renderStudentList();renderAll();

// Edit an existing class with the official 1–5 scale without changing the
// current practical worksheet or creating another history entry.
function renderClassRatings(entryId){
 const p=currentPermitData(),entry=p.history.find(e=>e.id===entryId);if(!entry)return;
 els.content.innerHTML='<section class="panel"><h2>Valoración oficial de esta clase</h2><p id="classRatingTitle"></p><p>Escala oficial 1–5. Cada cambio se guarda en esta clase; la ficha reducida conserva su propia escala.</p></section>';
 document.querySelector('#classRatingTitle').textContent=entry.date+' · '+entry.minutes+' min · '+(entry.route||'');
 entry.ratings||={};
 Object.entries(DGT_DATA[currentPermit].practical).forEach(([group,items])=>{
  const section=document.createElement('section');section.className='group class-ratings';const header=document.createElement('h3');header.textContent=group;section.append(header);
  items.forEach(item=>{const row=document.createElement('div');row.className='item';const label=document.createElement('div');label.textContent=item;const rating=document.createElement('div');rating.className='rating';
   for(let n=1;n<=5;n++){const b=document.createElement('button');b.type='button';b.textContent=n;b.classList.toggle('selected',entry.ratings[item]===n);b.addEventListener('click',()=>{entry.ratings[item]=entry.ratings[item]===n?0:n;entry.updatedAt=currentStudent().updatedAt=new Date().toISOString();saveDb();renderClassRatings(entryId);});rating.append(b);}
   row.append(label,rating);section.append(row);
  });els.content.append(section);
 });
}

window.RutasFicha={open(id,permit,tab='history',entryId){
 db=JSON.parse(localStorage.getItem(DBKEY)||'{"students":{}}');
 if(!db.students[id])return;
 selectStudent(id);if(permit&&db.students[id].permits[permit])currentPermit=permit;
 currentTab=tab==='class'?'practical':tab;renderAll();if(tab==='class'&&entryId)renderClassRatings(entryId);else if(tab==='reduced'&&entryId)renderReducedTab(entryId);
},flush(){const s=currentStudent();if(!s)return;s.name=els.name.value.trim();s.teacher=els.teacher.value.trim();s.school=els.school.value.trim();s.updatedAt=new Date().toISOString();saveDb();}};
})();
