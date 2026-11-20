import test from 'node:test';
import assert from 'node:assert/strict';
import { extractWatch } from '../src/watch.mjs';
import { verifiedFees } from '../src/price-fees.mjs';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { compareWatch, selectHistoricalSales, selectOffers, searchCreditMunicipal, searchPacket } from '../src/prices.mjs';

const target = extractWatch({ number: 318, title: 'TAG HEUER, Carrera.', description: 'Montre chronographe automatique Calibre 16. Bracelet caoutchouc. Référence : CV2010-3. Sans écrin ni papiers.', source: 'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/210605000/tag-heuer-carrera/' });
const chopard = extractWatch({ number: 323, title: 'CHOPARD, Alfa Romeo.', description: 'Montre chronographe GMT. Bracelet caoutchouc. Référence : 8954. Écrin.', source: 'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/210605000/chopard-alfa-romeo/' });
const sale = (id, price, description = 'TAG HEUER, Carrera chronographe Calibre 16. Référence : CV2010-4. Bracelet en acier.') => ({ number: 288, url: `https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/${id}/tag-heuer-carrera/`, date: `20${id.slice(0,2)}-${id.slice(2,4)}-${id.slice(4,6)}`, brand: 'TAG HEUER', model: 'Carrera', description, reference: id === '240615000' ? 'CV2010-4' : 'CV2010-0', bracelet: 'acier', box: 'absent', hammerPrice: price });
const offer = (id, price, country = 'FR', overrides = {}) => ({ id, price, currency: 'EUR', sellerCountry: country, available: true, brand: 'TAG Heuer', model: 'Carrera Calibre 16', reference: 'CV2010', bracelet: 'acier', box: 'présent', url: `https://www.chrono24.fr/tagheuer/carrera--id${id}.htm`, ...overrides });

test('five-year inclusive boundary, sold vs estimate, fees by dated source, no old CGV fallback', () => {
 const sales = [sale('210605000',1500),sale('211111000',1200),sale('220611000',1650),sale('240615000',1900),sale('260620000',2000),sale('271101000',9999)];
 const result = selectHistoricalSales(target, sales, '2026-11-11', s => s.date === '2024-06-15' ? { buyerPercent:18, livePercent:0, source:'https://example.org/2024-catalogue.pdf' } : null);
 assert.equal(result.status,'partial');
 assert.deepEqual(result.sales.map(s=>[s.date,s.hammerPrice,s.onlineCost]),[['2021-11-11',1200,null],['2022-06-11',1650,null],['2024-06-15',1900,2242],['2026-06-20',2000,null]]);
 assert.equal(result.count,1);assert.equal(result.average,2242);
 assert.equal(result.sales[2].feeSource,'https://example.org/2024-catalogue.pdf');
 assert.equal(result.sales[2].differences.bracelet,'acier (lot : caoutchouc)');
});

test('sale window includes both boundary dates and rejects dates just outside them',()=>{
 const candidates=[sale('211110000',1000),sale('211111000',1200),sale('261111000',1400),sale('261112000',2000)];
 const result=selectHistoricalSales(target,candidates,'2026-11-11',()=>({buyerPercent:0,livePercent:0,source:'https://example.org/dated-cgv.pdf'}));
 assert.deepEqual(result.sales.map(s=>[s.date,s.hammerPrice,s.onlineCost]),[['2021-11-11',1200,1200],['2026-11-11',1400,1400]]);
 assert.equal(result.average,1300);assert.equal(result.status,'available');
});

test('historical selection rejects invalid analysis dates, missing sources, zero hammer and duplicate auctions',()=>{
 assert.throws(()=>selectHistoricalSales(target,[], '2026-13-01',()=>null),/Date d’analyse invalide/);
 const valid=sale('240615000',1),duplicate={...valid},noUrl={...valid,url:''},zero={...valid,url:valid.url+'zero/',hammerPrice:0};
 const result=selectHistoricalSales(target,[valid,duplicate,noUrl,zero],'2026-11-11',()=>({buyerPercent:0,livePercent:0,source:'https://example.org/dated.pdf'}));
 assert.equal(result.count,1);assert.equal(result.sales[0].onlineCost,1);assert.equal(result.sales.length,1);
});

test('non-finite historic fee rates never enter a cost-inclusive mean',()=>{
 const result=selectHistoricalSales(target,[sale('240615000',1900)],'2026-11-11',()=>({buyerPercent:Infinity,livePercent:0,source:'https://example.org/dated.pdf'}));
 assert.equal(result.count,0);assert.equal(result.average,null);assert.equal(result.sales[0].onlineCost,null);
});

