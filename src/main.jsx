import React from 'react';
import { createRoot } from 'react-dom/client';
import 'maplibre-gl/dist/maplibre-gl.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import './styles.css';

const STORAGE_PREFIX = 'traza-bizkaia-';
const librarySnapshot = () => Object.fromEntries(Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
  .filter(key => key?.startsWith(STORAGE_PREFIX)).map(key => [key, localStorage.getItem(key)]));

function connectDesktopLibrary() {
  const desktop = window.trazaDesktop;
  if (!desktop) return;
  let saveTimer;
  const scheduleSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => desktop.saveLibrary(librarySnapshot()).catch(error => console.error('No se pudo guardar la biblioteca:', error)), 350);
  };
  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;
  Storage.prototype.setItem = function (key, value) {
    originalSetItem.call(this, key, value);
    if (key.startsWith(STORAGE_PREFIX)) scheduleSave();
  };
  Storage.prototype.removeItem = function (key) {
    originalRemoveItem.call(this, key);
    if (key.startsWith(STORAGE_PREFIX)) scheduleSave();
  };
  window.addEventListener('beforeunload', () => {
    clearTimeout(saveTimer);
    desktop.saveLibraryBeforeClose(librarySnapshot());
  });
}

async function start() {
  const root = createRoot(document.getElementById('root'));
  if (window.trazaDesktop) {
    try {
      const library = await window.trazaDesktop.loadLibrary();
      for (const [key, value] of Object.entries(library)) {
        if (key.startsWith(STORAGE_PREFIX) && typeof value === 'string') localStorage.setItem(key, value);
      }
    } catch (error) { console.error('No se pudo abrir la biblioteca local:', error); }
    connectDesktopLibrary();
  }
  if (import.meta.env.PROD && 'serviceWorker' in navigator && !window.trazaDesktop) navigator.serviceWorker.register('/sw.js').catch(() => {});
  const openApp = async () => {
    const { default: App } = await import('./App.jsx');
    root.render(<React.StrictMode><App /></React.StrictMode>);
  };
  if (window.trazaDesktop) {
    await openApp();
  } else {
    const { default: Welcome } = await import('./Welcome.jsx');
    root.render(<React.StrictMode><Welcome onEnter={openApp} /></React.StrictMode>);
  }
}

start();
