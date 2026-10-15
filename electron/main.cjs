const { app, BrowserWindow, ipcMain, protocol, net, shell, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

protocol.registerSchemesAsPrivileged([{ scheme: 'traza', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);
app.setName('RutasAD');

const dataDirectory = path.join(app.getPath('documents'), 'Traza Bizkaia');
const libraryPath = path.join(dataDirectory, 'Biblioteca de recorridos.json');
const gpxDirectory = path.join(dataDirectory, 'Archivos GPX');
const videoDirectory = path.join(dataDirectory, 'Vídeos MP4');
const appDataDirectory = path.join(dataDirectory, '.datos-de-la-aplicacion');

app.setPath('userData', appDataDirectory);

function ensureDataDirectories() {
  for (const directory of [dataDirectory, gpxDirectory, videoDirectory, appDataDirectory]) fs.mkdirSync(directory, { recursive: true });
}

function writeLibrary(storage) {
  ensureDataDirectories();
  const temporaryPath = `${libraryPath}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), storage }, null, 2), 'utf8');
  fs.renameSync(temporaryPath, libraryPath);
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
    return library?.storage && typeof library.storage === 'object' ? library.storage : {};
  } catch (error) {
    if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) console.error('No se pudo leer la biblioteca local:', error);
    return {};
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

ipcMain.handle('files:save-gpx', async (_event, fileName, contents) => {
  ensureDataDirectories();
  const safeName = cleanFileName(fileName, '.gpx');
  await fs.promises.writeFile(path.join(gpxDirectory, safeName), String(contents), 'utf8');
  return path.join('Archivos GPX', safeName);
});

ipcMain.handle('files:save-video', async (_event, fileName, bytes) => {
  ensureDataDirectories();
  const safeName = cleanFileName(fileName, '.mp4');
  await fs.promises.writeFile(path.join(videoDirectory, safeName), Buffer.from(bytes));
  return path.join('Vídeos MP4', safeName);
});

ipcMain.handle('files:open-data-folder', async () => {
  ensureDataDirectories();
  return shell.openPath(dataDirectory);
});
ipcMain.on('files:get-data-directory', event => { event.returnValue = dataDirectory; });

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
  protocol.handle('traza', request => {
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