test('Monaco Calibre 12 is not compared with Monaco Linear System or a time-only Monaco',()=>{
 const targetMonaco=extractWatch({number:268,title:'TAG HEUER, Monaco.',description:'Montre carrée chronographe Calibre 12. Référence CAW2111. Bracelet cuir.',source:'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/261205000/monaco/'});
 const good={...sale('240615000',3700),model:'Monaco',reference:'CW2113-0',description:'TAG HEUER Monaco cadran bleu à deux sous-compteurs. Bracelet cuir.'};
 const linear={...sale('240615000',2900),url:'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/240615000/monaco-linear/',model:'Monaco Linear System',reference:'CAL2110',description:'TAG HEUER Monaco Linear System avec compteurs chronographe.'};
 const noChrono={...sale('241207000',1600),model:'Monaco',reference:'WAW131A',description:'TAG HEUER Monaco automatique, cadran à index et guichet date.'};
 const result=selectHistoricalSales(targetMonaco,[good,linear,noChrono],'2026-11-15',()=>({buyerPercent:18,livePercent:0,source:'https://example.org/catalogue.pdf'}));
 assert.deepEqual(result.sales.map(s=>s.reference),['CW2113-0']);assert.equal(result.average,4366);
});

test('a Monaco with a catalogue line break after sous- remains a chronograph comparable',()=>{
 const monaco=extractWatch({number:268,title:'TAG HEUER, Monaco.',description:'Montre chronographe Calibre 12. Référence CAW2111.',source:'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/261205000/lot268/'});
 const historic={...sale('221210000',4800),number:302,brand:'TAG HEUER',model:'Monaco',reference:'CAW211P',description:'TAG HEUER, Monaco. Cadran bleu à deux sous- compteurs et guichet date à 6h. Calibre 11.',date:'2022-12-10'};
 const result=selectHistoricalSales(monaco,[historic],'2026-11-15',()=>null);
 assert.deepEqual(result.sales.map(s=>[s.number,s.date,s.reference,s.hammerPrice]),[[302,'2022-12-10','CAW211P',4800]]);
});

test('French Monaco Calibre 12 product titles and CAW2111 variants remain comparable without repeating chronographe',()=>{
 const targetMonaco=extractWatch({number:268,title:'TAG HEUER, Monaco.',description:'Montre carrée chronographe Calibre 12. Référence CAW2111. Bracelet cuir.',source:'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/261205000/monaco/'});
 const result=selectOffers(targetMonaco,[offer(48909624,4100,'FR',{model:'Monaco Calibre 12',reference:'CAW2111.FC6183'}),offer(48704080,4590,'FR',{model:'Monaco Calibre 12',reference:'CAW2111'}),offer(77,900,'FR',{model:'Monaco Calibre 6',reference:'WAW131A'})]);
 assert.equal(result.count,2);assert.equal(result.average,4345);
});

test('Monaco reference matching distinguishes missing, exact, suffix and unrelated references',()=>{
 const monaco=extractWatch({number:268,title:'TAG HEUER, Monaco.',description:'Montre chronographe. Référence CAW2111. Bracelet cuir.',source:'https://example.org/target'});
 const offers=[offer(1,1000,'FR',{model:'Monaco',reference:'CAW2111'}),offer(2,1100,'FR',{model:'Monaco',reference:'CAW2111.FC6183'}),offer(3,1200,'FR',{model:'Monaco',reference:'CAW2112'})];
 assert.deepEqual(selectOffers(monaco,offers).offers.map(o=>o.id),[1,2]);
 assert.equal(selectOffers({...monaco,reference:null},offers).count,0);
 assert.equal(selectOffers(monaco,[offer(4,900,'FR',{model:'Monaco',reference:null})]).count,0);
});

test('Carrera CV2010 family remains comparable without a calibre in the candidate description',()=>{
 const same={...sale('240615000',1900),reference:'CV2010-4',description:'TAG HEUER Carrera chronographe, bracelet acier.'};
 const different={...same,url:'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/240615000/other/',reference:'CV2014'};
 const result=selectHistoricalSales(target,[same,different],'2026-11-11',()=>null);
 assert.deepEqual(result.sales.map(s=>s.reference),['CV2010-4']);
});

test('no fee evidence cannot turn known adjudications into an invented online mean', () => {
 const result=selectHistoricalSales(chopard,[{...sale('210206000',4550),brand:'CHOPARD',model:'Alfa Romeo',description:'Alfa Romeo 8954'}, {...sale('240615000',3100),brand:'CHOPARD',model:'Alfa Romeo',description:'Alfa Romeo 8954'}],'2026-11-11',()=>null);
 assert.equal(result.count,0);assert.equal(result.average,null);assert.equal(result.sales.length,1);assert.equal(result.sales[0].onlineCost,null);
});

