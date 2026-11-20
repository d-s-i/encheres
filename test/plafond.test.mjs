import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { extractWatch } from '../src/watch.mjs';
import { compareWatch, calculateBidCeiling } from '../src/prices.mjs';
import { verifiedTargetFees } from '../src/price-fees.mjs';
import { formatComparison } from '../bin/comparer-prix.mjs';

const saleUrl = 'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/261205000/';
const catalogue = 'https://www.creditmunicipal.fr/app/uploads/sales/261205000/generate-catalogue-261205000.pdf';
const watch = extractWatch({number:268,title:'TAG HEUER, Monaco.',description:'Monaco chronographe calibre 12. Référence CAW2111. Bracelet en cuir. Sans écrin.',source:saleUrl+'tag-heuer-monaco/',saleUrl});
const offer = (id,price) => ({id,price,currency:'EUR',sellerCountry:'FR',available:true,brand:'TAG Heuer',model:'Monaco Calibre 12',reference:'CAW2111',url:`https://www.chrono24.fr/tagheuer/monaco--id${id}.htm`});
const targetFees = {buyerPercent:18,livePercent:1.2,source:catalogue};
const historic = {url:'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/240615000/tag-heuer-monaco/',date:'2024-06-15',number:246,brand:'TAG HEUER',model:'Monaco',reference:'CW2113-0',description:'Monaco cadran bleu à deux sous-compteurs.',hammerPrice:3700};

test('maximum bid divides asking-price mean by target-sale fees, not historic fees or a percentage of the mean',async()=>{
 const result=await compareWatch(watch,{asOf:'2026-11-15',cmSearch:async()=>[historic],feeLookup:async()=>({buyerPercent:18,livePercent:0,source:'https://example.org/2024.pdf'}),offerSearch:async()=>[offer(1,4100),offer(2,4590)],targetFeeLookup:async()=>targetFees});
 assert.equal(result.chrono.average,4345);assert.equal(result.chrono.count,2);assert.equal(result.credit.average,4366);
 assert.deepEqual(result.ceiling,{status:'partial',amount:3645.13,sourceAverage:4345,sourceCount:2,buyerPercent:18,livePercent:1.2,feeSource:catalogue});
 assert.ok(result.ceiling.amount*1.192<=result.chrono.average);assert.ok((result.ceiling.amount+0.01)*1.192>result.chrono.average);
 assert.notEqual(result.ceiling.amount,3700);assert.notEqual(result.ceiling.amount,4345*(1-.192));
});

test('public report labels the bid ceiling hors frais and shows its asking-price base and target-sale fee source',async()=>{
 const r=await compareWatch(watch,{asOf:'2026-11-15',cmSearch:async()=>[historic],feeLookup:async()=>({buyerPercent:18,livePercent:0,source:'https://example.org/2024.pdf'}),offerSearch:async()=>[offer(1,4100),offer(2,4590)],targetFeeLookup:async()=>targetFees});
 const out=formatComparison(r);
 assert.match(out,/Prix à ne pas dépasser\s*:\s*3[\s\u202f]645,13 € hors frais Crédit Municipal/i);
 assert.match(out,/moyenne partielle Chrono24.*4[\s\u202f]345 €.*2 annonces/i);
 assert.ok(out.includes(catalogue));
 assert.doesNotMatch(out,/Prix à ne pas dépasser\s*:\s*3[\s\u202f]700 €/i);
 const without=await compareWatch(watch,{asOf:'2026-11-15',cmSearch:async()=>[],offerSearch:async()=>[offer(1,4100)],targetFeeLookup:async()=>null});
 assert.match(formatComparison(without),/Prix à ne pas dépasser\s*:\s*indisponible.*frais.*vente ciblée/i);
});

