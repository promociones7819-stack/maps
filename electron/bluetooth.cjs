const {ipcMain}=require('electron');
const {randomUUID}=require('node:crypto');
const requests=new Map();
function finish(contents,deviceId='',reason='cancelled'){
 const entry=requests.get(contents.id);if(!entry)return;requests.delete(contents.id);clearTimeout(entry.timer);
 try{entry.callback(deviceId);}catch{}
 if(!contents.isDestroyed())contents.send('bluetooth:closed',{requestId:entry.id,reason});
}
ipcMain.handle('bluetooth:select',(event,{requestId,deviceId})=>{
 const entry=requests.get(event.sender.id);if(!entry||entry.id!==requestId||!entry.devices.some(d=>d.deviceId===deviceId))throw Error('El dispositivo ya no está disponible.');finish(event.sender,deviceId,'selected');
});
ipcMain.handle('bluetooth:cancel',(event,requestId)=>{if(requests.get(event.sender.id)?.id===requestId)finish(event.sender);});
module.exports=function attachBluetooth(window,allowed=()=>true){
 const contents=window.webContents,id=contents.id;
 contents.on('select-bluetooth-device',(event,devices,callback)=>{
  event.preventDefault();
  if(!allowed()||!contents.getURL().startsWith('traza://app/')){callback('');return;}
  let entry=requests.get(contents.id);
  if(!entry){entry={id:randomUUID(),callback,devices:[],timer:setTimeout(()=>finish(contents,'','timeout'),60000)};requests.set(contents.id,entry);}
  entry.callback=callback;entry.devices=devices.map(d=>({deviceId:d.deviceId,deviceName:d.deviceName||''}));
  contents.send('bluetooth:devices',{requestId:entry.id,devices:entry.devices});
 });
 contents.on('destroyed',()=>{const entry=requests.get(id);if(entry){requests.delete(id);clearTimeout(entry.timer);try{entry.callback('');}catch{}}});
};
