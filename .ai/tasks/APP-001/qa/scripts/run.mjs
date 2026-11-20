#!/usr/bin/env node
// External APP-001 QA: a real local app process and visible Chromium, with independently verified HTTPS responses.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdtemp,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {load} from 'cheerio';
import {preflight} from './preflight.mjs';
import {openBrowser,freePort} from './browser.mjs';
const root=resolve(import.meta.dirname,'../../../../..'),qa=resolve(import.meta.dirname,'..');
const app=JSON.parse(await readFile(resolve(qa,'fixtures/manifest.json'))).sources;
const price=JSON.parse(await readFile(resolve(qa,'../../PRICE-001/qa/fixtures/manifest.json'))).sources;
const sale2026=price.sale2026.url,sale2021=price.sale2021.url,sale2022=app.sale2022.url;
const imageRoutes=new Map(Object.entries(app).filter(([k])=>k.startsWith('image-')).map(([,entry])=>[entry.url,resolve(qa,'fixtures',entry.file)]));
const delay=ms=>new Promise(done=>setTimeout(done,ms));
const has=(text,...terms)=>terms.forEach(term=>assert.ok(text.includes(term),`Expected ${JSON.stringify(term)}`));
const lacks=(text,...terms)=>terms.forEach(term=>assert.ok(!text.includes(term),`Unexpected ${JSON.stringify(term)}`));
const stateHtml=s=>load(s.html);
const dateLabel='2026-11-15';
const scenarios=[
 {id:'S01',feature:'APP-001-F01',name:'Étudier une montre et afficher les sources et la photo principale',mode:'baseline',run:async e=>{
  const s=await e.submit(sale2026,268),$=stateHtml(s);e.record(s);
  assert.match(s.path,/^\/studies\/[a-f0-9]{64}$/);has(s.text,'Lot 268','TAG HEUER','Monaco','CAW2111',dateLabel,'4 345 €','3 645,13 €','3 700 €','4 366 €','moyenne partielle','2 annonces','6 annonces analysées sur 10 résultats','échantillon des trois premières pages');
  const photo=$('section').first().find('img[src]').first();assert.equal(photo.attr('src'),app['image-lot268'].url);assert.ok(s.html.indexOf(photo.attr('src'))<s.html.indexOf('<table'));
  has(s.html,price.lot268.url,price.lot246.url,price.pdf2024.url,price.pdf2026.url);
  e.path=s.path;await e.imageLoad();const m=await e.browser.evaluate('({src:document.querySelector("section img")?.src,visible:document.querySelector("section img")?.naturalWidth>0})');assert.equal(m.visible,true);
 }},
 {id:'S02',feature:'APP-001-F01',name:'Fiches et photos des trois comparables retenus',mode:'baseline',run:async e=>{
  await e.submit(sale2026,268);const s=await e.browser.inspect(),$=stateHtml(s);e.record(s);
  assert.equal($('.comparable').length,3);const cards=$('.comparable').toArray().map(el=>$(el));
  has(cards[0].text(),'Adjudication historique','2024-06-15','3 700 €','4 366 €');
  has(cards[1].text(),'Annonce Chrono24','4 100 €','prix demandé');has(cards[2].text(),'Annonce Chrono24','4 590 €','prix demandé');
  assert.equal(cards[0].find('img').first().attr('src'),app['image-lot246'].url);
  assert.equal(cards[1].find('img').first().attr('src'),app['image-packet-48909624'].url);
  assert.equal(cards[2].find('img').first().attr('src'),app['image-packet-48704080'].url);
  assert.equal(cards[0].find(`a[href="${price.lot246.url}"]`).length,1);
  assert.equal(cards[1].find(`a[href="${JSON.parse(await readFile(resolve(qa,'fixtures',app['packet-48909624'].file))).payload.url}"]`).length,1);
  lacks(s.html,'--id48045150.htm','achat conclu');await e.imageLoad();
  const photos=await e.browser.evaluate('[...document.querySelectorAll(".comparable")].map(card=>({src:card.querySelector("img")?.src,loaded:card.querySelector("img")?.naturalWidth>0}))');assert.equal(photos.length,3);assert.ok(photos.every(x=>x.loaded));
 }},
 {id:'S03',feature:'APP-001-F01',name:'Images inaccessibles après sauvegarde',mode:'baseline',run:async e=>{
  const first=await e.submit(sale2026,268);e.path=first.path;await e.imageLoad();
  e.browser.blockedSet.add(app['image-lot268'].url);e.browser.blockedSet.add(app['image-lot246'].url);
  await e.browser.rpc('Network.enable');await e.browser.rpc('Network.setCacheDisabled',{cacheDisabled:true});
  await e.browser.navigate('/');const s=await e.browser.navigate(e.path);e.record(s);has(s.text,'4 345 €','3 645,13 €');has(s.html,price.lot268.url,price.lot246.url);
  await e.imageLoad();const status=await e.browser.evaluate('({target:document.querySelector("section img")?.nextElementSibling?.hidden,credit:document.querySelector(".comparable img")?.nextElementSibling?.hidden,offer:[...document.querySelectorAll(".comparable")].slice(1).map(card=>card.querySelector("img")?.naturalWidth>0)})');
  assert.equal(status.target,false);assert.equal(status.credit,false);assert.deepEqual(status.offer,[true,true]);
 }},
 {id:'S04',feature:'APP-001-F01',name:'Résultat partiel quand Packet et frais historiques indisponibles',mode:'unknown',blocked:true,run:async e=>{
  const s=await e.submit(sale2026,268),$=stateHtml(s);e.record(s);assert.match(s.path,/^\/studies\//);
  has(s.text,'TAG HEUER','Monaco','6 600 €','coût en ligne non vérifié','non vérifiable : accès empêché','non vérifiable : accès à Chrono24 impossible');
  assert.equal($('tr[data-lot="268"]').length,0);const list=await e.browser.navigate('/');e.record(list);assert.equal(stateHtml(list)('tr[data-lot="268"]').length,1);
  lacks(s.text,'Prix à ne pas dépasser — hors frais0 €');
 }},
 {id:'S05',feature:'APP-001-F01',name:'Lot absent sans sauvegarde',mode:'baseline',run:async e=>{
  const s=await e.submit(sale2026,99999);e.record(s);has(s.text,'Lot introuvable dans cette vente');const listing=await e.browser.navigate('/');e.record(listing);assert.equal(stateHtml(listing)('tr[data-lot]').length,0);
 }},
 {id:'S11',feature:'APP-001-F01',name:'Deux ventes historiques avec frais distincts',mode:'baseline',asOf:'2026-11-11',run:async e=>{
  const s=await e.submit(sale2021,318),$=stateHtml(s);e.record(s);assert.match(s.path,/^\/studies\//);
  has(s.text,'2022-06-11','1 650 €','coût en ligne non vérifié','2024-06-15','1 900 €','2 242 €','1 vente avec frais vérifiés');
  assert.equal($('.comparable').length,2);has(s.html,price.lot288.url,price.lot368.url,price.pdf2024.url);
  assert.equal($('.comparable').eq(0).find('img').first().attr('src'),app['image-lot368'].url);
  assert.equal($('.comparable').eq(1).find('img').first().attr('src'),app['image-lot288'].url);
 }},
 {id:'S06',feature:'APP-001-F02',name:'Instantané rouvert après changement de marché',mode:'baseline',run:async e=>{
  const first=await e.submit(sale2026,268);e.path=first.path;const before=(await e.requests()).length;
  await e.update({mode:'new',asOf:'2026-11-16'});await e.restart();
  const s=await e.browser.navigate(e.path);e.record(s);has(s.text,'2026-11-15','4 345 €','3 645,13 €');lacks(s.text,'3 933 €','3 299,49 €');
  assert.equal((await e.requests()).length,before,'opening snapshot must not re-fetch sources');const list=await e.browser.navigate('/');assert.equal(stateHtml(list)('tr[data-lot="268"]').length,1);
 }},
 {id:'S07',feature:'APP-001-F02',name:'Doublon bloqué avant collecte',mode:'baseline',run:async e=>{
  const first=await e.submit(sale2026,268),before=(await e.requests()).length;
  await e.update({mode:'new',asOf:'2026-11-16'});const blocked=await e.submit(sale2026,268);e.record(blocked);has(blocked.text,'Lot déjà analysé','Voir l’étude existante'.replace('’',"'"));assert.equal((await e.requests()).length,before);
  const link=stateHtml(blocked)('a[href^="/studies/"]').first().attr('href');assert.equal(link,first.path);const prior=await e.browser.navigate(link);has(prior.text,'4 345 €','2026-11-15');const list=await e.browser.navigate('/');assert.equal(stateHtml(list)('tr[data-lot="268"]').length,1);
 }},
 {id:'S08',feature:'APP-001-F02',name:'Suppression et nouvelle analyse',mode:'baseline',run:async e=>{
  const first=await e.submit(sale2026,268),old=first.path;await e.browser.remove(268);const gone=await e.browser.navigate('/');assert.equal(stateHtml(gone)('tr[data-lot="268"]').length,0);
  await e.update({mode:'new',asOf:'2026-11-16'});const s=await e.submit(sale2026,268);e.record(s);assert.equal(s.path,old);has(s.text,'2026-11-16','3 933 €','3 299,49 €','3 800 €','3 899 €','4 100 €');lacks(s.text,'4 345 €','3 645,13 €');
  const list=await e.browser.navigate('/');assert.equal(stateHtml(list)('tr[data-lot="268"]').length,1);
 }},
 {id:'S09',feature:'APP-001-F02',name:'Même numéro dans deux ventes distinctes',mode:'baseline',run:async e=>{
  const first=await e.submit(sale2026,268);await e.submit(sale2022,268);const list=await e.browser.navigate('/');e.record(list);const $=stateHtml(list),rows=$('tr[data-lot="268"]');assert.equal(rows.length,2);
  assert.deepEqual(rows.map((_,el)=>$(el).attr('data-sale')).get().sort(),[sale2022,sale2026].sort());
  const detailFirst=await e.browser.navigate(first.path);has(detailFirst.text,'TAG HEUER','Monaco');assert.equal(stateHtml(detailFirst)('section').first().find('img').first().attr('src'),app['image-lot268'].url);
  const other=rows.filter((_,el)=>$(el).attr('data-sale')===sale2022).find('a[href^="/studies/"]').first().attr('href');const detailSecond=await e.browser.navigate(other);has(detailSecond.text,'CHOPARD','Happy Sport');assert.equal(stateHtml(detailSecond)('section').first().find('img').first().attr('src'),app['image-lot2022_268'].url);
 }},
 {id:'S10',feature:'APP-001-F02',name:'Suppression isolée de deux ventes',mode:'baseline',run:async e=>{
  await e.submit(sale2026,268);await e.submit(sale2022,268);const list=await e.browser.navigate('/');const $=stateHtml(list),other=$('tr[data-sale="'+sale2022+'"] a[href^="/studies/"]').first().attr('href');assert.ok(other);
  await e.browser.navigate('/');await e.browser.evaluate(`document.querySelector('tr[data-sale=${JSON.stringify(sale2026)}] form').requestSubmit()`);await e.browser.until(s=>s.path==='/'&&!s.html.includes(`data-sale="${sale2026}"`),'delete first sale');await e.restart();
  const after=await e.browser.navigate('/');e.record(after);assert.equal(stateHtml(after)('tr[data-lot="268"]').length,1);has(after.html,sale2022);lacks(after.html,`data-sale="${sale2026}"`);
  const remaining=await e.browser.navigate(other);has(remaining.text,'CHOPARD','Happy Sport');assert.equal(stateHtml(remaining)('section').first().find('img').first().attr('src'),app['image-lot2022_268'].url);
 }},
 {id:'S12',feature:'APP-001-F03',name:'Grille Excel avec ventes historiques et liens',mode:'grid',run:async e=>{
  const a=await e.submit(sale2026,268);assert.match(a.path,/^\/studies\//);await e.submit(sale2026,343);const s=await e.browser.navigate('/');e.record(s);const $=stateHtml(s);
  assert.equal($('tr[data-lot]').length,2);for(const name of ['Vente','Lot','Marque','Type','Boîtes','Bracelet','Estimation','Prix Chrono24 moyen','Moyenne Crédit Municipal','Observations'])assert.ok($('th').toArray().some(x=>$(x).text().includes(name)),name);
  for(const date of ['2022-12-10','2023-06-17','2024-06-15'])assert.equal($(`td[data-date="${date}"]`).length,2,date);
  const x=$('tr[data-lot="268"]'),y=$('tr[data-lot="343"]');assert.match(x.find('td[data-date="2022-12-10"]').text(),/4 800.*non vérifié/);assert.match(x.find('td[data-date="2024-06-15"]').text(),/3 700.*4 366/);assert.equal(x.find('td[data-date="2023-06-17"]').text().trim(),'—');assert.match(y.find('td[data-date="2023-06-17"]').text(),/4 200.*non vérifié/);
  assert.deepEqual(x.find('td[data-column="chrono24"] a').map((_,el)=>$(el).attr('href')).get(),[48909624,48704080].map(id=>JSON.parse((e.packet[id])).payload.url));
  for(const row of [x,y])assert.equal(row.find('form[action$="/delete"]').length,1);
  const detail=await e.browser.navigate(x.find('a[href^="/studies/"]').first().attr('href'));assert.ok(stateHtml(detail)('.comparable img').length>=2);
 }},
 {id:'S13',feature:'APP-001-F03',name:'Moyennes et cellules absentes sans faux prix',mode:'unknown',run:async e=>{
  await e.submit(sale2021,323);await e.submit(sale2026,268);const s=await e.browser.navigate('/');e.record(s);const $=stateHtml(s),ch=$('tr[data-lot="323"]'),other=$('tr[data-lot="268"]');assert.equal(ch.length,1);assert.equal(other.length,1);
  assert.ok((ch.text().match(/indisponible/g)||[]).length>=2);assert.equal(ch.find('td[data-column="chrono24"] a').length,0);
  assert.equal(ch.find('td[data-date="2023-06-17"]').text().trim(),'—');assert.match(other.find('td[data-date="2023-06-17"]').text(),/6 600.*non vérifié/);
 }},
 {id:'S14',feature:'APP-001-F03',name:'Grille sans défilement horizontal avec six dates',mode:'wide',run:async e=>{
  await e.submit(sale2026,268);await e.submit(sale2026,343);const s=await e.browser.navigate('/');e.record(s);const $=stateHtml(s);
  assert.equal(s.width,1357);assert.ok(s.scrollWidth<=s.width,`horizontal scroll ${s.scrollWidth}/${s.width}`);assert.ok(s.tableWidth<=s.containerWidth+1);
  const dates=$('table[aria-label="Tableau des études"] th').map((_,x)=>$(x).text()).get().filter(t=>t.startsWith('Vente du '));assert.equal(dates.length,4);
  const extra=$('tr[data-lot="268"] .extra-dates');assert.match(extra.text(),/dates historiques supplémentaires/);assert.match(extra.attr('title'),/2021|2023/);
  await e.browser.screenshot(resolve(qa,'evidence','APP-001-S14.png'));
  const link=$('tr[data-lot="268"] a[href^="/studies/"]').first().attr('href');const detail=await e.browser.navigate(link);has(detail.html,app.lot2021_monaco.url,app.lot2023_monaco_june.url,'2021-12-11','2023-06-17');
 }},
];
const only=process.argv.find(arg=>arg.startsWith('--scenario='))?.slice('--scenario='.length);
if(only&&!scenarios.some(s=>s.id===only))throw Error(`Unknown QA scenario ${only}`);
const selected=only?scenarios.filter(s=>s.id===only):scenarios;
const result={task:'APP-001',interface:'pnpm app:start — form saleUrl + number in Chromium',scope:only??'full',started_at:new Date().toISOString(),preflight:null,scenarios:[],status:'BLOCKED'};
async function scenarioRun(def){
 const work=await mkdtemp(join(tmpdir(),'app001-qa-')),configPath=join(work,'config.json'),logPath=join(work,'requests.ndjson'),port=await freePort();
 let appProcess,browser,output='',envState={mode:def.mode,asOf:def.asOf??dateLabel,blocked:def.blocked??false};
 const base=`http://127.0.0.1:${port}/`,events=[];
 const update=async values=>{Object.assign(envState,values);await writeFile(configPath,JSON.stringify(envState))};
 await update({});await writeFile(logPath,'');
 const startApp=async()=>{
  const env={...process.env,PORT:String(port),HOST:'127.0.0.1',PCKT_API_KEY:'qa-replay-only',QA_APP_CONFIG:configPath,QA_APP_LOG:logPath,NODE_OPTIONS:`--import=${resolve(import.meta.dirname,'replay.mjs')}`};
  appProcess=spawn(process.execPath,[resolve(root,'bin/app.mjs')],{cwd:work,env,stdio:['ignore','pipe','pipe']});
  for(const stream of [appProcess.stdout,appProcess.stderr])stream.on('data',x=>{output+=x.toString()});
  for(let i=0;i<100;i++){try{const r=await fetch(base,{signal:AbortSignal.timeout(1000)});if(r.status===200)return}catch{}if(appProcess.exitCode!==null)throw Error('app server exited '+output);await delay(100)}
  throw Error('app server did not start');
 };
 const stopApp=async()=>{if(!appProcess)return;const proc=appProcess;proc.kill();await Promise.race([new Promise(done=>proc.once('exit',done)),delay(1800)]);appProcess=null};
 const imageLoad=async()=>{await browser.evaluate('window.scrollTo(0,document.body.scrollHeight)');await delay(1200)};
 const record=state=>events.push({url:state.url,text:state.text,html:state.html,width:state.width,scrollWidth:state.scrollWidth});
 const packet={};
 try{
  for(const id of [48909624,48704080,41128458,45122294])packet[id]=await readFile(resolve(qa,'fixtures',app['packet-'+id].file),'utf8');
  await startApp();browser=await openBrowser(base,work,{images:imageRoutes});
  const ctx={browser,base,config:envState,packet,record,update,imageLoad,requests:async()=>JSON.parse('['+(await readFile(logPath,'utf8')).trim().split('\n').filter(Boolean).join(',')+']'),submit:(sale,lot)=>browser.submit(sale,lot),restart:async()=>{await browser.close();await stopApp();await startApp();browser=await openBrowser(base,work,{images:imageRoutes});ctx.browser=browser}};
  await def.run(ctx);
  // Delete only through the public user interface; no QA database writes.
  await browser.navigate('/');
  for(let i=0;i<5;i++){
   const s=await browser.inspect(),$=stateHtml(s),row=$('tr[data-lot]').first();if(!row.length)break;
   const sale=row.attr('data-sale'),lot=row.attr('data-lot'),before=$('tr[data-lot]').length;
   await browser.evaluate(`document.querySelector('tr[data-sale=${JSON.stringify(sale)}][data-lot=${JSON.stringify(lot)}] form').requestSubmit()`);
   await browser.until(x=>x.path==='/'&&stateHtml(x)('tr[data-lot]').length===before-1,'cleanup via public delete');
  }
  return {status:'PASS',evidence:{command:`node --import=${resolve(import.meta.dirname,'replay.mjs')} ${resolve(root,'bin/app.mjs')} (cwd isolated, HOST=127.0.0.1 PORT=${port}) + Chromium user form actions`,config:envState,events,requests:await ctx.requests(),images:browser.imageCalls,serverOutput:output,cleanup:'public delete forms, temporary app directory removed'}};
 }catch(error){
  await mkdir(resolve(qa,'evidence'),{recursive:true});if(browser)try{await browser.screenshot(resolve(qa,'evidence',`APP-001-${def.id}-failure.png`))}catch{}
  return {status:/Chromium exited|DevTools tab unavailable/.test(error.message)?'ENVIRONMENT_ERROR':'FAIL',error:String(error.stack??error),evidence:{config:envState,events,requests:await readFile(logPath,'utf8').catch(()=>''),images:browser?.imageCalls??[],serverOutput:output,command:`node --import=${resolve(import.meta.dirname,'replay.mjs')} ${resolve(root,'bin/app.mjs')} + Chromium`}};
 }finally{if(browser)await browser.close().catch(()=>{});await stopApp();await rm(work,{recursive:true,force:true}).catch(()=>{})}
}
// Preflight is complete before any scenario is classified.
try{result.preflight=await preflight();await mkdir(resolve(qa,'evidence'),{recursive:true});console.log('PREFLIGHT PASS',result.preflight.checked.length,'captured responses')}
catch(error){result.setup_error=String(error.stack??error);console.error('PREFLIGHT INCOMPLETE',result.setup_error);process.exitCode=4}
if(result.preflight){
 for(const feature of ['APP-001-F01','APP-001-F02','APP-001-F03']){
  for(const def of selected.filter(s=>s.feature===feature)){
   const outcome=await scenarioRun(def);result.scenarios.push({id:`QA-APP-001-${def.id}`,feature,name:def.name,...outcome});console.log(outcome.status,`QA-APP-001-${def.id}`,outcome.error?.split('\n')[0]??'');
  }
 }
 result.status=result.scenarios.every(s=>s.status==='PASS')?'PASS':result.scenarios.some(s=>s.status==='FAIL')?'FAIL':'BLOCKED';process.exitCode=result.status==='PASS'?0:result.status==='BLOCKED'?2:1;
}
result.completed_at=new Date().toISOString();await writeFile(resolve(qa,only?`evidence/APP-001-${only}-rerun.json`:'result.json'),JSON.stringify(result,null,2)+'\n');console.log(`QA ${result.status}: ${result.scenarios.length}/${selected.length} scenarios`);
