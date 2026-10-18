import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const base=process.env.AUTH_TEST_URL||'http://localhost:8787',browser=await chromium.launch();
const request=async(context,path,method='GET',data)=>context.request.fetch(base+'/api/'+path,{method,headers:{Origin:base},data});
try{
 const admin=await browser.newContext(),page=await admin.newPage(),errors=[];page.setDefaultTimeout(20000);page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});
 const manifest=JSON.parse(await readFile('dist/.vite/manifest.json','utf8'));const app=Object.values(manifest).find(v=>v.name==='App');
 assert.equal((await admin.request.get(base+'/'+app.file)).status(),401);
 assert.equal((await request(admin,'admin/users')).status(),401);
 await page.addInitScript(()=>{localStorage.setItem('traza-bizkaia-language','es');localStorage.setItem('traza-bizkaia-pointer-test','legacy-private');localStorage.setItem('traza-bizkaia-projects',JSON.stringify({activeProjectId:'legacy',projects:[{id:'legacy',name:'Mi biblioteca anterior'}]}));localStorage.setItem('traza-bizkaia-project-legacy',JSON.stringify([{id:'legacy-route',name:'Ruta anterior',points:[[-2.93,43.26],[-2.94,43.27]],color:'#c7522a'}]));});
 await page.goto(base);await page.getByRole('combobox').selectOption('es');
 await page.getByLabel('Correo electrónico',{exact:true}).fill('admin@example.test');await page.getByLabel('Contraseña o PIN',{exact:true}).fill('Test-only-admin-8527');await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await page.locator('.welcome-page select').selectOption('es');
 await page.getByRole('button',{name:'Entrar en la aplicación'}).click();
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Conservar mis datos anteriores'}).click();await page.getByRole('button',{name:'Entrar en la aplicación'}).click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('traza-bizkaia-pointer-test')),'legacy-private');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('traza-bizkaia-projects')).activeProjectId),'legacy');
 await page.getByRole('button',{name:'Administración',exact:true}).click();
 const panel=page.getByRole('dialog',{name:'Cuenta y usuarios'});await panel.getByLabel('Correo electrónico',{exact:true}).fill('pupil-test@example.test');await panel.getByLabel('Contraseña o PIN inicial').fill('12345678');await panel.getByRole('button',{name:'Crear usuario',exact:true}).click();await panel.getByText('pupil-test@example.test',{exact:true}).waitFor();
 const list=await(await request(admin,'admin/users')).json(),user=list.users.find(u=>u.email==='pupil-test@example.test');assert.ok(user);assert.equal(user.password_hash,undefined);
 const csrf=await admin.request.post(base+'/api/admin/users',{headers:{Origin:'https://attacker.test'},data:{email:'bad@example.test',password:'12345678'}});assert.equal(csrf.status(),403);
 await page.evaluate(()=>{localStorage.setItem('traza-bizkaia-account-data','admin-only');sessionStorage.setItem('private','admin-session');});
 await panel.getByRole('button',{name:'Cerrar',exact:true}).click();
 await page.getByRole('button',{name:'♙ Alumnos',exact:true}).click();
 const pupils=page.getByRole('dialog',{name:'Alumnos',exact:true});await pupils.getByRole('button',{name:'Nuevo alumno',exact:false}).click();const frame=page.frameLocator('iframe[title="FichaAutoescuela"]');
 await frame.locator('#sfFirst').fill('Alumno');await frame.locator('#sfLast').fill('Privado');await frame.locator('#sfDni').fill('PRUEBA');await frame.locator('#sfPhone').fill('000000000');await frame.locator('#sfSave').click();
 await page.waitForFunction(()=>Object.values(JSON.parse(localStorage.getItem('traza-bizkaia-ficha-autoescuela-v2')||'{"students":{}}').students).some(s=>s.name==='Alumno Privado'));
 await pupils.getByRole('button',{name:'Volver a clases',exact:false}).click();await pupils.getByRole('button',{name:'Nueva clase',exact:false}).click();await pupils.getByRole('button',{name:'Crear clase',exact:true}).click();await pupils.getByRole('button',{name:'Valoración oficial (1–5)',exact:true}).click();await frame.locator('.class-ratings .rating').first().getByRole('button',{name:'3',exact:true}).click();await pupils.getByRole('button',{name:'Volver a clases',exact:false}).click();await pupils.getByRole('button',{name:'Volver al mapa',exact:false}).click();
 await page.getByRole('button',{name:'Gestionar copias',exact:true}).click();const backups=page.getByRole('dialog',{name:'Copias de seguridad',exact:true});
 const downloaded=page.waitForEvent('download');await backups.getByRole('button',{name:'Descargar copia',exact:false}).click();const file=await downloaded;const exported=JSON.parse(await readFile(await file.path(),'utf8'));assert.ok(Object.values(JSON.parse(exported.storage['traza-bizkaia-ficha-autoescuela-v2']).students).some(s=>s.name==='Alumno Privado'));
 await page.reload();await page.getByRole('button',{name:'Entrar en la aplicación'}).click();

 // Legacy database belongs exclusively to the admin after import.
 await page.evaluate(()=>new Promise((ok,no)=>{const r=indexedDB.open('traza-lessons',3);r.onupgradeneeded=()=>{for(const n of ['sessions','videos','library'])r.result.createObjectStore(n,{keyPath:'id'});};r.onsuccess=()=>{const d=r.result,t=d.transaction('library','readwrite');t.objectStore('library').put({id:'private-review',name:'Admin route'});t.oncomplete=()=>{d.close();ok();};};r.onerror=()=>no(r.error);}));
 const userContext=await browser.newContext();assert.equal((await request(userContext,'login','POST',{email:user.email,password:'12345678'})).status(),200);assert.equal((await request(userContext,'admin/users')).status(),403);
 // Same browser storage, another account: no inherited values or IndexedDB records.
 await request(admin,'logout','POST');assert.equal((await request(admin,'login','POST',{email:user.email,password:'12345678'})).status(),200);
 await page.reload();await page.getByRole('combobox').selectOption('es');await page.getByRole('button',{name:'Entrar en la aplicación'}).click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('traza-bizkaia-account-data')),null);assert.equal(await page.evaluate(()=>localStorage.getItem('traza-bizkaia-pointer-test')),null);assert.equal(await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('traza-bizkaia-ficha-autoescuela-v2')||'{"students":{}}').students).length),0);assert.equal(await page.evaluate(()=>sessionStorage.getItem('private')),null);
 assert.ok(!(await page.evaluate(()=>Object.keys(localStorage))).some(k=>k.includes('account:')));
 await page.evaluate(()=>localStorage.setItem('traza-bizkaia-account-data','user-only'));
 const records=await page.evaluate(()=>new Promise((ok,no)=>{const r=indexedDB.open('traza-lessons',3);r.onupgradeneeded=()=>{for(const n of ['sessions','videos','library'])r.result.createObjectStore(n,{keyPath:'id'});};r.onsuccess=()=>{const d=r.result,q=d.transaction('library').objectStore('library').getAll();q.onsuccess=()=>{d.close();ok(q.result);};q.onerror=()=>no(q.error);};}));assert.deepEqual(records,[]);
 const ficha=await page.goto(base+'/ficha/index.html');assert.equal(ficha.status(),200);assert.equal(await page.evaluate(()=>localStorage.getItem('traza-bizkaia-account-data')),'user-only');assert.equal(await page.evaluate(()=>localStorage.getItem('traza-bizkaia-pointer-test')),null);
 // Reauthenticate admin elsewhere and invalidate every user session.
 const manager=await browser.newContext();await request(manager,'login','POST',{email:'admin@example.test',password:'Test-only-admin-8527'});
 await request(manager,'admin/users/'+user.id,'PATCH',{active:false});assert.equal((await request(userContext,'me')).status(),401);assert.equal((await request(admin,'me')).status(),401);
 assert.equal((await request(userContext,'login','POST',{email:user.email,password:'12345678'})).status(),401);
 await request(manager,'admin/users/'+user.id,'PATCH',{active:true});await request(manager,'admin/users/'+user.id,'PATCH',{password:'87654321'});
 assert.equal((await request(userContext,'login','POST',{email:user.email,password:'12345678'})).status(),401);assert.equal((await request(userContext,'login','POST',{email:user.email,password:'87654321'})).status(),200);
 assert.equal((await request(manager,'admin/users/test-admin','DELETE')).status(),400);
 await request(manager,'admin/users/'+user.id,'DELETE');assert.equal((await request(userContext,'me')).status(),401);
 // Login throttle is persisted in D1 and prevents guessing a PIN.
 for(let i=0;i<16;i++){const r=await request(userContext,'login','POST',{email:'absent@example.test',password:'wrong123'});if(i===15)assert.equal(r.status(),429);}
 assert.deepEqual(errors,[]);console.log('Web access PASS: login, admin UI create, CSRF, authorization, account-scoped local/IDB/session storage and ficha, block/reactivate/reset/delete, session invalidation, login throttle.');
}finally{await browser.close();}
