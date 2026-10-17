import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1512,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{console.log('DIALOG',d.message());await d.accept();});page.on('console',msg=>{if(msg.type()==='error')console.log('CONSOLE',msg.text().slice(0,400));});
 await page.addInitScript(()=>{if(localStorage.getItem('test-students'))return;localStorage.setItem('test-students','1');localStorage.setItem('traza-bizkaia-language','es');localStorage.setItem('traza-bizkaia-projects',JSON.stringify({activeProjectId:'test',projects:[{id:'test',name:'Bilbao'}]}));localStorage.setItem('traza-bizkaia-project-test',JSON.stringify([{id:'route',name:'Ruta examen',color:'#c7522a',points:[[-2.93,43.26],[-2.94,43.27]]}]));localStorage.setItem('traza-bizkaia-project-test-markers','[]');localStorage.setItem('traza-bizkaia-students',JSON.stringify([{id:'legacy',name:'Ane Test'}]));});
 await page.goto('http://localhost:5173');await page.getByRole('button',{name:'Entrar en la aplicación'}).click();await page.getByRole('button',{name:'♙ Alumnos',exact:true}).click();
 const screen=page.getByRole('dialog',{name:'Alumnos',exact:true});await screen.waitFor();
 const incoming={format:'FichaAutoescuela',version:2,students:{canonical:{id:'canonical',name:'Ane Test',firstName:'Ane',lastName:'Test',dni:'PRUEBA',phone:'000000000',teacher:'Profesor',school:'Prueba',notes:'nota general',updatedAt:'2026-10-17T10:00:00Z',permits:{B:{key:'B',started:'2026-10-01',theory:{'Normas':true},practical:{'Observación':3},notes:'Observaciones',history:[{id:'class-original',date:'2026-10-15',minutes:50,route:'Práctica anterior',notes:'Se conserva',ratings:{'Observación':3},theory:{'Normas':true},createdAt:'2026-10-15T10:00:00Z',reduced:{ratings:{'Observación':4},custom:'PRESERVAR'}}]}}}}};
 await screen.getByLabel('Copia FichaAutoescuela').setInputFiles({name:'ficha.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(incoming))});
 assert.equal(await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('traza-bizkaia-ficha-autoescuela-v2')).students).length),1);
 await screen.getByRole('button',{name:'Importar alumnos',exact:true}).click();
 const data=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('traza-bizkaia-ficha-autoescuela-v2')));
 assert.equal(Object.keys((await data()).students).length,2,'Same names do not auto merge');
 assert.deepEqual((await data()).students.canonical.permits.B,incoming.students.canonical.permits.B);
 await screen.getByRole('button',{name:'Ane Test B · 1 clases',exact:true}).click();await screen.getByRole('button',{name:'2026-10-15 · 50 min',exact:false}).click();
 await screen.getByRole('button',{name:'Asignar desde biblioteca'}).click();await screen.getByRole('button',{name:'Ruta examen · Trayectoria',exact:true}).click();
 assert.equal((await data()).students.canonical.permits.B.history[0].rutas[0].routeId,'route');await page.evaluate(async incoming=>{incoming.students.canonical.updatedAt='2099-01-01T00:00:00Z';(await import('/src/students.js')).importFicha(incoming);},incoming);assert.equal((await data()).students.canonical.permits.B.history[0].rutas[0].routeId,'route','Ficha-only refresh retains local route links');
 await screen.getByRole('button',{name:'Nueva clase',exact:false}).click();await screen.getByRole('textbox',{name:'Título',exact:true}).fill('Clase con recorrido');await screen.getByRole('button',{name:'Crear clase',exact:true}).click();
 assert.equal((await data()).students.canonical.permits.B.history.length,2);
 await screen.getByRole('button',{name:'Valoración oficial (1–5)',exact:true}).click();let official=page.frameLocator('iframe[title="FichaAutoescuela"]');await official.locator('.class-ratings .rating').first().getByRole('button',{name:'4',exact:true}).click();assert.ok(Object.values((await data()).students.canonical.permits.B.history.find(e=>e.route==='Clase con recorrido').ratings).includes(4));await screen.getByRole('button',{name:'Volver a clases',exact:false}).click();await screen.getByRole('button',{name:'Valorar esta clase'}).click();const ficha=page.frameLocator('iframe[title="FichaAutoescuela"]');await ficha.getByText('Objetivo del día',{exact:false}).first().waitFor();
 assert.equal(await ficha.locator('#rFinish').count(),1);await ficha.locator('[data-goal="0"]').check();await ficha.locator('#rConfirm').click();await ficha.locator('[data-result="0"]').selectOption('Logrado');await ficha.locator('#rFinish').click();assert.equal((await data()).students.canonical.permits.B.history.length,2);assert.equal((await data()).students.canonical.permits.B.history.find(e=>e.route==='Clase con recorrido').reduced.results[0],'Logrado');assert.equal((await data()).students.canonical.permits.B.history.length,2);
 await screen.getByRole('button',{name:'Volver a clases'}).click();
 await screen.getByRole('button',{name:'GPX + PIP',exact:true}).click();
 const context=await page.evaluate(()=>JSON.parse(localStorage.getItem('traza-bizkaia-class-context')));assert.equal(context.studentId,'canonical');assert.equal(context.permit,'B');assert.ok(context.classId);
 await page.locator('.racebox-panel input[accept=".gpx"]').setInputFiles({name:'ruta-clase.gpx',mimeType:'application/gpx+xml',buffer:Buffer.from('<gpx><trk><trkseg><trkpt lat="43.26" lon="-2.93"><time>2026-10-17T10:00:00Z</time></trkpt><trkpt lat="43.27" lon="-2.94"><time>2026-10-17T10:50:00Z</time></trkpt></trkseg></trk></gpx>')});
 await page.getByRole('button',{name:'Guardar sesión',exact:true}).click();await page.getByText('Sesión guardada.',{exact:true}).first().waitFor();
 const sessions=await page.evaluate(async()=>{return(await import('/src/lessonStore.js')).listLessons();});assert.equal(sessions[0].classId,context.classId);assert.equal(sessions[0].studentId,'canonical');assert.equal(sessions[0].permit,'B');

 await page.getByRole('button',{name:'♙ Alumnos',exact:true}).click();
 await screen.getByRole('button',{name:'Nuevo alumno',exact:false}).click();
 await ficha.locator('#sfFirst').fill('Iker');await ficha.locator('#sfLast').fill('Nuevo');await ficha.locator('#sfDni').fill('TEST-123');await ficha.locator('#sfPhone').fill('000000001');await ficha.locator('#sfSave').click();
 await page.waitForFunction(()=>Object.values(JSON.parse(localStorage.getItem('traza-bizkaia-ficha-autoescuela-v2')).students).some(s=>s.name==='Iker Nuevo'));
 await screen.getByRole('button',{name:'Volver a clases'}).click();await screen.getByRole('heading',{name:'Iker Nuevo',exact:true}).waitFor();await screen.getByRole('button',{name:'Ane Test B · 2 clases',exact:true}).click();
 await screen.getByRole('button',{name:'PDF',exact:true}).click();await ficha.locator('#pdfFilled').waitFor();
 const download=page.waitForEvent('download');await ficha.locator('#pdfFilled').click();const pdf=await download;assert.ok((await pdf.suggestedFilename()).endsWith('.pdf'));
 await screen.getByRole('button',{name:'Volver a clases'}).click();
 // Complete backup contains the original grades, reduced metadata, links and UUIDs.
 const backup=await page.evaluate(async()=>{return(await import('/src/backups.js')).createBackup();});
 assert.equal(JSON.parse(backup.storage['traza-bizkaia-ficha-autoescuela-v2']).students.canonical.permits.B.history.length,2);
 const parsed=JSON.parse(backup.storage['traza-bizkaia-ficha-autoescuela-v2']);assert.equal(parsed.students.canonical.permits.B.history.find(c=>c.id==='class-original').reduced.custom,'PRESERVAR');
 await page.evaluate(async b=>{const {restoreBackup}=await import('/src/backups.js');await restoreBackup(b);},backup);
 await screen.getByRole('button',{name:'Ane Test B · 2 clases',exact:true}).click();await screen.getByRole('button',{name:'2026-10-15 · 50 min',exact:false}).click();
 await screen.getByLabel('Alumno anterior',{exact:true}).selectOption('legacy');await screen.getByRole('button',{name:'Vincular historial',exact:true}).click();await page.waitForFunction(()=>!JSON.parse(localStorage.getItem('traza-bizkaia-ficha-autoescuela-v2')).students.legacy);assert.equal(Object.keys((await data()).students).length,2);await page.screenshot({path:'../RutasAD-alumnos-integrados.png',fullPage:true});
 await screen.getByRole('button',{name:'Abrir mapa y vídeo',exact:true}).click();await screen.waitFor({state:'detached'});assert.ok(await page.getByText('Ruta examen',{exact:true}).count());
 assert.deepEqual(errors,[]);console.log('PASS students: exact-ID import, legacy preservation, original ficha create/PDF/reduced, class route link and complete backup');
}finally{await browser.close();}
