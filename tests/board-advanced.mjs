import assert from 'node:assert/strict';
import {vehicleAt,lineFeatures,geoFeatures,loadBoardLibrary,saveBoardLibrary,deleteBoardLibrary,validateBoardImport} from '../src/boardAdvanced.js';

const car={id:'car-A',type:'vehicle',coordinates:[-2.94,43.26],heading:0,path:[[-2.94,43.26],[-2.939,43.26],[-2.939,43.261]],label:'A'};
assert.deepEqual(vehicleAt(car,0).coordinates,car.path[0]);
assert.deepEqual(vehicleAt(car,1).coordinates,car.path[2]);
const midway=vehicleAt(car,.5);
assert.ok(midway.coordinates[0]>-2.94&&midway.coordinates[1]>=43.26);
assert.ok(Number.isFinite(midway.heading));
const noPath=vehicleAt({...car,path:[]},.5);
assert.deepEqual(noPath.coordinates,car.coordinates);

const l=lineFeatures([{id:'a',type:'ink',points:[[0,0],[1,1]],color:'#57b9f4'}, {id:'b',type:'dashed',points:[[0,0],[1,0]],color:'#ed7373'}, {id:'c',type:'text',coordinates:[0,0]}]);
assert.equal(l.features.length,2);
assert.equal(l.features[1].properties.dashed,true);
const s=geoFeatures([{id:'s',type:'sight',points:[[-2.94,43.26],[-2.94,43.2601]],color:'#f3b73e',aperture:60},{id:'c',type:'circle',points:[[0,0],[0.001,0]]},{id:'r',type:'rectangle',points:[[0,0],[1,1]]}]);
assert.equal(s.features.length,3);
assert.equal(s.features[0].geometry.coordinates[0][0].length,2);
assert.equal(s.features[2].geometry.coordinates[0].length,5);

const saved=new Map();
globalThis.localStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
globalThis.crypto ||= (await import('node:crypto')).webcrypto;
assert.deepEqual(loadBoardLibrary(),[]);
const example={id:'a',name:'Cruce Basauri',items:[{id:'v',type:'vehicle',coordinates:[-2.94,43.26]}],scenes:[{id:'s',items:[]}],updatedAt:1};
saveBoardLibrary(example);
assert.equal(loadBoardLibrary()[0].name,'Cruce Basauri');
assert.ok([...saved.keys()].every(k=>k.startsWith('traza-bizkaia-')));
const imported=validateBoardImport(example);
assert.notEqual(imported.id,example.id);
assert.throws(()=>validateBoardImport({items:'invalid',scenes:[]}));
deleteBoardLibrary('a');
assert.deepEqual(loadBoardLibrary(),[]);
console.log('boardAdvanced PASS: vehicle movement, map geometry, durable library, backup namespace, import validation.');
