import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
try {
 const page=await browser.newPage();
 await page.goto('http://127.0.0.1:5173');
 await page.evaluate(async()=>{
  const {saveLibraryReview}=await import('/src/lessonStore.js');
  const review={libraryId:'large',name:'GPX recuperado',points:[{coordinates:[-2.93,43.26],time:1000},{coordinates:[-2.931,43.261],time:2000}],incidents:[{id:'critical',title:'Ceda el paso',note:'Conservar',coordinates:[-2.931,43.261],time:2000}]};
  await saveLibraryReview({id:'large',projectId:'recovery',review});
  localStorage.setItem('traza-bizkaia-projects',JSON.stringify({activeProjectId:'recovery',projects:[{id:'recovery',name:'Recuperación'}]}));
  localStorage.setItem('traza-bizkaia-project-recovery-gpx-review',JSON.stringify({name:review.name,points:[],incidents:[],autosaveReviewId:'large'}));
  localStorage.setItem('traza-bizkaia-autosave-session',JSON.stringify({version:1,projectId:'recovery',reviewId:'large',workspaceMode:'gpx-review'}));
 });
 await page.reload();await page.getByRole('button',{name:/Entrar en la aplicación|Aplikazioan sartu/}).click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('traza-bizkaia-project-recovery-gpx-review')).points.length===2);
 await page.evaluate(async()=>{await(await import('/src/autosave.js')).checkpointAutosave();});
 const result=await page.evaluate(async()=>(await(await import('/src/lessonStore.js')).listLibraryReviews()).find(r=>r.id==='large').review);
 assert.equal(result.points.length,2);assert.equal(result.incidents[0].note,'Conservar');
 console.log('GPX recovery PASS: IndexedDB restores the lightweight cache without overwriting the full route or incidents.');
} finally {await browser.close();}
