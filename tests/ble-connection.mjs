// Browser API contract tests only: no claim of a physical RaceBox connection.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {SERVICE} from '../src/racebox.js';
import {DEVICE_INFO} from '../src/raceboxConnection.js';
const browser=await chromium.launch();try{for(const scenario of [{model:'RaceBox Mini',all:false},{model:'RaceBox Mini',all:true},{model:'RaceBox Micro',all:true},{cancel:true,all:true}]){
 const page=await browser.newPage();await page.addInitScript(s=>{
  window.bleTrace={};const device=new EventTarget();device.id='TEST-ONLY';device.name='RaceBox Mini 0000000000';
  device.gatt={connected:false,async connect(){this.connected=true;return this;},disconnect(){this.connected=false;},async getPrimaryService(service){if(!window.bleTrace.options.optionalServices.includes(service))throw new DOMException('Service not authorized','SecurityError');return {async getCharacteristic(){const c=new EventTarget();c.readValue=async()=>new DataView(new TextEncoder().encode(s.model).buffer);c.startNotifications=async()=>{window.bleTrace.notifications=true;return c;};return c;}};}};
  Object.defineProperty(navigator,'bluetooth',{configurable:true,value:{getAvailability:async()=>true,requestDevice:async options=>{window.bleTrace.options=options;if(s.cancel)throw new DOMException('User cancelled','NotFoundError');return device;}}});
 },scenario);
 await page.goto('http://localhost:5173');await page.getByRole('button',{name:'Aplikazioan sartu'}).click();await page.getByRole('tab',{name:'GPX / Saioak'}).click();const panel=page.locator('.racebox-panel');await panel.getByRole('button',{name:scenario.all?'Gailu guztiak bilatu':'Konektatu',exact:true}).click();
 if(scenario.cancel)await panel.getByText('Bilaketa:',{exact:false}).first().waitFor();else if(scenario.model==='RaceBox Mini')await page.waitForFunction(()=>window.bleTrace.notifications===true);else await panel.getByText('RaceBox Micro',{exact:false}).first().waitFor();
 const trace=await page.evaluate(()=>window.bleTrace);assert.ok(trace.options.optionalServices.includes(SERVICE));assert.ok(trace.options.optionalServices.includes(DEVICE_INFO));if(scenario.all){assert.equal(trace.options.acceptAllDevices,true);assert.equal(trace.options.filters,undefined);}else{assert.equal(trace.options.filters.length,1);assert.equal(trace.options.filters[0].namePrefix,'RaceBox Mini');assert.equal(trace.options.filters[0].services,undefined);}
 assert.equal(await panel.getByRole('button',{name:'Hasi saioa'}).isDisabled(),true);if(scenario.model==='RaceBox Micro')assert.notEqual(trace.notifications,true);await page.close();
}console.log('Chrome BLE API harness PASS: name-only discovery, broad fallback, explicit GATT permissions, model rejection, cancellation and no session without real GPS');}finally{await browser.close();}