test('missing reference and absent attributes do not make a time-only Monaco comparable',()=>{
 const monaco=extractWatch({number:268,title:'TAG HEUER, Monaco.',description:'Montre chronographe en acier. Bracelet en cuir.',source:'https://example.org/target'});
 const result=selectOffers(monaco,[offer(1,900,'FR',{model:'Monaco',reference:null,bracelet:null,box:null}),offer(2,1000,'FR',{model:'Monaco chronographe',reference:null,bracelet:null,box:null})]);
 assert.deepEqual(result.offers.map(o=>o.id),[2]);assert.deepEqual(result.offers[0].differences,{});
});

test('a generic Carrera still compares same-brand model variants without demanding calibre 16',()=>{
 const generic=extractWatch({number:7,title:'TAG HEUER, Carrera.',description:'TAG HEUER Carrera automatique. Bracelet acier.',source:'https://example.org/target'});
 const result=selectOffers(generic,[offer(1,1500,'FR',{model:'Carrera Calibre 5'})]);
 assert.equal(result.count,1);
});

test('lowest three deduplicate by id, filter seller France, exclude shipping, wrong model and foreign asks', () => {
 const source=[offer(1,2000),offer(2,1500),offer(3,1650),offer(4,1800),offer(5,2300),offer(3,1650),offer(6,500,'IT'),offer(7,400,'FR',{model:'Carrera Calibre 5'}),offer(8,300,'FR',{available:false})];
 const result=selectOffers(target,source);
 assert.deepEqual(result.offers.map(x=>x.price),[1500,1650,1800]);assert.equal(result.average,1650);assert.equal(result.status,'available');assert.equal(result.count,3);
});

test('offer ranking excludes zero/negative prices and is stable for equal asks',()=>{
 const result=selectOffers(target,[offer(4,0),offer(5,-10),offer(6,1500),offer(3,1500),offer(9,NaN),offer(7,1000,'IT')]);
 assert.deepEqual(result.offers.map(o=>o.id),[3,6]);assert.equal(result.average,1500);
});

test('a fully inspected three-offer search is not labelled a partial three-page sample',()=>{
 const offers=[offer(1,1),offer(2,2),offer(3,3)];
 offers.sample={inspectedPages:3,totalPages:3,inspectedListings:3,totalListings:3};
 const result=selectOffers(target,offers);
 assert.deepEqual(result.offers.map(o=>o.price),[1,2,3]);assert.equal(result.status,'available');assert.equal(result.sample.totalPages,3);
});

test('one matching offer yields partial; no offer yields unavailable; inaccessible source is not zero',async()=>{
 const partial=selectOffers(target,[offer(45070719,1750),offer(9,1690,'IT')]);assert.equal(partial.average,1750);assert.equal(partial.status,'partial');assert.equal(partial.offers[0].differences.box,'présent (lot : absent)');
 const none=selectOffers(chopard,[offer(1,1000,'FR',{brand:'Chopard',model:'Mille Miglia'})]);assert.equal(none.status,'unavailable');assert.equal(none.count,0);
 const r=await compareWatch(target,{asOf:'2026-11-11',cmSearch:async()=>[sale('240615000',1900)],feeLookup:()=>({buyerPercent:18,livePercent:0,source:'https://example.org/catalogue.pdf'}),offerSearch:async()=>{throw new Error('HTTP 403')}});
 assert.equal(r.chrono.status,'inaccessible');assert.equal(r.chrono.average,null);assert.equal(r.credit.average,2242);
});

function cmCard(id,number,description,price){const url=`https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/${id}/tag-heuer-carrera/`;return {url,card:`<div class="card--lot"><h2 class="card__title"><a href="${url}">TAG HEUER Carrera</a></h2></div>`,detail:`<div class="lot__number">Lot n°${number}</div><h1 class="lot__title">TAG HEUER, Carrera.</h1><div class="lot__prices">Adjugé à ${price} €* le 15 juin 20${id.slice(0,2)}</div><div class="lot__description"><p>${description}</p></div>`};}
test('Credit Municipal searches exactly the allowed last page and never starts at page zero',async()=>{
 const card=cmCard('240615000',288,'TAG HEUER Carrera chronographe. Calibre 16. Référence : CV2010-4. Bracelet acier.','1 900');
 const requests=[];
 const fetchImpl=async url=>{const u=new URL(url);requests.push(u.toString());const body=u.pathname.includes('rechercher-un-lot')?(u.searchParams.get('_paged')==='2'?card.card:'<a class="page-item last-page" href="?_paged=2">last</a><div class="card--lot"></div>'):card.detail;return {ok:true,url:u.toString(),text:async()=>body}};
 const result=await searchCreditMunicipal(target,{fetchImpl,maxPages:2});
 assert.equal(result.length,1);assert.equal(requests[0].includes('_paged'),false);
 assert.equal(requests.filter(u=>u.includes('/rechercher-un-lot/')).length,2);
 assert.ok(requests.some(u=>u.includes('_paged=2')));
});

