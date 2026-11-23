// Read-only browser smoke of the installed local UI. Does not import, bid or submit an analysis.
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const core=process.env.PI_PLAYWRIGHT_CORE_PATH;
if(!core)throw Error('PI_PLAYWRIGHT_CORE_PATH requis pour le navigateur de QA.');
const {chromium}=await import(pathToFileURL(resolve(core,'index.mjs')));
const base='http://127.0.0.1:3000/';
const sale='https://www.interencheres.com/art-decoration/horlogerie-692045/';
const browser=await chromium.launch({executablePath:process.env.QA_CHROMIUM??'/etc/profiles/per-user/anon/bin/chromium',headless:true,args:['--no-sandbox']});
const observations=[];
try{
 const page=await browser.newPage({viewport:{width:1365,height:900}});
 let submitted=0;
 page.on('request',request=>{if(request.method()==='POST'&&request.url().endsWith('/studies'))submitted++});
 await page.goto(base,{waitUntil:'domcontentloaded'});
 const initialRows=await page.locator('table[aria-label="Tableau des études"] tbody tr').count();
 assert.equal(await page.locator('#analysis-modal').isVisible(),false);
 assert.equal(await page.locator('#studies table[aria-label="Tableau des études"]').isVisible(),true);
 assert.equal(await page.locator('.favorite-batch').count(),0);
 observations.push({check:'S10 accueil',status:'PASS'});
 await page.getByRole('button',{name:'Commencer une nouvelle analyse'}).click();
 assert.equal(await page.locator('#analysis-modal').isVisible(),true);
 await page.getByRole('button',{name:'Importer mes favoris'}).click();
 assert.equal(await page.locator('#favorite-import').isVisible(),true);
 await page.getByRole('button',{name:'Choisir une autre option'}).click();
 await page.getByRole('button',{name:'Analyser un lot seul'}).click();
 assert.equal(await page.locator('#study-form').isVisible(),true);
 await page.getByRole('button',{name:'Fermer la fenêtre d’analyse'}).click();
 assert.equal(await page.locator('#analysis-modal').isVisible(),false);
 observations.push({check:'S12 choix modaux',status:'PASS'});
 await page.goto(base+'?imported='+encodeURIComponent(sale),{waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('#analysis-modal').isVisible(),true);
 const launch=page.getByRole('button',{name:"Lancer l'analyse"});
 assert.equal(await launch.isVisible(),true);
 const offered=(await launch.getAttribute('data-batch-lots')).split(',').map(Number);
 assert.deepEqual(offered,[201,202]);
 page.once('dialog',dialog=>dialog.dismiss());
 await launch.click();
 assert.equal(await page.locator('.batch-progress').isVisible(),false);
 assert.equal(submitted,0);
 assert.equal(await page.locator('table[aria-label="Tableau des études"] tbody tr').count(),initialRows);
 observations.push({check:'retour import (sans étude), confirmation annulée',status:'PASS',offered});
 console.log(JSON.stringify({status:'PARTIAL',interface:base,observations,unverified:['extension authentifiée','étude réelle avec Packet','pagination et Vercel']},null,2));
}finally{await browser.close()}
