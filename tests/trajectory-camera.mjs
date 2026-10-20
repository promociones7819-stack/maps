import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const browser=await chromium.launch();try{
 const page=await browser.newPage();await page.addInitScript(()=>{localStorage.setItem('traza-bizkaia-language','es');localStorage.setItem('traza-bizkaia-projects',JSON.stringify({activeProjectId:'camera-test',projects:[{id:'camera-test',name:'Camera test'}]}));localStorage.setItem('traza-bizkaia-project-camera-test',JSON.stringify([{id:'route-camera',name:'Trajectory',color:'#e36b4d',points:[]}]));});
 await page.goto('http://localhost:5173');await page.getByRole('button',{name:'Entrar en la aplicación'}).click();await page.locator('.map-canvas canvas').waitFor();await page.getByRole('button',{name:'+ Añadir puntos',exact:true}).click();
 const map=page.locator('.map-canvas');for(const x of [200,350,500]){await map.click({position:{x,y:220}});await page.waitForTimeout(850);}
 const points=await page.evaluate(()=>JSON.parse(localStorage.getItem('traza-bizkaia-project-camera-test'))[0].points);assert.equal(points.length,3);assert.ok(Math.abs(points[0][1]-points[1][1])<1e-7);assert.ok(Math.abs(points[1][1]-points[2][1])<1e-7);assert.ok(Math.abs((points[1][0]-points[0][0])-(points[2][0]-points[1][0]))<1e-7);
 // Selecting and reordering must also preserve the same pixel-to-coordinate mapping.
 await page.getByLabel('Punto del itinerario',{exact:true}).selectOption('0');await page.getByRole('button',{name:'↓ Retrasar',exact:true}).click();await page.waitForTimeout(850);await page.getByRole('button',{name:'+ Añadir puntos',exact:true}).click();await map.click({position:{x:650,y:220}});await page.waitForTimeout(850);
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('traza-bizkaia-project-camera-test'))[0].points);assert.equal(after.length,4);assert.ok(Math.abs(after[3][1]-points[2][1])<1e-7);assert.ok(Math.abs((after[3][0]-points[2][0])-(points[2][0]-points[1][0]))<1e-7);
 console.log('Editing camera stays fixed across first point, successive additions, point selection and reordering PASS');
}finally{await browser.close();}