test('Credit Municipal ignores foreign cards with auction-like paths while retaining a valid lot',async()=>{
 const card=cmCard('240615000',288,'TAG HEUER Carrera chronographe. Calibre 16. Référence : CV2010-4. Bracelet acier.','1 900');
 const foreign=card.card.replaceAll('https://www.creditmunicipal.fr','https://foreign.example.org');
 const calls=[];
 const fetchImpl=async url=>{calls.push(String(url));return {ok:true,url:String(url),text:async()=>String(url).includes('/rechercher-un-lot/')?foreign+card.card:card.detail}};
 const result=await searchCreditMunicipal(target,{fetchImpl});
 assert.deepEqual(result.map(s=>s.url),[card.url]);
 assert.equal(calls.length,2);assert.ok(calls.every(url=>new URL(url).hostname==='www.creditmunicipal.fr'));
});

test('Credit Municipal search traverses pages and verifies dated details, not print-page CGV',async()=>{
 const a=cmCard('240615000',288,'TAG HEUER Carrera chronographe. Référence CV2010-4. Bracelet en acier.', '1 900');
 const b=cmCard('210605000',318,'TAG HEUER Carrera chronographe. Calibre 16. Référence : CV2010-3. Bracelet en caoutchouc.', '1 500');
 const urls=[];const fetchImpl=async u=>{urls.push(String(u));return {ok:true,text:async()=>String(u).includes('/rechercher-un-lot/') ? (String(u).includes('_paged=2') ? b.card : `<a class="page-item last-page" href="?_paged=2">last</a>${a.card}`) : (String(u)===a.url?a.detail:b.detail)}};
 const got=await searchCreditMunicipal(target,{fetchImpl});assert.equal(got.length,2);assert.equal(got[0].date,'2024-06-15');assert.equal(got[0].hammerPrice,1900);assert.equal(got[0].reference,'CV2010-4');assert.equal(urls.filter(u=>u.includes('_paged=2')).length,1);
});

test('Credit Municipal excludes malformed detail pages rather than fabricating sold lots',async()=>{
 const card=cmCard('240615000',288,'TAG HEUER Carrera chronographe. Référence CV2010-4. Bracelet acier.','1 900');
 const details=[
   card.detail.replace('TAG HEUER, Carrera.',''),
   card.detail.replace(/<p>[^<]+<\/p>/,'<p></p>'),
   card.detail.replace('Adjugé à 1 900 €','Estimation : 1 900 €'),
   card.detail.replace('le 15 juin 2024','le 15 juin 2023'),
   card.detail.replace('le 15 juin 2024','le 15 juin 1024'),
   card.detail.replace('Lot n°288','Lot numéro inconnu'),
 ];
 for(const html of details) {
   const fetchImpl=async url=>({ok:true,text:async()=>String(url).includes('/rechercher-un-lot/')?card.card:html});
   assert.deepEqual(await searchCreditMunicipal(target,{fetchImpl}),[]);
 }
});

function searchResult(listings,total,from=0){return {payload:{paging:{total,totalPages:Math.max(1,Math.ceil(total/2)),pageSize:2,from},listings:listings.map(x=>({listing:{listingId:x.id,title:x.title??'TAG Heuer Carrera Calibre 16',subtitle:'CV2010',listingUrl:`/tagheuer/carrera--id${x.id}.htm`,price:{amount:String(x.price),currency:'EUR'},location:{countryCode:x.country},listingStatus:'Available',watchStockInfo:'InStock'}}))}}}
function product(id,price,country='FR',model='Carrera Calibre 16'){return {payload:{id,manufacturer:{name:'TAG Heuer'},title:`TAG Heuer ${model}`,productType:'Watch_Wristwatch',sold:false,inactive:false,reserved:false,availabilityText:"L'article est en stock",price:{value:price,currency:'EUR'},referenceNumber:'CV2010',seller:{privateSeller:{contactInfo:{countryCode:country}}},url:`https://www.chrono24.fr/tagheuer/carrera--id${id}.htm`,scopeOfDelivery:'WithBoxAndPapers'}}}
test('Packet searches by brand and model, without requiring the same reference',async()=>{
 const monaco=extractWatch({number:268,title:'TAG HEUER, Monaco.',description:'Montre chronographe Calibre 12. Référence CAW2111. Bracelet cuir.',source:'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/261205000/monaco/'});
 let query;
 await searchPacket(monaco,{apiKey:'fixture-only',fetchImpl:async url=>{query=new URL(url).searchParams.get('query');return {ok:true,json:async()=>searchResult([],0)}},pace:async()=>{}});
 assert.equal(query,'TAG HEUER Monaco');
});

