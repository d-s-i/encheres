import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {createApplication} from '../src/app.mjs';
import {load} from 'cheerio';

const sale='https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/261205000/';
const target=sale+'tag-heuer-monaco/';
const historic='https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/240615000/tag-heuer-monaco/';
const offer='https://www.chrono24.fr/tagheuer/monaco--id1.htm';
const watch={number:268,brand:'TAG HEUER',model:'Monaco',box:'absent',bracelet:'cuir',reference:'CAW2111',estimation:[1000,2000],source:target,saleUrl:sale};
const comparison={lot:268,brand:'TAG HEUER',model:'Monaco',reference:'CAW2111',asOf:'2026-11-15',credit:{status:'available',average:4366,count:1,sales:[{number:246,date:'2024-06-15',reference:'CW2113-0',hammerPrice:3700,onlineCost:4366,buyerPercent:18,livePercent:0,feeSource:'https://example.org/dated.pdf',url:historic,differences:{reference:'CW2113-0 (lot : CAW2111)'}}]},chrono:{status:'partial',average:4345,count:2,offers:[{id:1,price:4100,currency:'EUR',url:offer,sellerCountry:'FR',condition:'Très bon',differences:{bracelet:'acier (lot : cuir)'}},{id:2,price:4590,currency:'EUR',url:'https://www.chrono24.fr/tagheuer/monaco--id2.htm',sellerCountry:'FR',differences:{}}],sample:{inspectedPages:3,inspectedListings:150,totalListings:1195,totalPages:24}},ceiling:{status:'partial',amount:3645.13,sourceCount:2,sourceAverage:4345,buyerPercent:18,livePercent:1.2,feeSource:'https://www.creditmunicipal.fr/app/uploads/sales/261205000/generate-catalogue-261205000.pdf'}};
async function withServer(fn,{study=async()=>({watches:[watch],missing:[]}),compare=async()=>comparison,images=async()=>({target:['https://www.creditmunicipal.fr/app/uploads/sales/261205000/images/268-1.jpg'],credit:{[historic]:['https://www.creditmunicipal.fr/app/uploads/sales/240615000/images/246-1.jpg']},offers:{[offer]:['https://img.chrono24.com/images/uhren/1.jpg']}}),asOf=()=>comparison.asOf}={}){
 const dir=await mkdtemp(join(tmpdir(),'app001-unit-'));
 const handler=createApplication({dataDir:dir,study,compare,images,asOf});
 const server=await new Promise(resolve=>{const s=createServer(handler);s.listen(0,'127.0.0.1',()=>resolve(s))});
 const base=`http://127.0.0.1:${server.address().port}`;
 try{await fn({base,dir,handler})}finally{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true})}
}
const submit=(base,number=268,url=sale)=>fetch(base+'/studies',{method:'POST',redirect:'manual',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({saleUrl:url,number:String(number)})});

test('public form studies a lot, saves a sourced price table and puts the target and comparable photos in the right places',async()=>{
 await withServer(async({base})=>{
  const home=await(await fetch(base)).text();assert.match(home,/name="saleUrl"/);assert.match(home,/name="number"/);
  const response=await submit(base);assert.equal(response.status,303);
  const page=await(await fetch(new URL(response.headers.get('location'),base))).text();
  for(const word of ['Lot 268','TAG HEUER','Monaco','CAW2111','Estimation','1 000','2 000','2026-11-15','moyenne partielle','4 345','2 annonces','3 700','4 366','2024-06-15','3 645,13','18%','1.2%','150 annonces','1195 résultats','prix demandés','hors frais','état : Très bon',target,historic,offer])assert.ok(page.includes(word),word);
  assert.ok(page.indexOf('268-1.jpg')<page.indexOf('<table'), 'Target image must be above the table');
  assert.ok(page.indexOf('246-1.jpg')>page.indexOf('</table>'),'Historic image must follow the table');
  assert.ok(page.indexOf('uhren/1.jpg')>page.indexOf('</table>'),'Listing image must follow the table');
  assert.equal((page.match(/class="comparable"/g)||[]).length,3);
  const listing=await(await fetch(base)).text();assert.match(listing,/Lot 268/);
  const $=load(listing),links=$('tr[data-lot="268"] td[data-column="chrono24"] a').map((_,a)=>$(a).attr('href')).get();
  assert.deepEqual(links,[offer,comparison.chrono.offers[1].url]);
 });
});

