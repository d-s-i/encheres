#!/usr/bin/env node
// Capture only publicly served HTTPS documents; no keys, no application modules.
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const dir=resolve(import.meta.dirname,'../fixtures');
const base='https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/';
export const sources={
 sale2021:base+'ventes-passees/210605000/',
 lot318:base+'ventes-passees/210605000/tag-heuer-carrera-montre-dhomme-ronde-en-acier-3/',
 lot323:base+'ventes-passees/210605000/chopard-alfa-romeo-montre-dhomme-en-acier-avec/',
 lot288:base+'ventes-passees/240615000/tag-heuer-carrera-montre-dhomme-ronde-chronogr/',
 lot246:base+'ventes-passees/240615000/tag-heuer-monaco-montre-dhomme-de-forme-carree/',
 lot368:base+'ventes-passees/220611000/tag-heuer-carrera-montre-dhomme-ronde-chronogra/',
 sale2026:base+'261205000/',
 sale2026page2:base+'261205000/?_paged=2',
 sale2026page3:base+'261205000/?_paged=3',
 lot268:base+'261205000/tag-heuer-monaco-montre-bracelet-de-forme-carre/',
 pdf2024:'https://serret-portier-expertises.com/wp-content/uploads/2021/05/Catalogue-Bijoux-Montres-juin2024_bdef_web.pdf',
 pdf2026:'https://www.creditmunicipal.fr/app/uploads/sales/261205000/generate-catalogue-261205000.pdf',
};
export const fileFor=name=>resolve(dir,name+(name.startsWith('pdf')?'.pdf':'.html'));
const hash=b=>createHash('sha256').update(b).digest('hex');
export async function capture(){
 await mkdir(dir,{recursive:true});const result={captured_at:new Date().toISOString(),sources:{}};
 for(const [name,url] of Object.entries(sources)){
  const response=await fetch(url,{signal:AbortSignal.timeout(45000)});
  if(response.status!==200 || response.url!==url)throw Error(`Capture ${name}: HTTP ${response.status} / redirect ${response.url}`);
  const data=Buffer.from(await response.arrayBuffer());
  if(data.length<1000)throw Error(`Capture ${name}: source trop courte`);
  await writeFile(fileFor(name),data);
  result.sources[name]={url,file:name+(name.startsWith('pdf')?'.pdf':'.html'),bytes:data.length,sha256:hash(data)};
  console.log(`CAPTURE ${name} HTTP 200 ${data.length} octets SHA256 ${hash(data)}`);
 }
 await writeFile(resolve(dir,'manifest.json'),JSON.stringify(result,null,2)+'\n');
 return result;
}
if(process.argv[1]&&import.meta.url===new URL(`file://${process.argv[1]}`).href)await capture();
