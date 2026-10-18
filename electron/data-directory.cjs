const fs=require('node:fs');const path=require('node:path');
// Preserve the previous folder. Never overwrite an existing RutasAD library.
module.exports=function prepareDataDirectory(documents){
 const target=path.join(documents,'RutasAD'),legacy=path.join(documents,'Traza Bizkaia');
 const hasData=fs.existsSync(path.join(target,'Biblioteca de recorridos.json'))||fs.existsSync(path.join(target,'.datos-de-la-aplicacion'));
 fs.mkdirSync(target,{recursive:true});
 if(!hasData&&fs.existsSync(legacy))for(const name of ['Biblioteca de recorridos.json','.datos-de-la-aplicacion','Archivos GPX','Vídeos MP4']){
  const from=path.join(legacy,name),to=path.join(target,name);if(fs.existsSync(from))fs.cpSync(from,to,{recursive:true,force:false,errorOnExist:false});
 }
 return target;
};
