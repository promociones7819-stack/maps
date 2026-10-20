import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),create=require('../electron/map-tiles.cjs'),directory=await fs.mkdtemp(path.join(os.tmpdir(),'rutasad-tiles-'));let calls=0,offline=false;
const service=create({directory,fetchTile:async(url)=>{calls++;assert.match(url,/^https:\/\/www\.geo\.euskadi\.eus\/geoeuskadi\/rest\/services\/U11\/WMTS_ORTO\//);if(offline)throw Error('Offline');await new Promise(r=>setTimeout(r,10));return new Response(Buffer.from([137,80,78,71]),{headers:{'content-type':'image/png'}});}});
const request=(suffix,method='GET')=>new Request('traza://app/__geo/tiles/'+suffix,{method});
try{
 const [a,b]=await Promise.all([service(request('16/23988/32221')),service(request('16/23988/32221'))]);assert.equal(a.status,200);assert.equal(b.status,200);assert.equal(calls,1);assert.equal((await a.arrayBuffer()).byteLength,4);
 offline=true;assert.equal((await service(request('16/23988/32221'))).status,200);assert.equal(calls,1);assert.equal((await service(request('16/23989/32221'))).status,502);assert.equal(calls,3);
 for(const url of ['30/0/0','1/7/0','16/1/1?url=https://example.com','a/b/c'])assert.equal((await service(request(url))).status,400);assert.equal((await service(request('1/1/1','POST'))).status,400);
 assert.equal(calls,3);console.log('PASS desktop tiles: native fetch, concurrent deduplication, durable offline cache, bounded retry, upstream failure, URL/range/method restrictions.');
}finally{await fs.rm(directory,{recursive:true,force:true});}
