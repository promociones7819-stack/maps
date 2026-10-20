// SPDX-FileCopyrightText: 2026 Aitor Delgado Martínez · AD Mobility
// SPDX-License-Identifier: LicenseRef-RutasAD-Educational-NonCommercial-1.0
export const GOOGLE_CONFIG='rutasad-google-config-v1',GOOGLE_USAGE='rutasad-google-usage-v1';
export const DAILY_LIMIT=2500,MONTHLY_LIMIT=90000;
export function googleConfig(){try{return JSON.parse(localStorage.getItem(GOOGLE_CONFIG)||'null');}catch{return null;}}
export function validateGoogleConfig(config){if(!/^AIza[\w-]{25,120}$/.test(config.key||''))throw Error('Introduce una clave API válida de Google.');if(!config.quotaConfirmed)throw Error('Confirma la cuota diaria en Google Cloud antes de activar Google.');}
export function saveGoogleConfig(config){validateGoogleConfig(config);localStorage.setItem(GOOGLE_CONFIG,JSON.stringify({key:config.key,quotaConfirmed:true}));window.dispatchEvent(new Event('rutasad:google-config'));}
export function googleUsage(now=new Date()){
 const day=now.toISOString().slice(0,10),month=day.slice(0,7);let old={};try{old=JSON.parse(localStorage.getItem(GOOGLE_USAGE)||'{}');}catch{throw Error('No se puede leer el contador Google. Revisa la configuración antes de continuar.');}
 if(!old||typeof old!=='object'||Array.isArray(old))throw Error('Contador Google inválido.');
 const rows=old.month===month?old.days||{}:{};
 if(typeof rows!=='object'||Array.isArray(rows)||Object.keys(rows).length>31||Object.entries(rows).some(([date,r])=>!date.startsWith(month+'-')||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!r||!Number.isSafeInteger(r.used??0)||(r.used??0)<0||!Number.isSafeInteger(r.extra??0)||(r.extra??0)<0||(r.extra??0)>10000000))throw Error('Contador Google inválido. No se descargarán imágenes.');
 return {month,day,days:rows,daily:Number(rows[day]?.used||0),monthly:Object.values(rows).reduce((n,r)=>n+Number(r.used||0),0),dailyLimit:DAILY_LIMIT+Number(rows[day]?.extra||0),monthlyLimit:MONTHLY_LIMIT+Object.values(rows).reduce((n,r)=>n+Number(r.extra||0),0)};
}
let queue=Promise.resolve();
const locked=fn=>globalThis.navigator?.locks?.request?navigator.locks.request('rutasad-google-budget',fn):(queue=queue.catch(()=>{}).then(fn));
export const reserveGoogleTile=()=>locked(()=>{const config=googleConfig();if(!config?.quotaConfirmed)throw Error('Configura tu cuenta Google y confirma sus cuotas.');const u=googleUsage();if(u.daily>=u.dailyLimit||u.monthly>=u.monthlyLimit){window.dispatchEvent(new Event('rutasad:google-limit'));throw Error('Límite de Google alcanzado en este equipo. Usa PNOA o revisa la autorización de consumo.');}const days={...u.days,[u.day]:{...u.days[u.day],used:u.daily+1}};localStorage.setItem(GOOGLE_USAGE,JSON.stringify({month:u.month,days}));if((u.daily+1)%25===0||u.daily+1===u.dailyLimit)window.dispatchEvent(new Event('rutasad:google-usage'));});
export const authorizeGoogleExtra=()=>locked(()=>{const u=googleUsage(),days={...u.days,[u.day]:{...u.days[u.day],used:u.daily,extra:Number(u.days[u.day]?.extra||0)+500}};localStorage.setItem(GOOGLE_USAGE,JSON.stringify({month:u.month,days}));window.dispatchEvent(new Event('rutasad:google-usage'));});
