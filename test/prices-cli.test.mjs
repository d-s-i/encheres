import test from 'node:test';
import assert from 'node:assert/strict';
import { run, formatComparison } from '../bin/comparer-prix.mjs';

const source='https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/261205000/';
const watch={number:343,brand:'PANERAI',model:'Luminor Marina',reference:'PAM01028'};
const result={lot:343,brand:watch.brand,model:watch.model,reference:watch.reference,asOf:'2026-11-15',credit:{status:'unavailable',average:null,count:0,sales:[]},chrono:{status:'partial',average:3750,count:1,offers:[{price:3750,sellerCountry:'FR',reference:'PAM01028',url:'https://www.chrono24.fr/panerai/id1.htm',differences:{}}],sample:{inspectedPages:1,inspectedListings:1,totalPages:1,totalListings:1}},ceiling:{amount:3145.97,status:'partial',sourceAverage:3750,sourceCount:1,buyerPercent:18,livePercent:1.2,feeSource:'https://www.creditmunicipal.fr/catalogue.pdf'}};

test('CLI preserves public URL, PDF and missing-lot behavior',async()=>{
 const received=[],study=async input=>{received.push(input);return {watches:[watch],missing:[999]}};
 const compare=async (w,options)=>{assert.equal(w,watch);assert.deepEqual(options,{asOf:'2026-11-15'});return result};
 const url=await run(['--url',source,'--as-of','2026-11-15','343','999'],{study,compare});
 assert.deepEqual(received[0],{saleUrl:source,numbers:[343,999]});
 assert.match(url,/Lot 999 : aucun lot trouvé/);assert.match(url,/Prix à ne pas dépasser/);
 const pdf=await run(['--pdf','montres.pdf','--as-of','2026-11-15','343'],{study,compare,readFileImpl:async()=>Buffer.from('%PDF-test')});
 assert.deepEqual(received[1].numbers,[343]);assert.equal(received[1].pdfName,'montres.pdf');assert.equal(received[1].pdfBytes.toString(),'37,80,68,70,45,116,101,115,116');
 assert.match(pdf,/Lot 343/);
});

test('CLI rejects missing and malformed options without changing output contracts',async()=>{
 for(const args of [[],['--other',source,'343'],['--url',source],['--url',source,'abc'],['--url',source,'--as-of','bad','343'],['--url',source,'--as-of']]) {
   await assert.rejects(run(args,{study:async()=>{throw Error('should not run')}}),/Usage|Numéros de lot et date/);
 }
});

test('rendering distinguishes a sampled result from an exhaustive one and preserves unavailable reasons',()=>{
 const scoped=structuredClone(result);
 scoped.chrono.sample={inspectedPages:3,inspectedListings:150,totalPages:51,totalListings:2545};
 scoped.ceiling.sample=scoped.chrono.sample;
 let output=formatComparison(scoped);
 assert.match(output,/3 pages, 150 annonces analysées sur 2545 résultats/);
 assert.match(output,/échantillon des trois premières pages seulement/);
 assert.match(output,/pas nécessairement les offres les moins chères de tout Chrono24/);
 const exhaustive=structuredClone(result);
 exhaustive.ceiling.sample=exhaustive.chrono.sample;
 output=formatComparison(exhaustive);
 assert.doesNotMatch(output,/échantillon des trois premières pages seulement/);
 output=formatComparison(result);
 assert.match(output,/1 page, 1 annonce analysées sur 1 résultats/);
 assert.match(output,/état : non renseigné/);
 const withCondition=structuredClone(result);
 withCondition.chrono.offers[0].condition='Très bon';
 assert.match(formatComparison(withCondition),/état : Très bon/);
 assert.match(output,/Moyenne partielle des prix affichés : 3[\s\u202f]750 € \(1 annonce\)/);
 assert.match(output,/Base : moyenne partielle Chrono24.*\(1 annonce française\)/);
 assert.match(output,/tous les résultats de cette recherche ont été parcourus/);
 const unavailable=structuredClone(result);
 unavailable.chrono={status:'sample_empty',average:null,count:0,offers:[],sample:scoped.chrono.sample};
 unavailable.ceiling={status:'unavailable',amount:null,reason:'chrono_unavailable_sample'};
 assert.match(formatComparison(unavailable),/Prix à ne pas dépasser : indisponible : aucune annonce admissible dans l’échantillon/);
});