test('Packet samples at most first three relevance pages and labels the French lowest asks within the sample',async()=>{
 const panerai=extractWatch({number:343,title:'PANERAI, Luminor Marina.',description:'PANERAI Luminor Marina. Référence PAM01028. Bracelet acier.',source:'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/261205000/343/'});
 const calls=[], rows={1:[{id:1,price:1000,country:'FR'},{id:9,price:50,country:'IT'}],2:[{id:2,price:1300,country:'FR'},{id:10,price:150,country:'UK'}],3:[{id:3,price:1600,country:'FR'},{id:11,price:180,country:'DE'}],4:[{id:4,price:100,country:'FR'},{id:12,price:500,country:'FR'}]};
 const fetchImpl=async url=>{const u=new URL(url);calls.push(u);let p=u.searchParams.get('page'),id=Number(u.searchParams.get('id'));
   const data=p?{payload:{paging:{total:10,totalPages:5,pageSize:2,from:(Number(p)-1)*2},listings:rows[p].map(x=>({listing:{listingId:x.id,location:{countryCode:x.country},price:{amount:String(x.price),currency:'EUR'},listingStatus:'Available',watchStockInfo:'InStock'}}))}}:{payload:{id,manufacturer:{name:'Panerai'},title:'Panerai Luminor Marina',model:{modelName:'Luminor Marina'},referenceNumber:'PAM00050',productType:'Watch_Wristwatch',sold:false,inactive:false,reserved:false,availabilityText:"L'article est en stock",price:{value:{1:1000,2:1300,3:1600,4:100}[id],currency:'EUR'},seller:{dealer:{contactInfo:{countryCode:'FR'}}},url:`https://www.chrono24.fr/panerai/luminor--id${id}.htm`}};
   return {ok:true,status:200,json:async()=>data};};
 const got=await searchPacket(panerai,{apiKey:'fixture-only',fetchImpl,pageSize:2,pace:async()=>{}});
 const result=selectOffers(panerai,got);
 assert.equal(calls.filter(u=>u.pathname.endsWith('/search')).length,3);
 assert.ok(calls.filter(u=>u.pathname.endsWith('/search')).every(u=>u.searchParams.get('query')==='PANERAI Luminor Marina'));
 assert.ok(!calls.some(u=>u.searchParams.get('page')==='4'));
 assert.deepEqual(result.offers.map(o=>o.price),[1000,1300,1600]);assert.equal(result.average,1300);
 assert.equal(result.status,'sample');assert.deepEqual(result.sample,{inspectedPages:3,inspectedListings:6,totalPages:5,totalListings:10,query:'PANERAI Luminor Marina'});
});

test('an empty three-page sample does not assert zero French offers across the marketplace',async()=>{
 const panerai=extractWatch({number:343,title:'PANERAI, Luminor Marina.',description:'Référence PAM01028. Bracelet acier.',source:'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/261205000/343/'});
 const calls=[];const fetchImpl=async url=>{const u=new URL(url),page=Number(u.searchParams.get('page'));calls.push(page);return {ok:true,status:200,json:async()=>({payload:{paging:{total:10,totalPages:5,pageSize:2,from:(page-1)*2},listings:[{listing:{listingId:page*2,location:{countryCode:'IT'},listingStatus:'Available',watchStockInfo:'InStock'}},{listing:{listingId:page*2+1,location:{countryCode:'DE'},listingStatus:'Available',watchStockInfo:'InStock'}}]}})}};
 const result=selectOffers(panerai,await searchPacket(panerai,{apiKey:'fixture-only',fetchImpl,pageSize:2,pace:async()=>{}}));
 assert.deepEqual(calls,[1,2,3]);assert.equal(result.average,null);assert.equal(result.count,0);assert.equal(result.status,'sample_empty');assert.equal(result.sample.inspectedListings,6);
});

test('Packet reads all pages before filtering, checks seller country on detail and selects cheaper later page',async()=>{
 const calls=[];const fetchImpl=async (url)=>{const u=new URL(url);calls.push(u);const data=u.pathname.endsWith('/search')?(u.searchParams.get('page')==='1'?searchResult([{id:1,price:2300,country:'FR'},{id:2,price:600,country:'IT'}],3):searchResult([{id:3,price:1750,country:'FR'}],3,2)):product(Number(u.searchParams.get('id')),Number(u.searchParams.get('id'))===1?2300:1750,Number(u.searchParams.get('id'))===1?'DE':'FR');return {ok:true,status:200,json:async()=>data}};
 const got=await searchPacket(target,{apiKey:'fixture-only',fetchImpl,pageSize:2,pace:async()=>{}});
 assert.deepEqual(got.map(o=>o.price),[1750]);assert.equal(calls.filter(u=>u.pathname.endsWith('/search')).length,2);assert.equal(calls.filter(u=>u.pathname.endsWith('/product')).length,2);assert.ok(calls.every(u=>u.searchParams.get('currency')==='EUR'));
});