test('missing sale URL from a user PDF leaves a future bid ceiling unverified rather than throwing',async()=>{
 const pdfWatch={...watch,saleUrl:null,source:'montres.pdf'};
 const result=await compareWatch(pdfWatch,{asOf:'2026-11-15',cmSearch:async()=>[],offerSearch:async()=>[offer(1,4100)],targetFeeLookup:async()=>null});
 assert.equal(result.ceiling.reason,'target_fees_unverified');assert.equal(result.ceiling.amount,null);
});

test('a sale on the analysis date is not treated as a future auction',async()=>{
 const result=await compareWatch(watch,{asOf:'2026-12-05',cmSearch:async()=>[],offerSearch:async()=>[offer(1,4100)],targetFeeLookup:async()=>{throw Error('should not need rates')}});
 assert.equal(result.ceiling.reason,'sale_not_upcoming');
});

test('default analysis date uses the complete current UTC date',async()=>{
 const before=new Date().toISOString().slice(0,10);
 const result=await compareWatch(watch,{cmSearch:async()=>[],offerSearch:async()=>[]});
 const after=new Date().toISOString().slice(0,10);
 assert.ok([before,after].includes(result.asOf));
});

test('cent rounding never exceeds the reference, including values exactly on a cent boundary',()=>{
 assert.equal(calculateBidCeiling(4345,{buyerPercent:18,livePercent:1.2,source:catalogue}).amount,3645.13);
 assert.equal(calculateBidCeiling(1000,{buyerPercent:25,livePercent:0,source:catalogue}).amount,800);
 assert.equal(calculateBidCeiling(1000,{buyerPercent:18,livePercent:1.2,source:catalogue}).amount,838.92);
});

test('missing target-sale fees cannot be substituted with historic sale fees',async()=>{
 const result=await compareWatch(watch,{asOf:'2026-11-15',cmSearch:async()=>[historic],feeLookup:async()=>({buyerPercent:18,livePercent:0,source:'https://example.org/2024.pdf'}),offerSearch:async()=>[offer(1,4100),offer(2,4590)],targetFeeLookup:async()=>null});
 assert.equal(result.credit.average,4366);assert.equal(result.ceiling.status,'unavailable');assert.equal(result.ceiling.amount,null);assert.equal(result.ceiling.reason,'target_fees_unverified');
});

test('no French offers and blocked Chrono24 yield distinct absent ceilings',async()=>{
 const options={asOf:'2026-11-15',cmSearch:async()=>[historic],feeLookup:async()=>null,targetFeeLookup:async()=>targetFees};
 const none=await compareWatch(watch,{...options,offerSearch:async()=>[]});
 assert.equal(none.ceiling.status,'unavailable');assert.equal(none.ceiling.reason,'chrono_unavailable');assert.equal(none.ceiling.amount,null);
 const blocked=await compareWatch(watch,{...options,offerSearch:async()=>{throw Error('Packet HTTP 426')}});
 assert.equal(blocked.ceiling.status,'inaccessible');assert.equal(blocked.ceiling.reason,'chrono_inaccessible');assert.equal(blocked.ceiling.amount,null);
});

async function pdfFor(lines) {
 const doc=await PDFDocument.create(),page=doc.addPage([595,842]),font=await doc.embedFont(StandardFonts.Helvetica);
 lines.forEach((line,i)=>page.drawText(line,{x:25,y:785-i*29,font,size:11}));
 return new Uint8Array(await doc.save());
}
const clauses=['Samedi 05 décembre 2026 à 14h00','2. FRAIS ACHETEURS','Frais acheteurs 18 % TTC sur le montant de l adjudication.','Frais supplémentaires de plateforme live de 1,2 % TTC sur l adjudication.','3. MODE DE PAIEMENT','6. ENCHÈRES EN DIRECT','1,2 % TTC en plus des frais acheteurs de 18,00 % TTC.','7. ORDRES D ACHAT'];

