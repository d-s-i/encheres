// QA read-only with respect to studies. The user opens the installed extension popup on the authenticated Favorites tab first.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve,join} from 'node:path';

const profile=process.env.QA_PROFILE_DIR;
if(!profile||!process.env.PI_PLAYWRIGHT_CORE_PATH)throw Error('QA_PROFILE_DIR et PI_PLAYWRIGHT_CORE_PATH requis. Ouvrir la popup de l’extension avant la commande.');
const port=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];
const {chromium}=await import(pathToFileURL(resolve(process.env.PI_PLAYWRIGHT_CORE_PATH,'index.mjs')));
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const sale='https://www.interencheres.com/art-decoration/horlogerie-692045/';
const base='http://127.0.0.1:3000/';
try{
 const context=browser.contexts()[0];
 const popup=context.pages().find(p=>p.url().startsWith('chrome-extension://')&&p.url().endsWith('/popup.html'));
 if(!popup)throw Error('Popup non ouverte dans ce profil : cliquer sur l’icône de l’extension depuis Mon compte → Favoris.');
 const source=context.pages().find(p=>p.url()==='https://www.interencheres.com/compte/favoris/');
 assert.ok(source,'Page authentifiée Favoris absente');
 assert.match(await source.locator('body').innerText(),/Lot 201/);
 assert.match(await source.locator('body').innerText(),/Lot 202/);
 assert.match(await popup.locator('#source-status').innerText(),/2 favoris Crédit Municipal visibles, dans 1 vente/);
 assert.deepEqual(await popup.locator('#sale option').allTextContents(),['Choisir une vente','horlogerie — 2 lot(s)']);
 await popup.locator('#app-url').selectOption(base);
 await popup.locator('#sale').selectOption(sale);
 const rowsBefore=(await(await fetch(base)).text().then(html=>(html.match(/data-lot="/g)??[]).length));
 const tabOpened=context.waitForEvent('page',{timeout:20000});
 await popup.locator('#import').click();
 const tab=await tabOpened;await tab.waitForURL(url=>url.href.startsWith(base+'?imported='),{timeout:20000});
 assert.equal(await tab.locator('#analysis-modal').isVisible(),true);
 const launch=tab.getByRole('button',{name:"Lancer l'analyse"});
 assert.equal(await launch.getAttribute('data-batch-lots'),'201,202');
 let studiesSubmitted=0;tab.on('request',request=>{if(request.method()==='POST'&&request.url().endsWith('/studies'))studiesSubmitted++});
 tab.once('dialog',dialog=>dialog.dismiss());await launch.click();
 assert.equal(studiesSubmitted,0);
 const rowsAfter=(await(await fetch(base)).text().then(html=>(html.match(/data-lot="/g)??[]).length));
 assert.equal(rowsAfter,rowsBefore);
 console.log(JSON.stringify({status:'PASS_SMOKE',source:'authenticated Interencheres favorites + installed extension',target:'local public UI',selectedSale:sale,lots:[201,202],studiesSubmitted,studiesBefore:rowsBefore,studiesAfter:rowsAfter,limitations:'existing user data; no isolated QA / price search / Vercel'},null,2));
}finally{await browser.close()}
