// SPDX-FileCopyrightText: 2026 Aitor Delgado Martínez · AD Mobility
// SPDX-License-Identifier: LicenseRef-RutasAD-Educational-NonCommercial-1.0
import {addProtocol} from 'maplibre-gl';
import {googleConfig,reserveGoogleTile} from './googleBudget.js';
const scenes=new Map();let installed=false,sessionTask,activeKey='';
async function googleJSON(url,options={}){const r=await fetch(url,{...options,cache:'no-store'});if(!r.ok)throw Error(r.status===403?'Google ha rechazado la clave. Revisa API, facturación y restricciones.':r.status===429?'Google ha detenido las peticiones por su cuota. Puedes continuar con PNOA.':'No se pudo conectar con Google Maps.');return r.json();}
export async function verifyGoogleKey(key){
 if(!/^AIza[\w-]{25,120}$/.test(key||''))throw Error('Introduce una clave API válida de Google.');
 const s=await googleJSON(`https://tile.googleapis.com/v1/createSession?key=${encodeURIComponent(key)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mapType:'satellite',language:'es-ES',region:'ES',highDpi:false})});
 if(typeof s.session!=='string'||!s.session||!Number.isFinite(Number(s.expiry))||Number(s.expiry)*1000<Date.now()+60000)throw Error('Google no ha creado una sesión válida.');
 return s;
}
export async function googleSession(){
 const key=googleConfig()?.key;if(!key)throw Error('Configura tu clave de Google Maps.');
 if(key!==activeKey){activeKey=key;sessionTask=null;}
 if(!sessionTask)sessionTask=verifyGoogleKey(key).catch(e=>{sessionTask=null;throw e;});
 const s=await sessionTask;if(Number(s.expiry)*1000<Date.now()+60000){sessionTask=null;return googleSession();}return s;
}
export function googleSource(){
 if(!installed){addProtocol('rutas-google',async(params,controller)=>{
  const url=new URL(params.url),scene=scenes.get(url.hostname),parts=url.pathname.slice(1).split('/').map(Number);if(!scene||parts.length!==3||!parts.every(Number.isSafeInteger))throw Error('Mapa de Google no disponible.');
  const [z,x,y]=parts;if(z<0||z>22||x<0||y<0||x>=2**z||y>=2**z)throw Error('Tesela de Google fuera de rango.');
  const s=await googleSession();if(controller.signal.aborted)throw Error('Petición cancelada.');await scene.attribution();await reserveGoogleTile();if(controller.signal.aborted)throw Error('Petición cancelada.');
  const r=await fetch(`https://tile.googleapis.com/v1/2dtiles/${z}/${x}/${y}?session=${encodeURIComponent(s.session)}&key=${encodeURIComponent(googleConfig().key)}`,{signal:controller.signal});if(!r.ok)throw Error(r.status===429?'Cuota de Google alcanzada. Usa PNOA o revisa las cuotas en Google Cloud.':'Google no pudo descargar la imagen del mapa.');if(!r.headers.get('content-type')?.startsWith('image/'))throw Error('Google no ha devuelto una imagen válida.');return {data:await r.arrayBuffer(),cacheControl:r.headers.get('cache-control')||'no-store',expires:r.headers.get('expires')||undefined};
 });installed=true;}
 const id=crypto.randomUUID();const source={type:'raster',tiles:[`rutas-google://${id}/{z}/{x}/{y}`],tileSize:256,maxzoom:22,attribution:'Google Maps'};return source;
}
export function attachGoogleMap(map,source){
 const id=new URL(source.tiles[0]).hostname;let last='',pending;const update=async()=>{
  const b=map.getBounds(),key=[Math.round(map.getZoom()+1),...b.toArray().flat().map(n=>n.toFixed(3))].join(',');if(last===key&&pending)return pending;last=key;
  pending=(async()=>{const s=await googleSession(),query=new URLSearchParams({session:s.session,key:googleConfig().key,zoom:String(Math.max(0,Math.min(22,Math.floor(map.getZoom()+1)))),north:String(Math.min(85,b.getNorth())),south:String(Math.max(-85,b.getSouth())),east:String(Math.min(180,b.getEast())),west:String(Math.max(-180,b.getWest()))});const data=await googleJSON('https://tile.googleapis.com/tile/v1/viewport?'+query);if(!data.copyright)throw Error('No se pudo obtener la atribución de Google.');let note=map.getContainer().querySelector('.google-data-credit');if(!note){note=document.createElement('div');note.className='google-data-credit';note.setAttribute('aria-label','Google Maps y proveedores del mapa');map.getContainer().append(note);}note.textContent='Google Maps · '+data.copyright;})().catch(e=>{last='';throw e;});return pending;
 };
 map.rutasGoogle=true;scenes.set(id,{attribution:update});const changed=()=>update().catch(()=>{});map.on('moveend',changed);map.once('remove',()=>{scenes.delete(id);});return()=>{map.off('moveend',changed);scenes.delete(id);};
}
export function assertMapExportAllowed(map){if(map?.rutasGoogle)throw Error('Para grabar o exportar el mapa elige PNOA o geoEuskadi. Google está disponible para explicación y edición en pantalla.');}