test('dated catalogue of target sale verifies both buyer and live fees, not the current generic terms',async()=>{
 const bytes=await pdfFor(clauses),calls=[];
 const fetchImpl=async url=>{calls.push(String(url));return String(url)===saleUrl?{ok:true,url:saleUrl,text:async()=>`<a href="${catalogue}">voir le catalogue de la vente (pdf)</a>`}:{ok:true,url:catalogue,arrayBuffer:async()=>bytes.buffer}};
 assert.deepEqual(await verifiedTargetFees(watch,{fetchImpl}),targetFees);
 assert.deepEqual(calls,[saleUrl,catalogue]);
});

test('a dated target catalogue that explicitly waives live surcharge uses buyer fees only',async()=>{
 const lines=clauses.filter(s=>!s.includes('1,2'));
 lines.splice(lines.findIndex(s=>s.startsWith('7. ORDRES')),0,'Pas de majoration des frais habituels pour les lots judiciaires : 18,00 % TTC frais acheteur.');
 const bytes=await pdfFor(lines);
 const fetchImpl=async url=>String(url)===saleUrl?{ok:true,url:saleUrl,text:async()=>`<a href="${catalogue}">catalogue PDF</a>`}:{ok:true,url:catalogue,arrayBuffer:async()=>bytes.buffer};
 assert.deepEqual(await verifiedTargetFees(watch,{fetchImpl}),{buyerPercent:18,livePercent:0,source:catalogue});
});

test('target sale URL must be a valid dated Credit Municipal sale before fetching conditions',async()=>{
 let calls=0;const fetchImpl=async()=>{calls++;throw Error('should not fetch')};
 for(const value of [undefined,'not a URL','https://wrong.example.org/ventes-aux-encheres/catalogue-des-ventes/261205000/','https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/261305000/','https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/260001000/','https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/261200000/','https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/261232000/']) {
   assert.equal(await verifiedTargetFees({...watch,saleUrl:value},{fetchImpl}),null);
 }
 assert.equal(calls,0);
});

test('target sale failures and malformed catalogues do not invent live fees',async()=>{
 for(const response of [{ok:false,status:503},{ok:true,url:'https://wrong.example.org/',text:async()=>''}]) assert.equal(await verifiedTargetFees(watch,{fetchImpl:async()=>response}),null);
 const catalogueHtml=`<a href="${catalogue}">catalogue</a>`;
 const validBytes=await pdfFor(clauses);
 for(const response of [{ok:false,status:503},{ok:true,url:'https://wrong.example.org/',arrayBuffer:async()=>new ArrayBuffer(0)},{ok:true,url:'https://www.creditmunicipal.fr/app/uploads/sales/261206000/other.pdf',arrayBuffer:async()=>validBytes.buffer},{ok:true,url:catalogue,arrayBuffer:async()=>new TextEncoder().encode('not PDF').buffer}]) {
   assert.equal(await verifiedTargetFees(watch,{fetchImpl:async url=>String(url)===saleUrl?{ok:true,url:saleUrl,text:async()=>catalogueHtml}:response}),null);
 }
 for(const lines of [clauses.filter(s=>!s.includes('Frais acheteurs 18 %')),clauses.filter(s=>!s.startsWith('2. FRAIS ACHETEURS')),clauses.filter(s=>!s.startsWith('6. ENCHÈRES EN DIRECT'))]) {
   const bytes=await pdfFor(lines);
   assert.equal(await verifiedTargetFees(watch,{fetchImpl:async url=>String(url)===saleUrl?{ok:true,url:saleUrl,text:async()=>catalogueHtml}:{ok:true,url:catalogue,arrayBuffer:async()=>bytes.buffer}}),null);
 }
});

test('bid ceiling validates prices and rates without returning rounded-up or unsafe amounts',()=>{
 for(const [value,fees] of [[0,targetFees],[-1,targetFees],[NaN,targetFees],[1000,null],[1000,{...targetFees,source:null}],[1000,{...targetFees,buyerPercent:-1}],[1000,{...targetFees,livePercent:NaN}],[Number.MAX_SAFE_INTEGER,targetFees]]) {
   assert.throws(()=>calculateBidCeiling(value,fees),/non vérifiés|limite de précision/);
 }
});

