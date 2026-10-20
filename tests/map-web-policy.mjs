import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {pathToFileURL} from 'node:url';
const manifest=JSON.parse(await fs.readFile('dist/.vite/manifest.json','utf8'));
let source=await fs.readFile('server/worker.js','utf8');source=source.replace("import manifest from '../dist/.vite/manifest.json';",`const manifest=${JSON.stringify(manifest)};`).replace("'./password.js'",JSON.stringify(pathToFileURL(process.cwd()+'/server/password.js').href));
const worker=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
const env={ASSETS:{fetch:()=>new Response('<html>Public entry</html>',{headers:{'Content-Type':'text/html'}})}};
const entry=await worker.fetch(new Request('https://maps.example.test/'),env);assert.equal(entry.headers.get('Referrer-Policy'),'strict-origin-when-cross-origin');assert.equal(entry.headers.get('Cache-Control'),'no-store');
const app=Object.values(manifest).find(v=>v.name==='App');assert.equal((await worker.fetch(new Request('https://maps.example.test/'+app.file),env)).status,401);assert.equal((await worker.fetch(new Request('https://maps.example.test/api/admin/users'),env)).status,401);
console.log('PASS web map policy: external providers receive origin only, private app and admin API remain protected.');
