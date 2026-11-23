// QA-IMPORT-001-S13: real public UI, real Credit Municipal lot, isolated local data, no Packet key.
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {createServer} from 'node:net';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';

const core=process.env.PI_PLAYWRIGHT_CORE_PATH;
if(!core)throw Error('PI_PLAYWRIGHT_CORE_PATH requis pour la QA navigateur.');
const {chromium}=await import(pathToFileURL(resolve(core,'index.mjs')));
const root=resolve(fileURLToPath(new URL('../../../../../',import.meta.url)));
const dir=await mkdtemp(join(tmpdir(),'import001-qa-'));
const locator=createServer();await new Promise(resolve=>locator.listen(0,'127.0.0.1',resolve));
const port=locator.address().port;await new Promise(resolve=>locator.close(resolve));
const base=`http://127.0.0.1:${port}/`,env={...process.env,PORT:String(port),HOST:'127.0.0.1'};
delete env.PCKT_API_KEY;
let browser,log='';
const app=spawn(process.execPath,[join(root,'bin/app.mjs')],{cwd:dir,env,stdio:['ignore','pipe','pipe']});
app.stdout.on('data',bytes=>{log+=bytes.toString('utf8')});app.stderr.on('data',bytes=>{log+=bytes.toString('utf8')});
try{
 const until=Date.now()+12000;
 while(!log.includes('Application montres :')&&Date.now()<until&&app.exitCode===null)await new Promise(resolve=>setTimeout(resolve,100));
 if(!log.includes('Application montres :'))throw Error(`Application QA non prête : ${log.slice(-600)}`);
 browser=await chromium.launch({executablePath:process.env.QA_CHROMIUM??'/etc/profiles/per-user/anon/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1365,height:900}});
 let submitted=0;page.on('request',request=>{if(request.method()==='POST'&&request.url().endsWith('/studies'))submitted++});
 await page.goto(base,{waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('table[aria-label="Tableau des études"] tbody tr').count(),0);
 await page.getByRole('button',{name:'Commencer une nouvelle analyse'}).click();
 assert.equal(await page.locator('#analysis-modal').isVisible(),true);
 await page.getByRole('button',{name:'Importer mes favoris'}).click();
 assert.equal(await page.locator('#favorite-import').isVisible(),true);
 await page.getByRole('button',{name:'Choisir une autre option'}).click();
 await page.getByRole('button',{name:'Analyser un lot seul'}).click();
 assert.equal(await page.locator('#study-form').isVisible(),true);assert.equal(submitted,0);
 await page.locator('input[name="saleUrl"]').fill('https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/261205000/');
 await page.locator('input[name="number"]').fill('202');
 await page.locator('#study-form button[type="submit"]').click();
 assert.equal(await page.locator('#analysis-modal').isVisible(),true);
 await page.waitForSelector('#manual-result:not([hidden])',{timeout:120000});
 const result=await page.locator('#manual-result').innerText();
 assert.match(result,/Étude terminée pour le lot 202/);
 assert.match(await page.locator('#manual-detail').getAttribute('href'),/^\/studies\/[a-f0-9]{64}$/);
 await page.getByRole('button',{name:'Voir le tableau'}).click();
 await page.waitForURL(base,{timeout:15000});
 const row=page.locator('table[aria-label="Tableau des études"] tr[data-lot="202"]');
 assert.equal(await row.count(),1);
 assert.equal(await row.locator('td').nth(2).innerText(),'PIAGET');
 assert.equal(await row.locator('td').nth(3).innerText(),'non indiqué');
 assert.match(await row.innerText(),/modèle non indiqué/);
 assert.equal(await page.locator('table[aria-label="Tableau des études"] tbody tr').count(),1);
 console.log(JSON.stringify({status:'PARTIAL',environment:'isolated local UI',scenarios:[{id:'IMPORT-001-S12',result:'PASS'},{id:'IMPORT-001-S13',result:'PASS',lot:202,brand:'PIAGET',model:'non indiqué'}],packetCalls:'none (key absent)',studiesSubmitted:submitted},null,2));
}finally{
 await browser?.close();app.kill('SIGTERM');await new Promise(resolve=>{if(app.exitCode!==null||app.signalCode!==null)resolve();else app.once('exit',resolve)});
 await rm(dir,{recursive:true,force:true});
}
