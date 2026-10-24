import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {installMapFixtures} from './map-fixtures.mjs';
const browser=await chromium.launch();try{
 const page=await browser.newPage();await installMapFixtures(page);
 await page.addInitScript(()=>{localStorage.setItem('traza-bizkaia-language','es');localStorage.setItem('traza-bizkaia-projects',JSON.stringify({activeProjectId:'search-test',projects:[{id:'search-test',name:'Search test'}]}));localStorage.setItem('traza-bizkaia-project-search-test',JSON.stringify([{id:'r',name:'Trayectoria A',color:'#e36b4d',points:[[-2.93,43.26],[-2.931,43.261]]}]));});
 let calls=0;await page.route('https://www.cartociudad.es/geocoder/api/geocoder/**',async route=>{calls++;const url=new URL(route.request().url());await route.fulfill({json:url.pathname.endsWith('candidates')?[{id:'48044',address:'Getxo, Bizkaia',type:'Municipio',lat:0,lng:0},{id:'street',address:'Gran Vía, Bilbao',type:'callejero',lat:43.26,lng:-2.94}]:{lat:43.3557,lng:-3.0095}});});
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:5177');await page.getByRole('button',{name:'Entrar en la aplicación'}).click();
 const button=page.getByRole('button',{name:/Buscar lugar/});await button.click();const panel=page.locator('.place-search-panel');await panel.getByLabel('Pueblo o calle').fill('Getxo');assert.equal(calls,0);await panel.getByRole('button',{name:'Buscar',exact:true}).click();await panel.getByRole('button',{name:/Getxo, Bizkaia/}).click();await panel.waitFor({state:'hidden'});assert.equal(calls,2);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('traza-bizkaia-project-search-test'))[0].points.length),2);
 await button.click();await panel.getByLabel('Pueblo o calle').fill('Gran Vía Bilbao');await panel.getByRole('button',{name:'Buscar',exact:true}).click();await panel.getByRole('button',{name:/Gran Vía, Bilbao/}).click();await panel.waitFor({state:'hidden'});assert.equal(calls,3);
 console.log('Place search: explicit submission, candidate resolution, street coordinates and unchanged trajectory PASS');
}finally{await browser.close();}
