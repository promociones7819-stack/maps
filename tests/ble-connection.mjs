// Browser API contract tests only: no claim of a physical RaceBox connection.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {SERVICE} from '../src/racebox.js';
import {DEVICE_INFO} from '../src/raceboxConnection.js';
const browser=await chromium.launch();try{for(const scenario of [{model:'RaceBox Mini',all:false},{model:'RaceBox Mini',all:true},{model:'RaceBox Mini S',all:false},{model:'RaceBox Micro',all:true},{cancel:true,all:true}]){
 const page=await browser.newPage();await page.addInitScript(s=>{
  window.bleTrace={};const device=new EventTarget();device.id='TEST-ONLY';device.name='RaceBox Mini 0000000000';
  device.gatt={connected:false,async connect(){this.connected=true;return this;},disconnect(){this.connected=false;},async getPrimaryService(service){if(!window.bleTrace.options.optionalServices.includes(service))throw new DOMException('Service not authorized','SecurityError');return {async getCharacteristic(uuid){const c=new EventTarget();c.uuid=uuid;c.service={device,uuid:service};c.readValue=async()=>new DataView(new TextEncoder().encode(s.model).buffer);c.startNotifications=async()=>{window.bleTrace.notifications=true;window.testNotify=bytes=>{c.value=new DataView(Uint8Array.from(bytes).buffer);c.dispatchEvent(new Event('characteristicvaluechanged'));};return c;};return c;}};}};
  Object.defineProperty(navigator,'bluetooth',{configurable:true,value:{getAvailability:async()=>true,requestDevice:async options=>{window.bleTrace.options=options;if(s.cancel)throw new DOMException('User cancelled','NotFoundError');return device;}}});
 },scenario);
 await page.goto('http://localhost:5173');await page.getByRole('button',{name:'Aplikazioan sartu'}).click();await page.getByRole('tab',{name:'GPX / Saioak'}).click();const panel=page.locator('.racebox-panel');await panel.getByRole('button',{name:scenario.all?'Gailu guztiak bilatu':'Konektatu',exact:true}).click();
 if(scenario.cancel)await panel.getByText('Bilaketa:',{exact:false}).first().waitFor();else if(['RaceBox Mini','RaceBox Mini S'].includes(scenario.model))await page.waitForFunction(()=>window.bleTrace.notifications===true);else await panel.getByText('RaceBox Micro',{exact:false}).first().waitFor();
 const trace=await page.evaluate(()=>window.bleTrace);assert.ok(trace.options.optionalServices.includes(SERVICE));assert.ok(trace.options.optionalServices.includes(DEVICE_INFO));if(scenario.all){assert.equal(trace.options.acceptAllDevices,true);assert.equal(trace.options.filters,undefined);}else{assert.equal(trace.options.filters.length,1);assert.equal(trace.options.filters[0].namePrefix,'RaceBox Mini');assert.equal(trace.options.filters[0].services,undefined);}
 if(scenario.model==='RaceBox Mini S'){
  const bytes='B5 62 FF 01 50 00 A0 E7 0C 07 E6 07 01 0A 08 33 08 37 19 00 00 00 2A AD 4D 0E 03 01 EA 0B C6 93 E1 0D 3B 37 6F 19 61 8C 09 00 0F 01 09 00 9C 03 00 00 2C 07 00 00 23 00 00 00 00 00 00 00 D0 00 00 00 88 A9 DD 00 2C 01 00 59 FD FF 71 00 CE 03 2F FF 56 00 FC FF 06 DB'.split(' ').map(x=>parseInt(x,16));
  await page.evaluate(bytes=>window.testNotify(bytes),bytes);
  await panel.getByText('GPS prest. Hautatu edo sortu ikasle bat saioa hasteko.',{exact:true}).waitFor();
  assert.equal(await panel.getByText('Konektatuta; GPSaren zain.',{exact:true}).count(),0);
 }
 assert.equal(await panel.getByRole('button',{name:'Hasi saioa'}).isDisabled(),true);if(scenario.model==='RaceBox Micro')assert.notEqual(trace.notifications,true);await page.close();
}console.log('Chrome BLE API harness PASS: name-only discovery, broad fallback, explicit GATT permissions, model rejection, cancellation and no session without real GPS');}finally{await browser.close();}
