// SPDX-FileCopyrightText: 2026 Aitor Delgado Martínez · AD Mobility
// SPDX-License-Identifier: LicenseRef-RutasAD-Educational-NonCommercial-1.0
// Advanced didactic-board helpers; saved lessons never modify route projects.
const KEY='traza-bizkaia-didactic-boards-v1';
export const VEHICLE_KINDS=[['car','Coche','Autoa'],['bus','Autobús','Autobusa'],['truck','Camión','Kamioia'],['motorcycle','Moto','Motoa'],['bicycle','Bicicleta','Bizikleta'],['pedestrian','Peatón','Oinezkoa']];
export const BOARD_COLORS=['#f3b73e','#57b9f4','#ed7373','#4abf89','#ffffff','#222222'];
const rad=Math.PI/180;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function vehicleSvg(kind) {
 const body=kind==='bus'?'<rect x="8" y="3" width="24" height="54" rx="5" fill="currentColor"/><rect x="11" y="8" width="18" height="10" rx="2" fill="#c6e1ea"/><rect x="11" y="24" width="18" height="24" rx="2" fill="#c6e1ea"/>':
 kind==='truck'?'<rect x="8" y="3" width="24" height="33" rx="3" fill="currentColor"/><rect x="8" y="38" width="24" height="19" rx="4" fill="currentColor"/><rect x="11" y="41" width="18" height="7" rx="2" fill="#c6e1ea"/>':
 kind==='motorcycle'?'<circle cx="20" cy="10" r="5" fill="#111"/><circle cx="20" cy="50" r="5" fill="#111"/><path d="M20 15 L20 45 M12 28H28" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>':
 kind==='bicycle'?'<circle cx="20" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="20" cy="52" r="6" fill="none" stroke="currentColor" stroke-width="3"/><path d="M20 14L12 31L20 46L28 31L20 14" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="20" cy="31" r="4" fill="currentColor"/>':
 kind==='pedestrian'?'<circle cx="20" cy="10" r="7" fill="currentColor"/><path d="M20 20V38M20 27L8 36M20 27L32 36M20 38L11 54M20 38L29 54" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>':
 '<rect x="8" y="3" width="24" height="54" rx="8" fill="currentColor"/><rect x="11" y="13" width="18" height="13" rx="3" fill="#c6e1ea"/><rect x="11" y="37" width="18" height="12" rx="3" fill="#c6e1ea"/>';
 return `<svg width="32" height="48" viewBox="0 0 40 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g stroke="#fff" stroke-width="1.6">${body}</g><path d="M16 3L20 0L24 3" fill="none" stroke="#fff" stroke-width="2"/></svg>`;
}
function meters(a,b){const latitude=(a[1]+b[1])/2*rad;return Math.hypot((b[0]-a[0])*111320*Math.cos(latitude),(b[1]-a[1])*111320);}
export function vehicleAt(item, fraction) {
 const points=item.path;
 if(!Array.isArray(points)||points.length<2)return {coordinates:item.coordinates,heading:item.heading||0};
 const lengths=points.slice(1).map((p,i)=>meters(points[i],p)),total=lengths.reduce((a,b)=>a+b,0);
 let remaining=clamp(fraction,0,1)*total;
 for(let i=0;i<lengths.length;i++){const length=lengths[i];if(remaining<=length||i===lengths.length-1){const f=length?clamp(remaining/length,0,1):0;const a=points[i],b=points[i+1];return {coordinates:[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f],heading:Math.atan2((b[0]-a[0])*Math.cos(a[1]*rad),b[1]-a[1])/rad};}remaining-=length;}
 return {coordinates:points.at(-1),heading:item.heading||0};
}
const offset=(origin,distance,angle)=>[origin[0]+Math.sin(angle*rad)*distance/(111320*Math.cos(origin[1]*rad)),origin[1]+Math.cos(angle*rad)*distance/111320];
function polygonFor(item){
 const p=item.points||[];if(p.length<2)return null;const a=p[0],b=p.at(-1);
 if(item.type==='area')return p.length>=3?[...p,p[0]]:null;
 if(item.type==='rectangle')return [a,[b[0],a[1]],b,[a[0],b[1]],a];
 if(item.type==='circle'){const radius=Math.max(.5,meters(a,b));return Array.from({length:49},(_,i)=>offset(a,radius,i*7.5));}
 if(item.type==='sight'){const radius=Math.max(.5,meters(a,b)),bearing=Number.isFinite(item.heading)?item.heading:Math.atan2((b[0]-a[0])*Math.cos(a[1]*rad),b[1]-a[1])/rad,spread=clamp(Number(item.aperture)||70,10,180);return [a,...Array.from({length:25},(_,i)=>offset(a,radius,bearing-spread/2+spread*i/24)),a];}
 return null;
}
export function geoFeatures(items){
 const features=[];
 for(const item of items){
  const polygon=polygonFor(item);
  if(polygon)features.push({type:'Feature',properties:{id:item.id,color:item.color||'#f3b73e',opacity:Number.isFinite(Number(item.opacity))?Number(item.opacity):.25},geometry:{type:'Polygon',coordinates:[polygon]}});
 }
 return {type:'FeatureCollection',features};
}
export function lineFeatures(items) {
 return {type:'FeatureCollection',features:items.filter(i=>['route','arrow','ink','dashed','line','stopline','yieldline','crosswalk','vehicle-path'].includes(i.type)&&i.points?.length>1).map(i=>({type:'Feature',properties:{id:i.id,color:['stopline','yieldline','crosswalk'].includes(i.type)?'#ffffff':i.color||'#f3b73e',dashed:['dashed','yieldline','crosswalk'].includes(i.type),width:i.type==='stopline'||i.type==='yieldline'?9:i.type==='crosswalk'?16:i.width||5},geometry:{type:'LineString',coordinates:i.points}}))};
}
export function loadBoardLibrary(){try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(a)?a.filter(x=>x&&typeof x.id==='string'&&Array.isArray(x.items)&&Array.isArray(x.scenes)):[];}catch{return [];}}
export function saveBoardLibrary(entry){const items=loadBoardLibrary().filter(e=>e.id!==entry.id);items.unshift(structuredClone(entry));localStorage.setItem(KEY,JSON.stringify(items.slice(0,100)));return entry;}
export function deleteBoardLibrary(id){localStorage.setItem(KEY,JSON.stringify(loadBoardLibrary().filter(e=>e.id!==id)));}
export function validateBoardImport(entry) {
 if(!entry||!Array.isArray(entry.items)||!Array.isArray(entry.scenes)||entry.items.length>800||entry.scenes.length>150)throw Error('Archivo de pizarra no válido.');
 for(const v of [...entry.items,...entry.scenes.flatMap(s=>s.items||[])]){if(!v||typeof v.type!=='string'||typeof v.id!=='string')throw Error('Elemento de pizarra no válido.');}
 return {id:crypto.randomUUID(),name:String(entry.name||'Explicación importada').slice(0,90),items:structuredClone(entry.items),scenes:structuredClone(entry.scenes),camera:entry.camera||null,updatedAt:Date.now()};
}
export function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function boardFilename(name){return String(name||'pizarra').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,60)||'pizarra';}
export async function imageOfBoard(map,items) {
 const base=map.getCanvas(),out=document.createElement('canvas'),scale=1;out.width=base.width*scale;out.height=base.height*scale;
 const ctx=out.getContext('2d');ctx.drawImage(base,0,0,out.width,out.height);
 const sx=out.width/base.clientWidth,sy=out.height/base.clientHeight;
 for(const item of items) {
  if(!item.coordinates)continue;
  const p=map.project(item.coordinates),x=p.x*sx,y=p.y*sy;
  ctx.save();ctx.translate(x,y);
  if(item.type==='vehicle'){
   const v=vehicleAt(item,0);const rot=((v.heading||0)-map.getBearing())*rad;ctx.rotate(rot);ctx.fillStyle=item.color||'#57b9f4';ctx.strokeStyle='#fff';ctx.lineWidth=2;
   if(item.kind==='pedestrian'){ctx.beginPath();ctx.arc(0,0,9,0,Math.PI*2);ctx.fill();ctx.stroke();}else{ctx.fillRect(-11,-21,22,42);ctx.strokeRect(-11,-21,22,42);}
   ctx.rotate(-rot);ctx.fillStyle='#fff';ctx.strokeStyle='#111';ctx.lineWidth=3;ctx.font='bold 17px sans-serif';ctx.strokeText(item.label||'A',13,-10);ctx.fillText(item.label||'A',13,-10);
  }else{ctx.fillStyle=item.type==='note'?'#d9483c':'#fff';ctx.strokeStyle='#173f36';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,14,0,2*Math.PI);ctx.fill();ctx.stroke();ctx.fillStyle=item.type==='note'?'#fff':'#173f36';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText(item.type==='note'?'!':String(item.signalCode||'S').slice(0,4),0,4);}
  ctx.restore();
 }
 ctx.fillStyle='rgba(255,255,255,.88)';ctx.fillRect(8,out.height-27,270,22);ctx.fillStyle='#1d392f';ctx.font='12px sans-serif';ctx.fillText('RutasAD · © geoEuskadi / Mapbox',14,out.height-12);
 return new Promise((resolve,reject)=>out.toBlob(blob=>blob?resolve(blob):reject(Error('No se pudo generar la imagen.')),'image/png'));
}
export async function pdfOfBoard(pngBlob){
 if(!globalThis.PDFLib){await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/ficha/pdf-lib.min.js';script.onload=resolve;script.onerror=()=>reject(Error('No se pudo cargar el generador PDF.'));document.head.append(script);});}
 const pdf=await globalThis.PDFLib.PDFDocument.create(),bytes=await pngBlob.arrayBuffer(),picture=await pdf.embedPng(bytes),page=pdf.addPage([picture.width,picture.height]);page.drawImage(picture,{x:0,y:0,width:picture.width,height:picture.height});return new Blob([await pdf.save()],{type:'application/pdf'});
}