test('dated 2024 catalogue supplies 18% with no live surcharge, while an archived print-page is not accepted',async()=>{
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),page=doc.addPage([595,842]);
 ['15 juin 2024','288 TAG HEUER CV2010-4','2. FRAIS DE VENTE','18,00 % TTC','3. MODE DE PAIEMENT','6. ENCHÈRES EN DIRECT','Pas de majoration des frais habituels pour les lots judiciaires : 18,00 % TTC','7. ORDRES D ACHAT'].forEach((s,i)=>page.drawText(s,{x:20,y:790-i*30,font,size:10}));
 const bytes=new Uint8Array(await doc.save());let calls=0;
 const fetchImpl=async()=>{calls++;return {ok:true,arrayBuffer:async()=>bytes.buffer}};
 assert.deepEqual(await verifiedFees(sale('240615000',1900),{fetchImpl}),{buyerPercent:18,livePercent:0,source:'https://serret-portier-expertises.com/wp-content/uploads/2021/05/Catalogue-Bijoux-Montres-juin2024_bdef_web.pdf'});
 assert.equal(await verifiedFees(sale('220611000',1650),{fetchImpl}),null);assert.equal(calls,1);
 await assert.rejects(verifiedFees(sale('240615000',1900),{fetchImpl:async()=>({ok:true,url:'https://wrong.example.org/catalogue.pdf',arrayBuffer:async()=>bytes.buffer})}),/Catalogue de frais 2024 inaccessible/);
});

test('a 2024 catalogue must identify both the right sale and its actual buyer and live terms',async()=>{
 const date='15 juin 2024',lot='288 TAG HEUER CV2010-4',buyer='18,00 % TTC',live='Pas de majoration des frais habituels pour les lots judiciaires : 18,00 % TTC';
 const makePdf=async lines=>{const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),page=doc.addPage([595,842]);lines.forEach((s,i)=>page.drawText(s,{x:20,y:790-i*30,font,size:10}));return new Uint8Array(await doc.save())};
 const lines=(d,l,b,v)=>[d,l,'2. FRAIS DE VENTE',b,'3. MODE DE PAIEMENT','6. ENCHÈRES EN DIRECT',v,'7. ORDRES D ACHAT'];
 for(const invalid of [lines('15 juin 2023',lot,buyer,live),lines(date,'287 TAG HEUER CV2010-4',buyer,live),lines(date,lot,'frais non spécifiés',live),lines(date,lot,buyer,'surcharge inconnue'),lines(date,lot,buyer,live).filter(s=>s!=='2. FRAIS DE VENTE'),lines(date,lot,buyer,live).filter(s=>s!=='6. ENCHÈRES EN DIRECT')]) {
   const bytes=await makePdf(invalid);
   assert.equal(await verifiedFees(sale('240615000',1900),{fetchImpl:async()=>({ok:true,arrayBuffer:async()=>bytes.buffer})}),null);
 }
 const valid=await makePdf(lines(date,lot,buyer,live));
 let calls=0,fetchImpl=async()=>{calls++;return {ok:true,arrayBuffer:async()=>valid.buffer}};
 assert.equal(await verifiedFees(sale('220611000',1600),{fetchImpl}),null);
 assert.equal(await verifiedFees({...sale('240615000',1900),date:'2024-06-16'},{fetchImpl}),null);
 assert.equal(calls,0);
});

test('Credit Municipal rejects HTTP failure, foreign redirect and search HTML without results marker',async()=>{
 for(const response of [{ok:false,status:404},{ok:true,url:'https://wrong.example.com/',text:async()=>'<main>Aucun résultat</main>'},{ok:true,text:async()=>'<main>Défi de sécurité</main>'}]) {
   await assert.rejects(searchCreditMunicipal(target,{fetchImpl:async()=>response}),/Crédit Municipal/);
 }
 await assert.rejects(searchCreditMunicipal(target,{fetchImpl:async()=>({ok:true,url:'',text:async()=>'<main>Aucun résultat</main>'})}));
});

test('Packet rejects malformed pagination, changed totals, unreadable JSON and missing payload',async()=>{
 const results=[
   {payload:{listings:null,paging:{totalPages:1,total:0}}},
   {payload:{listings:[],paging:{totalPages:0,total:0}}},
   {payload:{listings:[],paging:{totalPages:1,total:-1}}},
   {payload:{listings:[],paging:undefined}},
 ];
 for(const value of results) await assert.rejects(searchPacket(target,{apiKey:'fixture-only',fetchImpl:async()=>({ok:true,json:async()=>value}),pace:async()=>{}}),/Packet :/);
 await assert.rejects(searchPacket(target,{apiKey:'fixture-only',pageSize:2,pace:async()=>{},fetchImpl:async url=>({ok:true,json:async()=>new URL(url).searchParams.get('page')==='1'?searchResult([],3):searchResult([],4,2)})}),/résultats instables/);
 for(const json of [async()=>{throw Error('bad json')}, async()=>({noPayload:true}), async()=>null]) await assert.rejects(searchPacket(target,{apiKey:'fixture-only',fetchImpl:async()=>({ok:true,json}),pace:async()=>{}}),/Packet inaccessible/);
 await assert.rejects(searchPacket(target,{apiKey:'fixture-only',fetchImpl:async()=>({ok:false}),pace:async()=>{}}),/Packet inaccessible \(erreur\)/);
 await assert.rejects(searchPacket(target,{apiKey:'fixture-only',fetchImpl:async()=>({ok:false,status:429,json:async()=>searchResult([],0)}),pace:async()=>{}}),/Packet inaccessible \(429\)/);
});