test('unavailable external photo shows a fallback and saved table still opens without a new comparison',async()=>{
 let calls=0;
 await withServer(async({base})=>{
  const r=await submit(base);assert.equal(r.status,303);
  const page=await(await fetch(new URL(r.headers.get('location'),base))).text();
  assert.match(page,/Image indisponible/);assert.match(page,/4 345/);assert.match(page,/class="comparable"/);
  assert.equal(calls,1);
 },{compare:async()=>{calls++;return comparison},images:async()=>({target:[],credit:{},offers:{}})});
});

test('missing lot or invalid sale cannot create a saved analysis',async()=>{
 await withServer(async({base})=>{
  assert.equal((await submit(base,99999)).status,422);
  assert.equal((await submit(base,268,'https://example.org/wrong/')).status,422);
  assert.doesNotMatch(await(await fetch(base)).text(),/Lot 268|Lot 99999/);
 },{study:async({numbers})=>({watches:numbers.includes(268)?[watch]:[],missing:[99999]})});
});

test('external names, URLs and image sources cannot inject executable HTML into the public view',async()=>{
 const r=structuredClone(comparison);r.brand='<script>alert(1)</script>';
 r.chrono.offers[0].url='javascript:alert(1)';r.chrono.offers[0].condition='<img src=x onerror=alert(1)>';
 await withServer(async({base})=>{
  const response=await submit(base);assert.equal(response.status,303);
  const page=await(await fetch(new URL(response.headers.get('location'),base))).text();
  assert.match(page,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(page,/&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(page,/href="javascript:|src="https:\/\/attacker\.example|<script>alert\(1\)<\/script>/);
  assert.doesNotMatch(await(await fetch(base)).text(),/href="javascript:/);
 },{compare:async()=>r,images:async()=>({target:['https://attacker.example/x.jpg'],credit:{},offers:{}})});
});

test('saved duplicate is blocked before any source request and opens the unmodified study',async()=>{
 let studies=0,comparisons=0,photos=0;
 await withServer(async({base})=>{
  const first=await submit(base);assert.equal(first.status,303);
  const location=first.headers.get('location');
  const second=await submit(base);assert.equal(second.status,409);
  assert.match(await second.text(),/Lot déjà analysé/);
  assert.deepEqual([studies,comparisons,photos],[1,1,1]);
  const previous=await(await fetch(new URL(location,base))).text();assert.match(previous,/4 345/);
  const list=await(await fetch(base)).text();assert.equal((list.match(/Lot 268/g)||[]).length,1);
 },{study:async()=>{studies++;return {watches:[watch],missing:[]}},compare:async()=>{comparisons++;return comparison},images:async()=>{photos++;return {target:[],credit:{},offers:{}}}});
});

test('simultaneous requests for one lot do not run the analysis twice and a failed attempt can be retried',async()=>{
 const started=Promise.withResolvers(),release=Promise.withResolvers();let calls=0;
 await withServer(async({base})=>{
  const first=submit(base);await started.promise;
  const second=await submit(base);assert.equal(second.status,409);assert.match(await second.text(),/Analyse en cours/);assert.equal(calls,1);
  release.resolve();assert.equal((await first).status,303);
  assert.equal((await submit(base)).status,409);assert.equal(calls,1);
 },{study:async()=>{calls++;started.resolve();await release.promise;return {watches:[watch],missing:[]}}});
 let retry=0;
 await withServer(async({base})=>{assert.equal((await submit(base)).status,500);assert.equal((await submit(base)).status,303);assert.equal(retry,2)},{study:async()=>{retry++;if(retry===1)throw Error('source indisponible');return {watches:[watch],missing:[]}}});
});

test('saved snapshot survives reopening with changed external prices and never recalculates on GET',async()=>{
 await withServer(async({base,dir})=>{
  const saved=await submit(base);assert.equal(saved.status,303);
  const path=saved.headers.get('location');
  const reopened=await new Promise(resolve=>{const s=createServer(createApplication({dataDir:dir,study:async()=>{throw Error('should not study again')},compare:async()=>{throw Error('should not compare again')}}));s.listen(0,'127.0.0.1',()=>resolve(s))});
  const other=`http://127.0.0.1:${reopened.address().port}`;
  try{const list=await(await fetch(other)).text();assert.match(list,/Lot 268/);const view=await(await fetch(other+path)).text();assert.match(view,/2026-11-15/);assert.match(view,/4 345/);assert.doesNotMatch(view,/3 933/);assert.match(view,/268-1.jpg/)}
  finally{await new Promise(resolve=>reopened.close(resolve))}
 });
});

test('removing a saved row makes the old view unavailable and permits a fresh price and date',async()=>{
 let date='2026-11-15',price=4345,calls=0;
 await withServer(async({base})=>{
  const first=await submit(base);assert.equal(first.status,303);const path=first.headers.get('location');
  const list=await(await fetch(base)).text();assert.match(list,/Supprimer/);
  const removal=await fetch(base+path+'/delete',{method:'POST',redirect:'manual'});assert.equal(removal.status,303);assert.equal(removal.headers.get('location'),'/');
  assert.equal((await fetch(base+path)).status,404);
  assert.doesNotMatch(await(await fetch(base)).text(),/Lot 268/);
  date='2026-11-16';price=3933;
  const fresh=await submit(base);assert.equal(fresh.status,303);assert.equal(calls,2);
  const page=await(await fetch(base+fresh.headers.get('location'))).text();
  assert.match(page,/3 933/);assert.match(page,/3 800/);assert.match(page,/3 899/);assert.match(page,/3 299,49/);assert.match(page,/2026-11-16/);assert.doesNotMatch(page,/4 345|4 590/);
  assert.equal((await fetch(base+path+'/delete',{method:'GET'})).status,404);
 },{asOf:()=>date,compare:async(_watch,{asOf})=>{calls++;return {...comparison,asOf,chrono:{...comparison.chrono,average:price,count:price===4345?2:3,offers:price===4345?comparison.chrono.offers:[3800,3899,4100].map((amount,i)=>({...comparison.chrono.offers[0],id:i+3,price:amount,url:`https://www.chrono24.fr/tagheuer/monaco--id${i+3}.htm`}))},ceiling:{...comparison.ceiling,amount:price===4345?3645.13:3299.49,sourceAverage:price,sourceCount:price===4345?2:3}}}});
});

test('same lot number in two sales has two independent rows, views and deletions',async()=>{
 const secondSale='https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/240615000/';
 let calls=0;
 await withServer(async({base})=>{
  const first=await submit(base),second=await submit(base,268,secondSale);
  assert.equal(first.status,303);assert.equal(second.status,303);assert.notEqual(first.headers.get('location'),second.headers.get('location'));
  assert.equal(calls,2);
  const list=await(await fetch(base)).text();assert.equal((list.match(/Lot 268/g)||[]).length,2);assert.match(list,/261205000/);assert.match(list,/240615000/);
  const other=await(await fetch(base+second.headers.get('location'))).text();assert.match(other,/240615000/);assert.match(other,/268-2.jpg/);
  assert.equal((await fetch(base+first.headers.get('location')+'/delete',{method:'POST',redirect:'manual'})).status,303);
  assert.equal((await fetch(base+first.headers.get('location'))).status,404);
  const retained=await(await fetch(base+second.headers.get('location'))).text();assert.match(retained,/268-2.jpg/);assert.match(retained,/4 345/);
  assert.equal((await fetch(base+first.headers.get('location')+'/delete',{method:'POST',redirect:'manual'})).status,404);
 },{study:async({saleUrl})=>{calls++;return {watches:[{...watch,saleUrl,source:saleUrl+'lot-268/'}],missing:[]}},images:async w=>({target:[`https://www.creditmunicipal.fr/app/uploads/sales/${w.saleUrl.includes('240615000')?'240615000':'261205000'}/images/${w.saleUrl.includes('240615000')?'268-2':'268-1'}.jpg`],credit:{},offers:{}})});
});

test('a cross-origin form cannot delete a saved study or submit an analysis',async()=>{
 let calls=0;
 await withServer(async({base})=>{
  const saved=await submit(base);assert.equal(saved.status,303);const path=saved.headers.get('location');
  const forbidden=await fetch(base+path+'/delete',{method:'POST',headers:{Origin:'https://attacker.example'},redirect:'manual'});
  assert.equal(forbidden.status,403);assert.equal((await fetch(base+path)).status,200);
  const foreign=await fetch(base+'/studies',{method:'POST',headers:{Origin:'https://attacker.example','content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({saleUrl:sale,number:'268'}),redirect:'manual'});
  assert.equal(foreign.status,403);assert.equal(calls,1);
 },{study:async()=>{calls++;return {watches:[watch],missing:[]}}});
});

test('after deleting one sale, a restarted server still shows the other sale and its photos',async()=>{
 const otherSale='https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/240615000/';
 await withServer(async({base,dir})=>{
  const first=await submit(base),second=await submit(base,268,otherSale);
  assert.equal(first.status,303);assert.equal(second.status,303);
  assert.equal((await fetch(base+first.headers.get('location')+'/delete',{method:'POST',redirect:'manual'})).status,303);
  const server=await new Promise(resolve=>{const s=createServer(createApplication({dataDir:dir,study:async()=>{throw Error('must not fetch')},compare:async()=>{throw Error('must not compare')}}));s.listen(0,'127.0.0.1',()=>resolve(s))});
  try{const reopened=`http://127.0.0.1:${server.address().port}`;assert.equal((await fetch(reopened+first.headers.get('location'))).status,404);const page=await(await fetch(reopened+second.headers.get('location'))).text();assert.match(page,/240615000/);assert.match(page,/268-2.jpg/);assert.equal(((await(await fetch(reopened)).text()).match(/Lot 268/g)||[]).length,1)}finally{await new Promise(resolve=>server.close(resolve))}
 },{study:async({saleUrl})=>({watches:[{...watch,saleUrl,source:saleUrl+'lot-268/'}],missing:[]}),images:async w=>({target:[`https://www.creditmunicipal.fr/app/uploads/sales/${w.saleUrl.includes('240615000')?'240615000':'261205000'}/images/${w.saleUrl.includes('240615000')?'268-2':'268-1'}.jpg`],credit:{},offers:{}})});
});

test('saved studies are spreadsheet-like rows with dynamic dated auction columns and per-row actions',async()=>{
 const watches={268:watch,343:{...watch,number:343,brand:'PANERAI',model:'Luminor Marina',reference:'PAM01028',box:'présent',bracelet:'acier',source:sale+'panerai-luminor/',estimation:[2000,3000]}};
 const older={...comparison.credit.sales[0],number:368,date:'2022-06-11',url:'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/220611000/tag-heuer/',hammerPrice:1650,onlineCost:null,feeSource:null};
 const panerai={...comparison,lot:343,brand:'PANERAI',model:'Luminor Marina',reference:'PAM01028',credit:{status:'unavailable',average:null,count:0,sales:[{...older,number:300,date:'2023-12-09',hammerPrice:2100,url:'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/231209000/panerai/',differences:{bracelet:'cuir (lot : acier)'}}]},chrono:{...comparison.chrono,status:'available',average:3750,count:3},ceiling:{...comparison.ceiling,amount:3145.97}};
 await withServer(async({base})=>{
  const first=await submit(base),second=await submit(base,343);assert.equal(first.status,303);assert.equal(second.status,303);
  const $=load(await(await fetch(base)).text());
  const headers=$('table[aria-label="Tableau des études"] thead th').map((_,el)=>$(el).text()).get();
  for(const name of ['Vente','Lot','Marque','Type','Boîtes','Bracelet','Estimation','Prix Chrono24 moyen','Moyenne Crédit Municipal','Observations','11/06/2022','09/12/2023','15/06/2024'])assert.ok(headers.some(h=>h.includes(name)),name);
  const a=$('tbody tr[data-lot="268"]'),b=$('tbody tr[data-lot="343"]');assert.equal(a.length,1);assert.equal(b.length,1);
  assert.match(a.text(),/TAG HEUER|Monaco/);assert.match(b.text(),/PANERAI|Luminor Marina/);
  assert.match(a.find('td[data-date="2024-06-15"]').text(),/3 700.*4 366/);
  assert.match(a.find('td[data-date="2022-06-11"]').text(),/1 650.*non vérifié/);
  assert.equal(a.find('td[data-date="2023-12-09"]').text().trim(),'—');
  assert.match(b.find('td[data-date="2023-12-09"]').text(),/2 100.*non vérifié/);
  for(const row of [a,b]){assert.equal(row.find('a[href^="/studies/"]').length,1);assert.equal(row.find('form[action$="/delete"]').length,1)}
 },{study:async({numbers})=>({watches:[watches[numbers[0]]],missing:[]}),compare:async w=>w.number===343?panerai:{...comparison,credit:{...comparison.credit,status:'partial',sales:[older,...comparison.credit.sales]}}});
});

test('global grid leaves missing mean and unrelated dated cell blank while preserving unknown fees',async()=>{
 const chopard={...watch,number:323,brand:'CHOPARD',model:'Alfa Romeo',source:sale+'chopard-alfa-romeo/'};
 const empty={...comparison,lot:323,brand:'CHOPARD',model:'Alfa Romeo',credit:{status:'unavailable',average:null,count:0,sales:[]},chrono:{status:'unavailable',average:null,count:0,offers:[]},ceiling:{status:'unavailable',amount:null,reason:'chrono_unavailable'}};
 const old={...comparison.credit.sales[0],onlineCost:null,feeSource:null};
 const incomplete={...comparison,credit:{status:'unavailable',average:null,count:0,sales:[old]}};
 await withServer(async({base})=>{
  assert.equal((await submit(base,323)).status,303);assert.equal((await submit(base)).status,303);
  const $=load(await(await fetch(base)).text()),ch=$('tr[data-lot="323"]'),other=$('tr[data-lot="268"]');
  assert.equal(ch.length,1);assert.equal(other.length,1);
  assert.equal(ch.find('td[data-date="2024-06-15"]').text().trim(),'—');
  assert.match(ch.text(),/indisponible/);assert.doesNotMatch(ch.text(),/4 366|3 700/);
  assert.equal(ch.find('td[data-column="chrono24"] a').length,0);
  assert.match(other.find('td[data-date="2024-06-15"]').text(),/3 700.*non vérifié/);
  assert.doesNotMatch(other.find('td[data-date="2024-06-15"]').text(),/4 366/);
 },{study:async({numbers})=>({watches:[numbers[0]===323?chopard:watch],missing:[]}),compare:async w=>w.number===323?empty:incomplete});
});

test('overview keeps at most four newest dated columns and points to older full detail without horizontal table overflow',async()=>{
 const dates=['2020-06-15','2021-06-15','2022-06-15','2023-06-15','2024-06-15','2025-06-15'];
 const notes='Référence différente '.repeat(20);
 const sales=dates.map((date,i)=>({...comparison.credit.sales[0],date,number:200+i,hammerPrice:1000+i*100,onlineCost:null,feeSource:null,url:`https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/${date.slice(2).replaceAll('-','')}000/lot-${i}/`,differences:{reference:notes}}));
 await withServer(async({base})=>{
  const created=await submit(base);assert.equal(created.status,303);
  const $=load(await(await fetch(base)).text()),headers=$('table[aria-label="Tableau des études"] thead th').map((_,th)=>$(th).text()).get();
  assert.deepEqual(headers.filter(h=>h.startsWith('Vente du ')),['Vente du 15/06/2022','Vente du 15/06/2023','Vente du 15/06/2024','Vente du 15/06/2025']);
  const row=$('tr[data-lot="268"]');assert.equal(row.find('td[data-date]').length,4);
  assert.match(row.text(),/2 dates historiques supplémentaires/);assert.match(row.find('.extra-dates').attr('title'),/15\/06\/2020.*15\/06\/2021/);
  const detail=await(await fetch(base+created.headers.get('location'))).text();
  for(const date of dates)assert.ok(detail.includes(date),date);
  assert.match(detail,/Référence différente Référence différente Référence différente/);
  const css=await(await fetch(base+'/app.css')).text();assert.match(css,/\.table-wrap table\{[^}]*table-layout:fixed/);assert.match(css,/\.table-wrap\{[^}]*overflow-x:hidden/);
 },{compare:async()=>({...comparison,credit:{...comparison.credit,average:null,count:0,status:'unavailable',sales}})});
});

test('unknown watch attributes and inaccessible historic source retain their distinct labels',async()=>{
 const missingWatch={...watch,reference:null,box:null,bracelet:null,estimation:null};
 const missingResult={...comparison,reference:null,credit:{status:'inaccessible',average:null,count:null,sales:[],reason:'catalogue inaccessible'},chrono:{status:'sample_empty',average:null,count:0,offers:[],sample:{inspectedPages:3,totalPages:5,inspectedListings:6,totalListings:10}},ceiling:{status:'unavailable',amount:null,reason:'target_fees_unverified'}};
 await withServer(async({base})=>{
  const saved=await submit(base);assert.equal(saved.status,303);
  const page=await(await fetch(base+saved.headers.get('location'))).text();
  assert.match(page,/Référence<\/th><td>non indiquée/);
  assert.match(page,/Boîte \/ écrin<\/th><td>non renseigné/);
  assert.match(page,/Bracelet<\/th><td>non renseigné/);
  assert.match(page,/Estimation<\/th><td>non publiée/);
  assert.match(page,/indisponible dans l’échantillon/);
  assert.match(page,/non vérifiable : catalogue inaccessible/);
  assert.match(page,/frais de la vente cible non vérifiés/);
 },{study:async()=>({watches:[missingWatch],missing:[]}),compare:async()=>missingResult});
});

test('blocked Chrono24 and unknown historic fees remain unavailable in the saved view',async()=>{
 const partial=structuredClone(comparison);
 partial.credit={status:'unavailable',average:null,count:0,sales:[{...comparison.credit.sales[0],onlineCost:null,feeSource:null}]};
 partial.chrono={status:'inaccessible',average:null,count:null,offers:[],reason:'Packet inaccessible (426)'};
 partial.ceiling={amount:null,status:'inaccessible',reason:'chrono_inaccessible'};
 await withServer(async({base})=>{
  const r=await submit(base);assert.equal(r.status,303);
  const page=await(await fetch(new URL(r.headers.get('location'),base))).text();
  for(const text of ['3 700','coût en ligne non vérifié','non vérifiable : accès empêché','non vérifiable : accès à Chrono24 impossible'])assert.ok(page.includes(text),text);
  assert.doesNotMatch(page,/Prix à ne pas dépasser : 0 €/);
 },{compare:async()=>partial});
});
