import {movieWriter} from './movieWriter.js';
// Render uploaded footage and timed incident captions, without editor chrome.
export function movieIncidents(review,clock) {
 const start=review.media?.videoStartUtc??clock.start;
 return (review.incidents||[]).map(i=>({...i,second:Number.isFinite(i.time)&&Number.isFinite(start)?(i.time-start)/1000:i.videoTime})).filter(i=>i.showInVideo!==false&&Number.isFinite(i.second)&&i.second>=0);
}
export function visibleIncidents(incidents,second){return incidents.filter(i=>second>=i.second&&second<i.second+4);}
export function drawMovie(ctx,video,incidents,second,composition){
 const {width:w,height:h}=ctx.canvas;ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);if(composition){ctx.drawImage(composition.mapCanvas,0,0,w,h);const r=composition.pipRect();const panel=composition.mapCanvas.getBoundingClientRect();const scale=w/panel.width;const x=(r.left-panel.left)*scale,y=(r.top-panel.top)*scale,pw=r.width*scale,ph=r.height*scale;ctx.fillStyle='#111';ctx.fillRect(x,y,pw,ph);const fit=Math.min(pw/video.videoWidth,ph/video.videoHeight);ctx.drawImage(video,x+(pw-video.videoWidth*fit)/2,y+(ph-video.videoHeight*fit)/2,video.videoWidth*fit,video.videoHeight*fit);ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(x,y,pw,ph);ctx.font=`${Math.max(10,w/110)}px sans-serif`;ctx.fillStyle='#fff';ctx.fillText(composition.attribution||'© geoEuskadi',12,h-12);composition.drawMarkers?.(ctx,w,h);const hud=composition.hud?.(),hr=composition.hudRect?.();if(hud&&hr){const hx=(hr.left-panel.left)*scale,hy=(hr.top-panel.top)*scale,hw=hr.width*scale,hh=hr.height*scale;ctx.fillStyle='#172c25ed';ctx.fillRect(hx,hy,hw,hh);ctx.fillStyle='#fff';const fs=Math.max(9,12*scale);ctx.font=`${fs}px sans-serif`;hud.split('\n').slice(0,11).forEach((line,i)=>ctx.fillText(line,hx+8*scale,hy+(20+i*17)*scale,hw-16*scale));}}else ctx.drawImage(video,0,0,w,h);
 const active=visibleIncidents(incidents,second);if(!active.length)return;composition?.drawIncident?.(ctx,active[0],w);
 const font=Math.max(16,Math.round(w/45)),pad=font;ctx.font=`600 ${font}px sans-serif`;
 const words=active.map(i=>[i.title,i.note].filter(Boolean).join(' · ')).join(' / ').split(/\s+/);const lines=[];let line='';
 for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width>w-pad*2&&line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);
 const shown=lines.slice(0,5);if(lines.length>5)shown[4]+='…';const box=shown.length*font*1.35+pad*2;
 ctx.fillStyle='rgba(10,15,22,.88)';ctx.fillRect(0,h-box,w,box);ctx.fillStyle='#ffb74d';ctx.fillRect(0,h-box,6,box);ctx.fillStyle='#fff';shown.forEach((text,i)=>ctx.fillText(text,pad,h-box+pad+font+i*font*1.35,w-pad*2));
}
export async function createFinalMovie({url,incidents,onProgress,signal,composition,startSecond=0,endSecond,audioContext,sink}){
 const mime=['video/mp4;codecs="avc1.42E01E,mp4a.40.2"','video/mp4;codecs=avc1,mp4a.40.2','video/mp4'].find(m=>globalThis.MediaRecorder?.isTypeSupported(m));
 if(!mime)throw Error('Este navegador no permite exportar MP4. Usa Safari o Chrome actualizado.');
 const video=document.createElement('video');video.src=url;video.muted=true;video.playsInline=true;video.preload='auto';video.style.cssText='position:fixed;left:-2px;bottom:0;width:1px;height:1px;opacity:.01;pointer-events:none';document.body.append(video);
 let stream,audio,recorder,frame,wake,completed=false;const writer=sink?movieWriter(sink):null;let failed=null;
 try{
  await new Promise((resolve,reject)=>{video.onloadeddata=resolve;video.onerror=()=>reject(Error('No se puede decodificar el vídeo.'));video.load();});
  if(signal.aborted)throw Error('Exportación cancelada.');
  const canvas=document.createElement('canvas'),width=composition?.mapCanvas.width||video.videoWidth,height=composition?.mapCanvas.height||video.videoHeight,scale=Math.min(1,1280/width,720/height);canvas.width=Math.max(2,Math.round(width*scale/2)*2);canvas.height=Math.max(2,Math.round(height*scale/2)*2);const end=Math.min(video.duration,endSecond??video.duration);if(startSecond>=end)throw Error('El vídeo y el GPX no coinciden en el tiempo. Ajusta la sincronización.');if(startSecond>0){video.currentTime=startSecond;await new Promise(ok=>video.onseeked=ok);}const ctx=canvas.getContext('2d');drawMovie(ctx,video,incidents,startSecond,composition);stream=canvas.captureStream(30);
  audio=audioContext||new (window.AudioContext||window.webkitAudioContext)();const source=audio.createMediaElementSource(video),destination=audio.createMediaStreamDestination();source.connect(destination);video.muted=false;await audio.resume();destination.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
  recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4000000});const chunks=[];recorder.ondataavailable=e=>{if(!e.data.size)return;if(!writer){chunks.push(e.data);return;}try{writer.write(e.data).catch(error=>{failed=error;stop();});}catch(error){failed=error;stop();}};
  const stop=()=>{if(recorder.state!=='inactive')recorder.stop();};const abort=()=>{failed=Error('Exportación cancelada.');stop();};const hidden=()=>{if(document.hidden){failed=Error('Exportación interrumpida: mantén la app visible y vuelve a intentarlo.');stop();}};
  const done=new Promise((resolve,reject)=>{recorder.onstop=async()=>{try{if(failed)throw failed;resolve(writer?await writer.close():new Blob(chunks,{type:recorder.mimeType}));}catch(e){reject(e);}};recorder.onerror=e=>{failed=e.error||Error('No se pudo generar el MP4.');stop();};});
  signal.addEventListener('abort',abort);document.addEventListener('visibilitychange',hidden);video.onended=stop;video.onerror=()=>{failed=Error('La reproducción del vídeo falló.');stop();};
  try{
   wake=await navigator.wakeLock?.request('screen').catch(()=>null);recorder.start(1000);
   const paint=()=>{onProgress((video.currentTime-startSecond)/(end-startSecond),video.currentTime);drawMovie(ctx,video,incidents,video.currentTime,composition);if(video.currentTime>=end){stop();return;}frame=requestAnimationFrame(paint);};paint();
   try{await video.play();}catch(e){failed=e;stop();}const blob=await done;if((blob.saved?blob.bytes:blob.size)<100)throw Error('El MP4 está vacío.');completed=true;return blob;
  }finally{signal.removeEventListener('abort',abort);document.removeEventListener('visibilitychange',hidden);}
 }finally{if(writer&&!completed)await writer.abort().catch(()=>{});cancelAnimationFrame(frame);video.pause();stream?.getTracks().forEach(t=>t.stop());await audio?.close();await wake?.release();video.removeAttribute('src');video.load();video.remove();}
}
