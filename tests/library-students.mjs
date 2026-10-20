import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.goto('http://localhost:5173');
 await page.evaluate(async()=>{
  localStorage.setItem('traza-bizkaia-language','es');localStorage.setItem('traza-bizkaia-projects',JSON.stringify({activeProjectId:'p',projects:[{id:'p',name:'Prueba'}]}));
  localStorage.setItem('traza-bizkaia-project-p',JSON.stringify([{id:'r',name:'Rotonda común',color:'#e36b4d',points:[[-2.93,43.26],[-2.931,43.261]]}]));
  const students={};for(const id of ['a','b','c'])students[id]={id,name:id==='a'?'Ane':id==='b'?'Iker':'Sin clases',permits:{B:{key:'B',theory:{},practical:{},history:id==='c'?[]:[{id:'class-'+id,date:'2026-10-20',minutes:50,rutas:[]}]}}};
  students.c.permits={};(await import('/src/students.js')).writeStudents({students});
  await(await import('/src/lessonStore.js')).saveLesson({id:'trip',studentId:'a',studentName:'Ane',projectId:'p',name:'Ruta Ane',startedAt:'2026-10-20T08:00:00Z',points:[{lat:43.26,lon:-2.93,time:'2026-10-20T08:00:00Z'},{lat:43.261,lon:-2.931,time:'2026-10-20T08:01:00Z'}],events:[]});
 });
 await page.getByRole('button',{name:/Entrar en la aplicación|Aplikazioan sartu/}).click();await page.getByRole('button',{name:'Biblioteca',exact:false}).click();
 const library=page.getByRole('dialog',{name:'Biblioteca',exact:true});await library.getByRole('button',{name:'Asignar a alumnos Ruta Ane',exact:true}).waitFor();
 const chooseStudent=async name=>{await library.getByRole('tab',{name:'Alumnos',exact:false}).click();await library.locator('.library-student-card').filter({hasText:name}).click();};
 await chooseStudent('Ane');assert.equal(await library.getByRole('button',{name:'Abrir Ruta Ane',exact:true}).count(),1);
 await chooseStudent('Iker');assert.equal(await library.locator('.library-card').count(),0);await library.getByRole('heading',{name:'Recorridos asignados',exact:true}).waitFor();await library.getByRole('heading',{name:'Trayectorias asignadas',exact:true}).waitFor();
 await library.getByRole('tab',{name:'Rutas guardadas',exact:false}).click();await library.getByRole('button',{name:'Asignar a alumnos Ruta Ane',exact:true}).click();
 const form=library.getByRole('form',{name:'Asignar a alumnos'});await form.getByLabel('Ane',{exact:true}).check();await form.getByLabel('Iker',{exact:true}).check();await form.getByLabel('Sin clases',{exact:true}).check();await form.getByLabel('Clase de Ane',{exact:true}).selectOption('B:class-a');await form.getByLabel('Clase de Iker',{exact:true}).selectOption('B:class-b');assert.equal(await form.getByLabel('Sin clases',{exact:true}).isDisabled(),false);await form.getByRole('button',{name:'Asignar',exact:true}).click();
 await chooseStudent('Iker');assert.equal(await library.getByRole('button',{name:'Abrir Ruta Ane',exact:true}).count(),1);
 await library.getByRole('tab',{name:'Trayectorias',exact:false}).click();await library.getByRole('button',{name:'Asignar a alumnos Rotonda común',exact:true}).click();await form.getByLabel('Ane',{exact:true}).check();await form.getByLabel('Iker',{exact:true}).check();await form.getByLabel('Sin clases',{exact:true}).check();await form.getByLabel('Clase de Ane',{exact:true}).selectOption('B:class-a');await form.getByLabel('Clase de Iker',{exact:true}).selectOption('B:class-b');await form.getByRole('button',{name:'Asignar',exact:true}).click();
 await chooseStudent('Iker');assert.equal(await library.getByRole('button',{name:'Abrir Rotonda común',exact:true}).count(),1);assert.equal(await library.getByRole('button',{name:'Abrir Ruta Ane',exact:true}).count(),1);
 // Repeat assignment is idempotent; a failed batch must not partially persist.
 const result=await page.evaluate(async()=>{const api=await import('/src/libraryStudents.js'),s=await import('/src/students.js'),store=await import('/src/lessonStore.js'),entry={key:'route:p:r',kind:'routes',projectId:'p',routeId:'r',name:'Rotonda común'};api.assignLibraryEntry(entry,[{studentId:'b',permit:'B',classId:'class-b'}]);const before=JSON.stringify(s.readStudents());let rejected=false;try{api.assignLibraryEntry({...entry,key:'route:p:other'},[{studentId:'a',permit:'B',classId:'class-a'},{studentId:'c',permit:'B',classId:'missing'}]);}catch{rejected=true;}return {db:s.readStudents(),unchanged:before===JSON.stringify(s.readStudents()),rejected,sessions:await store.listLessons(),library:await store.listLibraryReviews(),routes:JSON.parse(localStorage.getItem('traza-bizkaia-project-p'))};});
 assert.ok(result.rejected&&result.unchanged);assert.equal(result.routes.filter(r=>r.points.length).length,1);assert.equal(result.sessions.length,1);assert.equal(result.library.filter(r=>r.review.sessionId==='trip').length<=1,true);for(const id of ['a','b'])assert.equal(result.db.students[id].permits.B.history[0].rutas.length,2);
 assert.equal(result.db.students.c.rutas.length,2);assert.equal(Object.keys(result.db.students.c.permits).length,0);
 await page.screenshot({path:'../RutasAD-biblioteca-alumno.png'});await library.getByRole('button',{name:'Volver a alumnos',exact:false}).click();await page.screenshot({path:'../RutasAD-biblioteca-alumnos.png'});
 await page.reload();await page.getByRole('button',{name:/Entrar en la aplicación|Aplikazioan sartu/}).click();await page.getByRole('button',{name:'Biblioteca',exact:false}).click();await chooseStudent('Iker');await library.getByRole('button',{name:'Abrir Ruta Ane',exact:true}).waitFor();
 await chooseStudent('Sin clases');assert.equal(await library.locator('.library-card').count(),2);
 const deletion=await page.evaluate(async()=>{await(await import('/src/studentDeletion.js')).deleteStudent('a',{desktop:null});const db=(await import('/src/students.js')).readStudents(),store=await import('/src/lessonStore.js');const backup=await(await import('/src/backups.js')).createBackup();return {student:db.students.c,library:await store.listLibraryReviews(),backup};});
 const shared=deletion.student.rutas.find(r=>r.kind==='reviews');assert.ok(shared.libraryId&&!shared.sessionId);assert.ok(deletion.library.some(r=>r.id===shared.libraryId));assert.equal(JSON.parse(deletion.backup.storage['traza-bizkaia-ficha-autoescuela-v2']).students.c.rutas.length,2);
 console.log('PASS library students: UUID ownership filter, multi-student/class assignment, GPX and trajectory references, no media duplication, direct assignment without permits/classes, idempotent writes, failed-batch rollback and reload persistence.');
}finally{await browser.close();}
