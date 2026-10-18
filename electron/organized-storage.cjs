const fs=require('node:fs'),path=require('node:path');
const STUDENTS='traza-bizkaia-ficha-autoescuela-v2';
function folders(root){return {root,gpx:path.join(root,'Archivos GPX'),videos:path.join(root,'Vídeos MP4'),students:path.join(root,'Alumnos'),app:path.join(root,'App'),backups:path.join(root,'App','Copias de seguridad')};}
function ensure(root){const dirs=folders(root);for(const dir of Object.values(dirs))fs.mkdirSync(dir,{recursive:true});return dirs;}
function atomic(file,data){const temporary=file+'.'+require('node:crypto').randomUUID()+'.tmp';try{fs.writeFileSync(temporary,data,'utf8');fs.renameSync(temporary,file);}finally{fs.rmSync(temporary,{force:true});}}
function writeLibrary(root,storage){
 const dirs=ensure(root),db=storage[STUDENTS]?JSON.parse(storage[STUDENTS]):{students:{}};
 if(!db||!db.students||typeof db.students!=='object'||Array.isArray(db.students))throw Error('Datos de alumnos no válidos.');
 const now=new Date().toISOString();
 // The root library remains the complete canonical snapshot. This compatible
 // student export is refreshed on every save, including edits and deletion.
 const pupilFile=path.join(dirs.students,'Alumnos.json');if(fs.existsSync(pupilFile)){let managed=false;try{managed=JSON.parse(fs.readFileSync(pupilFile,'utf8')).rutasadAutomatic===true;}catch{}if(!managed)fs.copyFileSync(pupilFile,uniqueFile(dirs.students,'Alumnos-anterior.json'));}
 atomic(pupilFile,JSON.stringify({rutasadAutomatic:true,format:'FichaAutoescuela',version:2,exportedAt:now,students:db.students},null,2));
 atomic(path.join(root,'Biblioteca de recorridos.json'),JSON.stringify({version:1,updatedAt:now,storage},null,2));
}
function loadStudentsFallback(root,storage){
 if(Object.hasOwn(storage,STUDENTS))return storage;
 const file=path.join(root,'Alumnos','Alumnos.json');if(!fs.existsSync(file))return storage;
 try{const db=JSON.parse(fs.readFileSync(file,'utf8'));if(db.rutasadAutomatic!==true||db.format!=='FichaAutoescuela'||db.version!==2||!db.students||typeof db.students!=='object'||Array.isArray(db.students))return storage;return {...storage,[STUDENTS]:JSON.stringify({students:db.students})};}catch{return storage;}
}
function uniqueFile(directory,filename){const ext=path.extname(filename),stem=path.basename(filename,ext);let result=path.join(directory,filename);for(let i=2;fs.existsSync(result);i++)result=path.join(directory,`${stem}-${i}${ext}`);return result;}
function downloadFolder(root,filename){const dirs=folders(root),ext=path.extname(filename).toLowerCase();if(ext==='.gpx')return dirs.gpx;if(['.mp4','.m4v','.mov','.webm'].includes(ext))return dirs.videos;if(ext==='.pdf')return dirs.students;if(ext==='.json')return /^RutasAD-copia/i.test(filename)?dirs.backups:dirs.students;return null;}
module.exports={folders,ensure,writeLibrary,loadStudentsFallback,uniqueFile,downloadFolder};
