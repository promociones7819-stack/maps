import React,{useEffect,useMemo,useRef,useState} from 'react';
import {pointAt,speedAt,timeline} from './reviewTime.js';
import {loadVideo,saveVideo} from './lessonStore.js';
import {createFinalMovie,movieIncidents,visibleIncidents} from './finalMovie.js';

export default function ReviewStudio({review,onReview,progress,onProgress,playing,onPlaying,speed,language,live}){
 const t=(eu,es)=>language==='eu'?eu:es;
 const clock=useMemo(()=>timeline(review.points),[review.points]);
 const position=pointAt(review.points,live?1:progress,clock),point=position.point;
 const velocity=position.gap?{value:null,estimated:false}:speedAt(review.points,position.index);
 const videoRef=useRef(null),raf=useRef(0),state=useRef(null),urlRef=useRef(null),selectedFile=useRef(null),drag=useRef(null);
 const [videoUrl,setVideoUrl]=useState(''),[duration,setDuration]=useState(0),[message,setMessage]=useState(''),[calibrating,setCalibrating]=useState(false),[size,setSize]=useState(false),[corner,setCorner]=useState({x:12,y:58});
 state.current={progress,onProgress,onPlaying,speed,clock,live};
 useEffect(()=>{
  let cancelled=false;setDuration(0);setMessage('');setVideoUrl('');setCalibrating(false);
  if(urlRef.current){URL.revokeObjectURL(urlRef.current);urlRef.current=null;}
  if(review.media?.id)(selectedFile.current?.id===review.media.id?Promise.resolve(selectedFile.current.file):loadVideo(review.media.id)).then(file=>{if(cancelled)return;if(!file){setMessage(t('Bideoa berriz hautatu behar da.','Debes volver a seleccionar el vídeo.'));return;}const url=URL.createObjectURL(file);urlRef.current=url;setVideoUrl(url);}).catch(()=>{if(!cancelled)setMessage(t('Ezin izan da bideoa ireki.','No se pudo abrir el vídeo.'));});
  return()=>{cancelled=true;};
 },[review.media?.id]);
 useEffect(()=>()=>{if(urlRef.current)URL.revokeObjectURL(urlRef.current);},[]);
 useEffect(()=>{
  if(!playing||live)return;
  let previous=0;
  const tick=now=>{const s=state.current;if(!previous)previous=now;const dt=Math.min((now-previous)/1000,.25);previous=now;const next=Math.min(1,s.progress+dt*s.speed/s.clock.duration);s.onProgress(next);if(next>=1)s.onPlaying(false);else raf.current=requestAnimationFrame(tick);};
  raf.current=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf.current);
 },[playing,live,review.sessionId,clock.duration]);
 const [finalView,setFinalView]=useState(false),[movieSecond,setMovieSecond]=useState(0),[exporting,setExporting]=useState(false),[exportProgress,setExportProgress]=useState(0),[result,setResult]=useState('');
 const exportAbort=useRef(null),resultRef=useRef('');
 useEffect(()=>()=>{exportAbort.current?.abort();if(resultRef.current)URL.revokeObjectURL(resultRef.current);},[]);
 useEffect(()=>{if(resultRef.current)URL.revokeObjectURL(resultRef.current);resultRef.current='';setResult('');},[review.media?.id,review.media?.videoStartUtc,review.incidents]);
 const incidents=movieIncidents(review,clock);
 const markMovie=()=>{const time=(review.media?.videoStartUtc??clock.start)+movieSecond*1000;const fraction=(time-clock.start)/(clock.end-clock.start);if(!clock.timed||fraction<0||fraction>1)return;const location=pointAt(review.points,fraction,clock);if(location.gap)return;onReview({...review,incidents:[...review.incidents,{id:crypto.randomUUID(),coordinates:[...location.point.coordinates],pointIndex:location.index,time,fraction,videoTime:movieSecond,title:t("Puntu kritikoa","Punto crítico"),note:""}]});};
 const exportMovie=async()=>{onPlaying(false);setExporting(true);setExportProgress(0);setMessage('');if(resultRef.current)URL.revokeObjectURL(resultRef.current);setResult('');const controller=new AbortController();exportAbort.current=controller;try{const blob=await createFinalMovie({url:videoUrl,incidents,onProgress:setExportProgress,signal:controller.signal});const url=URL.createObjectURL(blob);resultRef.current=url;setResult(url);}catch(e){setMessage(e.message);}finally{setExporting(false);exportAbort.current=null;}};
 const targetTime=clock.timed&&position.time!=null?(position.time-(review.media?.videoStartUtc??clock.start))/1000:null;
 const outside=targetTime==null||targetTime<0||targetTime>duration;
 useEffect(()=>{
  const video=videoRef.current;if(!video||!videoUrl||calibrating)return;
  if(!clock.timed||outside){video.pause();return;}
  video.playbackRate=Math.max(.1,Math.min(4,speed));
  if(Number.isFinite(targetTime)&&(!playing||Math.abs(video.currentTime-targetTime)>.35))video.currentTime=Math.min(duration,Math.max(0,targetTime));
  if(playing){video.play().catch(()=>{onPlaying(false);setMessage(t('Sakatu erreproduzitu bideoa aktibatzeko.','Pulsa reproducir para activar el vídeo.'));});}else video.pause();
 },[videoUrl,targetTime,playing,speed,calibrating,outside,duration,clock.timed]);
 const importVideo=async e=>{
  const file=e.target.files?.[0];if(!file)return;onPlaying(false);
  try{const id=crypto.randomUUID();let stored=false;selectedFile.current={id,file};if(file.size<=256*1024*1024){try{await saveVideo(id,file);stored=true;}catch{stored=false;}}onReview({...review,media:{id,name:file.name,stored,size:file.size,videoStartUtc:review.media?.name===file.name&&review.media?.size===file.size?review.media.videoStartUtc:clock.start}});setMessage(t('Aukeratu une bera bideoan eta ibilbidean, eta sinkronizatu.','Elige el mismo instante en vídeo y recorrido y pulsa sincronizar.'));}
  catch(error){setMessage(t('Ezin izan da bideoa gorde: ','No se pudo guardar el vídeo: ')+error.message);}
  finally{e.target.value='';}
 };
 const align=()=>{if(!clock.timed||!videoRef.current)return;onReview({...review,media:{...review.media,videoStartUtc:position.time-videoRef.current.currentTime*1000}});setCalibrating(false);setMessage(t('Sinkronizazioa gordeta. Gorde saioa historia eguneratzeko.','Sincronización guardada. Guarda la sesión para actualizar el historial.'));};
 const mark=()=>{if(!point||live||position.gap)return;onPlaying(false);const incident={id:crypto.randomUUID(),coordinates:[...point.coordinates],pointIndex:position.index,time:position.time??point.time,fraction:progress,videoTime:targetTime!=null&&!outside?targetTime:null,title:t('Gorabehera','Incidencia'),note:''};onReview({...review,incidents:[...review.incidents,incident]});};
 const format=(n,d=1)=>Number.isFinite(n)?n.toFixed(d):'—';
 const zero=review.calibration;
 const force=axis=>point?.gForce&&!position.gap?point.gForce[axis]-(zero?.[axis]||0):null;
 const startDrag=e=>{if(!e.target.closest('header')||e.target.closest('button,input,video'))return;drag.current={x:e.clientX,y:e.clientY,corner};e.currentTarget.setPointerCapture(e.pointerId);};
 const moveDrag=e=>{if(!drag.current)return;const box=e.currentTarget,parent=box.parentElement;setCorner({x:Math.max(0,Math.min(parent.clientWidth-box.clientWidth,drag.current.corner.x+e.clientX-drag.current.x)),y:Math.max(0,Math.min(parent.clientHeight-box.clientHeight,drag.current.corner.y+e.clientY-drag.current.y))});};
 return <>
  {finalView&&<section className="final-movie" role="dialog" aria-label={t("Azken bideoa","Vídeo final")}><div className="final-movie-screen"><video src={videoUrl} controls playsInline onTimeUpdate={e=>setMovieSecond(e.currentTarget.currentTime)} /><div className="final-movie-caption">{visibleIncidents(incidents,movieSecond).map(i=><p key={i.id}>{i.title}{i.note?` · ${i.note}`:""}</p>)}</div></div><footer><button disabled={exporting} onClick={()=>setFinalView(false)}>{t("Itzuli","Volver")}</button><button disabled={exporting||!clock.timed||((review.media?.videoStartUtc??clock.start)+movieSecond*1000)<clock.start||((review.media?.videoStartUtc??clock.start)+movieSecond*1000)>clock.end} onClick={markMovie}>{t("Puntu kritikoa gehitu","Añadir punto crítico")}</button><button disabled={exporting} onClick={exportMovie}>{t("MP4 esportatu","Exportar MP4")}</button>{exporting&&<><span role="status">{Math.round(exportProgress*100)}% · {t("Mantendu pantaila piztuta","Mantén la pantalla encendida")}</span><button onClick={()=>exportAbort.current?.abort()}>{t("Utzi","Cancelar")}</button></>}{result&&!exporting&&<a download="traza-video-final.mp4" href={result}>{t("MP4 deskargatu","Descargar MP4")}</a>}{message&&<p role="status">{message}</p>}<small>{t("Bideo osoa eta puntu kritikoak. Esportazioak bideoaren iraupena behar du.","Vídeo completo con puntos críticos. La exportación tarda lo que dura el vídeo.")}</small></footer></section>}
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
  {!live&&review.points.length>0&&<div className={`review-pip ${size?'large':''}`} style={{left:corner.x,top:corner.y}} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null}>
   <header><strong>Dashcam · {t('Mugitu','Mover')}</strong><button onClick={()=>setSize(!size)} aria-label={t('Bideoaren tamaina aldatu','Cambiar tamaño del vídeo')}>⤢</button></header>
   {videoUrl?<><video ref={videoRef} src={videoUrl} preload="metadata" muted playsInline controls={calibrating} onLoadedMetadata={e=>setDuration(e.currentTarget.duration)} onError={()=>{onPlaying(false);setMessage(t('Bideo formatua ez da bateragarria. Saiatu H.264 MP4 batekin.','Formato de vídeo no compatible. Prueba un MP4 H.264.'));}}/>{outside&&!calibrating&&<p className="video-uncovered">{clock.timed?t('Une honetarako bideorik ez','Sin vídeo para este instante'):t('GPXak ez dauka ordutegi osoa','El GPX no tiene tiempos completos')}</p>}</>:<p>{t('Gehitu dashcam grabazioa','Añade la grabación de dashcam')}</p>}
   <label className="video-upload">{t('Bideoa hautatu','Seleccionar vídeo')}<input aria-label={t('Bideoa hautatu','Seleccionar vídeo')} type="file" accept="video/*,.mp4,.mov" onChange={importVideo}/></label>
   {videoUrl&&<><button className="final-movie-open" onClick={()=>{onPlaying(false);setMovieSecond(0);setFinalView(true);}}>{t('Azken bideoa · MP4','Vídeo final · MP4')}</button><small>{review.media?.name}</small><div className="pip-actions"><button disabled={!clock.timed} onClick={()=>{onPlaying(false);setCalibrating(!calibrating);}}>{t('Sinkronizazioa doitu','Ajustar sincronización')}</button>{calibrating&&<button onClick={align}>{t('Une hau lotu','Vincular este instante')}</button>}<button onClick={()=>{onPlaying(false);onReview({...review,media:null});}}>{t('Kendu','Quitar')}</button></div>{calibrating&&<label>{t('Bideoaren segundoa','Segundo del vídeo')}<input aria-label={t('Bideoaren segundoa','Segundo del vídeo')} type="number" min="0" max={duration} step="0.1" defaultValue={videoRef.current?.currentTime||0} onChange={e=>{if(videoRef.current)videoRef.current.currentTime=Math.max(0,Math.min(duration,Number(e.target.value)));}}/></label>}</>}
   {!clock.timed&&<small>{t('Sinkronizatzeko, puntu guztiek ordu balioduna izan behar dute.','Para sincronizar, todos los puntos deben tener una hora válida.')}</small>}
   {review.media?.stored===false&&<p>{t('Bideoa ez da lokalean gorde; berriro hautatu beharko duzu aplikazioa irekitzean.','El vídeo no se ha guardado localmente; tendrás que seleccionarlo de nuevo al abrir la app.')}</p>}{message&&<p role="status">{message}</p>}
  </div>}
  {!live&&review.points.length>0&&<div className="review-clock">
   <button onClick={()=>{if(progress>=1)onProgress(0);onPlaying(!playing);}} aria-label={t(playing?'Gelditu berrikuspena':'Erreproduzitu berrikuspena',playing?'Pausar revisión':'Reproducir revisión')}>{playing?'Ⅱ':'▶'}</button>
   <input aria-label={t('Berrikuspenaren posizioa','Posición de revisión')} type="range" min="0" max="10000" value={Math.round(progress*10000)} onChange={e=>{onPlaying(false);setCalibrating(false);onProgress(Number(e.target.value)/10000);}}/>
   <button disabled={position.gap} onClick={mark}>＋ {t('Puntu kritikoa','Punto crítico')}</button>
   <small>{clock.timed?`${Math.round(progress*clock.duration)} / ${Math.round(clock.duration)} s`:t('Denborarik gabeko puntuak','Puntos sin tiempo')}</small>
  </div>}
 </>;
}
