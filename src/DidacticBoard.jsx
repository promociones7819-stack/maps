// SPDX-FileCopyrightText: 2026 Aitor Delgado Martínez · AD Mobility
// SPDX-License-Identifier: LicenseRef-RutasAD-Educational-NonCommercial-1.0
import React,{useEffect,useReducer,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import './didactic-board.css';
import {VEHICLE_KINDS,vehicleSvg,vehicleAt,geoFeatures,lineFeatures,loadBoardLibrary,saveBoardLibrary,deleteBoardLibrary,validateBoardImport,downloadBlob,boardFilename,imageOfBoard,pdfOfBoard} from './boardAdvanced.js';

const empty=()=>({items:[],past:[]});
function historyReducer(state,action){
 if(action.type==='undo')return state.past.length?{items:state.past.at(-1),past:state.past.slice(0,-1)}:state;
 const next=typeof action.items==='function'?action.items(state.items):action.items;
 return next===state.items?state:{items:next,past:[...state.past,state.items].slice(-80)};
}
const coordinates=point=>[point.lng,point.lat];
const colorOptions=['#f3b73e','#57b9f4','#ed7373','#4abf89','#222222'];
const tools=[['pointer','Erakuslea','Puntero','◉'],['move','Mapa mugitu','Mover mapa','✥'],['route','Ibilbidea','Trayectoria','⌁'],['arrow','Gezia','Flecha','↗'],['signal','Seinalea','Señal','⚑'],['note','Puntu kritikoa','Punto conflictivo','!'],['edit','Mugitu / editatu','Mover / editar','✎'],['erase','Ezabatu','Borrar','⌫'],['vehicle','Ibilgailua','Vehículo','▣'],['path','Ibilgailuaren ibilbidea','Ruta de vehículo','➜'],['ink','Errotuladorea','Rotulador','✎'],['line','Lerroa','Línea','━'],['dashed','Lerro etena','Línea discontinua','┄'],['circle','Zirkulua','Círculo','◯'],['rectangle','Laukizuzena','Rectángulo','▭'],['area','Eremua','Área','▱'],['sight','Ikus-eremua','Visibilidad','◁'],['text','Testua','Texto','T']];
const groups=[['draw','Marraztu','Dibujar'],['vehicles','Ibilgailuak','Vehículos'],['signals','Seinaleak','Señales'],['explain','Azaldu','Explicar'],['present','Aurkeztu','Presentar']];
const groupTools={draw:['pointer','move','route','arrow','ink','line','dashed','circle','rectangle','area','sight','text','edit','erase'],vehicles:['pointer','move','vehicle','path','edit','erase'],signals:['pointer','move','signal','edit','erase'],explain:['pointer','move','note','text','sight','edit','erase'],present:['pointer','move']};

// This board owns its map and its in-memory history. It never calls project,
// storage, backup, microphone or recorder APIs.
export default function DidacticBoard({createMap,Marker,catalog,signalDefinition,signalHtml,SignalFace,arrows,defaultDraft,language,onClose}){
 const t=(eu,es)=>language==='eu'?eu:es;
 const container=useRef(null),mapRef=useRef(null),ringRef=useRef(null),panelRef=useRef(null),stateRef=useRef(null),draggingRef=useRef(false);
 const [state,dispatch]=useReducer(historyReducer,undefined,empty),[tool,setTool]=useState('pointer'),[ready,setReady]=useState(false),[error,setError]=useState('');
 const [draftPath,setDraftPath]=useState(null),[selected,setSelected]=useState(null),[editor,setEditor]=useState(null),[signal,setSignal]=useState({...defaultDraft,signalCode:'R-2',title:''});
 const [color,setColor]=useState(colorOptions[0]),[locating,setLocating]=useState(false),[view,setView]=useState({lat:'',lng:''});
 const [group,setGroup]=useState('draw'),[drawing,setDrawing]=useState(null),[vehicleKind,setVehicleKind]=useState('car'),[vehicleLabel,setVehicleLabel]=useState('A'),[vehicleColor,setVehicleColor]=useState('#57b9f4');
 const [playing,setPlaying]=useState(false),[playProgress,setPlayProgress]=useState(0),[playDuration,setPlayDuration]=useState(8),[scenes,setScenes]=useState([]),[sceneIndex,setSceneIndex]=useState(-1),[presenting,setPresenting]=useState(false),[revealed,setRevealed]=useState(false);
 const [question,setQuestion]=useState(''),[answer,setAnswer]=useState(''),[boardName,setBoardName]=useState(''),[libraryOpen,setLibraryOpen]=useState(false),[library,setLibrary]=useState(()=>loadBoardLibrary()),[message,setMessage]=useState('');
 const markersRef=useRef([]),arrowTipsRef=useRef([]),vehicleMarkersRef=useRef(new Map()),drawingRef=useRef(null),presentationSnapshot=useRef(null),animationRef=useRef(null);
 useEffect(()=>{const bar=panelRef.current.querySelector('.board-tools');const measure=()=>panelRef.current?.style.setProperty('--board-tools-bottom',`${bar.offsetTop+bar.offsetHeight+12}px`);const resize=new ResizeObserver(measure);resize.observe(bar);measure();return()=>resize.disconnect();},[]);
 stateRef.current={items:state.items,tool,draftPath,selected,signal,color,editor,vehicleKind,vehicleLabel,vehicleColor,presenting};
 const commit=items=>dispatch({type:'set',items});
 const selectTool=next=>{setTool(next);setDraftPath(null);drawingRef.current=null;setDrawing(null);setLocating(false);if(ringRef.current)ringRef.current.hidden=true;};
 const remove=id=>{commit(items=>items.filter(i=>i.id!==id));setSelected(null);setDraftPath(null);};
 const close=()=>{if(stateRef.current.items.length&&!confirm(t('Pizarra itxi eta behin-behineko elementuak baztertu?','¿Salir de la pizarra y descartar los elementos temporales?')))return;onClose();};
 const closeRef=useRef(close);closeRef.current=close;

 useEffect(()=>{
  const root=document.getElementById('root'),previous=document.activeElement,wasInert=root?.inert;
  if(root)root.inert=true;
  const key=event=>{
   if(event.key==='Escape'){event.preventDefault();if(stateRef.current.editor)setEditor(null);else closeRef.current();}
   if(event.key==='Tab'){
    const nodes=[...panelRef.current.querySelectorAll('button:not(:disabled),input,select,textarea')].filter(e=>e.getClientRects().length);
    const first=nodes[0],last=nodes.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
   }
  };
  const hide=()=>{if(ringRef.current)ringRef.current.hidden=true;};
  window.addEventListener('blur',hide);document.addEventListener('visibilitychange',hide);
  document.addEventListener('keydown',key);
  panelRef.current.querySelector('button')?.focus();
  return()=>{window.removeEventListener('blur',hide);document.removeEventListener('visibilitychange',hide);document.removeEventListener('keydown',key);if(root)root.inert=wasInert;previous?.focus();};
 },[]);

 useEffect(()=>{
  let map;
  try{map=createMap(container.current);mapRef.current=map;}catch(e){setError(e.message);return;}
  const load=()=>{
   map.addSource('board-lines',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
   map.addSource('board-polygons',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
   map.addLayer({id:'board-fill',type:'fill',source:'board-polygons',paint:{'fill-color':['get','color'],'fill-opacity':.24}});
   map.addLayer({id:'board-polygon-border',type:'line',source:'board-polygons',paint:{'line-color':['get','color'],'line-width':3}});
   map.addLayer({id:'board-outline',type:'line',source:'board-lines',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#163b30','line-width':10}});
   map.addLayer({id:'board-lines',type:'line',source:'board-lines',filter:['!=',['get','dashed'],true],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['get','color'],'line-width':['get','width']}});
   map.addLayer({id:'board-dashed',type:'line',source:'board-lines',filter:['==',['get','dashed'],true],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['get','color'],'line-width':['get','width'],'line-dasharray':[1.5,2]}});
   setReady(true);
  };
  map.on('load',load);
  const click=event=>{
   if(draggingRef.current||stateRef.current.presenting||!map.getLayer('board-lines'))return;
   const s=stateRef.current,point=coordinates(event.lngLat);if(s.editor)return;
   if(['move','pointer','ink','line','dashed','circle','rectangle','area','sight'].includes(s.tool))return;
   const hit=map.queryRenderedFeatures(event.point,{layers:['board-lines','board-dashed','board-fill','board-polygon-border']})[0];
   if(s.tool==='erase'){if(hit)remove(hit.properties.id);return;}
   if(s.tool==='edit'){if(hit)setSelected(hit.properties.id);return;}
   if(s.tool==='path'){
    const vehicle=s.items.find(i=>i.id===s.selected&&i.type==='vehicle');if(!vehicle){setMessage(t('Hautatu ibilgailu bat lehenik.','Selecciona primero un vehículo.'));return;}
    commit(items=>items.map(i=>i.id===vehicle.id?{...i,path:[...(s.draftPath===vehicle.id?i.path||[]:[]),point]}:i));setDraftPath(vehicle.id);
   }else if(s.tool==='vehicle'){
    const id=crypto.randomUUID();commit(items=>[...items,{id,type:'vehicle',kind:s.vehicleKind,label:s.vehicleLabel,color:s.vehicleColor,coordinates:point,heading:0,path:[]}]);setSelected(id);
   }else if(s.tool==='text'){
    setEditor({id:crypto.randomUUID(),type:'text',coordinates:point,title:'',description:''});
   }else if(s.tool==='route'||s.tool==='arrow'){
    const active=s.items.find(i=>i.id===s.draftPath);
    if(active){commit(items=>items.map(i=>i.id===active.id?{...i,points:[...i.points,point]}:i));if(s.tool==='arrow'){setDraftPath(null);}}
    else {const id=crypto.randomUUID();commit(items=>[...items,{id,type:s.tool,points:[point],color:s.color}]);setDraftPath(id);setSelected(id);}
   }else if(s.tool==='signal'){
    const id=crypto.randomUUID();commit(items=>[...items,{...structuredClone(s.signal),id,type:'signal',coordinates:point,phase:'red'}]);setSelected(id);
   }else if(s.tool==='note'){
    setEditor({id:crypto.randomUUID(),type:'note',coordinates:point,title:'',description:''});
   }
  };
  map.on('click',click);
  map.on('move',()=>{for(const tip of arrowTipsRef.current){const a=map.project(tip.previous),b=map.project(tip.last);tip.element.style.transform=`rotate(${Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI}deg)`;}});
  map.on('error',event=>{if(event.error?.message)setError(event.error.message);});
  const resize=new ResizeObserver(()=>map.resize());resize.observe(container.current);
  return()=>{resize.disconnect();markersRef.current.forEach(m=>m.remove());markersRef.current=[];mapRef.current=null;map.remove();};
 },[]);

 useEffect(()=>{
  const map=mapRef.current;if(!map)return;
  for(const name of ['dragPan','scrollZoom','boxZoom','dragRotate','keyboard','doubleClickZoom','touchZoomRotate','touchPitch']){
   if(tool==='move'&&!editor)map[name]?.enable();else map[name]?.disable();
  }
  map.getCanvas().style.cursor=tool==='move'?'grab':tool==='pointer'?'default':'crosshair';
 },[ready,tool,editor]);

 useEffect(()=>{
  const map=mapRef.current;if(!ready||!map)return;
  map.getSource('board-lines').setData({type:'FeatureCollection',features:state.items.filter(i=>i.points?.length>1).map(i=>({type:'Feature',properties:{id:i.id,color:i.color},geometry:{type:'LineString',coordinates:i.points}}))});
  markersRef.current.forEach(m=>m.remove());markersRef.current=[];arrowTipsRef.current=[];
  const add=(element,point,draggable,onDragEnd)=>{
   const marker=new Marker({element,draggable,anchor:'center'}).setLngLat(point).addTo(map);
   marker.on('dragstart',()=>{draggingRef.current=true;});
   marker.on('dragend',()=>{onDragEnd?.(coordinates(marker.getLngLat()));setTimeout(()=>{draggingRef.current=false;},0);});
   markersRef.current.push(marker);return marker;
  };
  for(const item of state.items){
   if(item.points){
    if(item.id===selected&&(tool==='edit'||item.id===draftPath))item.points.forEach((p,index)=>{
     const element=document.createElement('button');element.type='button';element.className='board-vertex';element.textContent=String(index+1);element.setAttribute('aria-label',t(`Ibilbideko ${index+1}. puntua`,`Punto ${index+1} de la pizarra`));
     element.onclick=e=>{e.stopPropagation();if(draggingRef.current)return;if(tool==='edit')setEditor({type:'vertex',pathId:item.id,index});};
     add(element,p,tool==='edit',next=>commit(items=>items.map(i=>i.id===item.id?{...i,points:i.points.map((p,n)=>n===index?next:p)}:i)));
    });
    if(item.type==='arrow'&&item.points.length>1){
     const last=item.points.at(-1),a=map.project(item.points.at(-2)),b=map.project(last),angle=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
     const element=document.createElement('div');element.className='board-arrow-tip';const tip=document.createElement('span');tip.style.transform=`rotate(${angle}deg)`;tip.style.borderLeftColor=item.color;element.append(tip);arrowTipsRef.current.push({element:tip,previous:item.points.at(-2),last});element.setAttribute('aria-hidden','true');add(element,last,false);
    }
    continue;
   }
   const element=document.createElement('button');element.type='button';element.className=`board-map-item board-${item.type}`;element.dataset.itemId=item.id;
   element.setAttribute('aria-label',item.type==='signal'?`${item.signalCode} · ${signalDefinition(item.signalCode).name}`:item.title||t('Puntu kritikoa','Punto conflictivo'));
   if(item.type==='signal'){element.innerHTML=`<div class="signal-face-wrap">${signalHtml(item)}</div>`;element.dataset.phase=item.phase||'red';}
   else {element.textContent='!';}
   element.onclick=e=>{
    e.stopPropagation();if(draggingRef.current)return;
    if(tool==='erase')remove(item.id);
    else if(tool==='edit')setEditor(structuredClone(item));
    else if(item.signalCode==='SEMÁFORO')commit(items=>items.map(i=>i.id===item.id?{...i,phase:{red:'amber',amber:'green',green:'red'}[i.phase||'red']}:i));
    else setSelected(item.id);
   };
   add(element,item.coordinates,tool==='edit',point=>commit(items=>items.map(i=>i.id===item.id?{...i,coordinates:point}:i)));
  }
 },[ready,state.items,tool,selected,draftPath]);

 const hints={pointer:t('Seinalatu mapan. Sakatu semaforoa kolorea aldatzeko.','Señala sobre el mapa. Toca un semáforo para cambiar su color.'),move:t('Kokatu mapa azaldu nahi duzun lekuan.','Desplaza y acerca el mapa al lugar que quieras explicar.'),route:t('Sakatu puntuak gehitzeko; bukatutakoan amaitu trazua.','Pulsa para añadir puntos; termina el trazo cuando esté listo.'),arrow:t('Sakatu geziaren hasiera eta amaiera.','Pulsa el inicio y el final de la flecha.'),signal:t('Sakatu mapan hautatutako seinalea jartzeko.','Pulsa en el mapa para colocar la señal elegida.'),note:t('Sakatu puntu kritikoa kokatzeko.','Pulsa para situar el punto conflictivo.'),edit:t('Arrastatu elementuak; sakatu seinalea editatzeko edo trazua puntuak mugitzeko.','Arrastra elementos. Pulsa señales o trazos para editarlos.'),erase:t('Sakatu elementua edo trazua ezabatzeko.','Pulsa un elemento o un trazo para borrarlo.')};
 const selectedItem=state.items.find(i=>i.id===selected);
 const pointerMove=event=>{
  const ring=ringRef.current;if(!ring)return;
  if(tool!=='pointer'||editor||event.target.closest('.board-ui,.maplibregl-control-container,.mapboxgl-control-container')){ring.hidden=true;return;}
  const rect=container.current.getBoundingClientRect();ring.hidden=false;ring.style.left=(event.clientX-rect.left)+'px';ring.style.top=(event.clientY-rect.top)+'px';
 };
 const editField=(key,value)=>setEditor(previous=>({...previous,[key]:value}));
 const signalFields=(value,update)=><>
  <label>{t('Seinalearen katalogoa','Señal del catálogo')}<select aria-label={t('Seinalearen katalogoa','Señal del catálogo')} value={value.signalCode} onChange={e=>{const code=e.target.value;update({...value,signalCode:code,title:signalDefinition(code).name});}}>{catalog.map(s=><option key={s.code} value={s.code}>{s.code} · {s.name}</option>)}</select></label>
  <SignalFace marker={value}/>
  {signalDefinition(value.signalCode).kind==='speed'&&<label>{t('Gehieneko abiadura','Velocidad máxima')}<input type="number" min="10" max="120" step="10" required value={value.speed||''} onChange={e=>update({...value,speed:e.target.value})} placeholder="km/h"/></label>}
  {signalDefinition(value.signalCode).kind==='direction'&&<>
   {value.signalCode==='S-220a'&&<label>{t('Distantzia','Distancia')}<input value={value.distance||''} maxLength={20} onChange={e=>update({...value,distance:e.target.value})}/></label>}
   {(value.destinations||[]).map((d,n)=><div className="board-destination" key={n}><label>{t('Helmuga','Destino')} {n+1}<input value={d.text} maxLength={32} onChange={e=>update({...value,destinations:value.destinations.map((x,j)=>j===n?{...x,text:e.target.value}:x)})}/></label><label>{t('Norabidea','Dirección')}<select value={d.arrow} onChange={e=>update({...value,destinations:value.destinations.map((x,j)=>j===n?{...x,arrow:e.target.value}:x)})}>{arrows.map(a=><option key={a.value} value={a.value}>{a.icon} {a.label}</option>)}</select></label><button type="button" aria-label={t('Helmuga kendu','Quitar destino')+` ${n+1}`} disabled={value.destinations.length<=1} onClick={()=>update({...value,destinations:value.destinations.filter((_,j)=>j!==n)})}>×</button></div>)}
   <button type="button" disabled={value.destinations.length>=6} onClick={()=>update({...value,destinations:[...(value.destinations||[]),{text:'',arrow:'right'}]})}>{t('Helmuga gehitu','Añadir destino')}</button>
  </>}
 </>;
 return createPortal(<section ref={panelRef} className="didactic-board" role="dialog" aria-modal="true" aria-label={t('Arbel didaktikoa','Pizarra didáctica')}>
  <header className="board-header"><div><strong>RutasAD <span>/ {t('Arbel didaktikoa','Pizarra didáctica')}</span></strong><small>{t('Behin-behinekoa · grabaziorik gabe · proiektutik bereizita','Temporal · sin grabación · independiente del proyecto')}</small></div><button onClick={close}>{t('Pizarratik irten','Salir de pizarra')}</button></header>
  <div className="board-stage" onPointerMove={pointerMove} onPointerLeave={()=>{if(ringRef.current)ringRef.current.hidden=true;}}>
   <div className="board-map" ref={container}/>
   <div className="board-pointer" ref={ringRef} hidden/>
   <nav className="board-tools board-ui" aria-label={t('Arbelaren tresnak','Herramientas de pizarra')}>
    {tools.map(([id,eu,es,icon])=><button key={id} aria-pressed={tool===id} onClick={()=>{if(id==='signal')setEditor({...structuredClone(signal),type:'signal-template'});selectTool(id);}}><b aria-hidden="true">{icon}</b>{t(eu,es)}</button>)}
    <button onClick={()=>{setSignal(s=>({...s,signalCode:'SEMÁFORO',title:t('Semaforoa','Semáforo')}));selectTool('signal');}}>{t('Semaforoa','Semáforo')}</button>
    <button aria-expanded={locating} onClick={()=>{const p=mapRef.current?.getCenter();if(!p)return;setView({lat:p.lat.toFixed(6),lng:p.lng.toFixed(6)});setLocating(!locating);}}>{t('Koordenatuak','Coordenadas')}</button>
   </nav>
   {locating&&<form className="board-location board-ui" onSubmit={e=>{e.preventDefault();const lat=Number(view.lat),lng=Number(view.lng);if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>85||Math.abs(lng)>180)return;mapRef.current?.jumpTo({center:[lng,lat],zoom:Math.max(17,mapRef.current.getZoom())});setLocating(false);}}><label>{t('Latitudea','Latitud')}<input required type="number" min="-85" max="85" step="any" value={view.lat} onChange={e=>setView(v=>({...v,lat:e.target.value}))}/></label><label>{t('Longitudea','Longitud')}<input required type="number" min="-180" max="180" step="any" value={view.lng} onChange={e=>setView(v=>({...v,lng:e.target.value}))}/></label><button>{t('Joan','Ir')}</button></form>}
   {selectedItem?.type==='note'&&!editor&&<aside className="board-note-card board-ui"><small>{t('Puntu kritikoa','Punto conflictivo')}</small><strong>{selectedItem.title}</strong>{selectedItem.description&&<p>{selectedItem.description}</p>}<button onClick={()=>setSelected(null)}>{t('Ezkutatu','Ocultar')}</button></aside>}
   {editor&&<form className="board-editor board-ui" aria-label={t('Arbeleko elementua editatu','Editar elemento de pizarra')} onSubmit={e=>{
    e.preventDefault();
    if(editor.type==='signal-template'){const {type,...template}=editor;setSignal(template);setEditor(null);setTool('signal');return;}
    if(editor.type==='vertex')return;
    const item={...editor,title:editor.title?.trim()||t('Puntu kritikoa','Punto conflictivo')};commit(items=>items.some(i=>i.id===item.id)?items.map(i=>i.id===item.id?item:i):[...items,item]);setSelected(item.id);setEditor(null);
   }}><div className="board-editor-heading"><strong>{editor.type==='vertex'?t('Ibilbideko puntua','Punto de trayectoria'):editor.type==='note'?t('Puntu kritikoa','Punto conflictivo'):t('Seinalea','Señal')}</strong><button type="button" aria-label={t('Editorea itxi','Cerrar editor')} onClick={()=>setEditor(null)}>×</button></div>
    {editor.type==='vertex'?<><p>{t('Arrastatu puntua mapan birkokatzeko.','Arrastra el punto sobre el mapa para recolocarlo.')}</p><button type="button" onClick={()=>{commit(items=>items.flatMap(i=>i.id!==editor.pathId?[i]:i.points.length>1?[{...i,points:i.points.filter((_,n)=>n!==editor.index)}]:[]));setEditor(null);}}>{t('Puntu hau ezabatu','Eliminar este punto')}</button></>:<>
     {editor.type!=='note'&&signalFields(editor,setEditor)}
     <label>{t('Izenburua','Título')}<input required={editor.type==='note'} maxLength={80} value={editor.title||''} onChange={e=>editField('title',e.target.value)}/></label>
     <label>{t('Azalpena','Explicación')}<textarea rows="3" maxLength={500} value={editor.description||''} onChange={e=>editField('description',e.target.value)}/></label>
     <button type="submit">{editor.type==='signal-template'?t('Mapan kokatu','Colocar en el mapa'):t('Arbelera gehitu','Aplicar en pizarra')}</button>
    </>}
    <button type="button" onClick={()=>setEditor(null)}>{t('Utzi','Cancelar')}</button>
   </form>}
   {error&&<div className="board-error board-ui" role="alert">{t('Maparen karga-arazoa','Problema al cargar el mapa')}: {error}<button onClick={()=>setError('')}>{t('Itxi','Cerrar')}</button></div>}
  </div>
  <footer className="board-footer board-ui"><span role="status">{ready?hints[tool]:t('Mapa kargatzen…','Cargando mapa…')}</span><div className="board-actions">
   <div className="board-path-actions" style={{visibility:(tool==='route'||tool==='arrow')?'visible':'hidden'}} aria-hidden={tool!=='route'&&tool!=='arrow'}><label>{t('Trazuaren kolorea','Color del trazo')}<select disabled={tool!=='route'&&tool!=='arrow'} value={color} onChange={e=>setColor(e.target.value)}>{colorOptions.map((c,n)=><option key={c} value={c}>{[t('Horia','Amarillo'),t('Urdina','Azul'),t('Gorria','Rojo')][n]}</option>)}</select></label><button disabled={!draftPath||(tool!=='route'&&tool!=='arrow')} onClick={()=>setDraftPath(null)}>{t('Trazua amaitu','Terminar trazo')}</button></div>
   <small className="board-count">{state.items.length} {t('elementu','elementos')}</small>
   <button disabled={!state.past.length} onClick={()=>{dispatch({type:'undo'});setDraftPath(null);setSelected(null);setEditor(null);}}>{t('Desegin','Deshacer')}</button>
   <button disabled={!state.items.length} onClick={()=>{if(confirm(t('Behin-behineko pizarra garbitu?','¿Limpiar todos los elementos temporales de la pizarra?'))){commit([]);setDraftPath(null);setSelected(null);setEditor(null);}}}>{t('Pizarra garbitu','Limpiar pizarra')}</button>
  </div></footer>
 </section>,document.body);
}
