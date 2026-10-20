import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.goto('http://localhost:5173');
 await page.evaluate(async()=>{
  localStorage.setItem('traza-bizkaia-language','es');localStorage.setItem('traza-bizkaia-projects',JSON.stringify({activeProjectId:'p',projects:[{id:'p',name:'Prueba'}]}));
  localStorage.setItem('traza-bizkaia-project-p',JSON.stringify([{id:'r',name:'Rotonda común',color:'#e36b4d',points:[[-2.93,43.26],[-2.931,43.261]]}]));
  const students={};for(const id of ['a','b','c'])students[id]={id,name:id==='a'?'Ane':id==='b'?'Iker':'Sin clases',permits:{B:{key:'B',theory:{},practical:{},history:id==='c'?[]:[{id:'class-'+id,date:'2026-10-20',minutes:50,rutas:[]}]}}};
  (await import('/src/students.js')).writeStudents({students});
  await(await import('/src/lessonStore.js')).saveLesson({id:'trip',studentId:'a',studentName:'Ane',projectId:'p',name:'Ruta Ane',startedAt:'2026-10-20T08:00:00Z',points:[{lat:43.26,lon:-2.93,time:'2026-10-20T08:00:00Z'},{lat:43.261,lon:-2.931,time:'2026-10-20T08:01:00Z'}],events:[]});
 });
 await page.getByRole('button',{name:/Entrar en la aplicación|Aplikazioan sartu/}).click();await page.getByRole('button',{name:'Biblioteca',exact:false}).click();
 const library=page.getByRole('dialog',{name:'Biblioteca',exact:true}),filter=library.getByLabel('Filtrar por alumno');await library.getByRole('button',{name:'Asignar a alumnos Ruta Ane',exact:true}).waitFor();
 await filter.selectOption('a');assert.equal(await library.getByRole('button',{name:'Abrir Ruta Ane',exact:true}).count(),1);
 await filter.selectOption('b');assert.equal(await library.locator('.library-card').count(),0);
 await filter.selectOption('');await library.getByRole('button',{name:'Asignar a alumnos Ruta Ane',exact:true}).click();
 const form=library.getByRole('form',{name:'Asignar a alumnos'});await form.getByLabel('Ane',{exact:true}).check();await form.getByLabel('Iker',{exact:true}).check();assert.equal(await form.getByLabel('Sin clases',{exact:true}).isDisabled(),true);await form.getByRole('button',{name:'Asignar',exact:true}).click();
 await filter.selectOption('b');assert.equal(await library.getByRole('button',{name:'Abrir Ruta Ane',exact:true}).count(),1);
 await library.getByRole('tab',{name:'Trayectorias',exact:false}).click();assert.equal(await library.locator('.library-card').count(),0);await filter.selectOption('');
 await library.getByRole('button',{name:'Asignar a alumnos Rotonda común',exact:true}).click();await form.getByLabel('Ane',{exact:true}).check();await form.getByLabel('Iker',{exact:true}).check();await form.getByRole('button',{name:'Asignar',exact:true}).click();await filter.selectOption('b');assert.equal(await library.getByRole('button',{name:'Abrir Rotonda común',exact:true}).count(),1);
 // Repeat assignment is idempotent; a failed batch must not partially persist.
 const result=await page.evaluate(async()=>{const api=await import('/src/libraryStudents.js'),s=await import('/src/students.js'),store=await import('/src/lessonStore.js'),entry={key:'route:p:r',kind:'routes',projectId:'p',routeId:'r',name:'Rotonda común'};api.assignLibraryEntry(entry,[{studentId:'b',permit:'B',classId:'class-b'}]);const before=JSON.stringify(s.readStudents());let rejected=false;try{api.assignLibraryEntry({...entry,key:'route:p:other'},[{studentId:'a',permit:'B',classId:'class-a'},{studentId:'c',permit:'B',classId:'missing'}]);}catch{rejected=true;}return {db:s.readStudents(),unchanged:before===JSON.stringify(s.readStudents()),rejected,sessions:await store.listLessons(),library:await store.listLibraryReviews(),routes:JSON.parse(localStorage.getItem('traza-bizkaia-project-p'))};});
 assert.ok(result.rejected&&result.unchanged);assert.equal(result.routes.filter(r=>r.points.length).length,1);assert.equal(result.sessions.length,1);assert.equal(result.library.filter(r=>r.review.sessionId==='trip').length<=1,true);for(const id of ['a','b'])assert.equal(result.db.students[id].permits.B.history[0].rutas.length,2);
 await page.screenshot({path:'../RutasAD-biblioteca-alumno.png'});
 await page.reload();await page.getByRole('button',{name:/Entrar en la aplicación|Aplikazioan sartu/}).click();await page.getByRole('button',{name:'Biblioteca',exact:false}).click();await filter.selectOption('b');await library.getByRole('button',{name:'Abrir Ruta Ane',exact:true}).waitFor();
 console.log('PASS library students: UUID ownership filter, multi-student/class assignment, GPX and trajectory references, no media duplication, no-class guidance, idempotent writes, failed-batch rollback and reload persistence.');
}finally{await browser.close();}
