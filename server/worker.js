// SPDX-FileCopyrightText: 2026 Aitor Delgado Martínez · AD Mobility
// SPDX-License-Identifier: LicenseRef-RutasAD-Educational-NonCommercial-1.0
import manifest from '../dist/.vite/manifest.json';
import {digest,passwordHash,verifyPassword} from './password.js';
const DAY=86400000;
const loginAssets=new Set();
function allowEntry(key){const entry=manifest[key];if(!entry||loginAssets.has('/'+entry.file))return;loginAssets.add('/'+entry.file);for(const css of entry.css||[])loginAssets.add('/'+css);for(const dep of entry.imports||[])allowEntry(dep);}
allowEntry('index.html');
// Vite can rename shared chunks when a new component is introduced.
const loginEntry=Object.entries(manifest).find(([,entry])=>entry.name==='WebAccess'&&entry.file.endsWith('.js'))?.[0];
if(!loginEntry)throw Error('No se encuentra el arranque de identificación en el manifiesto.');
allowEntry(loginEntry);
const privateApp=Object.values(manifest).find(entry=>entry.name==='App'&&entry.file.endsWith('.js'));
if(!privateApp||loginAssets.has('/'+privateApp.file))throw Error('La aplicación debe permanecer separada de los archivos públicos de acceso.');
const json=(value,status=200,headers={})=>Response.json(value,{status,headers:{'Cache-Control':'no-store',...headers}});
const cookie=(token,expired=false)=>`__Host-rutasad=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${expired?0:604800}`;
const publicUser=u=>({id:u.id,email:u.email,role:u.role,active:!!u.active,createdAt:u.created_at});
async function identity(request,env){
 const token=request.headers.get('Cookie')?.match(/(?:^|;\s*)__Host-rutasad=([^;]+)/)?.[1];
 if(!token)return null;
 return env.AUTH.prepare('SELECT u.*, s.token_hash FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1').bind(await digest(token),Date.now()).first();
}
async function body(request){if(Number(request.headers.get('content-length'))>4096)throw Error('Solicitud demasiado grande.');const raw=await request.text();if(raw.length>4096)throw Error('Solicitud demasiado grande.');return JSON.parse(raw);}
const validEmail=e=>typeof e==='string'&&e.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const validPassword=p=>typeof p==='string'&&p.length>=8&&p.length<=128;
async function api(request,env,path){
 if(request.method!=='GET'&&request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'Origen no permitido.'},403);
 if(path==='/api/login'&&request.method==='POST'){
  const b=await body(request),email=typeof b.email==='string'?b.email.trim().toLowerCase():'';
  const ip=request.headers.get('CF-Connecting-IP')||'local';
  for(const key of [`ip:${ip}`,`email:${email}`]){
   const bucket=await digest(key),now=Date.now();
   const limit=await env.AUTH.prepare('INSERT INTO login_limits(bucket,attempts,until_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN until_at<? THEN 1 ELSE attempts+1 END, until_at=CASE WHEN until_at<? THEN excluded.until_at ELSE until_at END RETURNING attempts').bind(bucket,now+900000,now,now).first();
   if(limit.attempts>15)return json({error:'Demasiados intentos. Espera 15 minutos.'},429);
  }
  const u=await env.AUTH.prepare('SELECT * FROM users WHERE email=?').bind(email).first();
  const ok=await verifyPassword(typeof b.password==='string'?b.password.slice(0,129):'',u?.password_hash||'pbkdf2:100000:dummy:0000000000000000000000000000000000000000000000000000000000000000');
  if(!u||!u.active||!ok)return json({error:'Correo o contraseña incorrectos, o acceso desactivado.'},401);
  const token=crypto.randomUUID()+crypto.randomUUID();
  await env.AUTH.batch([
   env.AUTH.prepare('DELETE FROM sessions WHERE expires_at<?').bind(Date.now()),
   env.AUTH.prepare('DELETE FROM login_limits WHERE until_at<?').bind(Date.now()),
   env.AUTH.prepare('INSERT INTO sessions VALUES(?,?,?)').bind(await digest(token),u.id,Date.now()+7*DAY),
  ]);
  return json({user:publicUser(u)},200,{'Set-Cookie':cookie(token)});
 }
 const u=await identity(request,env);if(!u)return json({error:'Inicia sesión para continuar.'},401);
 if(path==='/api/me'&&request.method==='GET')return json({user:publicUser(u)});
 if(path==='/api/logout'&&request.method==='POST'){
  await env.AUTH.prepare('DELETE FROM sessions WHERE token_hash=?').bind(u.token_hash).run();
  return json({ok:true},200,{'Set-Cookie':cookie('',true)});
 }
 if(path==='/api/password'&&request.method==='POST'){
  const b=await body(request);if(!validPassword(b.password)||!await verifyPassword(b.currentPassword||'',u.password_hash))return json({error:'Contraseña actual incorrecta o nueva contraseña de menos de 8 caracteres.'},400);
  await env.AUTH.batch([env.AUTH.prepare('UPDATE users SET password_hash=? WHERE id=?').bind(await passwordHash(b.password),u.id),env.AUTH.prepare('DELETE FROM sessions WHERE user_id=?').bind(u.id)]);
  return json({ok:true},200,{'Set-Cookie':cookie('',true)});
 }
 if(path.startsWith('/api/admin/')){
  if(u.role!=='admin')return json({error:'Acceso reservado al administrador.'},403);
  if(path==='/api/admin/users'&&request.method==='GET'){
   const {results}=await env.AUTH.prepare('SELECT id,email,role,active,created_at FROM users ORDER BY created_at').all();return json({users:results.map(publicUser)});
  }
  if(path==='/api/admin/users'&&request.method==='POST'){
   const b=await body(request),email=b.email?.trim().toLowerCase();if(!validEmail(email)||!validPassword(b.password))return json({error:'Introduce un correo válido y una contraseña o PIN de al menos 8 caracteres.'},400);
   const id=crypto.randomUUID(),hash=await passwordHash(b.password);
   const r=await env.AUTH.prepare('INSERT OR IGNORE INTO users(id,email,password_hash,created_at) VALUES(?,?,?,?)').bind(id,email,hash,Date.now()).run();
   if(!r.meta.changes)return json({error:'Ese correo ya tiene una cuenta.'},409);
   return json({ok:true},201);
  }
  const match=path.match(/^\/api\/admin\/users\/([a-zA-Z0-9-]+)$/);
  if(match&&['PATCH','DELETE'].includes(request.method)){
   const target=await env.AUTH.prepare('SELECT id,role FROM users WHERE id=?').bind(match[1]).first();
   if(!target)return json({error:'Usuario no encontrado.'},404);
   if(target.role==='admin')return json({error:'Esta acción no se permite sobre la cuenta administradora.'},400);
   if(request.method==='DELETE')await env.AUTH.batch([env.AUTH.prepare('DELETE FROM sessions WHERE user_id=?').bind(target.id),env.AUTH.prepare('DELETE FROM users WHERE id=?').bind(target.id)]);
   else {
    const b=await body(request);let statement;
    if(typeof b.active==='boolean')statement=env.AUTH.prepare('UPDATE users SET active=? WHERE id=?').bind(b.active?1:0,target.id);
    else if(validPassword(b.password))statement=env.AUTH.prepare('UPDATE users SET password_hash=? WHERE id=?').bind(await passwordHash(b.password),target.id);
    else return json({error:'Introduce una contraseña o PIN de al menos 8 caracteres.'},400);
    await env.AUTH.batch([statement,env.AUTH.prepare('DELETE FROM sessions WHERE user_id=?').bind(target.id)]);
   }
   return json({ok:true});
  }
 }
 return json({error:'No encontrado.'},404);
}
export default {async fetch(request,env){
 try{
  const url=new URL(request.url),path=url.pathname;
  if(path.startsWith('/api/'))return await api(request,env,path);
  // The entry and login assets are public; application code and ficha require a session.
  const publicPath=['/','/index.html','/sw.js','/account-storage.js','/licencia.html','/licencia','/LICENSE.txt','/THIRD-PARTY-NOTICES.txt'].includes(path)||loginAssets.has(path)||path==='/ad-mobility-logo.png';
  const u=publicPath?null:await identity(request,env);
  if(!publicPath&&!u)return new Response('Inicia sesión en RutasAD.',{status:401,headers:{'Cache-Control':'no-store'}});
  let response=await env.ASSETS.fetch(request);
  if(u&&path.startsWith('/ficha/')&&response.headers.get('Content-Type')?.includes('text/html')){
   const html=await response.text();
   const bootstrap=`<script src="/account-storage.js"></script><script>window.installRutasAccount(${JSON.stringify(publicUser(u)).replace(/</g,'\\u003c')});</script>`;
   const headers=new Headers(response.headers);headers.delete('Content-Length');headers.delete('Content-Encoding');response=new Response(html.replace(/<head[^>]*>/i,match=>match+bootstrap),{status:response.status,headers});
  }
  const headers=new Headers(response.headers);headers.set('Cache-Control','no-store');headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','same-origin');headers.set('X-Frame-Options','SAMEORIGIN');
  return new Response(response.body,{status:response.status,headers});
 }catch(error){console.error('Auth request failed',error.name);return json({error:'No se pudo completar la operación. Inténtalo de nuevo.'},500);}
}};
