import './check-installation.mjs';
import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';
import {domainConfiguration} from './domain-config.mjs';
const args=process.argv.slice(2),input=args.find(a=>!a.startsWith('--'));
if(!input||args.some(a=>a.startsWith('--')&&a!=='--apply'))throw Error('Uso: npm run domain -- app.tudominio.com [--apply]');
const root=new URL('..',import.meta.url),file=new URL('../wrangler.jsonc',import.meta.url),original=await fs.readFile(file,'utf8'),current=JSON.parse(original);
const {config:connected,origin}=domainConfiguration(current,input),{config:active}=domainConfiguration(current,input,{activate:true});
console.log('Dominio propuesto: '+origin+'\nSe conservarán Worker, cuenta, base D1, firma de licencias y dirección workers.dev.\nLa zona DNS debe estar activa en esta cuenta. No se compra ni se registra el dominio.\nAntes del cambio: exportar bibliotecas web y conservar vídeos/GPX originales; iniciar sesión y volver a autorizar carpetas en el dominio nuevo.');
if(!args.includes('--apply')){console.log('Vista previa: no se ha cambiado ningún archivo ni recurso remoto.');process.exit(0);}
function run(args){const r=spawnSync('npx',['wrangler',...args],{cwd:root,stdio:'inherit'});if(r.status!==0)throw Error('No se completó: wrangler '+args[0]);}
const backup=new URL('../.tmp/domain-backups/'+new Date().toISOString().replaceAll(':','-')+'/',import.meta.url);
await fs.mkdir(backup,{recursive:true,mode:0o700});
await fs.writeFile(new URL('wrangler-before.json',backup),original,{mode:0o600});
await fs.copyFile(new URL('../electron/license-public.json',import.meta.url),new URL('license-public.json',backup));
const database=current.d1_databases.find(d=>d.binding==='AUTH');
run(['d1','export',database.database_name,'--remote','--output',path.join(fileURLToPath(backup),'database.sql')]);
await fs.chmod(new URL('database.sql',backup),0o600);
console.log('Copia privada de recuperación: '+backup.pathname+' (contiene datos de acceso; no compartir).');
async function verify(){for(const [route,status] of [['/',200],['/api/me',401]]){const r=await fetch(origin+route,{redirect:'manual',signal:AbortSignal.timeout(15000)});if(r.status!==status)throw Error('Dominio sin verificar: '+route+' devolvió '+r.status);}}
try{
 // First attach the domain while signed receipts still point to the proven old URL.
 await fs.writeFile(file,JSON.stringify(connected,null,2)+'\n');run(['deploy']);
 await verify();
 // Only after HTTPS and access control work, advertise the domain in new receipts.
 await fs.writeFile(file,JSON.stringify(active,null,2)+'\n');run(['deploy']);await verify();
 console.log('Dominio conectado y comprobado. Completar prueba de login, bibliotecas, importación, licencia y renovación antes de dar acceso a clientes.\nConservar workers.dev: los instaladores 0.17.0 lo necesitan para su primera activación y como respaldo.\nGuardar y subir wrangler.jsonc al repositorio para que una publicación automática no deshaga el cambio.');
}catch(e){await fs.writeFile(file,original);throw Error(e.message+' Se ha restaurado sólo la configuración LOCAL; el despliegue remoto puede haber cambiado. Revisar DNS/certificado y estado del Worker antes de reintentar. No se ha restaurado ni borrado D1. Copia: '+backup.pathname);}
