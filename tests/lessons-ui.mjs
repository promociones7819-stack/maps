import {chromium,webkit} from '@playwright/test';
import assert from 'node:assert/strict';
for(const type of [chromium,webkit]){
 const browser=await type.launch({headless:true});const page=await browser.newPage({viewport:{width:834,height:1194}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5173');await page.getByRole('button',{name:'Aplikazioan sartu'}).click();await page.getByRole('tab',{name:'GPX / Saioak'}).click();
 const panel=page.locator('.racebox-panel');await panel.getByRole('textbox',{name:'Ikasle berria'}).fill('Ane');await panel.locator('.lesson-new-student button').click();
 if(type===webkit){await panel.getByRole('button',{name:'Konektatu',exact:true}).click();await page.getByText('En iPad necesitas la app nativa.',{exact:false}).count();assert.match(await panel.innerText(),/aplikazio natiboa/);}
 assert.equal(await panel.getByRole('button',{name:'Hasi saioa'}).isDisabled(),true);
 const gpx='<gpx xmlns="http://www.topografix.com/GPX/1/1"><trk><trkseg><trkpt lat="43.26" lon="-2.93"><time>2026-10-13T10:00:00Z</time></trkpt><trkpt lat="43.261" lon="-2.931"><time>2026-10-13T10:00:01Z</time></trkpt></trkseg></trk></gpx>';
 await panel.getByLabel('GPX',{exact:true}).setInputFiles({name:'lesson.gpx',mimeType:'application/gpx+xml',buffer:Buffer.from(gpx)});await panel.getByRole('button',{name:'Saioa gorde'}).click();await page.waitForTimeout(150);assert.equal(await panel.locator('.lesson-history').count(),1);
 const d=page.waitForEvent('download');await panel.getByRole('button',{name:'GPX ↓',exact:true}).click();assert.match((await d).suggestedFilename(),/\.gpx$/);
 await page.reload();await page.getByRole('button',{name:'Aplikazioan sartu'}).click();await page.getByRole('tab',{name:'GPX / Saioak'}).click();await panel.getByLabel('Ikaslea',{exact:true}).selectOption({label:'Ane'});assert.equal(await panel.locator('.lesson-history').count(),1);await panel.locator('.lesson-history').click();assert.equal(await page.locator('.gpx-summary').count(),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:`tests/${type.name()}-ipad.png`});
 await page.getByLabel('Hizkuntza / Idioma',{exact:true}).selectOption('es');assert.equal(await panel.getByRole('button',{name:'Iniciar sesión'}).count(),1);
 assert.deepEqual(errors,[]);await browser.close();console.log(type.name()+': Basque default, GPX, student history, reload, export and language PASS');
}
