import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {load} from 'cheerio';
import {createApplication} from '../src/app.mjs';
import {sale26,watch26,historic26,credit,photo26} from './app-acceptance-steps.mjs';

const sale22='https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/220611000/tag-heuer/';
const sale23='https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/231209000/panerai/';
const watch343={...watch26,number:343,brand:'PANERAI',model:'Luminor Marina',box:'présent',bracelet:'acier',reference:'PAM01028',source:sale26+'panerai-luminor/',estimation:[2000,3000]};
const watch323={...watch26,number:323,brand:'CHOPARD',model:'Alfa Romeo',reference:'8954',source:sale26+'chopard-alfa-romeo/'};
const old22={...historic26,date:'2022-06-11',number:368,url:sale22,hammerPrice:1650,onlineCost:null,feeSource:null,differences:{bracelet:'acier (lot : cuir)'}};
const old23={...historic26,date:'2023-12-09',number:300,url:sale23,hammerPrice:2100,onlineCost:null,feeSource:null,differences:{bracelet:'cuir (lot : acier)'}};
const old24={...historic26,onlineCost:4366,buyerPercent:18,livePercent:0,feeSource:'https://serret-portier-expertises.com/catalogue-2024.pdf',differences:{reference:'CW2113-0 (lot : CAW2111)'}};
const baseResult=(watch,sales,creditAverage,chronoAverage)=>({lot:watch.number,brand:watch.brand,model:watch.model,reference:watch.reference,asOf:'2026-11-15',credit:{status:creditAverage===null?'unavailable':sales.length>1?'partial':'available',average:creditAverage,count:creditAverage===null?0:1,sales},chrono:{status:chronoAverage===null?'unavailable':'available',average:chronoAverage,count:chronoAverage===null?0:3,offers:[],sample:null},ceiling:{status:'unavailable',amount:null,reason:'target_fees_unverified'}});
const result268=baseResult(watch26,[old22,old24],4366,4345),result343=baseResult(watch343,[old23],null,3750),result323=baseResult(watch323,[],null,null);
const selected268=[4100,4590].map((price,i)=>({id:i+1,price,url:`https://www.chrono24.fr/tagheuer/monaco--id${i+1}.htm`}));
result268.chrono={...result268.chrono,status:'partial',count:2,offers:selected268};
result343.chrono={...result343.chrono,count:3,offers:[3500,3750,4000].map((price,i)=>({id:i+3,price,url:`https://www.chrono24.fr/panerai/luminor--id${i+3}.htm`}))};
const longNote='Différence de référence à vérifier '.repeat(20);
const wideSales=[2020,2021,2022,2024,2025].map(year=>({...old22,date:`${year}-06-15`,url:`https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/${String(year).slice(2)}0615000/lot-268/`,number:year-1700,hammerPrice:year,onlineCost:null,feeSource:null,differences:{reference:longNote}}));
wideSales[3]=old24;
const resultWide={...result268,credit:{...result268.credit,sales:wideSales}};
const euro=s=>Number(s.replace(/[ \u202f\u00a0]/g,'').replace(',','.'));
const date=(day,month,year)=>`${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`;
async function execute(ctx){
 const dir=await mkdtemp(join(tmpdir(),'app001-grid-'));
 const studies=ctx.mode==='empty'?{323:{watch:watch323,r:result323},268:{watch:watch26,r:{...result268,credit:{...result268.credit,status:'unavailable',average:null,count:0,sales:[{...old24,onlineCost:null,feeSource:null}]}}}}:{268:{watch:watch26,r:ctx.mode==='wide'?resultWide:result268},343:{watch:watch343,r:result343}};
 const handler=createApplication({dataDir:dir,asOf:()=> '2026-11-15',study:async({numbers,saleUrl})=>{assert.equal(saleUrl,sale26);return {watches:[studies[numbers[0]].watch],missing:[]}},compare:async watch=>studies[watch.number].r,images:async (watch,result)=>({target:[watch.number===268?photo26:`https://www.creditmunicipal.fr/app/uploads/sales/261205000/images/${watch.number}-1.jpg`],credit:Object.fromEntries(result.credit.sales.map(s=>[s.url,[`https://www.creditmunicipal.fr/app/uploads/sales/${s.date.slice(2).replaceAll('-','')}000/images/${s.number}-1.jpg`]])),offers:{}})});
 const server=await new Promise(resolve=>{const s=createServer(handler);s.listen(0,'127.0.0.1',()=>resolve(s))});
 const origin=`http://127.0.0.1:${server.address().port}`;
 try{
  ctx.links={};
  for(const lot of Object.keys(studies)){
   const r=await fetch(origin+'/studies',{method:'POST',redirect:'manual',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({saleUrl:sale26,number:lot})});
   assert.equal(r.status,303);ctx.links[lot]=r.headers.get('location');
  }
  ctx.html=await(await fetch(origin)).text();ctx.$=load(ctx.html);ctx.css=await(await fetch(origin+'/app.css')).text();
  ctx.details={};for(const [lot,link] of Object.entries(ctx.links))ctx.details[lot]=await(await fetch(origin+link)).text();
 }finally{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true})}
}
const handlers=[
 [/^deux études de montres sont sauvegardées pour les lots (\d+) et (\d+) de la vente du (\d+) décembre (\d{4})$/, (ctx,m)=>{ctx.mode='full';assert.deepEqual([Number(m[1]),Number(m[2])],[268,343]);assert.equal(date(m[3],'12',m[4]),'2026-12-05');}],
 [/^le lot (\d+) a des comparables historiques vendus le (\d+) juin (\d{4}) et le (\d+) juin (\d{4})$/, (ctx,m)=>{assert.equal(Number(m[1]),268);assert.deepEqual([date(m[2],'06',m[3]),date(m[4],'06',m[5])],['2024-06-15','2022-06-11']);}],
 [/^le lot (\d+) a un comparable historique vendu le (\d+) décembre (\d{4})$/, (ctx,m)=>{assert.equal(Number(m[1]),343);assert.equal(date(m[2],'12',m[3]),old23.date);}],
 [/^l'utilisateur ouvre la grille des études$/,execute],
 [/^un tableau présente une ligne par lot avec vente et numéro, marque, type, boîtes, bracelet, estimation, prix moyen Chrono24, moyenne des coûts Crédit Municipal et observations$/,ctx=>{const $=ctx.$,heads=$('table[aria-label="Tableau des études"] thead th').map((_,el)=>$(el).text()).get();for(const name of ['Vente','Lot','Marque','Type','Boîtes','Bracelet','Estimation','Prix Chrono24 moyen','Moyenne Crédit Municipal','Observations'])assert.ok(heads.some(h=>h.includes(name)),name);assert.equal($('table[aria-label="Tableau des études"] tbody tr').length,2);assert.equal($('tr[data-lot="268"]').length,1);assert.equal($('tr[data-lot="343"]').length,1);}],
 [/^les ventes historiques disposent de colonnes distinctes datées du (\d+) juin (\d{4}), du (\d+) décembre (\d{4}) et du (\d+) juin (\d{4})$/, (ctx,m)=>{const dates=[date(m[1],'06',m[2]),date(m[3],'12',m[4]),date(m[5],'06',m[6])];assert.deepEqual(dates,['2022-06-11','2023-12-09','2024-06-15']);for(const d of dates)assert.ok(ctx.html.includes(`data-date="${d}"`),d);}],
 [/^chaque valeur historique est associée à son lot et distingue adjudication hors frais et coût en ligne vérifié ou non vérifié$/,ctx=>{const $=ctx.$,a=$('tr[data-lot="268"]'),b=$('tr[data-lot="343"]');assert.match(a.find('td[data-date="2024-06-15"]').text(),/3 700.*4 366/);assert.match(a.find('td[data-date="2022-06-11"]').text(),/1 650.*non vérifié/);assert.equal(a.find('td[data-date="2023-12-09"]').text().trim(),'—');assert.match(b.find('td[data-date="2023-12-09"]').text(),/2 100.*non vérifié/);assert.equal(b.find('td[data-date="2024-06-15"]').text().trim(),'—');}],
 [/^la cellule Chrono24 du lot (\d+) contient les liens directs des deux annonces retenues sans annonce non retenue$/, (ctx,m)=>{const links=ctx.$(`tr[data-lot="${m[1]}"] td[data-column="chrono24"] a`).map((_,a)=>ctx.$(a).attr('href')).get();assert.deepEqual(links,selected268.map(o=>o.url));assert.ok(!ctx.html.includes('id999.htm'));}],
 [/^chaque ligne permet d'ouvrir la fiche avec ses photos et de supprimer uniquement cette étude$/,ctx=>{for(const [lot,link] of Object.entries(ctx.links)){const row=ctx.$(`tr[data-lot="${lot}"]`);assert.equal(row.find(`a[href="${link}"]`).length,1);assert.equal(row.find(`form[action="${link}/delete"]`).length,1);assert.ok(ctx.details[lot].includes(`/images/${lot}-1.jpg`)||lot==='268'&&ctx.details[lot].includes(photo26));}}],
 [/^une analyse sauvegardée du lot (\d+) Chopard Alfa Romeo ne contient ni adjudication historique admissible ni annonce française vérifiée$/, (ctx,m)=>{ctx.mode='empty';assert.equal(Number(m[1]),323);assert.equal(result323.credit.sales.length,0);assert.equal(result323.chrono.average,null);}],
 [/^une autre analyse sauvegardée contient une adjudication historique datée avec frais inconnus$/,ctx=>{assert.equal(ctx.mode,'empty');assert.equal(old24.date,'2024-06-15');}],
 [/^la ligne du lot (\d+) indique des moyennes indisponibles sans montant inventé$/, (ctx,m)=>{const row=ctx.$(`tr[data-lot="${m[1]}"]`);assert.equal(row.length,1);assert.ok((row.text().match(/indisponible/g)||[]).length>=2);assert.doesNotMatch(row.text(),/3 700|4 366/);}],
 [/^sa case dans la colonne de la vente historique de l'autre lot reste vide ou indique une absence de donnée$/,ctx=>{assert.equal(ctx.$('tr[data-lot="323"] td[data-date="2024-06-15"]').text().trim(),'—');}],
 [/^sa cellule Chrono24 sans annonce retenue ne contient aucun lien d'annonce$/,ctx=>{assert.equal(ctx.$('tr[data-lot="323"] td[data-column="chrono24"] a').length,0);}],
 [/^l'autre ligne affiche le montant adjugé hors frais mais aucun coût en ligne prétendu vérifié$/,ctx=>{const value=ctx.$('tr[data-lot="268"] td[data-date="2024-06-15"]').text();assert.match(value,/3 700.*coût non vérifié/);assert.doesNotMatch(value,/4 366/);}],
 [/^plusieurs lots sauvegardés totalisent six dates distinctes de ventes historiques$/,ctx=>{ctx.mode='wide';assert.equal(new Set([...wideSales.map(s=>s.date),old23.date]).size,6);}],
 [/^l'écran a la largeur de ([\d ]+) pixels de la capture Excel$/, (ctx,m)=>{ctx.viewport=Number(m[1].replaceAll(' ',''));assert.equal(ctx.viewport,1357);}],
 [/^la grille et la page restent visibles dans cette largeur sans défilement horizontal$/,ctx=>{assert.equal(ctx.viewport,1357);assert.match(ctx.css,/\.table-wrap\{[^}]*overflow-x:hidden/);assert.match(ctx.css,/\.table-wrap table\{[^}]*table-layout:fixed;[^}]*width:100%/);assert.match(ctx.css,/main\{[^}]*width:100%/);}],
 [/^au plus quatre dates historiques récentes occupent des colonnes dans la grille$/,ctx=>{const labels=ctx.$('table[aria-label="Tableau des études"] thead th').map((_,el)=>ctx.$(el).text()).get().filter(x=>x.startsWith('Vente du '));assert.deepEqual(labels,['Vente du 15/06/2022','Vente du 09/12/2023','Vente du 15/06/2024','Vente du 15/06/2025']);}],
 [/^les autres ventes restent accessibles dans la fiche détaillée du lot avec une indication de leur présence sur sa ligne$/,ctx=>{const row=ctx.$('tr[data-lot="268"]');assert.match(row.text(),/2 dates historiques supplémentaires/);assert.match(row.find('.extra-dates').attr('title'),/15\/06\/2020.*15\/06\/2021/);for(const date of ['2020-06-15','2021-06-15'])assert.ok(ctx.details[268].includes(date),date);}],
 [/^les textes trop longs de la grille sont abrégés sans modifier les chiffres enregistrés dans la fiche détaillée$/,ctx=>{assert.match(ctx.css,/\.grid-clamp\{[^}]*-webkit-line-clamp:2/);assert.equal(ctx.$('tr[data-lot="268"] .grid-clamp').length>0,true);assert.ok(ctx.details[268].includes(longNote));assert.match(ctx.details[268],/2 020.*2 021/);}],
];
export async function runScenario(scenario){
 const ctx={};for(const step of scenario.steps){const matches=handlers.map(([pattern,fn])=>[step.text.match(pattern),fn]).filter(([m])=>m);assert.equal(matches.length,1,`Handler unique attendu pour ${scenario.name}: ${step.text}`);try{await matches[0][1](ctx,matches[0][0])}catch(error){error.message=`${scenario.name}: ${step.text}: ${error.message}`;throw error}}
}
