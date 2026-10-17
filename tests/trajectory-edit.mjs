import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch();try{
 const page=await browser.newPage();await page.addInitScript(()=>{
  if(localStorage.getItem('point-test-seeded'))return;
  localStorage.setItem('point-test-seeded','1');localStorage.setItem('traza-bizkaia-language','es');
  localStorage.setItem('traza-bizkaia-projects',JSON.stringify({activeProjectId:'test-points',projects:[{id:'test-points',name:'Test points'}]}));
  localStorage.setItem('traza-bizkaia-project-test-points',JSON.stringify([{id:'route-test',name:'Trayectoria A',color:'#e36b4d',points:[[-2.93,43.26],[-2.931,43.261],[-2.932,43.262]]}]));
 });await page.goto('http://localhost:5173');await page.getByRole('button',{name:'Entrar en la aplicación'}).click();
 const editor=page.locator('.trajectory-point-editor'),select=editor.getByLabel('Punto del itinerario');
 const points=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('traza-bizkaia-project-test-points'))[0].points);
 await select.selectOption('1');await editor.getByRole('button',{name:'↑ Adelantar'}).click();assert.deepEqual(await points(),[[-2.931,43.261],[-2.93,43.26],[-2.932,43.262]]);
 await editor.getByRole('button',{name:'↓ Retrasar'}).click();assert.deepEqual(await points(),[[-2.93,43.26],[-2.931,43.261],[-2.932,43.262]]);
 await editor.getByRole('button',{name:'Recolocar punto'}).click();await page.locator('.map-canvas').click({position:{x:350,y:260}});await page.waitForTimeout(250);const moved=await points();assert.equal(moved.length,3);assert.notDeepEqual(moved[1],[-2.931,43.261]);assert.deepEqual(moved[0],[-2.93,43.26]);
 await editor.getByRole('button',{name:'Eliminar punto',exact:true}).click();assert.deepEqual(await points(),[[-2.93,43.26],[-2.932,43.262]]);
 await page.reload();await page.getByRole('button',{name:'Entrar en la aplicación'}).click();await select.waitFor();assert.equal(await select.locator('option').count(),3);assert.deepEqual(await points(),[[-2.93,43.26],[-2.932,43.262]]);
 console.log('Trajectory point reorder, relocation without extra point, individual removal and persistence PASS');
}finally{await browser.close();}
