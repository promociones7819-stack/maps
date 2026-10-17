// Same schema and UUIDs as FichaAutoescuela. Never reconcile people by name.
export const FICHA_KEY='traza-bizkaia-ficha-autoescuela-v2';
export const PERMITS=['AM','A1/A2','B','C1/C','D1/D'];
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const safeId=id=>typeof id==='string'&&id.length>0&&id.length<=200&&!['__proto__','constructor','prototype'].includes(id);
export function validateStudents(db){
 if(!object(db)||!object(db.students)||Object.keys(db.students).length>10000)throw Error('Copia de alumnos no válida.');
 for(const [id,s] of Object.entries(db.students)){
  if(!safeId(id)||!s||s.id!==id||typeof s.name!=='string'||!s.name.trim()||s.name.length>500||!object(s.permits))throw Error('Datos del alumno no válidos.');
  if(s.rutasadPreviousIds!=null&&(!Array.isArray(s.rutasadPreviousIds)||s.rutasadPreviousIds.some(id=>!safeId(id)||id===s.id)))throw Error('Vínculos de alumnos no válidos.');
  for(const [key,p] of Object.entries(s.permits)){
   if(!PERMITS.includes(key)||!object(p)||!Array.isArray(p.history)||p.history.length>10000||!object(p.theory)||!object(p.practical))throw Error('Permiso no válido.');
   if(p.history.some(e=>!object(e)||!safeId(e.id)||typeof e.date!=='string'||!/^\d{4}-\d\d-\d\d$/.test(e.date)||!Number.isFinite(Number(e.minutes))||Number(e.minutes)<0))throw Error('Clase no válida.');
   for(const entry of p.history)if(entry.rutas!=null&&(!Array.isArray(entry.rutas)||entry.rutas.length>1000||entry.rutas.some(r=>!object(r)||typeof r.key!=='string'||typeof r.name!=='string'||!['routes','reviews'].includes(r.kind)||!safeId(r.projectId))))throw Error('Vínculos de recorridos no válidos.');
   if(new Set(p.history.map(e=>e.id)).size!==p.history.length)throw Error('Clases duplicadas.');
  }
 }
 return db;
}
export function readStudents(){return validateStudents(JSON.parse(localStorage.getItem(FICHA_KEY)||'{"students":{}}'));}
export function writeStudents(db){validateStudents(db);localStorage.setItem(FICHA_KEY,JSON.stringify(db));window.dispatchEvent(new Event('rutasad:students-changed'));}
export function migrateStudents(){
 const db=readStudents();if(localStorage.getItem('traza-bizkaia-ficha-migrated'))return db;let changed=false;
 for(const s of JSON.parse(localStorage.getItem('traza-bizkaia-students')||'[]'))if(safeId(s.id)&&s.name&&!Object.hasOwn(db.students,s.id)){db.students[s.id]={...s,teacher:'',school:'',notes:'',permits:{},updatedAt:new Date().toISOString()};changed=true;}
 if(changed)writeStudents(db);localStorage.setItem('traza-bizkaia-ficha-migrated','1');return db;
}
export function mergeStudents(current,incoming,update=false){
 validateStudents(current);validateStudents(incoming);const result=structuredClone(current);
 for(const [id,s] of Object.entries(incoming.students))if(!Object.hasOwn(result.students,id)||update)result.students[id]=structuredClone(s);
 for(const student of Object.values(result.students))for(const alias of student.rutasadPreviousIds||[])if(result.students[alias]&&!Object.keys(result.students[alias].permits).length)delete result.students[alias];
 return result;
}
export function importFicha(data){
 if(data?.format!=='FichaAutoescuela'||data.version!==2)throw Error('Selecciona una copia de FichaAutoescuela (versión 2).');
 const incoming=validateStudents({students:data.students}),db=migrateStudents();let added=0,updated=0;
 for(const [id,s] of Object.entries(incoming.students)){
  if(!Object.hasOwn(db.students,id)){db.students[id]=s;added++;}
  else if(Date.parse(s.updatedAt)>Date.parse(db.students[id].updatedAt||0)){const next=structuredClone(s),previous=db.students[id];if(previous.rutasadPreviousIds)next.rutasadPreviousIds=[...new Set([...(next.rutasadPreviousIds||[]),...previous.rutasadPreviousIds])];for(const [permit,p] of Object.entries(next.permits))for(const entry of p.history){const old=previous.permits[permit]?.history.find(c=>c.id===entry.id);if(old?.rutas){const links=new Map(old.rutas.map(r=>[r.key,r]));for(const r of entry.rutas||[])links.set(r.key,r);entry.rutas=[...links.values()];}}db.students[id]=next;updated++;}
 }
 writeStudents(db);return {added,updated};
}
export function newClass(studentId,permit,values){
 const db=readStudents(),s=db.students[studentId],p=s?.permits[permit];if(!p)throw Error('Selecciona un permiso del alumno.');
 const entry={id:crypto.randomUUID(),date:values.date,minutes:Number(values.minutes),vehicleType:values.vehicleType,route:values.route||'',notes:values.notes||'',ratings:{},theory:{},createdAt:new Date().toISOString(),rutas:[]};
 p.history.push(entry);s.updatedAt=new Date().toISOString();writeStudents(db);return entry;
}
export function updateClass(studentId,permit,classId,edit){const db=readStudents(),s=db.students[studentId],entry=s?.permits[permit]?.history.find(e=>e.id===classId);if(!entry)throw Error('Clase no encontrada.');edit(entry);entry.updatedAt=s.updatedAt=new Date().toISOString();writeStudents(db);}
export const CLASS_CONTEXT_KEY='traza-bizkaia-class-context';
export function classContext(){try{const context=JSON.parse(localStorage.getItem(CLASS_CONTEXT_KEY)||'null'),s=readStudents().students[context?.studentId];return s?.permits[context?.permit]?.history.some(e=>e.id===context.classId)?context:null;}catch{return null;}}
export function selectClass(context){localStorage.setItem(CLASS_CONTEXT_KEY,JSON.stringify(context));window.dispatchEvent(new Event('rutasad:class-selected'));}
// Reconcile an old RutasAD name-only record only after an explicit selection.
export async function linkPreviousStudent(previousId,studentId){
 const db=readStudents(),previous=db.students[previousId],student=db.students[studentId];
 if(!previous||!student||previousId===studentId||Object.keys(previous.permits).length)throw Error('Selecciona un alumno anterior sin permisos.');
 const {listLessons,saveLesson}=await import('./lessonStore.js');
 for(const session of await listLessons())if(session.studentId===previousId)await saveLesson({...session,studentId,studentName:student.name});
 student.rutasadPreviousIds=[...new Set([...(student.rutasadPreviousIds||[]),previousId])];student.updatedAt=new Date().toISOString();delete db.students[previousId];writeStudents(db);
 const legacy=JSON.parse(localStorage.getItem('traza-bizkaia-students')||'[]');localStorage.setItem('traza-bizkaia-students',JSON.stringify(legacy.filter(s=>s.id!==previousId)));window.dispatchEvent(new Event('rutasad:lessons-changed'));
}
