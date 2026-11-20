import assert from 'node:assert/strict';
import { extractWatch } from '../src/watch.mjs';
import { compareWatch } from '../src/prices.mjs';
import { run } from '../bin/comparer-prix.mjs';

const sale = 'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/261205000/';
const catalogue = 'https://www.creditmunicipal.fr/app/uploads/sales/261205000/generate-catalogue-261205000.pdf';
const historicUrl = 'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/240615000/tag-heuer-monaco-montre-dhomme-de-forme-carree/';
const monaco = extractWatch({number:268,title:'TAG HEUER, Monaco.',description:'TAG HEUER Monaco chronographe calibre 12. Référence CAW2111. Bracelet cuir. Sans écrin ni papiers.',source:sale+'tag-heuer-monaco-montre-bracelet-de-forme-carre/',saleUrl:sale,estimation:[1500,2000]});
const historic = {url:historicUrl,date:'2024-06-15',number:246,brand:'TAG HEUER',model:'Monaco',reference:'CW2113-0',description:'TAG HEUER Monaco avec deux sous-compteurs, bracelet cuir.',hammerPrice:3700};
const amount = value => Number(value.replace(/[\s\u202f]/g,'').replace(',','.'));

async function execute(ctx) {
  const study = async input => { assert.equal(input.saleUrl,sale);assert.deepEqual(input.numbers,[268]);return {watches:[monaco],missing:[]}; };
  const compare = async (watch,options) => {
    ctx.result = await compareWatch(watch,{...options,cmSearch:async()=>[historic],feeLookup:async()=>ctx.historicFees,offerSearch:async()=>{if(ctx.packetBlocked)throw Error('Packet inaccessible (426)');return ctx.offers;},targetFeeLookup:async()=>ctx.targetFees});
    return ctx.result;
  };
  ctx.output=await run(['--url',sale,'--as-of',ctx.asOf,'268'],{study,compare});
  assert.match(ctx.output,/Lot 268/);
}