test('Packet product verification rejects mismatched id or missing seller, skips accessories and unavailable watches',async()=>{
 const listing=searchResult([{id:3,price:1750,country:'FR'}],1),base=product(3,1750).payload;
 const fetchFor = value => async url=>({ok:true,json:async()=>new URL(url).pathname.endsWith('/search')?listing:{payload:value}});
 for(const value of [{...base,id:999},{...base,seller:null},{...base,url:null},{...base,price:{value:'not a price',currency:'EUR'}}]) await assert.rejects(searchPacket(target,{apiKey:'fixture-only',fetchImpl:fetchFor(value),pace:async()=>{}}),/Packet/);
 await assert.rejects(searchPacket(target,{apiKey:'fixture-only',fetchImpl:fetchFor({...base,seller:{dealer:{contactInfo:null}}}),pace:async()=>{}}),/Packet : fiche incomplète/);
 await assert.rejects(searchPacket(target,{apiKey:'fixture-only',fetchImpl:fetchFor({...base,seller:{dealer:{contactInfo:{countryCode:''}},privateSeller:{contactInfo:{countryCode:'FR'}}}}),pace:async()=>{}}),/Packet : fiche incomplète/);
 for(const value of [{...base,manufacturer:null},{...base,title:null,model:null}]) await assert.rejects(searchPacket(target,{apiKey:'fixture-only',fetchImpl:fetchFor(value),pace:async()=>{}}),/Packet : fiche incomplète/);
 for(const value of [{...base,productType:'Accessory'},{...base,sold:true},{...base,reserved:true},{...base,inactive:true},{...base,availabilityText:'Indisponible'}]) {
   const result=await searchPacket(target,{apiKey:'fixture-only',fetchImpl:fetchFor(value),pace:async()=>{}});
   assert.equal(result.length,0);
 }
 const withAttributes={...base,attributeGroups:[{attributes:[{name:'braceletMaterial',value:'Acier'}]}],topLevelAttributes:[{name:'condition',value:'Très bon'}]};
 const found=await searchPacket(target,{apiKey:'fixture-only',fetchImpl:fetchFor(withAttributes),pace:async()=>{}});
 assert.equal(found[0].bracelet,'acier');assert.equal(found[0].condition,'Très bon');
 assert.equal(found[0].box,'présent');assert.equal(found[0].sellerCountry,'FR');assert.equal(found[0].brand,'TAG Heuer');assert.equal(found[0].reference,'CV2010');assert.equal(found[0].url,'https://www.chrono24.fr/tagheuer/carrera--id3.htm');
 const watchOnly=await searchPacket(target,{apiKey:'fixture-only',fetchImpl:fetchFor({...base,scopeOfDelivery:'WatchOnly'}),pace:async()=>{}});
 assert.equal(watchOnly[0].box,'absent');
 const zero=await searchPacket(target,{apiKey:'fixture-only',fetchImpl:fetchFor({...base,price:{value:0,amount:'1750',currency:'EUR'}}),pace:async()=>{}});
 assert.equal(zero[0].price,0);
 const frenchLabel={...base,attributeGroups:[{attributes:[{name:'material',label:'Matière du bracelet',value:'Cuir'}]}]};
 const other=await searchPacket(target,{apiKey:'fixture-only',fetchImpl:fetchFor(frenchLabel),pace:async()=>{}});
 assert.equal(other[0].bracelet,'cuir');
 const missingMaterial=await searchPacket(target,{apiKey:'fixture-only',fetchImpl:fetchFor({...base,attributeGroups:[{attributes:[{name:'braceletMaterial',value:null}]}]}),pace:async()=>{}});
 assert.equal(missingMaterial[0].bracelet,null);
 const missingCondition=await searchPacket(target,{apiKey:'fixture-only',fetchImpl:fetchFor({...base,topLevelAttributes:[{name:'year',value:'2019'}]}),pace:async()=>{}});
 assert.equal(missingCondition[0].condition,null);
 const noReference=await searchPacket(target,{apiKey:'fixture-only',fetchImpl:fetchFor({...base,referenceNumber:''}),pace:async()=>{}});
 assert.equal(noReference.length,1);assert.equal(noReference[0].reference,null);
});

