import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {recordingContextOptions} from '../src/mapRecording.js';
assert.deepEqual(recordingContextOptions(true),{preserveDrawingBuffer:true});
assert.deepEqual(recordingContextOptions(false),{canvasContextAttributes:{preserveDrawingBuffer:true}});
const browser=await chromium.launch();
try{
 const page=await browser.newPage();await page.goto('http://localhost:5173');
 const result=await page.evaluate(async()=>{
  const {Map}=await import('/node_modules/maplibre-gl/dist/maplibre-gl.mjs');
  const {recordingContextOptions}=await import('/src/mapRecording.js');
  const host=document.createElement('div');host.style.cssText='position:fixed;inset:0;width:640px;height:360px;z-index:99999';document.body.append(host);
  // A local coloured map makes this a rendering test independent of remote tiles.
  const map=new Map({container:host,style:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#349867'}}]},...recordingContextOptions(false)});
  await new Promise(resolve=>map.once('load',resolve));
  const canvas=map.getCanvas(),ctx=canvas.getContext('webgl2');
  const preserved=ctx.getContextAttributes().preserveDrawingBuffer;
  const copy=document.createElement('canvas');copy.width=640;copy.height=360;const paint=copy.getContext('2d');
  const samples=[];
  for(let i=0;i<5;i++){
   map.jumpTo({center:[i,0]});await new Promise(resolve=>map.once('render',resolve));
   // The browser may discard a non-preserved WebGL buffer after compositing.
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   paint.drawImage(canvas,0,0,640,360);samples.push([...paint.getImageData(320,180,1,1).data]);
  }
  map.remove();
  const legacy=new Map({container:host,style:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#349867'}}]},preserveDrawingBuffer:true});
  await new Promise(resolve=>legacy.once('load',resolve));
  const legacyPreserved=legacy.getCanvas().getContext('webgl2').getContextAttributes().preserveDrawingBuffer;
  legacy.remove();host.remove();return {preserved,samples,legacyPreserved};
 });
 assert.equal(result.preserved,true);assert.equal(result.legacyPreserved,false);
 for(const [r,g,b,a] of result.samples){assert.ok(g>100&&r>20&&b>50);assert.equal(a,255);}
 console.log('Real MapLibre WebGL capture PASS: buffer preserved and five delayed moving-map frames remain coloured',result.samples);
}finally{await browser.close();}
