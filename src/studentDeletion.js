import {suspendAutosave,SESSION_KEY} from './autosave.js';
import {FICHA_KEY,CLASS_CONTEXT_KEY,readStudents,validateStudents} from './students.js';
import {listLessons,listLibraryReviews,commitStudentDeletion} from './lessonStore.js';
import {convert} from './RaceBoxPanel.jsx';
const prefix='traza-bizkaia-';
const snapshot=()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith(prefix)).map(k=>[k,localStorage.getItem(k)]));
const keys=r=>[r.key,r.sessionId&&`lesson:${r.sessionId}`,r.libraryId&&`review:${r.libraryId}`].filter(Boolean);
const links=s=>Object.values(s.permits||{}).flatMap(p=>(p.history||[]).flatMap(c=>c.rutas||[]));
const matches=(r,set)=>keys(r).some(k=>set.has(k));
// Build changes by UUID, never by a person's display name. Reusable trajectories
// and original files are not owned by a student just because a class uses them.
export async function deleteStudent(studentId,{desktop=window.trazaDesktop}={}){
 const storage=snapshot(),db=readStudents(),student=db.students[studentId];if(!student)throw Error('Alumno no encontrado.');
 const ids=new Set([studentId,...(student.rutasadPreviousIds||[])]),[sessions,library]=await Promise.all([listLessons(),listLibraryReviews()]);
 const owned=sessions.filter(s=>ids.has(s.studentId)),ownedIds=new Set(owned.map(s=>s.id)),ownLinks=new Set(links(student).flatMap(keys)),otherLinks=new Set(Object.values(db.students).filter(s=>!ids.has(s.id)).flatMap(s=>links(s).flatMap(keys)));
 for(const s of sessions)if(!ids.has(s.studentId))otherLinks.add(`lesson:${s.id}`);
 for(const item of library)if((item.studentId&&!ids.has(item.studentId))||(item.review?.studentId&&!ids.has(item.review.studentId))||(item.review?.sessionId&&sessions.some(s=>s.id===item.review.sessionId&&!ids.has(s.studentId))))for(const key of [...keys(item.review||{}),`review:${item.id}`])otherLinks.add(key);
 const deleted=new Set(owned.map(s=>`lesson:${s.id}`));
 for(const key of ownLinks)if(!otherLinks.has(key)&&!key.startsWith('route:'))deleted.add(key);
 for(const item of library)if(ownedIds.has(item.id)||ownedIds.has(item.review?.sessionId)||((ids.has(item.studentId)||ids.has(item.review?.studentId))&&!matches({...item.review,key:`review:${item.id}`},otherLinks))){for(const key of [...keys(item.review||{}),`review:${item.id}`])deleted.add(key);}
 const replacements=new Map(),remainingLibrary=[],removedLibrary=[],candidateVideos=new Set();
 const rememberVideo=r=>{if(r?.media?.id)candidateVideos.add(r.media.id);};
 // A track used by another pupil becomes an anonymous library item. Its former
 // owner's history is removed and the other class keeps a working reference.
 for(const s of owned){rememberVideo(s);const aliases=[`lesson:${s.id}`,...library.filter(i=>i.id===s.id||i.review?.sessionId===s.id).flatMap(i=>[...keys(i.review),`review:${i.id}`])];if(aliases.some(key=>otherLinks.has(key))){
  const review=convert(s),libraryId=crypto.randomUUID();delete review.sessionId;review.libraryId=libraryId;if(!review.name||review.name===student.name)review.name='Recorrido compartido';
  const ref={key:`review:${libraryId}`,kind:'reviews',projectId:s.projectId||JSON.parse(storage[`${prefix}projects`]).activeProjectId,libraryId,name:review.name};for(const key of aliases)replacements.set(key,{ref,review});remainingLibrary.push({id:libraryId,projectId:ref.projectId,review,updatedAt:Date.now()});
 }}
 for(const item of library){const r=item.review,ownedItem=ids.has(item.studentId)||ids.has(r?.studentId),remove=ownedItem||ownedIds.has(item.id)||matches(r||{},deleted)||deleted.has(`review:${item.id}`);
  if(ownedItem&&matches({...r,key:`review:${item.id}`},otherLinks)&&!ownedIds.has(r?.sessionId)){const clean=structuredClone(item);delete clean.studentId;delete clean.studentName;delete clean.review.studentId;delete clean.review.studentName;if(clean.review.name===student.name)clean.review.name='Recorrido compartido';remainingLibrary.push(clean);continue;}
  if(remove){removedLibrary.push(item.id);rememberVideo(r);}else remainingLibrary.push(item);
 }
 const next=structuredClone(db);for(const id of ids)delete next.students[id];
 for(const s of Object.values(next.students))for(const p of Object.values(s.permits))for(const c of p.history||[])if(c.rutas)c.rutas=(c.rutas||[]).flatMap(r=>{const replacement=keys(r).map(k=>replacements.get(k)).find(Boolean);return replacement?[replacement.ref]:matches(r,deleted)?[]:[r];});
 validateStudents(next);
 const nextStorage={...storage,[FICHA_KEY]:JSON.stringify(next)};
 if(nextStorage[`${prefix}students`])nextStorage[`${prefix}students`]=JSON.stringify(JSON.parse(nextStorage[`${prefix}students`]).filter(s=>!ids.has(s.id)));
 for(const key of [CLASS_CONTEXT_KEY,`${prefix}ficha-active-student`]){let value=storage[key];if(key===CLASS_CONTEXT_KEY&&value)value=JSON.parse(value)?.studentId;if(ids.has(value))delete nextStorage[key];}
 for(const [key,value] of Object.entries(storage))if(key.startsWith(`${prefix}project-`)&&key.endsWith('-gpx-review')){
  const r=JSON.parse(value);if(ids.has(r.studentId)||matches(r,deleted)){rememberVideo(r);const replacement=keys(r).map(k=>replacements.get(k)).find(Boolean);nextStorage[key]=JSON.stringify(replacement?.review||{name:'',points:[],incidents:[]});}
 }
 if(nextStorage[`${prefix}library-opened`]){const opened=JSON.parse(nextStorage[`${prefix}library-opened`]);for(const key of deleted)delete opened[key];nextStorage[`${prefix}library-opened`]=JSON.stringify(opened);}
 const remainingSessions=sessions.filter(s=>!ids.has(s.studentId)),retainedVideos=new Set();
 for(const r of [...remainingSessions,...remainingLibrary.map(i=>i.review)])if(r.media?.id)retainedVideos.add(r.media.id);
 for(const [key,value] of Object.entries(nextStorage))if(key.startsWith(`${prefix}project-`)&&key.endsWith('-gpx-review')){const r=JSON.parse(value);if(r.media?.id)retainedVideos.add(r.media.id);}
 const videoIds=[...candidateVideos].filter(id=>!retainedVideos.has(id));
 const write=values=>{for(const key of Object.keys(localStorage))if(key.startsWith(prefix)&&!(key in values))localStorage.removeItem(key);for(const [key,value] of Object.entries(values))localStorage.setItem(key,value);};
 // Native disk and localStorage failures happen before the atomic IndexedDB
 // deletion; failures roll the metadata back without loading video blobs.
 delete nextStorage[SESSION_KEY];const resumeAutosave=suspendAutosave();
 try{if(desktop)await desktop.saveLibrary(nextStorage);write(nextStorage);await commitStudentDeletion({sessionIds:owned.map(s=>s.id),libraryIds:removedLibrary,libraryItems:remainingLibrary,videoIds});}
 catch(error){resumeAutosave();let failed=false;try{write(storage);if(desktop)await desktop.saveLibrary(storage);}catch{failed=true;}throw Error(failed?'No se ha completado el borrado. Conserva la copia de seguridad y vuelve a abrir la app.':`No se ha eliminado el alumno. ${error.message||''}`);}
 if(ids.has(storage[`${prefix}ficha-active-student`]))sessionStorage.removeItem('ficha-autoescuela-active-class');
 if(ids.has(sessionStorage.getItem('ficha-autoescuela-open-student')))sessionStorage.removeItem('ficha-autoescuela-open-student');
 window.dispatchEvent(new Event('rutasad:students-changed'));window.dispatchEvent(new Event('rutasad:lessons-changed'));
 return {classes:Object.values(student.permits).reduce((n,p)=>n+p.history.length,0),sessions:owned.length,videos:videoIds.length};
}