test('Packet can verify a French offer by its detail even if the search card omits a preliminary price',async()=>{
 const search={payload:{paging:{total:1,totalPages:1},listings:[{listing:{listingId:3,location:{countryCode:'FR'},listingStatus:'Available',watchStockInfo:'InStock'}}]}};
 const fetchImpl=async url=>({ok:true,json:async()=>new URL(url).pathname.endsWith('/search')?search:product(3,1750)});
 const result=await searchPacket(target,{apiKey:'fixture-only',fetchImpl,pace:async()=>{}});
 assert.deepEqual(result.map(offer=>offer.price),[1750]);
});

test('Packet still checks every French detail if one preliminary search-card price is missing',async()=>{
 const search={payload:{paging:{total:2,totalPages:1},listings:[{listing:{listingId:3,location:{countryCode:'FR'},listingStatus:'Available',watchStockInfo:'InStock'}},{listing:{listingId:4,location:{countryCode:'FR'},price:{amount:'1900',currency:'EUR'},listingStatus:'Available',watchStockInfo:'InStock'}}]}};
 for(const listings of [search.payload.listings,[...search.payload.listings].reverse()]) {
   const fetchImpl=async url=>({ok:true,json:async()=>new URL(url).pathname.endsWith('/search')?{payload:{...search.payload,listings}}:product(Number(new URL(url).searchParams.get('id')),Number(new URL(url).searchParams.get('id'))===3?1750:1900)});
   const result=await searchPacket(target,{apiKey:'fixture-only',fetchImpl,pace:async()=>{}});
   assert.deepEqual(result.map(offer=>offer.price).sort((a,b)=>a-b),[1750,1900]);
 }
});

test('Packet skips malformed and unavailable search cards before requesting product details',async()=>{
 const calls=[];
 const cards=[
   {listing:{listingId:1,location:null,listingStatus:'Available',watchStockInfo:'InStock'}},
   {listing:{listingId:2,location:{countryCode:'FR'},listingStatus:'Sold',watchStockInfo:'NotInStock'}},
   {listing:{listingId:3,location:{countryCode:'IT'},listingStatus:'Available',watchStockInfo:'InStock'}},
   {listing:{listingId:4,location:{countryCode:'FR'},listingStatus:'Available',watchStockInfo:'NotInStock'}},
   {listing:{listingId:5,location:{countryCode:'FR'},listingStatus:'Sold',watchStockInfo:'InStock'}},
   {listing:null},
 ];
 const fetchImpl=async url=>{calls.push(new URL(url).pathname);return {ok:true,json:async()=>({payload:{paging:{total:cards.length,totalPages:1},listings:cards}})}};
 const result=await searchPacket(target,{apiKey:'fixture-only',fetchImpl,pace:async()=>{}});
 assert.equal(result.length,0);assert.deepEqual(calls,['/v1/chrono24/search']);
});

test('Packet accepts exactly the configured maximum of French listings without treating it as an overflow',async()=>{
 const fetchImpl=async url=>({ok:true,json:async()=>new URL(url).pathname.endsWith('/search')?searchResult([{id:3,price:1750,country:'FR'}],1):product(3,1750)});
 const result=await searchPacket(target,{apiKey:'fixture-only',maxProducts:1,fetchImpl,pace:async()=>{}});
 assert.equal(result.length,1);assert.equal(result[0].price,1750);
});

test('default Packet adapter spaces consecutive requests to respect the free-plan rate limit',async()=>{
 const times=[];
 const fetchImpl=async url=>{times.push(Date.now());const page=Number(new URL(url).searchParams.get('page'));return {ok:true,json:async()=>({payload:{paging:{total:3,totalPages:2,pageSize:2,from:(page-1)*2},listings:[]}})}};
 await searchPacket(target,{apiKey:'fixture-only',fetchImpl,pageSize:2});
 assert.equal(times.length,2);
 assert.ok(times[1]-times[0]>=1000,`Requests only ${times[1]-times[0]}ms apart`);
});

test('Packet quota or incomplete pagination is an access error, not a zero-announcement result',async()=>{
 await assert.rejects(searchPacket(target,{apiKey:'fixture-only',fetchImpl:async()=>({status:429,ok:false,json:async()=>({message:'limit'})}),pace:async()=>{}}),/Packet/);
 await assert.rejects(searchPacket(target,{apiKey:'fixture-only',pageSize:2,fetchImpl:async url=>new URL(url).searchParams.get('page')==='2'?{ok:false,status:503}:{ok:true,json:async()=>searchResult([{id:1,price:1000,country:'FR'}],3)},pace:async()=>{}}),/Packet inaccessible/);
});
