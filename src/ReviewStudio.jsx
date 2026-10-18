import ClipEditor from './ClipEditor.jsx';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {pointAt,speedAt,timeline} from './reviewTime.js';
import {loadVideo,saveVideo} from './lessonStore.js';
import {workspaceMedia,openMovieSink} from './workspace.js';
import {createFinalMovie,movieIncidents,prepareMovieAudio,releaseMovieVideo,videoDecodeError} from './finalMovie.js';

export default function ReviewStudio({review,onReview,progress,onProgress,playing,onPlaying,speed,language,live,getComposition,onMovieFrame,onMapResize,onEditIncident,clipRequest,onBoard}){
 const [clipOpen,setClipOpen]=useState(false),[previewRange,setPreviewRange]=useState(null);
 useEffect(()=>{if(clipRequest){onPlaying(false);setClipOpen(true);}},[clipRequest]);
 useEffect(()=>{setClipOpen(false);setPreviewRange(null);},[review.libraryId,review.sessionId]);
 const t=(eu,es)=>language==='eu'?eu:es;
 const clock=useMemo(()=>timeline(review.points),[review.points]);
 const position=pointAt(review.points,live?1:progress,clock),point=position.point;
 const velocity=position.gap?{value:null,estimated:false}:speedAt(review.points,position.index);
 const videoRef=useRef(null),raf=useRef(0),state=useRef(null),urlRef=useRef(null),selectedFile=useRef(null),drag=useRef(null);
 const [videoUrl,setVideoUrl]=useState(''),[duration,setDuration]=useState(0),[message,setMessage]=useState(''),[calibrating,setCalibrating]=useState(false),[layout,setLayout]=useState(()=>{try{return localStorage.getItem('rutasad-pip-layout')==='split'?'split':'large';}catch{return 'large';}}),[corner,setCorner]=useState({x:12,y:58});
 state.current={progress,onProgress,onPlaying,speed,clock,live,previewRange};
 useEffect(()=>{
  let cancelled=false;setDuration(0);setMessage('');setVideoUrl('');setCalibrating(false);
  if(urlRef.current){URL.revokeObjectURL(urlRef.current);urlRef.current=null;}
  if(review.media?.id)(review.media.workspace?workspaceMedia(review.media):selectedFile.current?.id===review.media.id?Promise.resolve(selectedFile.current.file):loadVideo(review.media.id)).then(file=>{if(cancelled)return;if(!file){setMessage(t('Bideoa berriz hautatu behar da.','Debes volver a seleccionar el vídeo.'));return;}const url=file.url||URL.createObjectURL(file.file||file);if(!file.url)urlRef.current=url;setVideoUrl(url);}).catch(error=>{if(!cancelled)setMessage(error.message||t('Ezin izan da bideoa ireki.','No se pudo abrir el vídeo.'));});
  return()=>{cancelled=true;};
 },[review.media?.id]);
 useEffect(()=>()=>{if(urlRef.current)URL.revokeObjectURL(urlRef.current);},[]);
 useEffect(()=>{
  if(!playing||live)return;
  let previous=0;
  const tick=now=>{const s=state.current;if(!previous)previous=now;const dt=Math.min((now-previous)/1000,.25);previous=now;const next=Math.min(s.previewRange?.end??1,s.progress+dt*s.speed/s.clock.duration);s.onProgress(next);if(next>=(s.previewRange?.end??1))s.onPlaying(false);else raf.current=requestAnimationFrame(tick);};
  raf.current=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf.current);
 },[playing,live,review.sessionId,clock.duration]);
 const [finalView,setFinalView]=useState(false),[exporting,setExporting]=useState(false),[exportProgress,setExportProgress]=useState(0),[result,setResult]=useState('');
 useEffect(()=>{if(['large','split'].includes(review.media?.layout))setLayout(review.media.layout);},[review.media?.id,review.media?.layout]);
 const changeLayout=value=>{setLayout(value);try{localStorage.setItem('rutasad-pip-layout',value);}catch{}if(review.media)onReview({...review,media:{...review.media,layout:value}});};
 const exportAbort=useRef(null),resultRef=useRef('');
 useEffect(()=>()=>{exportAbort.current?.abort();if(resultRef.current)URL.revokeObjectURL(resultRef.current);},[]);
 useEffect(()=>{if(resultRef.current)URL.revokeObjectURL(resultRef.current);resultRef.current='';setResult('');},[review.media?.id,review.media?.videoStartUtc,review.incidents,layout]);
 useEffect(()=>{const panel=videoRef.current?.closest(".map-panel");if(!panel)return;panel.classList.toggle("movie-preview",finalView);requestAnimationFrame(()=>onMapResize?.());return()=>{panel.classList.remove("movie-preview");requestAnimationFrame(()=>onMapResize?.());};},[finalView]);
 useEffect(()=>{const panel=videoRef.current?.closest('.map-panel')||document.querySelector('.map-panel');if(!panel)return;panel.classList.toggle('pip-split',layout==='split'&&!live&&review.points.length>0);const id=requestAnimationFrame(()=>onMapResize?.());return()=>{cancelAnimationFrame(id);panel.classList.remove('pip-split');requestAnimationFrame(()=>onMapResize?.());};},[layout,videoUrl,live,review.points.length>0]);
 const incidents=movieIncidents(review,clock);

 const exportMovie=async()=>{onPlaying(false);setExporting(true);setExportProgress(0);setMessage('');if(resultRef.current)URL.revokeObjectURL(resultRef.current);setResult('');const controller=new AbortController();exportAbort.current=controller;let exportAudio,sink;try{if(review.media?.workspace&&window.trazaDesktop)await workspaceMedia(review.media);const sinkPromise=openMovieSink();exportAudio=prepareMovieAudio(videoRef.current);await exportAudio.resume();sink=await sinkPromise;if(!sink&&duration>300)throw Error("Para clases largas usa Chrome en Mac o RutasAD y guarda directamente en disco.");if(review.media?.workspace)await workspaceMedia(review.media);const composition=await getComposition?.();if(!composition)throw Error("El mapa no está disponible para grabar.");if(!clock.timed)throw Error("El GPX necesita horas para sincronizar el vídeo.");const origin=review.media?.videoStartUtc??clock.start;const blob=await createFinalMovie({videoElement:videoRef.current,url:videoUrl,incidents,composition,audioContext:exportAudio,sink,startSecond:Math.max(0,(clock.start-origin)/1000),endSecond:(clock.end-origin)/1000,onProgress:(f,second)=>{setExportProgress(f);const fraction=Math.max(0,Math.min(1,(origin+second*1000-clock.start)/(clock.end-clock.start)));onProgress(fraction);onMovieFrame?.(fraction);},signal:controller.signal});if(blob.saved){setMessage(t("MP4 diskoan gordeta: ","MP4 guardado en disco: ")+blob.name);}else{const url=URL.createObjectURL(blob);resultRef.current=url;setResult(url);}}catch(e){await sink?.abort().catch(()=>{});setMessage(e.name==="AbortError"?t("Esportazioa bertan behera.","Exportación cancelada."):e.message);}finally{setExporting(false);exportAbort.current=null;}};
 const targetTime=clock.timed&&position.time!=null?(position.time-(review.media?.videoStartUtc??clock.start))/1000:null;
 const outside=targetTime==null||targetTime<0||targetTime>duration;
 useEffect(()=>{
  const video=videoRef.current;if(!video||!videoUrl||calibrating||exporting)return;
  if(!clock.timed||outside){video.pause();return;}
  video.playbackRate=Math.max(.1,Math.min(4,speed));
  if(Number.isFinite(targetTime)&&(!playing||Math.abs(video.currentTime-targetTime)>.35))video.currentTime=Math.min(duration,Math.max(0,targetTime));
  if(playing){video.play().catch(()=>{onPlaying(false);setMessage(t('Sakatu erreproduzitu bideoa aktibatzeko.','Pulsa reproducir para activar el vídeo.'));});}else video.pause();
 },[videoUrl,targetTime,playing,speed,calibrating,outside,duration,clock.timed,exporting]);
 useEffect(()=>{const video=videoRef.current;return()=>{if(video)releaseMovieVideo(video).catch(()=>{});};},[videoUrl]);
 const importVideo=async e=>{
  const file=e.target.files?.[0];if(!file)return;onPlaying(false);
  try{const id=crypto.randomUUID();let stored=false;selectedFile.current={id,file};if(file.size<=256*1024*1024){try{await saveVideo(id,file);stored=true;}catch{stored=false;}}onReview({...review,media:{id,name:file.name,stored,size:file.size,layout,videoStartUtc:review.media?.name===file.name&&review.media?.size===file.size?review.media.videoStartUtc:clock.start}});setMessage(t('Aukeratu une bera bideoan eta ibilbidean, eta sinkronizatu.','Elige el mismo instante en vídeo y recorrido y pulsa sincronizar.'));}
  catch(error){setMessage(t('Ezin izan da bideoa gorde: ','No se pudo guardar el vídeo: ')+error.message);}
  finally{e.target.value='';}
 };
 const align=()=>{if(!clock.timed||!videoRef.current)return;onReview({...review,media:{...review.media,videoStartUtc:position.time-videoRef.current.currentTime*1000}});setCalibrating(false);setMessage(t('Sinkronizazioa gordeta. Gorde saioa historia eguneratzeko.','Sincronización guardada. Guarda la sesión para actualizar el historial.'));};
 const mark=()=>{if(!point||live||position.gap)return;onPlaying(false);const incident={id:crypto.randomUUID(),coordinates:[...point.coordinates],pointIndex:position.index,time:position.time??point.time,fraction:progress,videoTime:targetTime!=null&&!outside?targetTime:null,title:t('Gorabehera','Incidencia'),note:''};onReview({...review,incidents:[...review.incidents,incident]});onEditIncident?.(incident);};
 const format=(n,d=1)=>Number.isFinite(n)?n.toFixed(d):'—';
 const zero=review.calibration;
 const force=axis=>point?.gForce&&!position.gap?point.gForce[axis]-(zero?.[axis]||0):null;
 const startDrag=e=>{if(layout==='split'||exporting||!e.target.closest('header')||e.target.closest('button,input,video'))return;drag.current={x:e.clientX,y:e.clientY,corner};e.currentTarget.setPointerCapture(e.pointerId);};
 const moveDrag=e=>{if(!drag.current)return;const box=e.currentTarget,parent=box.parentElement;setCorner({x:Math.max(0,Math.min(parent.clientWidth-box.clientWidth,drag.current.corner.x+e.clientX-drag.current.x)),y:Math.max(0,Math.min(parent.clientHeight-box.clientHeight,drag.current.corner.y+e.clientY-drag.current.y))});};
 return <>
  {clipOpen&&<ClipEditor review={review} progress={progress} onProgress={onProgress} playing={playing} onPlaying={onPlaying} onRange={setPreviewRange} onClose={()=>{onPlaying(false);setPreviewRange(null);setClipOpen(false);}} onBoard={seed=>{setClipOpen(false);onBoard(seed);}} videoUrl={videoUrl} language={language}/>}
  {!live&&review.points.length>0&&<div className="pip-layout-selector" role="group" aria-label={t('Bideoaren tamaina','Tamaño del vídeo')}><button disabled={exporting} aria-pressed={layout==='large'} onClick={()=>changeLayout('large')}>{t('Handia','Grande')}</button><button disabled={exporting} aria-pressed={layout==='split'} onClick={()=>changeLayout('split')}>{t('Pantaila erdia','Media pantalla')}</button></div>}
  {finalView&&<div className="movie-toolbar"><button disabled={exporting} onClick={()=>setFinalView(false)}>{t("Itzuli","Volver")}</button><button disabled={exporting} onClick={()=>{if(progress>=1)onProgress(0);onPlaying(!playing);}}>{playing?'Ⅱ':'▶'}</button><button disabled={exporting||position.gap} onClick={mark}>＋ {t("Puntu kritikoa","Punto crítico")}</button><button disabled={exporting} onClick={exportMovie}>{t("MP4 esportatu","Exportar MP4")}</button>{exporting&&<><span>{Math.round(exportProgress*100)}%</span><button onClick={()=>exportAbort.current?.abort()}>{t("Utzi","Cancelar")}</button></>}{result&&!exporting&&<a download="traza-mapa-pip.mp4" href={result}>{t("MP4 deskargatu","Descargar MP4")}</a>}{message&&<p role="status">{message}</p>}<small>{t("Mapa, ibilbidea, PIP bideoa eta puntu kritikoak. Mantendu pantaila piztuta.","Mapa, recorrido, vídeo PIP y puntos críticos. Mantén la pantalla encendida.")}</small></div>}
  {review.points.length>0&&<aside className="telemetry-hud" aria-label={t('Telemetria','Telemetría')}>
   <strong>{format(velocity.value)} <small>km/h{velocity.estimated?' ≈':''}</small></strong>
   <div><span>{t('Luzetarakoa','Longitudinal')} X</span><b>{format(force('x'),3)} g</b></div>
   <div><span>{t('Albokoa','Lateral')} Y</span><b>{format(force('y'),3)} g</b></div>
   <div><span>{t('Bertikala','Vertical')} Z</span><b>{format(force('z'),3)} g</b></div>
   <div><span>{t('Biraketa','Giro')} Z</span><b>{format(point?.rotation?.z,2)} °/s</b></div>
   <div><span>{t('Norabidea','Rumbo')}</span><b>{format(point?.heading,0)}°</b></div><div><span>{t('Bateria','Batería')}</span><b>{format(point?.battery,0)}%</b></div><div><span>GPS</span><b>±{format(point?.accuracy)} m</b></div>
   {position.gap&&<small>{t('GPS etenaldia','Hueco en el GPS')}</small>}<small>{point?.time!=null?new Date(position.time??point.time).toLocaleTimeString(language==='eu'?'eu-ES':'es-ES'):'—'} · {zero?t('Zeroa kenduta','Con cero restado'):t('Datu gordinak','Datos brutos')}</small>
   {point?.gForce&&!live&&<button onClick={()=>onReview({...review,calibration:zero?null:{...point.gForce}})}>{zero?t('Zeroa kendu','Quitar cero'):t('Zeroa ezarri geldirik','Fijar cero en reposo')}</button>}
  </aside>}
  {!live&&review.points.length>0&&<div className={`review-pip ${layout==='split'?'split':'large'}`} style={layout==='split'?undefined:{left:corner.x,top:corner.y,maxHeight:`calc(100% - ${corner.y+110}px)`}} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null}>
   <header><strong>Dashcam · {layout==='split'?t('Pantaila erdia','Media pantalla'):t('Mugitu','Mover')}</strong></header>
   {videoUrl?<><video ref={videoRef} src={videoUrl} preload="metadata" muted playsInline controls={calibrating} onLoadedMetadata={e=>setDuration(e.currentTarget.duration)} onError={e=>{onPlaying(false);setMessage(videoDecodeError(e.currentTarget).message);}}/>{outside&&!calibrating&&<p className="video-uncovered">{clock.timed?t('Une honetarako bideorik ez','Sin vídeo para este instante'):t('GPXak ez dauka ordutegi osoa','El GPX no tiene tiempos completos')}</p>}</>:<p>{t('Gehitu dashcam grabazioa','Añade la grabación de dashcam')}</p>}
   <label className="video-upload">{t('Bideoa hautatu','Seleccionar vídeo')}<input aria-label={t('Bideoa hautatu','Seleccionar vídeo')} type="file" accept="video/*,.mp4,.mov" onChange={importVideo}/></label>
   {videoUrl&&<><button className="final-movie-open" onClick={()=>{onPlaying(false);setFinalView(true);}}>{t('Mapa + PIP · MP4','Mapa + PIP · MP4')}</button><small>{review.media?.name}</small><div className="pip-actions"><button disabled={!clock.timed} onClick={()=>{onPlaying(false);setCalibrating(!calibrating);}}>{t('Sinkronizazioa doitu','Ajustar sincronización')}</button>{calibrating&&<button onClick={align}>{t('Une hau lotu','Vincular este instante')}</button>}<button onClick={()=>{onPlaying(false);onReview({...review,media:null});}}>{t('Kendu','Quitar')}</button></div>{calibrating&&<label>{t('Bideoaren segundoa','Segundo del vídeo')}<input aria-label={t('Bideoaren segundoa','Segundo del vídeo')} type="number" min="0" max={duration} step="0.1" defaultValue={videoRef.current?.currentTime||0} onChange={e=>{if(videoRef.current)videoRef.current.currentTime=Math.max(0,Math.min(duration,Number(e.target.value)));}}/></label>}</>}
   {!clock.timed&&<small>{t('Sinkronizatzeko, puntu guztiek ordu balioduna izan behar dute.','Para sincronizar, todos los puntos deben tener una hora válida.')}</small>}
   {review.media?.stored===false&&!review.media?.workspace&&<p>{t('Bideoa ez da lokalean gorde; berriro hautatu beharko duzu aplikazioa irekitzean.','El vídeo no se ha guardado localmente; tendrás que seleccionarlo de nuevo al abrir la app.')}</p>}{message&&<p role="status">{message}</p>}
  </div>}
  {!live&&review.points.length>0&&<div className="review-clock">
   <button className="map-cut-open" onClick={()=>{onPlaying(false);setClipOpen(true);}}>{t("✂ Moztu","✂ Recortar")}</button>
   <button onClick={()=>{if(progress>=1)onProgress(0);onPlaying(!playing);}} aria-label={t(playing?'Gelditu berrikuspena':'Erreproduzitu berrikuspena',playing?'Pausar revisión':'Reproducir revisión')}>{playing?'Ⅱ':'▶'}</button>
   <input aria-label={t('Berrikuspenaren posizioa','Posición de revisión')} type="range" min="0" max="10000" value={Math.round(progress*10000)} onChange={e=>{onPlaying(false);setCalibrating(false);onProgress(Number(e.target.value)/10000);}}/>
   <button disabled={position.gap} onClick={mark}>＋ {t('Puntu kritikoa','Punto crítico')}</button>
   <small>{clock.timed?`${Math.round(progress*clock.duration)} / ${Math.round(clock.duration)} s`:t('Denborarik gabeko puntuak','Puntos sin tiempo')}</small>
  </div>}
 </>;
}
