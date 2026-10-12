const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('trazaDesktop', Object.freeze({
  dataDirectory: ipcRenderer.sendSync('files:get-data-directory'),
  loadLibrary: () => ipcRenderer.invoke('library:load'),
  saveLibrary: storage => ipcRenderer.invoke('library:save', storage),
  saveLibraryBeforeClose: storage => ipcRenderer.sendSync('library:save-sync', storage),
  saveGpx: (name, contents) => ipcRenderer.invoke('files:save-gpx', name, contents),
  saveVideo: (name, bytes) => ipcRenderer.invoke('files:save-video', name, bytes),
  openDataFolder: () => ipcRenderer.invoke('files:open-data-folder'),
}));