test('past sale or target fee lookup failure produces a labelled absent ceiling',async()=>{
 const past={...watch,saleUrl:'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/210605000/'};
 const options={asOf:'2026-11-15',cmSearch:async()=>[],offerSearch:async()=>[offer(1,4100)]};
 const old=await compareWatch(past,{...options,targetFeeLookup:async()=>{throw Error('must not check past sale')}});
 assert.equal(old.ceiling.reason,'sale_not_upcoming');
 const inaccessible=await compareWatch(watch,{...options,targetFeeLookup:async()=>{throw Error('catalogue failed')}});
 assert.equal(inaccessible.ceiling.reason,'target_fees_unverified');
});

test('target catalogue identity accepts January and December boundary dates',async()=>{
 for(const [id,label] of [['260101000','01 janvier 2026'],['261231000','31 décembre 2026']]) {
   const targetUrl=`https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/${id}/`;
   const docUrl=`https://www.creditmunicipal.fr/app/uploads/sales/${id}/generate-catalogue-${id}.pdf`;
   const bytes=await pdfFor(clauses.map(s=>s.replace('05 décembre 2026',label)));
   const result=await verifiedTargetFees({...watch,saleUrl:targetUrl},{fetchImpl:async url=>String(url)===targetUrl?{ok:true,url:targetUrl,text:async()=>`<a href="${docUrl}">catalogue</a>`}:{ok:true,url:docUrl,arrayBuffer:async()=>bytes.buffer}});
   assert.deepEqual(result,{buyerPercent:18,livePercent:1.2,source:docUrl});
 }
});

test('catalogue date on the first line is accepted without a leading zero',async()=>{
 const bytes=await pdfFor(['5 décembre 2026',...clauses.slice(1)]);
 const fetchImpl=async url=>String(url)===saleUrl?{ok:true,url:saleUrl,text:async()=>`<a href="${catalogue}">catalogue</a>`}:{ok:true,url:catalogue,arrayBuffer:async()=>bytes.buffer};
 assert.deepEqual(await verifiedTargetFees(watch,{fetchImpl}),targetFees);
});

test('a dated target catalogue with zero buyer fees does not invent a surcharge',async()=>{
 const bytes=await pdfFor(clauses.map(s=>s.replace('Frais acheteurs 18 % TTC','Frais acheteurs 0 % TTC')));
 const result=await verifiedTargetFees(watch,{fetchImpl:async url=>String(url)===saleUrl?{ok:true,url:saleUrl,text:async()=>`<a href="${catalogue}">catalogue</a>`}:{ok:true,url:catalogue,arrayBuffer:async()=>bytes.buffer}});
 assert.deepEqual(result,{buyerPercent:0,livePercent:1.2,source:catalogue});
});

test('wrong date, missing live rate or foreign catalogue cannot justify a bid ceiling',async()=>{
 const wrong=await pdfFor(clauses.map(s=>s.replace('05 décembre 2026','06 décembre 2026')));
 const noLive=await pdfFor(clauses.filter(s=>!s.includes('1,2')));
 const lookup=(html,bytes)=>verifiedTargetFees(watch,{fetchImpl:async url=>String(url)===saleUrl?{ok:true,url:saleUrl,text:async()=>html}:{ok:true,url:catalogue,arrayBuffer:async()=>bytes.buffer}});
 assert.equal(await lookup(`<a href="${catalogue}">pdf</a>`,wrong),null);
 assert.equal(await lookup(`<a href="${catalogue}">pdf</a>`,noLive),null);
 let foreignFetched=false;
 assert.equal(await verifiedTargetFees(watch,{fetchImpl:async url=>{if(String(url)!==saleUrl)foreignFetched=true;return {ok:true,url:saleUrl,text:async()=>'<a href="https://evil.example.org/not-a-catalogue.pdf">pdf</a>'}}}),null);
 assert.equal(foreignFetched,false);
});
