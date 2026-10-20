import {checkpointAutosave,finishAutosave,hasActiveWork,reportAutosave,REVISION_KEY} from './autosave.js';
// SPDX-FileCopyrightText: 2026 Aitor Delgado Martínez · AD Mobility
// SPDX-License-Identifier: LicenseRef-RutasAD-Educational-NonCommercial-1.0
import React from 'react';
import {watchDataFolder,saveDataFolder,reconnectDataFolder} from './dataFolder.js';

import {Capacitor} from '@capacitor/core';
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
    reportAutosave('saving');saveTimer = setTimeout(() => desktop.saveLibrary(librarySnapshot()).then(()=>reportAutosave('saved')).catch(error => reportAutosave('error',error.message)), 350);
  };
  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;
  Storage.prototype.setItem = function (key, value) {
    originalSetItem.call(this, key, value);
    if (this===localStorage&&key.startsWith(STORAGE_PREFIX)){originalSetItem.call(localStorage,REVISION_KEY,String(Math.max(Date.now(),Number(localStorage.getItem(REVISION_KEY)||0)+1)));scheduleSave();}
  };
  Storage.prototype.removeItem = function (key) {
    originalRemoveItem.call(this, key);
    if (this===localStorage&&key.startsWith(STORAGE_PREFIX)){originalSetItem.call(localStorage,REVISION_KEY,String(Math.max(Date.now(),Number(localStorage.getItem(REVISION_KEY)||0)+1)));scheduleSave();}
  };
  window.addEventListener('beforeunload', () => {
    clearTimeout(saveTimer);
    checkpointAutosave();
    if(!desktop.saveLibraryBeforeClose(librarySnapshot()))reportAutosave('error','No se pudo guardar en el disco.');
  });
  desktop.onPrepareClose?.(async id=>{try{await finishAutosave();await saveDataFolder();clearTimeout(saveTimer);if(!desktop.saveLibraryBeforeClose(librarySnapshot()))throw Error('No se pudo guardar en el disco.');desktop.completeClose(id,true);}catch(e){reportAutosave('error',e.message);desktop.completeClose(id,false,e.message);}});
}

async function start() {
  const root = createRoot(document.getElementById('root'));
  if (import.meta.env.PROD && 'serviceWorker' in navigator && !window.trazaDesktop && !Capacitor.isNativePlatform()) navigator.serviceWorker.register('/sw.js').catch(() => {});

  if (import.meta.env.PROD && !window.trazaDesktop && !Capacitor.isNativePlatform()) {
    const {Login,accountRequest,monitorAccount}=await import('./WebAccess.jsx');
    let user;
    try { user=(await accountRequest('me')).user; } catch(error) {
      if(error.status!==401){root.render(<main className="access-page"><p>No se pudo comprobar el acceso. Comprueba tu conexión y recarga la página.</p></main>);return;}
      user=await new Promise(resolve=>root.render(<Login onLogin={(user,language)=>resolve({...user,loginLanguage:language})}/>));
    }
    await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/account-storage.js';script.onload=resolve;script.onerror=reject;document.head.append(script);});
    window.installRutasAccount(user);
    if(user.loginLanguage)localStorage.setItem('traza-bizkaia-language',user.loginLanguage);
    monitorAccount(user);
  }
  watchDataFolder();
  if (window.trazaDesktop) {
    try {
      const library = await window.trazaDesktop.loadLibrary();
      const localRevision=Number(localStorage.getItem(REVISION_KEY)||0),diskRevision=Number(library[REVISION_KEY]||0);
      for (const [key, value] of Object.entries(localRevision>diskRevision?{}:library)) {
        if (key.startsWith(STORAGE_PREFIX) && typeof value === 'string') localStorage.setItem(key, value);
      }
    } catch (error) { console.error('No se pudo abrir la biblioteca local:', error); }
    connectDesktopLibrary();
  }
  window.addEventListener('rutasad:retry-save',async()=>{try{await checkpointAutosave();if(window.trazaDesktop)await window.trazaDesktop.saveLibrary(librarySnapshot());await saveDataFolder();reportAutosave('saved');}catch(e){reportAutosave('error',e.message);}});
  window.addEventListener('pagehide',()=>{checkpointAutosave();saveDataFolder().catch(e=>reportAutosave('error',e.message));});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){checkpointAutosave();saveDataFolder().catch(e=>reportAutosave('error',e.message));}});
  window.addEventListener('beforeunload',event=>{checkpointAutosave();if(!window.trazaDesktop&&hasActiveWork()){event.preventDefault();event.returnValue='';}});
  if(!window.trazaDesktop)reconnectDataFolder().catch(e=>reportAutosave('error',e.message));
  const openApp = async () => {
    const { default: App } = await import('./App.jsx');
    root.render(<React.StrictMode><App /></React.StrictMode>);
  };
  if (window.trazaDesktop || sessionStorage.getItem('rutasad-after-student-delete')==='1') {
    await openApp();
  } else {
    const { default: Welcome } = await import('./Welcome.jsx');
    root.render(<React.StrictMode><Welcome onEnter={openApp} /></React.StrictMode>);
  }
}

start();
