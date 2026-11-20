// Verify all independent public captures, image oracles and replay inputs before any APP-001 scenario.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {load} from 'cheerio';
import {sources,fileFor} from './capture.mjs';
const dir=resolve(import.meta.dirname,'../fixtures');
const priceDir=resolve(import.meta.dirname,'../../../PRICE-001/qa/fixtures');
const hash=b=>createHash('sha256').update(b).digest('hex');
const has=(text,...terms)=>terms.forEach(x=>assert.ok(text.includes(x),`Oracle manquant : ${x}`));
async function pdfText(bytes){
 const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');const task=getDocument({data:new Uint8Array(bytes),useSystemFonts:true,disableFontFace:true});
 try{const pdf=await task.promise;let text='';for(let p=1;p<=pdf.numPages;p++){const content=await(await pdf.getPage(p)).getTextContent();text+=content.items.map(i=>i.str).join(' ')+' '}return text.replace(/\s+/g,' ')}finally{await task.destroy()}
}
export async function preflight(){
 const app=JSON.parse(await readFile(resolve(dir,'manifest.json'),'utf8')).sources;
 const price=JSON.parse(await readFile(resolve(priceDir,'manifest.json'),'utf8')).sources;
 for(const [name,url] of Object.entries(sources))assert.equal(app[name]?.url,url,`APP capture missing ${name}`);
 const checked=[];
 for(const [folder,entries] of [[dir,app],[priceDir,price]])for(const [name,entry] of Object.entries(entries)){
  const data=await readFile(resolve(folder,entry.file));assert.equal(data.length,entry.bytes,`bytes ${name}`);assert.equal(hash(data),entry.sha256,`sha ${name}`);
  if(name.startsWith('image-'))assert.ok(data[0]===0xff&&data[1]===0xd8&&data[2]===0xff,`JPEG invalid ${name}`);
  checked.push({name,url:entry.url,sha256:entry.sha256,bytes:entry.bytes});
 }
 const html=async(name,folder=dir)=>load(await readFile(folder===dir?fileFor(name):resolve(priceDir,price[name].file),'utf8'));
 for(const [name,number,amount] of [['lot2022_268',268,'1 900'],['lot2022_monaco',302,'4 800'],['lot2023_panerai',301,'4 200'],['lot343',343,null],['lot268',268,null],['lot246',246,'3 700'],['lot318',318,'1 500'],['lot288',288,'1 900'],['lot368',368,'1 650']]){
  const $=await html(name,price[name]?priceDir:dir);assert.match($('.lot__number').first().text(),new RegExp(`Lot n°${number}\\b`));if(amount)has($('.lot__prices').text(),amount);
  const photo=$('.lot__gallery img[src]').first().attr('src');assert.equal(app['image-'+name]?.url,photo,`photo ${name}`);
 }
 assert.match((await html('sale2022'))('main').text(),/Montre|CHOPARD/i);
 has(await readFile(resolve(priceDir,price.sale2026.file),'utf8'),'generate-catalogue-261205000.pdf');
 has(await readFile(resolve(dir,app.sale2026page4.file),'utf8'),'Lot n°343');
 for(const [id,amount,country] of [[48909624,4100,'FR'],[48704080,4590,'FR'],[41128458,3800,'FR'],[45122294,3899,'FR'],[48045150,1500,'ES']]){
  const p=JSON.parse(await readFile(fileFor('packet-'+id),'utf8')).payload;
  assert.equal(p.id,id);assert.equal(Number(p.price.value),amount);assert.equal(p.seller?.dealer?.contactInfo?.countryCode,country);assert.equal(p.productType,'Watch_Wristwatch');
  assert.equal(p.sold,false);assert.equal(p.inactive,false);assert.equal(p.reserved,false);
  const image=p.images[0].imageResources.find(x=>x.width>=350).url;
  assert.equal(app['image-packet-'+id].url,image);
  assert.ok(p.url.startsWith('https://www.chrono24.fr/'));
 }
 const pdf24=await pdfText(await readFile(resolve(priceDir,price.pdf2024.file))),pdf26=await pdfText(await readFile(resolve(priceDir,price.pdf2026.file)));
 has(pdf24,'288 TAG HEUER','CV2010-4','2. FRAIS DE VENTE','6. ENCHÈRES EN DIRECT','Pas de majoration des frais habituels pour les lots judiciaires : 18,00 % TTC');assert.match(pdf24,/15\s+juin\s+2024/i);
 assert.match(pdf26,/0?5\s+décembre\s+2026/i);assert.match(pdf26,/2\.\s*FRAIS ACHETEURS/i);assert.match(pdf26,/6\.\s*ENCHÈRES EN DIRECT/i);assert.match(pdf26,/18(?:[,.]00)?\s*%\s*TTC/i);assert.match(pdf26,/1[,.]2\s*%\s*TTC/i);
 return {status:'PASS',appCapturedAt:JSON.parse(await readFile(resolve(dir,'manifest.json'))).captured_at,priceCapturedAt:JSON.parse(await readFile(resolve(priceDir,'manifest.json'))).captured_at,checked};
}
if(process.argv[1]&&import.meta.url===new URL(`file://${process.argv[1]}`).href){try{const result=await preflight();console.log(`PREFLIGHT PASS ${result.checked.length} captured public responses validated`)}catch(e){console.error('PREFLIGHT INCOMPLETE',e.stack);process.exitCode=4}}
