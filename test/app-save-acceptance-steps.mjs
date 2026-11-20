import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApplication} from '../src/app.mjs';
import {compareWatch} from '../src/prices.mjs';
import {sale26,watch26,historic26,offer,credit,dated,catalogue,photo26} from './app-acceptance-steps.mjs';

const secondSale='https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/240615000/';
const secondPhoto='https://www.creditmunicipal.fr/app/uploads/sales/240615000/images/268-2.jpg';
const oldPrices=[4100,4590],newPrices=[3800,3899,4100];
const euro=s=>Number(s.replace(/[ \u202f\u00a0]/g,'').replace(',','.'));
const has=(text,...values)=>values.forEach(value=>assert.ok(text.includes(value),`Expected ${value}`));
const studyPath=response=>response.headers.get('location');
async function start(ctx){
 const study=async({saleUrl,numbers})=>{
  ctx.studies++;
  assert.deepEqual(numbers,[268]);assert.ok([sale26,secondSale].includes(saleUrl));
  return {watches:[{...watch26,saleUrl,source:saleUrl===sale26?watch26.source:secondSale+'lot-268/'}],missing:[]};
 };
 const compare=async(w,{asOf})=>{
  ctx.comparisons++;
  return compareWatch(w,{asOf,cmSearch:async()=>[historic26],feeLookup:async()=>({buyerPercent:18,livePercent:0,source:dated}),offerSearch:async()=>ctx.prices.map((price,i)=>offer(i+1,price)),targetFeeLookup:async()=>({buyerPercent:18,livePercent:1.2,source:catalogue})});
 };
 const images=async(w,r)=>({target:[w.saleUrl===sale26?photo26:secondPhoto],credit:{[credit]:['https://www.creditmunicipal.fr/app/uploads/sales/240615000/images/246-1.jpg']},offers:Object.fromEntries(r.chrono.offers.map(o=>[o.url,[`https://img.chrono24.com/images/uhren/${o.id}.jpg`]]))});
 ctx.server=await new Promise(resolve=>{const s=createServer(createApplication({dataDir:ctx.dir,study,compare,images,asOf:()=>ctx.asOf}));s.listen(0,'127.0.0.1',()=>resolve(s))});
 ctx.base=`http://127.0.0.1:${ctx.server.address().port}`;
}
async function restart(ctx){await new Promise(resolve=>ctx.server.close(resolve));await start(ctx)}
const post=(ctx,sale)=>fetch(ctx.base+'/studies',{method:'POST',redirect:'manual',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({saleUrl:sale,number:'268'})});
const page=(ctx,path)=>fetch(ctx.base+path).then(r=>r.text());
async function saved(ctx){if(ctx.first)return;const response=await post(ctx,sale26);assert.equal(response.status,303);ctx.first=studyPath(response);ctx.old=await page(ctx,ctx.first);has(ctx.old,'4 345','2026-11-15',photo26,credit)}
const handlers=[
 [/^une étude de la vente du (\d+) décembre (\d{4}) et du lot (\d+) est sauvegardée avec une moyenne de ([\d ]+) €$/,async(c,m)=>{assert.equal(`${m[2]}-12-${m[1].padStart(2,'0')}`,'2026-12-05');assert.equal(Number(m[3]),268);assert.equal(euro(m[4]),4345);await saved(c);}],
 [/^la date d'analyse enregistrée est le (\d+) novembre (\d{4}) avec les sources et photos disponibles$/, (c,m)=>{assert.equal(`${m[2]}-11-${m[1].padStart(2,'0')}`,'2026-11-15');has(c.old,photo26,credit,'2026-11-15');}],
 [/^les annonces consultables affichent désormais d'autres prix$/,c=>{c.prices=[...newPrices];}],
 [/^l'utilisateur ferme puis rouvre l'application et consulte la ligne de ce lot$/,async c=>{const count=c.comparisons;await restart(c);c.list=await page(c,'/');c.view=await page(c,c.first);assert.equal(c.comparisons,count);}],
 [/^son tableau enregistré affiche encore la date du (\d+) novembre (\d{4}), la moyenne de ([\d ]+) € et ses liens sources$/, (c,m)=>{assert.equal(`${m[2]}-11-${m[1].padStart(2,'0')}`,'2026-11-15');assert.equal(euro(m[3]),4345);has(c.view,'2026-11-15','4 345',credit,photo26);}],
 [/^aucune nouvelle moyenne ni nouvelle analyse du même lot n'est créée par cette consultation$/,c=>{assert.equal(c.studies,1);assert.equal(c.comparisons,1);assert.equal((c.list.match(/Lot 268/g)||[]).length,1);assert.doesNotMatch(c.view,/3 933/);}],
 [/^les prix des sources ont changé depuis son enregistrement$/,c=>{c.prices=[...newPrices];}],
 [/^l'utilisateur saisit de nouveau le lien de cette vente et le numéro de lot (\d+) puis demande une étude$/,async(c,m)=>{assert.equal(Number(m[1]),268);c.reply=await post(c,sale26);c.message=await c.reply.text();c.view=await page(c,c.first);c.list=await page(c,'/');}],
 [/^l'application indique que ce lot de cette vente a déjà été analysé et permet de retrouver le tableau existant$/,c=>{assert.equal(c.reply.status,409);has(c.message,'Lot déjà analysé',c.first,'Voir l’étude existante'.replace('’',"'"));}],
 [/^la liste conserve une seule ligne pour cette vente et ce lot, sans remplacer les montants ni la date enregistrés$/,c=>{assert.equal((c.list.match(/Lot 268/g)||[]).length,1);has(c.view,'4 345','2026-11-15');assert.equal(c.studies,1);assert.equal(c.comparisons,1);}],
 [/^les sources contrôlées fournissent désormais une moyenne vérifiée de ([\d ]+) € et les mêmes frais cibles de (\d+) % et (\d+,\d+) % live$/, (c,m)=>{assert.equal(euro(m[1]),3933);assert.deepEqual(newPrices,[3800,3899,4100]);assert.equal(Number(m[2]),18);assert.equal(euro(m[3]),1.2);c.prices=[...newPrices];}],
 [/^l'utilisateur supprime la ligne de cette étude puis relance le formulaire pour cette vente et ce lot$/,async c=>{c.removed=await fetch(c.base+c.first+'/delete',{method:'POST',redirect:'manual'});c.oldStatus=(await fetch(c.base+c.first)).status;c.asOf='2026-11-16';c.fresh=await post(c,sale26);c.newView=await page(c,studyPath(c.fresh));c.list=await page(c,'/');}],
 [/^l'ancienne étude n'est plus consultable depuis la liste des analyses$/,c=>{assert.equal(c.removed.status,303);assert.equal(c.oldStatus,404);assert.equal((c.list.match(/Lot 268/g)||[]).length,1);}],
 [/^une seule nouvelle ligne est sauvegardée pour cette vente et ce lot avec la moyenne de ([\d ]+) € et le plafond de ([\d ]+,\d{2}) € hors frais$/, (c,m)=>{assert.equal(c.fresh.status,303);assert.equal(euro(m[1]),3933);assert.equal(euro(m[2]),3299.49);has(c.newView,'3 933','3 299,49','3 800','3 899','4 100');assert.equal(c.studies,2);}],
 [/^les sources et la date de la nouvelle analyse correspondent aux données reconsultées, sans reprendre les anciens montants$/,c=>{has(c.newView,'2026-11-16',catalogue);assert.doesNotMatch(c.newView,/4 345|4 590/);}],
 [/^le lot (\d+) existe dans deux ventes distinctes de montres avec des sources vérifiables$/, (c,m)=>{assert.equal(Number(m[1]),268);assert.notEqual(sale26,secondSale);}],
 [/^l'utilisateur étudie ce lot dans chacune des deux ventes$/,async c=>{await saved(c);const r=await post(c,secondSale);assert.equal(r.status,303);c.second=studyPath(r);c.list=await page(c,'/');c.firstView=await page(c,c.first);c.secondView=await page(c,c.second);}],
 [/^la liste contient deux lignes identifiées chacune par sa vente et son numéro de lot$/,c=>{assert.equal((c.list.match(/Lot 268/g)||[]).length,2);has(c.list,sale26,secondSale);assert.notEqual(c.first,c.second);}],
 [/^chaque ligne mène au tableau et aux photos de sa propre vente, sans mélanger les sources$/,c=>{has(c.firstView,sale26,photo26);has(c.secondView,secondSale,secondPhoto);assert.doesNotMatch(c.firstView,/268-2\.jpg/);assert.doesNotMatch(c.secondView,/268-1\.jpg/);}],
 [/^deux analyses de lots numéro (\d+) sont sauvegardées pour des ventes distinctes$/,async(c,m)=>{assert.equal(Number(m[1]),268);await saved(c);const r=await post(c,secondSale);assert.equal(r.status,303);c.second=studyPath(r);}],
 [/^l'utilisateur supprime la ligne de la première vente$/,async c=>{c.removed=await fetch(c.base+c.first+'/delete',{method:'POST',redirect:'manual'});await restart(c);c.oldStatus=(await fetch(c.base+c.first)).status;c.list=await page(c,'/');c.secondView=await page(c,c.second);}],
 [/^seule cette ligne n'est plus consultable$/,c=>{assert.equal(c.removed.status,303);assert.equal(c.oldStatus,404);assert.equal((c.list.match(/Lot 268/g)||[]).length,1);has(c.list,secondSale);assert.ok(!c.list.includes(sale26));}],
 [/^l'étude de la seconde vente et ses photos restent consultables$/,c=>has(c.secondView,secondSale,secondPhoto,'4 345')],
];
export async function runScenario(scenario){
 const ctx={dir:await mkdtemp(join(tmpdir(),'app001-f02-')),asOf:'2026-11-15',prices:[...oldPrices],studies:0,comparisons:0};
 try{
  await start(ctx);
  for(const step of scenario.steps){
   const matches=handlers.map(([pattern,fn])=>[step.text.match(pattern),fn]).filter(([m])=>m);
   assert.equal(matches.length,1,`Handler unique attendu pour ${scenario.name}: ${step.text}`);
   try{await matches[0][1](ctx,matches[0][0])}catch(e){e.message=`${scenario.name}: ${step.text}: ${e.message}`;throw e}
  }
 }finally{if(ctx.server)await new Promise(resolve=>ctx.server.close(resolve));await rm(ctx.dir,{recursive:true,force:true})}
}
