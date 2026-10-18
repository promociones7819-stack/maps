const { app, BrowserWindow, ipcMain, protocol, net, shell, session, dialog } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const attachBluetooth=require('./bluetooth.cjs');
const organized=require('./organized-storage.cjs');

protocol.registerSchemesAsPrivileged([{ scheme: 'traza', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);
app.setName('RutasAD');

const dataDirectory = require('./data-directory.cjs')(app.getPath('documents'));
const libraryPath = path.join(dataDirectory, 'Biblioteca de recorridos.json');
const gpxDirectory = path.join(dataDirectory, 'Archivos GPX');
const videoDirectory = path.join(dataDirectory, 'Vídeos MP4');
const backupDirectory=organized.folders(dataDirectory).backups;
const appDataDirectory = path.join(dataDirectory, '.datos-de-la-aplicacion');

app.setPath('userData', appDataDirectory);

function ensureDataDirectories() {
  organized.ensure(dataDirectory);
  for (const directory of [appDataDirectory]) fs.mkdirSync(directory, { recursive: true });
}

function writeLibrary(storage) {
  ensureDataDirectories();organized.writeLibrary(dataDirectory,storage);
}

function cleanFileName(value, extension) {
  const stem = path.basename(String(value || 'archivo'), path.extname(String(value || '')))
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9 _-]+/g, '').trim().replace(/\s+/g, '-')
    .slice(0, 100) || 'archivo';
  return `${stem}${extension}`;
}

ipcMain.handle('library:load', () => {
  ensureDataDirectories();
  try {
    const library = JSON.parse(fs.readFileSync(libraryPath, 'utf8'));
    return organized.loadStudentsFallback(dataDirectory,library?.storage && typeof library.storage === 'object' ? library.storage : {});
  } catch (error) {
    if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) console.error('No se pudo leer la biblioteca local:', error);
    return organized.loadStudentsFallback(dataDirectory,{});
  }
});

ipcMain.handle('library:save', (_event, storage) => {
  if (!storage || typeof storage !== 'object' || Array.isArray(storage)) throw new Error('La biblioteca local no tiene un formato válido.');
  writeLibrary(storage);
  return true;
});

ipcMain.on('library:save-sync', (event, storage) => {
  try { writeLibrary(storage); event.returnValue = true; }
  catch (error) { console.error('No se pudo guardar la biblioteca al cerrar:', error); event.returnValue = false; }
});

ipcMain.handle('backup:save',async(event,{name,data}={})=>{
  if(typeof data!=='string'||Buffer.byteLength(data,'utf8')>256*1024*1024)throw Error('La copia no tiene un tamaño válido.');
  const result=await dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender),{title:'Guardar copia de seguridad',defaultPath:path.join(backupDirectory,cleanFileName(name||'RutasAD-copia','.json')),filters:[{name:'Copia RutasAD',extensions:['json']}]});
  if(result.canceled||!result.filePath)return {saved:false};
  const temporary=`${result.filePath}.${require('node:crypto').randomUUID()}.tmp`;
  try{await fs.promises.writeFile(temporary,data,'utf8');await fs.promises.rename(temporary,result.filePath);}catch(error){await fs.promises.rm(temporary,{force:true}).catch(()=>{});throw error;}
  return {saved:true,name:path.basename(result.filePath),path:result.filePath};
});

ipcMain.handle('files:save-gpx', async (_event, fileName, contents) => {
  ensureDataDirectories();
  const safeName = cleanFileName(fileName, '.gpx');
  const target=organized.uniqueFile(gpxDirectory,safeName);await fs.promises.writeFile(target,String(contents),'utf8');
  return path.join('Archivos GPX',path.basename(target));
});

ipcMain.handle('files:save-video', async (_event, fileName, bytes) => {
  ensureDataDirectories();
  const safeName = cleanFileName(fileName, '.mp4');
  const target=organized.uniqueFile(videoDirectory,safeName);await fs.promises.writeFile(target,Buffer.from(bytes));
  return path.join('Vídeos MP4',path.basename(target));
});

ipcMain.handle('files:open-data-folder', async () => {
  ensureDataDirectories();
  return shell.openPath(dataDirectory);
});
ipcMain.on('files:get-data-directory', event => { event.returnValue = dataDirectory; });

