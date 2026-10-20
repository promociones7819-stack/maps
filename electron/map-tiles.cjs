// SPDX-FileCopyrightText: 2026 Aitor Delgado Martínez · AD Mobility
// SPDX-License-Identifier: LicenseRef-RutasAD-Educational-NonCommercial-1.0
const fs=require('node:fs/promises'),path=require('node:path');
const base='https://www.geo.euskadi.eus/geoeuskadi/rest/services/U11/WMTS_ORTO/MapServer/WMTS/tile/1.0.0/U11_WMTS_ORTO/default/GoogleMapsCompatible';
module.exports=function createTileService({directory,fetchTile}){
 const pending=new Map();let maintenance=Promise.resolve();
 const response=bytes=>new Response(bytes,{headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=86400'}});
 const trim=()=>maintenance=maintenance.catch(()=>{}).then(async()=>{const rows=await Promise.all((await fs.readdir(directory)).filter(n=>/^\d+-\d+-\d+\.tile$/.test(n)).map(async name=>({name,...await fs.stat(path.join(directory,name))})));let total=rows.reduce((n,r)=>n+r.size,0);for(const row of rows.sort((a,b)=>a.mtimeMs-b.mtimeMs)){if(total<=256*1024*1024)break;await fs.unlink(path.join(directory,row.name)).catch(()=>{});total-=row.size;}}).catch(()=>{});
 async function load(key,z,y,x){
  const file=path.join(directory,key+'.tile');try{const bytes=await fs.readFile(file);if(bytes.length)return bytes;}catch{}
  let error;
  for(let attempt=0;attempt<2;attempt++)try{
   const result=await fetchTile(`${base}/${z}/${y}/${x}`,{signal:AbortSignal.timeout(10000),redirect:'error',credentials:'omit'});
   if(!result.ok)throw Error(`geoEuskadi: HTTP ${result.status}`);
   if(!/^image\//i.test(result.headers.get('content-type')||''))throw Error('geoEuskadi no ha devuelto una imagen.');
   const bytes=Buffer.from(await result.arrayBuffer());if(!bytes.length||bytes.length>4*1024*1024)throw Error('Imagen de mapa no válida.');
   // Cache failure must never prevent displaying a downloaded tile.
   try{await fs.mkdir(directory,{recursive:true});await fs.writeFile(file,bytes);void trim();}catch{}
   return bytes;
  }catch(e){error=e;}
  throw error;
 }
 return async request=>{
  const url=new URL(request.url),match=/^\/__geo\/tiles\/(\d{1,2})\/(\d+)\/(\d+)$/.exec(url.pathname);
  if(url.hostname!=='app'||url.search||!match||!['GET','HEAD'].includes(request.method))return new Response('Dirección de mapa no válida',{status:400});
  const [z,y,x]=match.slice(1).map(Number);if(z>20||x>=2**z||y>=2**z||![x,y].every(Number.isSafeInteger))return new Response('Tesela fuera de rango',{status:400});
  const key=`${z}-${y}-${x}`;
  try{let task=pending.get(key);if(!task){task=load(key,z,y,x);pending.set(key,task);task.finally(()=>pending.delete(key)).catch(()=>{});}const bytes=await task;return request.method==='HEAD'?new Response(null,{headers:{'Content-Type':'image/png'}}):response(bytes);}
  catch{return new Response('No se pudo descargar la ortofoto de geoEuskadi. Comprueba la conexión e inténtalo de nuevo.',{status:502});}
 };
};
