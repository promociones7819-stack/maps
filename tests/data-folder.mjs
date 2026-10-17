import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
try{
 const page=await browser.newPage();await page.goto('http://localhost:5173');
 const result=await page.evaluate(async()=>{
  localStorage.setItem('traza-bizkaia-projects',JSON.stringify({activeProjectId:'one',projects:[{id:'one',name:'Clase'}]}));localStorage.setItem('traza-bizkaia-project-one','[]');
  const students=await import('/src/students.js'),{saveLesson}=await import('/src/lessonStore.js');students.writeStudents({students:{ana:{id:'ana',name:'Ana Prueba',permits:{B:{key:'B',theory:{},practical:{},history:[]}}}}});
  const folder=await(await navigator.storage.getDirectory()).getDirectoryHandle('rutasad-test',{create:true});window.showDirectoryPicker=async()=>folder;
  const api=await import('/src/dataFolder.js');const fresh=await api.chooseDataFolder();if(fresh.backup)throw Error('Unexpected old OPFS data');await api.connectDataFolder(fresh);
  const first=JSON.parse(await(await(await folder.getFileHandle(api.DATA_FILE)).getFile()).text());
  const cls=students.newClass('ana','B',{date:'2026-10-17',minutes:50,vehicleType:'manual'});await saveLesson({id:'track',studentId:'ana',studentName:'Ana Prueba',classId:cls.id,permit:'B',projectId:'one',startedAt:'2026-10-17T10:00:00Z',points:[{lat:43.26,lon:-2.93,time:'2026-10-17T10:00:00Z'}],events:[]});await Promise.all([api.saveDataFolder(),api.saveDataFolder(),api.saveDataFolder()]);
  const saved=JSON.parse(await(await(await folder.getFileHandle(api.DATA_FILE)).getFile()).text());
  // An externally changed copy must stop autosaving rather than overwrite it.
  const writer=await(await folder.getFileHandle(api.DATA_FILE)).createWritable();await writer.write(JSON.stringify({...saved,createdAt:'2000-01-01T00:00:00Z'}));await writer.close();
  let conflict=false;try{await api.saveDataFolder();}catch{conflict=true;}
  const external=JSON.parse(await(await(await folder.getFileHandle(api.DATA_FILE)).getFile()).text());
  const reopen=await api.chooseDataFolder();
  return {first,saved,conflict,external,reopened:!!reopen.backup};
 });
 assert.equal(Object.keys(JSON.parse(result.first.storage['traza-bizkaia-ficha-autoescuela-v2']).students).length,1);
 assert.equal(JSON.parse(result.saved.storage['traza-bizkaia-ficha-autoescuela-v2']).students.ana.permits.B.history.length,1);
 assert.equal(result.saved.sessions[0].permit,'B');assert.ok(result.saved.sessions[0].classId);assert.equal(result.conflict,true);assert.equal(result.external.createdAt,'2000-01-01T00:00:00Z');assert.equal(result.reopened,true);
 console.log('PASS data folder: real FileSystem handles, complete class/student/track copy, safe reopen and external-write conflict');
}finally{await browser.close();}
