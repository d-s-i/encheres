import assert from 'node:assert/strict';
import { run } from '../bin/comparer-prix.mjs';
import { studyLots } from '../src/lots.mjs';
import { compareWatch } from '../src/prices.mjs';
import { extractWatch } from '../src/watch.mjs';
import { fetchFixture, sale2021 } from './fixtures/catalogues.mjs';

const sale2024 = 'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/240615000/tag-heuer-carrera-montre-dhomme-ronde-chronogr/';
const doc2024 = 'https://serret-portier-expertises.com/wp-content/uploads/2021/05/Catalogue-Bijoux-Montres-juin2024_bdef_web.pdf';
const sale2026 = 'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/260620000/tag-heuer-carrera-juan-manuel-fangioedition-m/';
const futureSale = 'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/261205000/';
const makeSale = (url, date, price, reference, bracelet='acier', brand='TAG HEUER',model='Carrera') => ({url,date,number:288,hammerPrice:price,reference,bracelet,box:'absent',brand,model,description:`${brand} ${model} chronographe Calibre 16. Référence : ${reference}. Bracelet ${bracelet}.`});
const makeOffer = (id,price, overrides={}) => ({id,price,currency:'EUR',sellerCountry:'FR',available:true,brand:'TAG Heuer',model:'Carrera Calibre 16',reference:'CV2010',bracelet:'acier',box:'présent',url:`https://www.chrono24.fr/tagheuer/carrera--id${id}.htm`,...overrides});
const eur = s => Number(s.replace(/[^\d]/g,''));
const sale2021Old = 'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/210605000/tag-heuer-carrera/';
async function execute(ctx) {
  const study = input => ctx.lot===343 ? Promise.resolve({watches:[extractWatch({number:343,title:'PANERAI, Luminor Marina.',description:'PANERAI Luminor Marina. Référence PAM01028. Bracelet acier.',source:futureSale+'panerai-luminor/',saleUrl:futureSale})],missing:[]}) : studyLots(input,{fetchImpl:fetchFixture});
  const compare = async (watch,{asOf}={}) => {
    const result=await compareWatch(watch,{asOf,cmSearch:async()=>ctx.sales,feeLookup:s=>ctx.fees.get(s.url)??null,offerSearch:async()=>{if(ctx.blocked) throw Error('HTTP 403 / défi de sécurité');return ctx.exact?.length?ctx.exact:ctx.offers;},targetFeeLookup:async()=>null});
    ctx.result=result;return result;
  };
  ctx.output=await run(['--url',ctx.lot===343?futureSale:sale2021,'--as-of',ctx.asOf,String(ctx.lot)],{study,compare});
  assert.equal(ctx.result.lot,ctx.lot);
  if(ctx.requireEvidence) {
    assert.equal(ctx.result.asOf,ctx.asOf);assert.match(ctx.output,/Date d'analyse :/);
    for(const s of ctx.result.credit.sales) assert.match(s.url,/^https:\/\//);
    for(const o of ctx.result.chrono.offers) assert.match(o.url,/^https:\/\//);
  }
}
const handlers = [
  [/^une fiche de montre caractérisée par LOT-001 et une date d'analyse connue$/, ctx=>{ctx.asOf='2026-11-11';ctx.lot=318;ctx.sales=[];ctx.offers=[];ctx.fees=new Map();ctx.requireEvidence=false;}],
  [/^les observations sont rattachées à des liens sources et à leur date de consultation$/,ctx=>{ctx.requireEvidence=true;}],
  [/^le lot étudié est la TAG Heuer Carrera Calibre 16 CV2010-3 du 5 juin 2021$/,ctx=>{ctx.lot=318;ctx.sales.push(makeSale(sale2021Old,'2021-06-05',1500,'CV2010-3','caoutchouc'));}],
  [/^la date d'analyse est le (\d+) novembre (\d{4})$/, (ctx,m)=>{ctx.asOf=`${m[2]}-11-${m[1].padStart(2,'0')}`;}],
  [/^le lot (\d+) Carrera (\S+) a été adjugé ([\d ]+) € le (\d+) juin (\d{4}) au Crédit Municipal$/, (ctx,m)=>{const s=makeSale(sale2024,`${m[5]}-06-${m[4].padStart(2,'0')}`,eur(m[3]),m[2]);s.number=Number(m[1]);ctx.sales.push(s);}],
  [/^le catalogue daté de cette vente fixe (\d+) % TTC de frais acheteur sans majoration live pour les lots judiciaires$/, (ctx,m)=>{ctx.fees.set(sale2024,{buyerPercent:Number(m[1]),livePercent:0,source:doc2024});}],
  [/^l'utilisateur demande la comparaison des prix du lot étudié$/,execute],
  [/^le lot (\d+) apparaît comme comparable historique avec sa référence et son bracelet acier différents$/, (ctx,m)=>{const s=ctx.result.credit.sales.find(x=>x.number===Number(m[1]));assert.ok(s);assert.match(s.differences.reference,/CV2010-4/);assert.match(s.differences.bracelet,/acier/);assert.match(ctx.output,/bracelet : acier/);}],
  [/^le montant adjugé est indiqué comme ([\d ]+) € hors frais et le coût en ligne hors transport comme ([\d ]+) €$/, (ctx,m)=>{const s=ctx.result.credit.sales.find(x=>x.hammerPrice===eur(m[1]));assert.equal(s.onlineCost,eur(m[2]));assert.match(ctx.output,/coût en ligne 2[\s\u202f]242 €/);}],
  [/^les liens de la fiche d'adjudication et du catalogue historique justifient ce calcul$/,ctx=>{assert.ok(ctx.output.includes(sale2024));assert.ok(ctx.output.includes(doc2024));}],
  [/^l'adjudication du lot étudié du 5 juin 2021 ne compte pas dans la moyenne des cinq dernières années$/,ctx=>{assert.ok(!ctx.result.credit.sales.some(s=>s.url===sale2021Old));assert.equal(ctx.result.credit.count,1);}],
  [/^une vente comparable de (\d{4}) a des conditions contemporaines fixant (\d+) % TTC sans majoration live$/, (ctx,m)=>{ctx.sales.push(makeSale(sale2024,`${m[1]}-06-15`,1900,'CV2010-4'));ctx.fees.set(sale2024,{buyerPercent:Number(m[2]),livePercent:0,source:doc2024});}],
  [/^les CGV du 24 avril (\d{4}) fixent (\d+) % TTC plus (\d+,\d+) % TTC pour les achats live régis par elles$/, (ctx,m)=>{ctx.sales.push(makeSale(sale2026,`${m[1]}-06-20`,2000,'CV201C'));ctx.fees.set(sale2026,{buyerPercent:Number(m[2]),livePercent:Number(m[3].replace(',','.')),source:'https://www.creditmunicipal.fr/en/conditions-generales-de-vente/hotel-des-ventes/'});}],
  [/^le coût d'achat en ligne de la vente 2024 est calculé$/,execute],
  [/^seul le taux vérifié de cette vente de 2024 est utilisé$/,ctx=>{const s=ctx.result.credit.sales.find(s=>s.date==='2024-06-15');assert.equal(s.onlineCost,2242);assert.equal(s.livePercent,0);}],
  [/^aucun supplément de 1,2 % tiré des CGV de 2026 n'est ajouté$/,ctx=>{const a=ctx.result.credit.sales.find(s=>s.date==='2024-06-15'),b=ctx.result.credit.sales.find(s=>s.date==='2026-06-20');assert.equal(a.onlineCost,2242);assert.equal(b.livePercent,1.2);}],
  [/^les frais acheteur et les frais live ne sont pas comptés deux fois$/,ctx=>{const s=ctx.result.credit.sales.find(s=>s.date==='2026-06-20');assert.equal(s.onlineCost,2384);assert.equal(ctx.result.credit.count,2);}],
  [/^une adjudication comparable dans les cinq dernières années a un prix vérifié$/,ctx=>{ctx.sales.push(makeSale(sale2024,'2024-06-15',1900,'CV2010-4'));}],
  [/^aucune condition de frais applicable à sa vente n'a pu être vérifiée$/,ctx=>{ctx.fees.delete(sale2024);const s=makeSale(sale2026,'2026-06-20',2000,'CV201C');ctx.sales.push(s);ctx.fees.set(sale2026,{buyerPercent:18,livePercent:1.2,source:'https://www.creditmunicipal.fr/en/conditions-generales-de-vente/hotel-des-ventes/'});}],
  [/^la comparaison Crédit Municipal est calculée$/,execute],
  [/^cette adjudication brute est affichée avec sa date et son lien$/,ctx=>{const s=ctx.result.credit.sales.find(s=>s.url===sale2024);assert.equal(s.hammerPrice,1900);assert.equal(s.date,'2024-06-15');assert.ok(ctx.output.includes(sale2024));}],
  [/^son coût d'achat en ligne est indiqué comme non vérifié$/,ctx=>{assert.equal(ctx.result.credit.sales.find(s=>s.url===sale2024).onlineCost,null);assert.match(ctx.output,/coût en ligne non vérifié/);}],
  [/^elle n'entre pas dans la moyenne des coûts d'achat en ligne vérifiés$/,ctx=>{assert.equal(ctx.result.credit.average,2384);assert.equal(ctx.result.credit.status,'partial');}],
  [/^le nombre de ventes retenues dans cette moyenne est indiqué$/,ctx=>{assert.equal(ctx.result.credit.count,1);assert.match(ctx.output,/\(1 vente avec frais vérifiés, échantillon partiel\)/);}],
  [/^les trois premières pages Chrono24 analysées incluent quatre annonces distinctes et disponibles de la même montre chez des vendeurs situés en France$/,ctx=>{ctx.offers=[makeOffer(1,0),makeOffer(2,0),makeOffer(3,0),makeOffer(4,0)];}],
  [/^leurs prix affichés hors port en euros sont ([\d ]+) €, ([\d ]+) €, ([\d ]+) € et ([\d ]+) €$/, (ctx,m)=>{ctx.offers.forEach((o,i)=>o.price=eur(m[i+1]));}],
  [/^les résultats contiennent aussi une montre d'un autre modèle, un accessoire, une annonce étrangère et un doublon$/,ctx=>{ctx.offers.push(makeOffer(5,200,{model:'Carrera Calibre 5'}),makeOffer(6,100,{productType:'WatchPart'}),makeOffer(7,50,{sellerCountry:'IT'}),{...ctx.offers[1]});}],
  [/^la comparaison Chrono24 est calculée$/,execute],
  [/^seuls les trois prix d'annonces françaises comparables les plus bas de l'échantillon sont retenus$/,ctx=>{assert.deepEqual(ctx.result.chrono.offers.map(o=>o.id),[1,2,3]);assert.equal(ctx.result.chrono.status,'available');}],
  [/^leur moyenne de prix affichés hors port est ([\d ]+) € sur (\d+) annonces$/, (ctx,m)=>{assert.equal(ctx.result.chrono.average,eur(m[1]));assert.equal(ctx.result.chrono.count,Number(m[2]));assert.match(ctx.output,/hors frais de port/);}],
  [/^chaque annonce retenue a son lien, son prix, son pays vendeur et ses différences pertinentes avec le lot$/,ctx=>{for(const o of ctx.result.chrono.offers){assert.ok(ctx.output.includes(o.url));assert.equal(o.sellerCountry,'FR');assert.equal(o.differences.bracelet,'acier (lot : caoutchouc)');assert.ok(ctx.output.includes(`${o.price.toLocaleString('fr-FR')} €`));}}],
  [/^aucun de ces prix n'est présenté comme un prix de vente conclue$/,ctx=>{assert.match(ctx.output,/prix demandés/);assert.doesNotMatch(ctx.output,/ventes conclues Chrono24/);}],
  [/^la recherche de Carrera CV2010-3 ne fournit aucune annonce française vérifiée$/,ctx=>{ctx.exact=[];assert.equal(ctx.exact.length,0);}],
  [/^une recherche élargie au modèle Carrera Calibre 16 CV2010 fournit une seule annonce française vérifiée à ([\d ]+) € hors port$/, (ctx,m)=>{ctx.offers=[makeOffer(45070719,eur(m[1])),makeOffer(47857106,1690,{sellerCountry:'IT'})];}],
  [/^la comparaison Chrono24 du lot (\d+) est calculée$/,async (ctx,m)=>{ctx.lot=Number(m[1]);await execute(ctx);}],
  [/^la moyenne est étiquetée « partielle : (\d+) annonce » et vaut ([\d ]+) € hors port$/, (ctx,m)=>{assert.equal(ctx.result.chrono.count,Number(m[1]));assert.equal(ctx.result.chrono.average,eur(m[2]));assert.equal(ctx.result.chrono.status,'partial');assert.match(ctx.output,/Moyenne partielle des prix affichés/);}],
  [/^la différence de référence, de bracelet et de contenu livré est indiquée$/,ctx=>{const d=ctx.result.chrono.offers[0].differences;assert.match(d.reference,/CV2010/);assert.match(d.bracelet,/acier/);assert.match(d.box,/présent/);assert.match(ctx.output,/box : présent/);}],
  [/^aucune annonce italienne à ([\d ]+) € n'est incluse$/, (ctx,m)=>{assert.ok(!ctx.result.chrono.offers.some(o=>o.price===eur(m[1])));}],
  [/^aucune offre française Alfa Romeo 8954 ni adjudication Alfa Romeo dans les cinq dernières années n'a pu être vérifiée pour le lot (\d+)$/, (ctx,m)=>{ctx.lot=Number(m[1]);ctx.sales=[makeSale('https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/200926000/chopard/','2020-09-26',3100,'8954','caoutchouc','CHOPARD','Alfa Romeo'),makeSale('https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/210206000/chopard/','2021-02-06',4550,'8954','caoutchouc','CHOPARD','Alfa Romeo'),makeSale('https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/210605000/chopard/','2021-06-05',3600,'8954','caoutchouc','CHOPARD','Alfa Romeo')];ctx.offers=[makeOffer(7,2000,{brand:'Chopard',model:'Mille Miglia',reference:'8954'})];}],
  [/^l'utilisateur demande la comparaison des prix du lot (\d+)$/,async (ctx,m)=>{ctx.lot=Number(m[1]);await execute(ctx);}],
  [/^la moyenne Chrono24 et la moyenne du coût en ligne Crédit Municipal sont indiquées comme indisponibles avec un échantillon de zéro$/,ctx=>{assert.equal(ctx.result.chrono.count,0);assert.equal(ctx.result.credit.count,0);assert.equal(ctx.result.chrono.average,null);assert.equal(ctx.result.credit.average,null);assert.match(ctx.output,/indisponible \(0 annonce/);assert.match(ctx.output,/indisponible \(0 vente/);}],
  [/^les ventes Alfa Romeo de 2020 et du premier semestre 2021 ne sont pas utilisées pour remplir la fenêtre de cinq ans$/,ctx=>{assert.equal(ctx.result.credit.sales.length,0);assert.equal(ctx.result.credit.status,'unavailable');}],
  [/^une autre Chopard Mille Miglia sans correspondance Alfa Romeo n'est pas substituée$/,ctx=>{assert.equal(ctx.result.chrono.offers.length,0);}],
  [/^une recherche Panerai Luminor Marina triée par pertinence contient (\d+) pages et (\d+) annonces$/, (ctx,m)=>{ctx.lot=343;ctx.market={totalPages:Number(m[1]),totalListings:Number(m[2])};}],
  [/^les trois premières pages contiennent (\d+) annonces dont trois offres comparables de vendeurs français à ([\d ]+) €, ([\d ]+) € et ([\d ]+) € hors port$/, (ctx,m)=>{ctx.offers=[makeOffer(1,eur(m[2]),{brand:'Panerai',model:'Luminor Marina',reference:'PAM00050'}),makeOffer(2,eur(m[3]),{brand:'Panerai',model:'Luminor Marina',reference:'PAM01028'}),makeOffer(3,eur(m[4]),{brand:'Panerai',model:'Luminor Marina',reference:'PAM00111'}),makeOffer(4,50,{sellerCountry:'IT'}),makeOffer(5,60,{sellerCountry:'DE'}),makeOffer(6,70,{sellerCountry:'UK'})];ctx.offers.sample={inspectedPages:3,inspectedListings:Number(m[1]),...ctx.market,query:'PANERAI Luminor Marina'};}],
  [/^une annonce française moins chère se trouve sur la quatrième page non analysée$/,ctx=>{ctx.fourth=makeOffer(7,100,{brand:'Panerai',model:'Luminor Marina',reference:'PAM01028'});assert.ok(ctx.fourth.price<Math.min(...ctx.offers.filter(o=>o.sellerCountry==='FR').map(o=>o.price)));}],
  [/^la moyenne de l'échantillon est ([\d ]+) € sur (\d+) annonces françaises vérifiées$/, (ctx,m)=>{assert.equal(ctx.result.chrono.average,eur(m[1]));assert.equal(ctx.result.chrono.count,Number(m[2]));assert.equal(ctx.result.chrono.status,'sample');}],
  [/^le résultat précise (\d+) pages et (\d+) annonces analysées sur (\d+) résultats, sans prétendre aux trois offres les moins chères de tout Chrono24$/, (ctx,m)=>{assert.deepEqual([ctx.result.chrono.sample.inspectedPages,ctx.result.chrono.sample.inspectedListings,ctx.result.chrono.sample.totalListings],m.slice(1).map(Number));assert.match(ctx.output,/3 pages, 6 annonces analysées sur 10 résultats/);assert.match(ctx.output,/pas nécessairement les offres les moins chères de tout Chrono24/);}],
  [/^aucune fiche de la quatrième page n'est incluse$/,ctx=>{assert.ok(!ctx.result.chrono.offers.some(o=>o.id===ctx.fourth.id));assert.equal(ctx.result.chrono.sample.inspectedPages,3);}],
  [/^les trois premières pages d'une recherche de (\d+) pages ne contiennent aucun vendeur français comparable$/, (ctx,m)=>{ctx.lot=343;ctx.offers=[makeOffer(1,250,{sellerCountry:'IT'}),makeOffer(2,300,{sellerCountry:'DE'}),makeOffer(3,350,{sellerCountry:'UK'})];ctx.offers.sample={inspectedPages:3,inspectedListings:6,totalPages:Number(m[1]),totalListings:10,query:'PANERAI Luminor Marina'};}],
  [/^une annonce française comparable existe sur la quatrième page non analysée$/,ctx=>{ctx.fourth=makeOffer(7,100,{brand:'Panerai',model:'Luminor Marina'});assert.equal(ctx.fourth.sellerCountry,'FR');}],
  [/^la moyenne est indisponible faute d'offre comparable dans l'échantillon des trois premières pages$/,ctx=>{assert.equal(ctx.result.chrono.status,'sample_empty');assert.equal(ctx.result.chrono.count,0);assert.match(ctx.output,/indisponible \(0 annonce dans l’échantillon\)/);}],
  [/^le résultat ne prétend pas qu'aucune annonce française n'existe sur Chrono24$/,ctx=>{assert.match(ctx.output,/ce ne sont pas nécessairement les offres les moins chères de tout Chrono24/);assert.ok(!ctx.result.chrono.offers.some(o=>o.id===ctx.fourth.id));}],
  [/^la recherche Chrono24 est inaccessible à cause d'un défi de sécurité ou d'une erreur réseau$/,ctx=>{ctx.blocked=true;ctx.sales.push(makeSale(sale2024,'2024-06-15',1900,'CV2010-4'));ctx.fees.set(sale2024,{buyerPercent:18,livePercent:0,source:doc2024});}],
  [/^la comparaison Chrono24 est demandée$/,execute],
  [/^la moyenne Chrono24 est indiquée comme non vérifiable pour cause d'accès$/,ctx=>{assert.equal(ctx.result.chrono.status,'inaccessible');assert.match(ctx.output,/Source non vérifiable \(accès empêché\)/);}],
  [/^elle n'est pas présentée comme une moyenne sur zéro annonce$/,ctx=>{assert.equal(ctx.result.chrono.count,null);assert.doesNotMatch(ctx.output,/\(0 annonce/);}],
  [/^la recherche Crédit Municipal reste présentée séparément si elle a été vérifiée$/,ctx=>{assert.equal(ctx.result.credit.average,2242);assert.ok(ctx.output.includes(sale2024));}],
];

export async function runScenario(scenario) {
 const ctx={};
 for(const step of scenario.steps) {
   const matches=handlers.map(([p,h])=>[step.text.match(p),h]).filter(([m])=>m);
   assert.equal(matches.length,1,`Handler unique attendu pour ${scenario.name}: ${step.text}`);
   try{await matches[0][1](ctx,matches[0][0]);}catch(e){e.message=`${scenario.name}: ${step.text}: ${e.message}`;throw e;}
 }
}
