#!/usr/bin/env node
// External QA: only the documented CLI is invoked; public HTTPS responses are replayed at transport boundary.
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {promisify} from 'node:util';
import {load} from 'cheerio';
import {sources,fileFor} from './capture.mjs';
const exec=promisify(execFile),root=resolve(import.meta.dirname,'../../../../..'),qa=resolve(import.meta.dirname,'..');
const hash=b=>createHash('sha256').update(b).digest('hex');
const has=(text,...words)=>words.forEach(word=>assert.ok(text.includes(word),`Expected ${JSON.stringify(word)}; actual output:\n${text}`));
const absent=(text,...words)=>words.forEach(word=>assert.ok(!text.includes(word),`Unexpected ${JSON.stringify(word)}; actual output:\n${text}`));
const price=(run,amount)=>assert.match(run.stdout,new RegExp(`Prix à ne pas dépasser : ${String(amount).replace(' ','[\\s\\u202f]')} € hors frais`));
async function pdfText(name){
 const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const pdf=getDocument({data:new Uint8Array(await readFile(fileFor(name))),useSystemFonts:true,disableFontFace:true});
 try{const p=await pdf.promise;let s='';for(let i=1;i<=p.numPages;i++){const text=await(await p.getPage(i)).getTextContent();s+=text.items.map(x=>x.str).join(' ')+' ';}return s.replace(/\s+/g,' ')}finally{await pdf.destroy()}
}
async function preflight(){
 const manifest=JSON.parse(await readFile(resolve(qa,'fixtures/manifest.json'),'utf8'));
 assert.deepEqual(Object.keys(manifest.sources).sort(),Object.keys(sources).sort(),'Capture incomplète : exécuter capture.mjs avant QA');
 const verified=[];
 for(const [name,url] of Object.entries(sources)){
  const data=await readFile(fileFor(name)),entry=manifest.sources[name];
  assert.equal(entry.url,url);assert.equal(entry.sha256,hash(data));assert.equal(entry.bytes,data.length);
  verified.push({name,url,sha256:entry.sha256,bytes:entry.bytes});
 }
 const html=async name=>load(await readFile(fileFor(name),'utf8'));
 for(const [name,number,priceAmount] of [['lot318',318,'1 500'],['lot323',323,'3 600'],['lot288',288,'1 900'],['lot246',246,'3 700'],['lot368',368,'1 650'],['lot268',268,null]]){
  const $=await html(name),numberText=$('.lot__number').first().text(),prices=$('.lot__prices').first().text();
  assert.match(numberText,new RegExp(`Lot n°${number}\\b`));
  if(priceAmount)has(prices,priceAmount);
  else assert.ok(!/Adjugé à/.test(prices),'Le lot cible était déjà adjugé lors de la capture');
 }
 for(const [sale,number] of [['sale2021',318],['sale2021',323],['sale2026page2',268]])has((await readFile(fileFor(sale),'utf8')),`Lot n°${number}`);
 const root26=await readFile(fileFor('sale2026'),'utf8');has(root26,'generate-catalogue-261205000.pdf');
 const text24=await pdfText('pdf2024'),text26=await pdfText('pdf2026');
 has(text24,'288 TAG HEUER','CV2010-4','2. FRAIS DE VENTE','6. ENCHÈRES EN DIRECT','Pas de majoration des frais habituels pour les lots judiciaires : 18,00 % TTC');
 assert.match(text24,/18,00\s*%\s*TTC/);assert.match(text24,/15\s+juin\s+2024/i);
 assert.match(text26,/0?5\s+décembre\s+2026/i);assert.match(text26,/2\.\s*FRAIS ACHETEURS/i);assert.match(text26,/6\.\s*ENCHÈRES EN DIRECT/i);assert.match(text26,/18(?:[,.]00)?\s*%\s*TTC/i);assert.match(text26,/1[,.]2\s*%\s*TTC/i);
 // Controlled search/product responses are generated from an explicit oracle in replay.mjs,
 // not from the implementation's fixtures. The captured source documents establish their sale identities.
 const replay=await readFile(resolve(import.meta.dirname,'replay.mjs'),'utf8');
 for(const key of ['baseline','chopard','monaco','rank','sample','empty'])has(replay,key+':');
 return {captured_at:manifest.captured_at,verified,oracle:'Public sale and fee documents independently inspected with Cheerio and PDF.js; synthetic Packet cases controlled per written QA procedure.'};
}
async function cli(work,{sale,lot,mode='auto',date=sale==='2021'?'2026-11-11':'2026-11-15'}){
 const replayConfig=join(work,'config.json'),log=join(work,'requests.ndjson');
 await writeFile(replayConfig,JSON.stringify({sale,lot,mode}));await writeFile(log,'');
 const args=['bin/comparer-prix.mjs','--url',sources[sale==='2021'?'sale2021':'sale2026'],'--as-of',date,String(lot)];
 const env={...process.env,PCKT_API_KEY:'qa-replay-token',NODE_OPTIONS:`--import=${resolve(import.meta.dirname,'replay.mjs')}`,QA_REPLAY_CONFIG:replayConfig,QA_REPLAY_LOG:log};
 let commandResult;
 try{const p=await exec('node',args,{cwd:root,env,timeout:75000,maxBuffer:3_000_000});commandResult={exitCode:0,stdout:p.stdout,stderr:p.stderr}}
 catch(error){commandResult={exitCode:error.code==='ETIMEDOUT'?124:error.code??1,stdout:error.stdout??'',stderr:error.stderr??''}}
 const requests=(await readFile(log,'utf8')).trim().split('\n').filter(Boolean).map(s=>JSON.parse(s));
 return {command:`node ${args.map(x=>JSON.stringify(x)).join(' ')}`,env:'QA transport replay on public HTTPS routes; no application injection or production override',initial:{sale,lot,mode,date},...commandResult,requests};
}
const credit288=r=>{has(r.stdout,'lot 288','1 900 € hors frais','2 242 €',sources.lot288,sources.pdf2024,'18% + 0% live','2024-06-15');absent(r.stdout,'2 264,80 €','lot 318 ·')};
const sample=(r,expected)=>{has(r.stdout,expected,'seules les trois premières pages','pas nécessairement les offres les moins chères de tout Chrono24');assert.ok(!r.requests.some(x=>new URL(x.url).searchParams.get('page')==='4'),'Page 4 parcourue')};
const scenarios=[
 {id:'S01',sale:'2021',lot:318,assert:r=>{credit288(r);has(r.stdout,"Moyenne des coûts d'achat en ligne vérifiés : 2 242 € (1 vente avec frais vérifiés, échantillon partiel)");}},
 {id:'S02',sale:'2021',lot:318,assert:credit288},
 {id:'S03',sale:'2021',lot:318,assert:r=>{credit288(r);has(r.stdout,'lot 368','1 650 € hors frais','coût en ligne non vérifié','(1 vente avec frais vérifiés, échantillon partiel)');}},
 {id:'S04',sale:'2021',lot:318,mode:'rank',assert:r=>{has(r.stdout,'Moyenne des prix affichés : 1 650 € (3 annonces)','1 500 € hors port','1 650 € hors port','1 800 € hors port','vendeur FR','état : Très bon','différences :','prix demandés');absent(r.stdout,'2 300 € hors port','\n- 500 € hors port','\n- 50 € hors port');assert.equal(r.requests.filter(x=>x.url.includes('/product?')).length,6);}},
 {id:'S05',sale:'2021',lot:318,assert:r=>{has(r.stdout,'Moyenne partielle des prix affichés : 1 750 € (1 annonce)','45070719','acier (lot : caoutchouc)','présent (lot : absent)');absent(r.stdout,'1 690 € hors port','47857106');}},
 {id:'S06',sale:'2021',lot:323,assert:r=>{has(r.stdout,'CHOPARD Alfa Romeo',"Moyenne des coûts d'achat en ligne vérifiés : indisponible (0 vente",'Moyenne des prix affichés : indisponible (0 annonce','2 annonces analysées sur 2 résultats');absent(r.stdout,'2021-06-05 · lot 323');}},
 {id:'S07',sale:'2021',lot:318,mode:'blocked',assert:r=>{credit288(r);has(r.stdout,'Source non vérifiable (accès empêché)','Packet inaccessible (426)',"Moyenne des coûts d'achat en ligne vérifiés : 2 242 €");absent(r.stdout,'Moyenne des prix affichés : 0');}},
 {id:'S13',sale:'2021',lot:318,mode:'sample',assert:r=>{sample(r,'3 pages, 6 annonces analysées sur 10 résultats');has(r.stdout,'Moyenne des prix affichés : 1 300 € (3 annonces)','1 000 € hors port','1 300 € hors port','1 600 € hors port');absent(r.stdout,'100 € hors port');}},
 {id:'S14',sale:'2021',lot:318,mode:'empty',assert:r=>{sample(r,'3 pages, 6 annonces analysées sur 10 résultats');has(r.stdout,'Moyenne des prix affichés : indisponible (0 annonce dans l’échantillon)');absent(r.stdout,'aucune offre française sur Chrono24');}},
 {id:'S08',sale:'2026',lot:268,assert:r=>{price(r,'3 645,13');has(r.stdout,'4 345 € (2 annonces françaises','18% TTC acheteur + 1.2% TTC live',sources.pdf2026,'lot 246','3 700 € hors frais','4 366 €');assert.ok(3645.13*1.192<=4345);}},
 {id:'S09',sale:'2026',lot:268,assert:r=>{price(r,'3 645,13');assert.ok((3645.13+.01)*1.192>4345);has(r.stdout,'Seuil théorique');}},
 {id:'S10',sale:'2026',lot:268,mode:'no_fees',assert:r=>{has(r.stdout,'Moyenne partielle des prix affichés : 4 345 €','Prix à ne pas dépasser : indisponible : frais de la vente ciblée non vérifiés.','4 366 €');absent(r.stdout,'Prix à ne pas dépasser : 3');}},
 {id:'S11',sale:'2026',lot:268,mode:'empty',assert:r=>{sample(r,'3 pages, 6 annonces analysées sur 10 résultats');has(r.stdout,'Prix à ne pas dépasser : indisponible : aucune annonce admissible dans l’échantillon');absent(r.stdout,'Prix à ne pas dépasser : 0');}},
 {id:'S15',sale:'2026',lot:268,mode:'sample',assert:r=>{sample(r,'3 pages, 6 annonces analysées sur 10 résultats');price(r,'1 090,60');has(r.stdout,'moyenne Chrono24 des prix demandés hors port 1 300 €','échantillon des trois premières pages seulement');}},
 {id:'S12',sale:'2026',lot:268,mode:'blocked',assert:r=>{has(r.stdout,'Packet inaccessible (426)','Prix à ne pas dépasser : non vérifiable : accès à Chrono24 impossible.','lot 246');absent(r.stdout,'Prix à ne pas dépasser : 0');}},
];
const result={task:'PRICE-001',started_at:new Date().toISOString(),interface:'node bin/comparer-prix.mjs --url <vente> --as-of <date> <lot>',preflight:null,scenarios:[],status:'BLOCKED'};
const work=await mkdtemp(join(tmpdir(),'price001-qa-'));
try{
 try{result.preflight=await preflight();console.log(`PREFLIGHT PASS: ${result.preflight.verified.length} captured public responses verified`)}
 catch(error){result.setup_error=String(error.stack??error);console.error('PREFLIGHT INCOMPLETE:',result.setup_error);process.exitCode=4;}
 if(result.preflight){
  for(const s of scenarios){
   let evidence;
   try{evidence=await cli(work,s);assert.equal(evidence.exitCode,0,evidence.stderr);s.assert(evidence);result.scenarios.push({id:`QA-PRICE-001-${s.id}`,feature:Number(s.id.slice(1))<8||['S13','S14'].includes(s.id)?'PRICE-001-F01':'PRICE-001-F02',scenario:s.id,status:'PASS',evidence});console.log(`PASS QA-PRICE-001-${s.id}`)}
   catch(error){result.scenarios.push({id:`QA-PRICE-001-${s.id}`,scenario:s.id,status:'FAIL',error:String(error.stack??error),evidence});console.error(`FAIL QA-PRICE-001-${s.id}: ${error.message}`)}
  }
  result.status=result.scenarios.every(s=>s.status==='PASS')?'PASS':'FAIL';process.exitCode=result.status==='PASS'?0:1;
 }
}finally{result.completed_at=new Date().toISOString();await rm(work,{recursive:true,force:true});result.cleanup='Temporary replay config and request logs deleted; no transactions or sales changed';await writeFile(resolve(qa,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(`QA ${result.status}: ${result.scenarios.length}/${scenarios.length} scenarios executed`)}