const handlers = [
  [/^le lot (\d+) TAG Heuer Monaco de la vente du (\d+) décembre (\d{4}) est à venir$/, (ctx,m)=>{assert.equal(Number(m[1]),monaco.number);assert.equal(`${m[3]}-12-${m[2].padStart(2,'0')}`,'2026-12-05');assert.ok(ctx.asOf<'2026-12-05');ctx.upcoming=true;}],
  [/^la moyenne partielle des prix demandés Chrono24 hors port est de ([\d ]+) € sur (\d+) annonces françaises$/, (ctx,m)=>{const average=amount(m[1]),count=Number(m[2]);assert.ok(count>0&&count<=3);ctx.expectedAverage=average;ctx.expectedCount=count;ctx.offers=Array.from({length:count},(_,i)=>({id:i+1,price:average+(i-(count-1)/2)*490,currency:'EUR',sellerCountry:'FR',available:true,brand:'TAG Heuer',model:'Monaco Calibre 12',reference:'CAW2111',url:`https://www.chrono24.fr/tagheuer/monaco--id${i+1}.htm`}));}],
  [/^le catalogue daté de la vente ciblée fixe (\d+) % TTC de frais acheteur et (\d+,\d+) % TTC de frais live sur l'adjudication$/, (ctx,m)=>{ctx.targetFees={buyerPercent:Number(m[1]),livePercent:amount(m[2]),source:catalogue};}],
  [/^l'utilisateur demande l'analyse du lot (\d+) pour un achat en ligne$/,async (ctx,m)=>{assert.equal(Number(m[1]),268);assert.equal(ctx.upcoming,true);await execute(ctx);}],
  [/^le « prix à ne pas dépasser » est de ([\d ]+,\d{2}) € hors frais Crédit Municipal$/, (ctx,m)=>{assert.equal(ctx.result.ceiling.amount,amount(m[1]));assert.match(ctx.output,new RegExp(`Prix à ne pas dépasser : ${m[1].trim().replace(/ /g,'[\\s\\u202f]').replace(',','[,]')} € hors frais Crédit Municipal`));}],
  [/^le résultat indique la moyenne Chrono24 partielle et les frais de la vente ciblée utilisés pour ce plafond$/,ctx=>{assert.equal(ctx.result.ceiling.sourceAverage,ctx.expectedAverage);assert.equal(ctx.result.ceiling.sourceCount,ctx.expectedCount);assert.match(ctx.output,/Base : moyenne partielle Chrono24 des prix demandés hors port/);assert.ok(ctx.output.includes(catalogue));assert.match(ctx.output,/Frais de la vente ciblée/);}],
  [/^le coût estimé avec ces frais ne dépasse pas ([\d ]+) €$/, (ctx,m)=>{const cap=ctx.result.ceiling;assert.ok(cap.amount*(1+(cap.buyerPercent+cap.livePercent)/100)<=amount(m[1]));}],
  [/^les ([\d ]+) € adjugés hors frais d'un autre lot en (\d{4}) ne sont pas présentés comme le plafond$/, (ctx,m)=>{assert.equal(historic.hammerPrice,amount(m[1]));assert.equal(historic.date.slice(0,4),m[2]);assert.ok(ctx.output.includes(historicUrl));assert.notEqual(ctx.result.ceiling.amount,historic.hammerPrice);assert.doesNotMatch(ctx.output,/Prix à ne pas dépasser\s*:\s*3[\s\u202f]700 €/);}],
  [/^l'utilisateur demande le « prix à ne pas dépasser »$/,execute],
  [/^le plafond affiché est ([\d ]+,\d{2}) € hors frais$/, (ctx,m)=>{assert.equal(ctx.result.ceiling.amount,amount(m[1]));assert.match(ctx.output,/Prix à ne pas dépasser/);}],
  [/^une enchère à ([\d ]+,\d{2}) € dépasserait ([\d ]+) € frais compris$/, (ctx,m)=>{const f=ctx.result.ceiling;assert.equal(amount(m[1]),Math.round((f.amount+0.01)*100)/100);assert.ok(amount(m[1])*(1+(f.buyerPercent+f.livePercent)/100)>amount(m[2]));}],
  [/^seuls les frais d'une ancienne vente comparable sont connus, pas ceux de la vente ciblée$/,ctx=>{ctx.targetFees=null;ctx.historicFees={buyerPercent:18,livePercent:0,source:'https://example.org/catalogue-2024.pdf'};}],
  [/^le plafond est indiqué comme indisponible faute de frais vérifiés pour la vente ciblée$/,ctx=>{assert.equal(ctx.result.credit.average,4366);assert.equal(ctx.result.ceiling.amount,null);assert.equal(ctx.result.ceiling.reason,'target_fees_unverified');assert.match(ctx.output,/Prix à ne pas dépasser : indisponible : frais de la vente ciblée non vérifiés/);}],
  [/^aucun taux d'une vente ancienne n'est appliqué au lot étudié$/,ctx=>{assert.equal(ctx.result.ceiling.feeSource,undefined);assert.doesNotMatch(ctx.output,/Prix à ne pas dépasser : [\d]/);}],
  [/^aucune annonce Chrono24 comparable de vendeur français n'est disponible après une recherche aboutie$/,ctx=>{ctx.offers=[];ctx.searchCompleted=true;}],
  [/^les frais de la vente ciblée sont vérifiés$/,ctx=>{ctx.targetFees={buyerPercent:18,livePercent:1.2,source:catalogue};}],
  [/^le plafond est indiqué comme indisponible faute de moyenne Chrono24$/,ctx=>{assert.equal(ctx.searchCompleted,true);assert.equal(ctx.result.chrono.count,0);assert.equal(ctx.result.ceiling.reason,'chrono_unavailable');assert.match(ctx.output,/Prix à ne pas dépasser : indisponible : moyenne Chrono24 indisponible/);}],
  [/^aucune adjudication historique ni estimation de la montre ne remplace cette moyenne$/,ctx=>{assert.equal(monaco.estimation[0],1500);assert.equal(ctx.result.credit.sales[0].hammerPrice,3700);assert.equal(ctx.result.ceiling.amount,null);}],
  [/^la moyenne des trois annonces françaises vérifiées dans les trois premières pages est de ([\d ]+) € hors port$/, (ctx,m)=>{const mean=amount(m[1]);ctx.offers=[mean-300,mean,mean+300].map((price,i)=>({id:i+1,price,currency:'EUR',sellerCountry:'FR',available:true,brand:'TAG Heuer',model:'Monaco Calibre 12',reference:'CAW2111',url:`https://www.chrono24.fr/tagheuer/monaco--id${i+1}.htm`}));}],
  [/^la recherche compte (\d+) pages et (\d+) annonces, dont seulement (\d+) ont été analysées$/, (ctx,m)=>{ctx.offers.sample={totalPages:Number(m[1]),totalListings:Number(m[2]),inspectedPages:3,inspectedListings:Number(m[3]),query:'TAG HEUER Monaco'};}],
  [/^la vente ciblée applique (\d+) % TTC de frais acheteur et (\d+,\d+) % TTC de frais live$/, (ctx,m)=>{ctx.targetFees={buyerPercent:Number(m[1]),livePercent:amount(m[2]),source:catalogue};}],
  [/^le plafond calculé est ([\d ]+,\d{2}) € hors frais sur la base de l'échantillon$/, (ctx,m)=>{assert.equal(ctx.result.ceiling.amount,amount(m[1]));assert.equal(ctx.result.ceiling.status,'sample');assert.match(ctx.output,/Prix à ne pas dépasser : 1[\s\u202f]090,60 € hors frais/);assert.match(ctx.output,/échantillon des trois premières pages seulement/);}],
  [/^le résultat précise que des offres moins chères peuvent exister après la troisième page$/,ctx=>{assert.ok(ctx.result.ceiling.sample.inspectedPages<ctx.result.ceiling.sample.totalPages);assert.match(ctx.output,/pas nécessairement les offres les moins chères de tout Chrono24/);}],
  [/^la recherche Chrono24 est inaccessible et ne permet pas de vérifier une moyenne$/,ctx=>{ctx.packetBlocked=true;}],
  [/^le plafond est indiqué comme non vérifiable faute d'accès à Chrono24$/,ctx=>{assert.equal(ctx.result.ceiling.status,'inaccessible');assert.equal(ctx.result.ceiling.reason,'chrono_inaccessible');assert.match(ctx.output,/Prix à ne pas dépasser : non vérifiable : accès à Chrono24 impossible/);}],
  [/^aucun montant de zéro euro n'est affiché comme plafond$/,ctx=>{assert.equal(ctx.result.ceiling.amount,null);assert.doesNotMatch(ctx.output,/Prix à ne pas dépasser\s*:\s*0[,.]?0*\s*€/);}],
];

export async function runScenario(scenario) {
  const ctx={asOf:'2026-11-15',offers:[],targetFees:null,historicFees:{buyerPercent:18,livePercent:0,source:'https://serret-portier-expertises.com/wp-content/uploads/2021/05/Catalogue-Bijoux-Montres-juin2024_bdef_web.pdf'},output:null};
  for(const step of scenario.steps) {
    const matches=handlers.map(([pattern,fn])=>[step.text.match(pattern),fn]).filter(([m])=>m);
    assert.equal(matches.length,1,`Handler unique attendu pour ${scenario.name}: ${step.text}`);
    try { await matches[0][1](ctx,matches[0][0]); }
    catch(e) { e.message=`${scenario.name}: ${step.text}: ${e.message}`;throw e; }
  }
}
