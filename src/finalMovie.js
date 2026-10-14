// Render uploaded footage and timed incident captions, without editor chrome.
export function movieIncidents(review,clock) {
 const start=review.media?.videoStartUtc??clock.start;
 return (review.incidents||[]).map(i=>({...i,second:Number.isFinite(i.time)&&Number.isFinite(start)?(i.time-start)/1000:i.videoTime})).filter(i=>Number.isFinite(i.second)&&i.second>=0);
}
export function visibleIncidents(incidents,second){return incidents.filter(i=>second>=i.second&&second<i.second+4);}
export function drawMovie(ctx,video,incidents,second){
 const {width:w,height:h}=ctx.canvas;ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);ctx.drawImage(video,0,0,w,h);
 const active=visibleIncidents(incidents,second);if(!active.length)return;
 const font=Math.max(16,Math.round(w/45)),pad=font;ctx.font=`600 ${font}px sans-serif`;
 const words=active.map(i=>[i.title,i.note].filter(Boolean).join(' · ')).join(' / ').split(/\s+/);const lines=[];let line='';
 for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width>w-pad*2&&line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);
 const shown=lines.slice(0,5);if(lines.length>5)shown[4]+='…';const box=shown.length*font*1.35+pad*2;
 ctx.fillStyle='rgba(10,15,22,.88)';ctx.fillRect(0,h-box,w,box);ctx.fillStyle='#ffb74d';ctx.fillRect(0,h-box,6,box);ctx.fillStyle='#fff';shown.forEach((text,i)=>ctx.fillText(text,pad,h-box+pad+font+i*font*1.35,w-pad*2));
}
export async function createFinalMovie({url,incidents,onProgress,signal}){
 const mime=['video/mp4;codecs="avc1.42E01E,mp4a.40.2"','video/mp4;codecs=avc1,mp4a.40.2','video/mp4'].find(m=>globalThis.MediaRecorder?.isTypeSupported(m));
 if(!mime)throw Error('Este navegador no permite exportar MP4. Usa Safari o Chrome actualizado.');
 const video=document.createElement('video');video.src=url;video.muted=true;video.playsInline=true;video.preload='auto';video.style.cssText='position:fixed;left:-2px;bottom:0;width:1px;height:1px;opacity:.01;pointer-events:none';document.body.append(video);
 let stream,audio,recorder,frame,wake;let failed=null;
 try{
  await new Promise((resolve,reject)=>{video.onloadeddata=resolve;video.onerror=()=>reject(Error('No se puede decodificar el vídeo.'));video.load();});
  if(signal.aborted)throw Error('Exportación cancelada.');
  const canvas=document.createElement('canvas'),scale=Math.min(1,1280/video.videoWidth,720/video.videoHeight);canvas.width=Math.max(2,Math.round(video.videoWidth*scale/2)*2);canvas.height=Math.max(2,Math.round(video.videoHeight*scale/2)*2);const ctx=canvas.getContext('2d');drawMovie(ctx,video,incidents,0);stream=canvas.captureStream(30);
  audio=new (window.AudioContext||window.webkitAudioContext)();const source=audio.createMediaElementSource(video),destination=audio.createMediaStreamDestination();source.connect(destination);video.muted=false;await audio.resume();destination.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
  recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4000000});const chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  const stop=()=>{if(recorder.state!=='inactive')recorder.stop();};const abort=()=>{failed=Error('Exportación cancelada.');stop();};const hidden=()=>{if(document.hidden){failed=Error('Exportación interrumpida: mantén la app visible y vuelve a intentarlo.');stop();}};
  const done=new Promise((resolve,reject)=>{recorder.onstop=()=>failed?reject(failed):resolve(new Blob(chunks,{type:recorder.mimeType}));recorder.onerror=e=>{failed=e.error||Error('No se pudo generar el MP4.');stop();};});
  signal.addEventListener('abort',abort);document.addEventListener('visibilitychange',hidden);video.onended=stop;video.onerror=()=>{failed=Error('La reproducción del vídeo falló.');stop();};
  try{
   wake=await navigator.wakeLock?.request('screen').catch(()=>null);recorder.start(1000);
   const paint=()=>{drawMovie(ctx,video,incidents,video.currentTime);onProgress(video.currentTime/video.duration);frame=requestAnimationFrame(paint);};paint();
   try{await video.play();}catch(e){failed=e;stop();}const blob=await done;if(blob.size<100)throw Error('El MP4 está vacío.');return blob;
  }finally{signal.removeEventListener('abort',abort);document.removeEventListener('visibilitychange',hidden);}
 }finally{cancelAnimationFrame(frame);video.pause();stream?.getTracks().forEach(t=>t.stop());await audio?.close();await wake?.release();video.removeAttribute('src');video.load();video.remove();}
}
