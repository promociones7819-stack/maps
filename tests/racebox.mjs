import assert from 'node:assert/strict';
import {RaceBoxParser,validateTrack} from '../src/racebox.js';
const bytes=Uint8Array.from('B5 62 FF 01 50 00 A0 E7 0C 07 E6 07 01 0A 08 33 08 37 19 00 00 00 2A AD 4D 0E 03 01 EA 0B C6 93 E1 0D 3B 37 6F 19 61 8C 09 00 0F 01 09 00 9C 03 00 00 2C 07 00 00 23 00 00 00 00 00 00 00 D0 00 00 00 88 A9 DD 00 2C 01 00 59 FD FF 71 00 CE 03 2F FF 56 00 FC FF 06 DB'.split(' ').map(x=>parseInt(x,16)));
for(let split=1;split<bytes.length;split++){const parser=new RaceBoxParser();assert.equal(parser.push(new DataView(bytes.slice(0,split).buffer)).length,0);const [p]=parser.push(new DataView(bytes.slice(split).buffer));assert.equal(p.lat,42.6719035);assert.equal(p.lon,23.2887238);assert.equal(p.speed,.126);assert.equal(p.valid,true);assert.deepEqual(p.gForce,{x:-.003,y:.113,z:.974});assert.deepEqual(p.rotation,{x:-2.09,y:.86,z:-.04});assert.equal(p.time,'2022-01-10T08:51:08.239Z');}
const parser=new RaceBoxParser(),bad=bytes.slice();bad[30]^=1;assert.equal(parser.push(new DataView(bad.buffer)).length,0);assert.equal(parser.push(new DataView(bytes.buffer)).length,1);
assert.equal(new RaceBoxParser().push(new DataView(Uint8Array.from([...bytes,...bytes]).buffer)).length,2);
assert.throws(()=>validateTrack({points:[{lat:91,lon:0,time:null}],events:[]}));
console.log('RaceBox official packet, all split positions, checksum, recovery, coalesced frames: PASS');

const {raceboxRequestOptions,raceboxModel,DEVICE_INFO}=await import('../src/raceboxConnection.js');
const options=raceboxRequestOptions();assert.equal(options.services,undefined);assert.equal(options.namePrefix,'RaceBox Mini');assert.ok(options.optionalServices.includes(DEVICE_INFO));assert.equal(raceboxRequestOptions(true).namePrefix,undefined);assert.equal(raceboxModel(new TextEncoder().encode('RaceBox Mini\0 ')),'RaceBox Mini');console.log('Discovery without mandatory advertised UUID, model access permission and broad scan options PASS');

const {supportedRaceboxModel}=await import('../src/raceboxConnection.js');assert.ok(supportedRaceboxModel('RaceBox Mini S'));assert.ok(supportedRaceboxModel('RaceBox Mini'));assert.equal(supportedRaceboxModel('RaceBox Micro'),false);
