// SPDX-FileCopyrightText: 2026 Aitor Delgado Martínez · AD Mobility
// SPDX-License-Identifier: LicenseRef-RutasAD-Educational-NonCommercial-1.0
import LegalNotice from './LegalNotice.jsx';
import React,{useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import './web-access.css';
export async function accountRequest(path,options={}){
 const response=await fetch('/api/'+path,{credentials:'same-origin',cache:'no-store',...options,headers:{'Content-Type':'application/json',...options.headers}});
 const result=await response.json();if(!response.ok)throw Object.assign(Error(result.error||'No se pudo completar la operación.'),{status:response.status});return result;
}
const announce=()=>{const channel=new BroadcastChannel('rutasad-access');channel.postMessage('changed');channel.close();};
export function Login({onLogin}){
 const [language,setLanguage]=useState('eu'),[busy,setBusy]=useState(false),[error,setError]=useState('');const t=(eu,es)=>language==='eu'?eu:es;
 return <main className="access-page"><form className="access-card" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');const data=new FormData(e.currentTarget);try{const r=await accountRequest('login',{method:'POST',body:JSON.stringify(Object.fromEntries(data))});announce();onLogin(r.user,language);}catch(e){setError(e.message);}finally{setBusy(false);}}}>
 <label className="access-language">Hizkuntza / Idioma <select value={language} onChange={e=>setLanguage(e.target.value)}><option value="eu">Euskara</option><option value="es">Castellano</option></select></label>
 <span className="access-brand">RutasAD</span><h1>{t('Zure kontuan sartu','Accede a tu cuenta')}</h1><p>{t('Administratzaileak baimendutako erabiltzaileentzat.','Para usuarios autorizados por el administrador.')}</p>
 <label>{t('Posta elektronikoa','Correo electrónico')}<input name="email" type="email" autoComplete="username" required maxLength={254}/></label>
 <label>{t('Pasahitza edo PINa','Contraseña o PIN')}<input name="password" type="password" autoComplete="current-password" required maxLength={128}/></label>
 {error&&<p role="alert">{error}</p>}<button disabled={busy} type="submit">{busy?t('Sartzen…','Accediendo…'):t('Sartu','Entrar')}</button>
 <small>{t('Sarbiderik ez baduzu edo pasahitza ahaztu baduzu, jarri administratzailearekin harremanetan.','Si necesitas acceso o has olvidado tu contraseña, contacta con el administrador.')}</small>
 <LegalNotice language={language}/></form></main>;
}
export function AccountControls({language='eu',disabled=false}){
 const user=window.rutasAccount;const [open,setOpen]=useState(false),[users,setUsers]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[reset,setReset]=useState(null),[change,setChange]=useState(false);const t=(eu,es)=>language==='eu'?eu:es;
 const refresh=async()=>{try{setUsers((await accountRequest('admin/users')).users);}catch(e){setError(e.message);}};
 const action=async fn=>{setBusy(true);setError('');try{await fn();await refresh();}catch(e){setError(e.message);}finally{setBusy(false);}};
 useEffect(()=>{if(open&&user?.role==='admin')void refresh();},[open]);
 useEffect(()=>{
  if(!open)return;
  const root=document.getElementById('root'),previous=document.activeElement;
  root.inert=true;
  const key=event=>{if(event.key==='Escape'&&!busy)setOpen(false);if(event.key==='Tab'){const nodes=[...document.querySelectorAll('.account-overlay button:not(:disabled),.account-overlay input')];const first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}};
  document.addEventListener('keydown',key);document.querySelector('.account-overlay button')?.focus();
  return()=>{root.inert=false;document.removeEventListener('keydown',key);previous?.focus();};
 },[open,busy]);
 if(!user)return null;
 const leave=async()=>{setBusy(true);try{await accountRequest('logout',{method:'POST'});announce();location.reload();}catch(e){setError(e.message);setBusy(false);}};
 return <><button disabled={disabled} onClick={()=>setOpen(true)}>{user.role==='admin'?t('Administrazioa','Administración'):t('Nire kontua','Mi cuenta')}</button>{open&&createPortal(<section className="account-overlay" role="dialog" aria-modal="true" aria-label={t('Kontua eta erabiltzaileak','Cuenta y usuarios')}><div className="account-panel"><header><div><span className="access-brand">RutasAD</span><h2>{user.role==='admin'?t('Erabiltzaileak','Usuarios'):t('Nire kontua','Mi cuenta')}</h2><p>{user.email}</p></div><button onClick={()=>{setOpen(false);setChange(false);setReset(null);}} disabled={busy}>{t('Itxi','Cerrar')}</button></header>
 <p>{t('Kontu bakoitzak bere ikasleak, klaseak eta ibilbideak ditu. Datuak gailu honetan gordetzen dira.','Cada cuenta tiene sus propios alumnos, clases y recorridos. Los datos se guardan en este dispositivo.')}</p>
 {user.role==='admin'&&<><form className="account-create" onSubmit={e=>{e.preventDefault();const form=e.currentTarget,data=Object.fromEntries(new FormData(form));void action(async()=>{await accountRequest('admin/users',{method:'POST',body:JSON.stringify(data)});form.reset();});}}><h3>{t('Erabiltzaile berria','Nuevo usuario')}</h3><label>{t('Posta elektronikoa','Correo electrónico')}<input name="email" type="email" required maxLength={254}/></label><label>{t('Hasierako pasahitza edo PINa','Contraseña o PIN inicial')}<input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" placeholder={t('Gutxienez 8 karaktere','Mínimo 8 caracteres')}/></label><button disabled={busy}>{t('Erabiltzailea sortu','Crear usuario')}</button><small>{t('Eman sarbide-datuak pertsona horri. Ez da mezu automatikorik bidaltzen.','Entrega los datos de acceso a esa persona. No se envía un correo automático.')}</small></form>
 <div className="account-user-list">{users.map(u=><article key={u.id}><div><strong>{u.email}</strong><small>{u.role==='admin'?t('Administratzailea','Administrador'):u.active?t('Sarbide aktiboa','Acceso activo'):t('Sarbidea blokeatuta','Acceso bloqueado')}</small></div>{u.role!=='admin'&&<div className="account-actions"><button disabled={busy} onClick={()=>void action(()=>accountRequest('admin/users/'+u.id,{method:'PATCH',body:JSON.stringify({active:!u.active})}))}>{u.active?t('Blokeatu','Bloquear'):t('Aktibatu','Activar')}</button><button disabled={busy} onClick={()=>setReset(u)}>{t('PINa aldatu','Restablecer acceso')}</button><button disabled={busy} onClick={()=>{if(confirm(t('Kontu hau ezabatu? Sarbidea galduko du. Bere gailuan gordetako fitxategiak ez dira ezabatuko.','¿Eliminar esta cuenta? Perderá el acceso. Los archivos guardados en su dispositivo no se borrarán.')))void action(()=>accountRequest('admin/users/'+u.id,{method:'DELETE'}));}}>{t('Ezabatu','Eliminar')}</button></div>}</article>)}</div></>}
 {reset&&<form className="account-create" onSubmit={e=>{e.preventDefault();const password=new FormData(e.currentTarget).get('password');void action(async()=>{await accountRequest('admin/users/'+reset.id,{method:'PATCH',body:JSON.stringify({password})});setReset(null);});}}><h3>{reset.email}</h3><label>{t('Pasahitz edo PIN berria','Nueva contraseña o PIN')}<input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password"/></label><button disabled={busy}>{t('Gorde','Guardar nuevo acceso')}</button><button type="button" onClick={()=>setReset(null)}>{t('Utzi','Cancelar')}</button></form>}
 <footer><button disabled={busy} onClick={()=>setChange(!change)}>{t('Nire pasahitza aldatu','Cambiar mi contraseña')}</button><button disabled={busy} onClick={leave}>{t('Saioa itxi','Cerrar sesión')}</button></footer>
 {change&&<form className="account-create" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await accountRequest('password',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.currentTarget)))});announce();location.reload();}catch(e){setError(e.message);setBusy(false);}}}><label>{t('Oraingo pasahitza','Contraseña actual')}<input name="currentPassword" type="password" autoComplete="current-password" required/></label><label>{t('Pasahitz berria','Nueva contraseña')}<input name="password" type="password" minLength={8} maxLength={128} autoComplete="new-password" required/></label><button disabled={busy}>{t('Aldatu eta saioa itxi','Cambiar y cerrar sesión')}</button></form>}
 {error&&<p role="alert">{error}</p>}
 </div></section>,document.body)}</>;
}
export function LegacyImport(){
 const [available,setAvailable]=useState(window.rutasLegacyAvailable),[error,setError]=useState('');if(!available)return null;
 return <aside className="legacy-import"><strong>Datos anteriores de este navegador</strong><p>Puedes recuperar la biblioteca anterior en tu cuenta administradora. Sustituirá los datos actuales de esta cuenta en este navegador. Las otras cuentas comenzarán vacías.</p><button onClick={()=>{try{if(!confirm('¿Recuperar los datos anteriores en esta cuenta? Sustituirá su biblioteca actual de este navegador. Los originales se conservarán.'))return;window.claimRutasLegacy();location.reload();}catch(e){setError(e.message);}}}>Conservar mis datos anteriores</button><button onClick={()=>setAvailable(false)}>Más adelante</button>{error&&<p role="alert">{error}</p>}</aside>;
}
export function monitorAccount(user){
 const lock=()=>{document.body.replaceChildren();location.replace('/');};
 let checking=false;const check=async()=>{if(checking)return;checking=true;try{const r=await accountRequest('me');if(r.user.id!==user.id)lock();}catch{lock();}finally{checking=false;}};
 const channel=new BroadcastChannel('rutasad-access');channel.onmessage=lock;
 setInterval(check,15000);window.addEventListener('pageshow',event=>{if(event.persisted)lock();});window.addEventListener('focus',check);document.addEventListener('visibilitychange',()=>{if(!document.hidden)void check();});
}