let workspaceDirectory=null;
const movieWrites=new Map();
function workspaceFile(name){if(!workspaceDirectory||typeof name!=='string'||name!==path.basename(name)||name.includes('\\'))throw Error('Archivo fuera de la carpeta de trabajo.');return path.join(workspaceDirectory,name);}
ipcMain.handle('workspace:choose',async()=>{const result=await dialog.showOpenDialog({title:'Carpeta de la clase · RutasAD',properties:['openDirectory']});if(result.canceled)return null;workspaceDirectory=result.filePaths[0];const entries=await fs.promises.readdir(workspaceDirectory,{withFileTypes:true});const files=[];for(const e of entries)if(e.isFile())files.push({name:e.name,size:(await fs.promises.stat(path.join(workspaceDirectory,e.name))).size});return {name:path.basename(workspaceDirectory),files};});
ipcMain.handle('workspace:check-media',async(_event,name,size)=>{try{const info=await fs.promises.stat(workspaceFile(name));if(!info.isFile()||info.size!==size)throw Error('changed');return true;}catch{throw Error('No se encuentra el vídeo original o ha cambiado. Si has renombrado o movido la carpeta, pulsa Abrir carpeta y selecciona su ubicación actual.');}});
ipcMain.handle('workspace:read-text',async(_event,name)=>{if(!/\.(gpx|json)$/i.test(name))throw Error('Solo se leen proyectos JSON y tracks GPX.');return fs.promises.readFile(workspaceFile(name),'utf8');});
ipcMain.handle('workspace:write-project',async(_event,text)=>{const target=workspaceFile('RutasAD-proyecto.json');const parsed=JSON.parse(text);if(parsed.format!=='rutasad-project')throw Error('Proyecto inválido.');const temporary=target+'.tmp';await fs.promises.writeFile(temporary,text,'utf8');await fs.promises.rename(temporary,target);});
ipcMain.handle('movie:begin',async()=>{const result=await dialog.showSaveDialog({title:'Guardar montaje MP4',defaultPath:path.join(videoDirectory,'RutasAD-mapa-pip.mp4'),filters:[{name:'MP4',extensions:['mp4']}]});if(result.canceled)return null;const id=require('node:crypto').randomUUID(),temporary=result.filePath+'.'+id+'.partial';const handle=await fs.promises.open(temporary,'wx');movieWrites.set(id,{handle,temporary,target:result.filePath});return {id,name:path.basename(result.filePath)};});
ipcMain.handle('movie:write',async(_event,id,bytes)=>{const entry=movieWrites.get(id);if(!entry)throw Error('La exportación no está abierta.');if(!(bytes instanceof ArrayBuffer)||bytes.byteLength>32*1024*1024)throw Error('Bloque de vídeo inválido.');await entry.handle.writeFile(Buffer.from(bytes));});
ipcMain.handle('movie:finish',async(_event,id)=>{const entry=movieWrites.get(id);if(!entry)throw Error('La exportación no está abierta.');await entry.handle.sync();await entry.handle.close();entry.closed=true;await fs.promises.rename(entry.temporary,entry.target);movieWrites.delete(id);});
ipcMain.handle('movie:abort',async(_event,id)=>{const entry=movieWrites.get(id);if(!entry)return;if(!entry.closed)await entry.handle.close().catch(()=>{});await fs.promises.unlink(entry.temporary).catch(()=>{});movieWrites.delete(id);});
app.on('before-quit',()=>{for(const entry of movieWrites.values()){void entry.handle.close().catch(()=>{});try{fs.unlinkSync(entry.temporary);}catch{}}movieWrites.clear();});

const distDirectory = path.join(app.getAppPath(), 'dist');

async function createWindow() {
  ensureDataDirectories();
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1050,
    minHeight: 720,
    title: 'RutasAD',
    backgroundColor: '#f5f6f3',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  attachBluetooth(window);
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('traza://')) event.preventDefault();
  });
  if (process.env.ELECTRON_START_URL) await window.loadURL(process.env.ELECTRON_START_URL);
  else await window.loadURL('traza://app/index.html');
}

app.whenReady().then(async () => {
  session.defaultSession.on('will-download',(_event,item)=>{const raw=item.getFilename(),directory=organized.downloadFolder(dataDirectory,raw);if(!directory)return;organized.ensure(dataDirectory);const extension=path.extname(raw).toLowerCase(),name=cleanFileName(raw,extension);item.setSavePath(organized.uniqueFile(directory,name));});
  protocol.handle('traza', async request => {
    if(new URL(request.url).hostname==='app'&&new URL(request.url).pathname.startsWith('/__workspace/')){
      try{
        const file=workspaceFile(decodeURIComponent(new URL(request.url).pathname.slice('/__workspace/'.length))),stat=await fs.promises.lstat(file);if(!stat.isFile())return new Response('Archivo no disponible',{status:404});
        const size=stat.size,range=request.headers.get('range');let start=0,end=size-1,status=200;const headers={'Accept-Ranges':'bytes','Content-Type':({'.mp4':'video/mp4','.m4v':'video/mp4','.mov':'video/quicktime','.webm':'video/webm'})[path.extname(file).toLowerCase()]||'application/octet-stream'};
        if(range){const match=/^bytes=(\d*)-(\d*)$/.exec(range);if(!match||(!match[1]&&!match[2]))return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));end=match[1]&&match[2]?Math.min(size-1,Number(match[2])):size-1;if(start>end||start>=size)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});status=206;headers['Content-Range']=`bytes ${start}-${end}/${size}`;}
        headers['Content-Length']=String(Math.max(0,end-start+1));const body=request.method==='HEAD'||!size?null:require('node:stream').Readable.toWeb(fs.createReadStream(file,{start,end}),{strategy:{highWaterMark:1024*1024,size:chunk=>chunk.byteLength}});return new Response(body,{status,headers});
      }catch{return new Response('Archivo no disponible',{status:404});}
    }
    let requestedPath;
    try { requestedPath = decodeURIComponent(new URL(request.url).pathname); }
    catch { return new Response('Dirección no válida', { status: 400 }); }
    const filePath = path.resolve(distDirectory, `.${requestedPath === '/' ? '/index.html' : requestedPath}`);
    if (!filePath.startsWith(`${path.resolve(distDirectory)}${path.sep}`)) return new Response('No encontrado', { status: 404 });
    return net.fetch(pathToFileURL(filePath).toString());
  });
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback, details) => {
    callback(permission === 'media' && details.mediaTypes?.includes('audio'));
  });
  await createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
