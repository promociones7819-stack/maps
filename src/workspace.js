let active;
const native=()=>window.trazaDesktop?.chooseWorkspace;
const db=()=>new Promise((ok,no)=>{const r=indexedDB.open('rutasad-workspace',1);r.onupgradeneeded=()=>r.result.createObjectStore('handles');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});
async function remember(handle){const d=await db();return new Promise((ok,no)=>{const t=d.transaction('handles','readwrite');t.objectStore('handles').put(handle,'folder');t.oncomplete=()=>{d.close();ok();};t.onerror=()=>no(t.error);});}
async function previous(){const d=await db();return new Promise((ok,no)=>{const r=d.transaction('handles').objectStore('handles').get('folder');r.onsuccess=()=>{d.close();ok(r.result);};r.onerror=()=>no(r.error);});}
export async function openWorkspace(reopen=false){
 if(native()){const folder=await window.trazaDesktop.chooseWorkspace();if(!folder)return null;active={...folder,native:true};return active;}
 if(!window.showDirectoryPicker)throw Error('Para trabajar con carpetas usa Chrome en Mac o RutasAD.');
 let handle=reopen?await previous():null;
 if(handle){if(await handle.requestPermission({mode:'readwrite'})!=='granted')throw Error('Necesitas autorizar lectura y escritura en la carpeta.');}
 else handle=await window.showDirectoryPicker({mode:'readwrite',id:'rutasad-class'});
 const files=[];for await(const [name,h] of handle.entries())if(h.kind==='file')files.push({name,size:(await h.getFile()).size});
 active={name:handle.name,handle,files};await remember(handle).catch(()=>{});return active;
}
export async function workspaceText(name){if(!active)throw Error('Abre primero la carpeta de esta clase.');if(active.native)return window.trazaDesktop.readWorkspaceText(name);return (await(await active.handle.getFileHandle(name)).getFile()).text();}
export async function workspaceMedia(media){
 if(!active)throw Error('Abre la carpeta de esta clase para recuperar el vídeo.');
 if(!active.files.some(f=>f.name===media.name&&f.size===media.size))throw Error('El vídeo original no está en esta carpeta o su tamaño ha cambiado.');
 if(active.native)return {url:`traza://app/__workspace/${encodeURIComponent(media.name)}`};
 return {file:await(await active.handle.getFileHandle(media.name)).getFile()};
}
export async function saveWorkspaceProject(review){
 if(!active)throw Error('Abre primero una carpeta.');const text=JSON.stringify({format:'rutasad-project',version:1,review},null,2);
 if(active.native)return window.trazaDesktop.writeWorkspaceProject(text);
 const f=await active.handle.getFileHandle('RutasAD-proyecto.json',{create:true});const w=await f.createWritable();try{await w.write(text);await w.close();}catch(e){await w.abort().catch(()=>{});throw e;}
}
export function parseWorkspaceGpx(text,name){const xml=new DOMParser().parseFromString(text,'application/xml');if(xml.querySelector('parsererror'))throw Error('GPX inválido.');const segments=[...xml.querySelectorAll('trkseg,rte')];const points=[...xml.querySelectorAll('trkpt,rtept')].map(p=>{if(!p.hasAttribute('lon')||!p.hasAttribute('lat'))throw Error('GPX inválido.');const time=Date.parse(p.querySelector('time')?.textContent);return {coordinates:[Number(p.getAttribute('lon')),Number(p.getAttribute('lat'))],time:Number.isFinite(time)?time:null,segment:Math.max(0,segments.indexOf(p.closest('trkseg,rte')))};});if(points.length<2||points.some(p=>!p.coordinates.every(Number.isFinite)||Math.abs(p.coordinates[0])>180||Math.abs(p.coordinates[1])>90))throw Error('El GPX necesita al menos dos posiciones válidas.');return {name,points,incidents:[]};}
export async function loadWorkspaceSelection(gpx,video){
 let review;
 if(gpx==='RutasAD-proyecto.json'){const p=JSON.parse(await workspaceText(gpx));if(p.format!=='rutasad-project'||p.version!==1||!Array.isArray(p.review?.points)||!Array.isArray(p.review?.incidents))throw Error('Proyecto RutasAD inválido.');review=p.review;if(review.points.length<2||review.points.some(p=>!Array.isArray(p.coordinates)||p.coordinates.length!==2||!p.coordinates.every(Number.isFinite)||Math.abs(p.coordinates[0])>180||Math.abs(p.coordinates[1])>90||(p.time!=null&&!Number.isFinite(p.time))))throw Error('Posiciones del proyecto inválidas.');if(review.incidents.some(i=>!Array.isArray(i.coordinates)||i.coordinates.length!==2||!i.coordinates.every(Number.isFinite)||typeof i.title!=='string'||typeof i.note!=='string'))throw Error('Incidencias del proyecto inválidas.');}
 else review=parseWorkspaceGpx(await workspaceText(gpx),gpx.replace(/\.gpx$/i,''));
 const file=active.files.find(f=>f.name===(video||review.media?.name));
 if(file)review.media={...(review.media||{}),id:crypto.randomUUID(),name:file.name,size:file.size,workspace:true,workspaceName:active.name,videoStartUtc:review.media?.videoStartUtc??review.points[0]?.time};
 else if(review.media)review.media={...review.media,id:crypto.randomUUID(),workspace:true};
 return review;
}
export async function openMovieSink(){
 if(window.trazaDesktop?.beginMovie){const token=await window.trazaDesktop.beginMovie();if(!token)throw new DOMException('Cancelado','AbortError');return {name:token.name,write:async blob=>window.trazaDesktop.writeMovie(token.id,await blob.arrayBuffer()),close:()=>window.trazaDesktop.finishMovie(token.id),abort:()=>window.trazaDesktop.abortMovie(token.id)};}
 if(!window.showSaveFilePicker)return null;
 const h=await window.showSaveFilePicker({suggestedName:'RutasAD-mapa-pip.mp4',id:'rutasad-export',...(active?.handle?{startIn:active.handle}:{}),types:[{description:'Vídeo MP4',accept:{'video/mp4':['.mp4']}}]});const writable=await h.createWritable();return {name:h.name,write:b=>writable.write(b),close:()=>writable.close(),abort:()=>writable.abort()};
}
