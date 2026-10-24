const fs=require('node:fs/promises'),path=require('node:path');
module.exports=async context=>{
 const resources=context.electronPlatformName==='darwin'?path.join(context.appOutDir,context.packager.appInfo.productFilename+'.app','Contents','Resources'):path.join(context.appOutDir,'resources');
 const destination=path.join(resources,'legal');await fs.mkdir(destination,{recursive:true});
 // Keep Electron's exact upstream third-party notices alongside our application.
 const platformFile=path.join(context.appOutDir,'LICENSES.chromium.html');
 let source=platformFile;try{await fs.access(source);}catch{source=path.join(context.packager.projectDir,'node_modules','electron','dist','LICENSES.chromium.html');}
 await fs.copyFile(source,path.join(destination,'Chromium-notices.html'));
 await fs.copyFile(path.join(context.packager.projectDir,'legal','electron-LICENSE.txt'),path.join(destination,'Electron-LICENSE.txt'));
};
