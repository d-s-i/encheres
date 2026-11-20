#!/usr/bin/env node
// Public HTTPS snapshots for APP-001 QA; Packet responses are projected to omit seller contact details.
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {load} from 'cheerio';
const dir=resolve(import.meta.dirname,'../fixtures');
const root='https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/';
export const sources={
 sale2022:root+'ventes-passees/220611000/',
 lot2022_268:root+'ventes-passees/220611000/chopard-happy-sport-montre-dhomme-ronde-en-acie/',
 lot2022_monaco:root+'ventes-passees/221210000/tag-heuer-monaco-montre-dhomme-carree-referenc/',
 lot2023_panerai:root+'ventes-passees/230617000/panerai-luminor-marina-montre-de-plongee-de-form/',
 lot2021_monaco:root+'ventes-passees/211211000/tag-heuer-monaco-calibre-12-montre-dhomme-carre/',
 lot2023_monaco_june:root+'ventes-passees/230617000/tag-heuer-monaco-edition-limitee-tribute-to-steve/',
 lot2023_monaco_dec:root+'ventes-passees/231209000/tag-heuer-monaco-montre-dhomme-de-forme-carree-2/',
 lot2025_monaco:root+'ventes-passees/250621000/tag-heuer-monaco-montre-de-forme-carree-chronog/',
 lot2026_june:root+'ventes-passees/260620000/tag-heuer-monaco-gulf-edition-montre-bracelet-d/',
 sale2026page4:root+'261205000/?_paged=4',
 sale2026page5:root+'261205000/?_paged=5',
 lot343:root+'261205000/panerai-luminor-marina-montre-bracelet-de-forme/',
};
export const fileFor=name=>resolve(dir,name.replaceAll(/[^a-zA-Z0-9_-]/g,'_')+(name.startsWith('image-')?'.jpg':name.startsWith('packet-')?'.json':'.html'));
const digest=data=>createHash('sha256').update(data).digest('hex');
export async function capture(){
 await mkdir(dir,{recursive:true});const result={captured_at:new Date().toISOString(),sources:{}};
 async function save(name,url,bytes,contentType){const data=Buffer.from(bytes);if(!data.length)throw Error(`empty ${name}`);await writeFile(fileFor(name),data);result.sources[name]={url,file:fileFor(name).split('/').at(-1),bytes:data.length,sha256:digest(data),contentType};console.log(`CAPTURE ${name} HTTP 200 ${data.length} octets SHA256 ${digest(data)}`)}
 async function http(name,url,contentType){const res=await fetch(url,{signal:AbortSignal.timeout(30000)});if(res.status!==200||res.url!==url)throw Error(`${name}: HTTP ${res.status} redirect ${res.url}`);await save(name,url,await res.arrayBuffer(),contentType)}
 for(const [name,url] of Object.entries(sources))await http(name,url,'text/html');
 // Photos captured from the public lot pages, including already captured PRICE-001 pages.
 const priceDir=resolve(dir,'../../../PRICE-001/qa/fixtures');
 const officialImages={...Object.fromEntries(Object.keys(sources).filter(x=>x.startsWith('lot')).map(x=>[x,fileFor(x)])),lot268:resolve(priceDir,'lot268.html'),lot246:resolve(priceDir,'lot246.html'),lot318:resolve(priceDir,'lot318.html'),lot288:resolve(priceDir,'lot288.html'),lot368:resolve(priceDir,'lot368.html')};
 for(const [name,file] of Object.entries(officialImages)){
  const $=load(await readFile(file,'utf8')),url=$('.lot__gallery img[src]').first().attr('src');
  if(!url||!url.startsWith('https://www.creditmunicipal.fr/'))throw Error(`photo missing: ${name}`);
  await http('image-'+name,url,'image/jpeg');
 }
 for(const id of [48909624,48704080,41128458,45122294,48045150]){
  if(!process.env.PCKT_API_KEY)throw Error('PCKT_API_KEY absent pour capture Packet (ne jamais l’imprimer)');
  const u=new URL('https://api.pckt.sh/v1/chrono24/product');u.search=new URLSearchParams({id:String(id),currency:'EUR',language:'fr_FR'});
  const r=await fetch(u,{headers:{Authorization:`Bearer ${process.env.PCKT_API_KEY}`},signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw Error(`Packet ${id}: HTTP ${r.status}`);
  const raw=Buffer.from(await r.arrayBuffer()),p=JSON.parse(raw.toString()).payload;
  if(p?.id!==id||p?.productType!=='Watch_Wristwatch'||!p.images?.length)throw Error(`Packet product ${id} incomplete`);
  const country=p.seller?.dealer?.contactInfo?.countryCode??p.seller?.privateSeller?.contactInfo?.countryCode;
  if(country!==(id===48045150?'ES':'FR'))throw Error(`Packet product ${id} seller country unexpected`);
  const clean={payload:{id:p.id,productType:p.productType,manufacturer:{name:p.manufacturer?.name},model:{modelName:p.model?.modelName},title:p.title,referenceNumber:p.referenceNumber,sold:p.sold,inactive:p.inactive,reserved:p.reserved,availabilityText:p.availabilityText,price:p.price,seller:{dealer:{contactInfo:{countryCode:country}}},url:p.url,scopeOfDelivery:p.scopeOfDelivery,attributeGroups:p.attributeGroups,topLevelAttributes:p.topLevelAttributes,images:p.images.slice(0,1)}};
  const bytes=Buffer.from(JSON.stringify(clean));await save('packet-'+id,u.href,bytes,'application/json');result.sources['packet-'+id].originalSha256=digest(raw);
  const photo=p.images[0].imageResources?.find(x=>x.width>=350)?.url??p.images[0].thumbnailUrl;
  if(!photo?.startsWith('https://img.chrono24.com/'))throw Error('Packet photo source invalid');
  await http('image-packet-'+id,photo,'image/jpeg');
  await new Promise(done=>setTimeout(done,1100));
 }
 await writeFile(resolve(dir,'manifest.json'),JSON.stringify(result,null,2)+'\n');return result;
}
if(process.argv[1]&&import.meta.url===new URL(`file://${process.argv[1]}`).href)await capture();
