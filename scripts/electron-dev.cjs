const { spawn } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const url = 'http://127.0.0.1:5173';
const vite = spawn(path.join(root, 'node_modules/.bin/vite'), ['--host', '127.0.0.1', '--port', '5173', '--strictPort'], { cwd: root, stdio: 'inherit' });
let electron;
let stopping = false;

async function startElectron() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) break;
    } catch { /* Wait for the local Vite server to start. */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (vite.exitCode !== null) throw new Error('No se pudo iniciar el servidor local de la aplicación.');
  electron = spawn(path.join(root, 'node_modules/.bin/electron'), ['.'], { cwd: root, env: { ...process.env, ELECTRON_START_URL: url }, stdio: 'inherit' });
  electron.on('exit', code => stop(code || 0));
}

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  vite.kill('SIGTERM');
  if (electron && electron.exitCode === null) electron.kill('SIGTERM');
  process.exitCode = code;
}

vite.on('exit', code => { if (!stopping && code) stop(code); });
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
startElectron().catch(error => { console.error(error.message); stop(1); });
