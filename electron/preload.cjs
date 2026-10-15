const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('trazaDesktop', Object.freeze({
  onBluetoothDevices:callback=>{const listener=(_event,data)=>callback(data);ipcRenderer.on('bluetooth:devices',listener);return ()=>ipcRenderer.removeListener('bluetooth:devices',listener);},
  onBluetoothClosed:callback=>{const listener=(_event,data)=>callback(data);ipcRenderer.on('bluetooth:closed',listener);return ()=>ipcRenderer.removeListener('bluetooth:closed',listener);},
  selectBluetooth:(requestId,deviceId)=>ipcRenderer.invoke('bluetooth:select',{requestId,deviceId}),
  cancelBluetooth:requestId=>ipcRenderer.invoke('bluetooth:cancel',requestId),
  chooseWorkspace:()=>ipcRenderer.invoke('workspace:choose'),
  readWorkspaceText:name=>ipcRenderer.invoke('workspace:read-text',name),
  writeWorkspaceProject:text=>ipcRenderer.invoke('workspace:write-project',text),
  beginMovie:()=>ipcRenderer.invoke('movie:begin'),
  writeMovie:(id,bytes)=>ipcRenderer.invoke('movie:write',id,bytes),
  finishMovie:id=>ipcRenderer.invoke('movie:finish',id),
  abortMovie:id=>ipcRenderer.invoke('movie:abort',id),
  dataDirectory: ipcRenderer.sendSync('files:get-data-directory'),
  loadLibrary: () => ipcRenderer.invoke('library:load'),
  saveLibrary: storage => ipcRenderer.invoke('library:save', storage),
  saveLibraryBeforeClose: storage => ipcRenderer.sendSync('library:save-sync', storage),
  saveGpx: (name, contents) => ipcRenderer.invoke('files:save-gpx', name, contents),
  saveVideo: (name, bytes) => ipcRenderer.invoke('files:save-video', name, bytes),
  openDataFolder: () => ipcRenderer.invoke('files:open-data-folder'),
}));
