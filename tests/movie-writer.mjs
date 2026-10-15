import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {movieWriter} from '../src/movieWriter.js';
const file=new URL('../../../work/stream-stress.bin',import.meta.url);const handle=await fs.open(file,'w');let bytes=0,closed=false;
const sink={name:'stress.mp4',async write(blob){await handle.writeFile(new Uint8Array(await blob.arrayBuffer()));bytes+=blob.size;},async close(){closed=true;await handle.close();},async abort(){await handle.close();}};
const writer=movieWriter(sink);const block=new Blob([new Uint8Array(1024*1024)]);
try{for(let i=0;i<1600;i++)await writer.write(block);const result=await writer.close();assert.equal(bytes,1600*1024*1024);assert.ok(closed);assert.equal(result.bytes,bytes);assert.ok(result.peakPendingBytes<=1024*1024);assert.equal((await fs.stat(file)).size,bytes);console.log('1.56 GiB real disk write PASS; peak queued data 1 MiB');}finally{await fs.unlink(file).catch(()=>{});}
let release;const slow=movieWriter({name:'slow',write:()=>new Promise(ok=>release=ok),close:async()=>{},abort:async()=>{}},{maxPendingBytes:4});const pending=slow.write(new Blob(['1234']));assert.throws(()=>slow.write(new Blob(['5'])),/disco/);await new Promise(ok=>setTimeout(ok,0));release();await pending;await slow.close();
let aborted=false;const failure=movieWriter({name:'full',write:async()=>{throw Error('disk full');},abort:async()=>aborted=true,close:async()=>assert.fail()});await assert.rejects(failure.write(new Blob(['x'])),/disk full/);await assert.rejects(failure.close(),/disk full/);await failure.abort();assert.ok(aborted);console.log('Bounded queue, ordered writes and disk failure cleanup PASS');
