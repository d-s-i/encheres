// Transport-level replay of public HTTP responses for an unchanged user CLI.
// No project modules, private interfaces, or application fixtures are imported.
import {readFileSync,appendFileSync} from 'node:fs';
import {resolve} from 'node:path';
const config=JSON.parse(readFileSync(process.env.QA_REPLAY_CONFIG,'utf8'));
const manifest=JSON.parse(readFileSync(resolve(import.meta.dirname,'../fixtures/manifest.json'),'utf8')).sources;
const folder=resolve(import.meta.dirname,'../fixtures');
const routes=new Map(Object.entries(manifest).map(([name,entry])=>[entry.url,{name,entry}]));
const record=(url,status)=>appendFileSync(process.env.QA_REPLAY_LOG,JSON.stringify({url,status})+'\n');
const response=(url,data,status=200)=>{record(url,status);const res=new Response(data,{status,headers:{'content-type':typeof data==='string'||url.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream'}});Object.defineProperty(res,'url',{value:url});return res};
const packet=(url,payload,status=200)=>{record(url,status);return new Response(JSON.stringify({payload}),{status,headers:{'content-type':'application/json'}})};
const sale='https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/';
const cards={
 carrera:['lot318','lot288','lot368'],
 monaco:['lot246'],
 chopard:['lot323'],
};
const card=name=>`<div class="card--lot"><div class="card__title"><a href="${manifest[name].url}">Montre</a></div></div>`;
const searchCredit=url=>{
 const query=new URL(url).searchParams.get('search')?.toLowerCase()??'';
 const kind=query.includes('alfa romeo')?'chopard':query.includes('monaco')?'monaco':'carrera';
 return `<main>${cards[kind].map(card).join('')||'Aucun résultat'}</main>`;
};
const item=(id,price,country='FR',extra={})=>({id,price,country,...extra});
const modes={
 baseline:{pages:[[item(45070719,1750),item(47857106,1690,'IT')]],total:2},
 chopard:{pages:[[item(550,800,'IT'),item(551,900,'CH')]],total:2},
 monaco:{pages:[[item(48909624,4100),item(48704080,4590)]],total:2},
 rank:{pages:[[item(1,2300),item(9,500,'IT')],[item(2,1500),item(3,1650)],[item(4,1800),item(3,1650),item(5,50,'FR',{type:'Accessory'}),item(6,70,'FR',{model:'Carrera Calibre 5'})]],total:8},
 sample:{pages:[[item(1,1600),item(9,150,'IT')],[item(2,1300),item(10,300,'DE')],[item(3,1000),item(11,400,'IT')],[item(4,100),item(12,500,'FR')],[item(13,1700,'IT'),item(14,1800,'DE')]],total:10},
 empty:{pages:[[item(21,100,'IT'),item(22,200,'DE')],[item(23,300,'IT'),item(24,400,'DE')],[item(25,500,'IT'),item(26,600,'DE')],[item(27,50),item(28,700,'IT')],[item(29,800,'IT'),item(30,900,'DE')]],total:10},
};
const dataset=['auto','no_fees','blocked'].includes(config.mode)?(config.sale==='2021'?(config.lot===323?modes.chopard:modes.baseline):modes.monaco):modes[config.mode];
const listing=x=>({listing:{listingId:x.id,location:{countryCode:x.country},listingStatus:'Available',watchStockInfo:'InStock',price:{amount:String(x.price),currency:'EUR'}}});
function product(x){
 const isMonaco=config.sale==='2026';
 return {id:x.id,productType:x.type??'Watch_Wristwatch',manufacturer:{name:'TAG Heuer'},model:{modelName:isMonaco?'Monaco Calibre 12':x.model??'Carrera Calibre 16'},title:isMonaco?'TAG Heuer Monaco chronographe Calibre 12':'TAG Heuer Carrera chronographe Calibre 16',referenceNumber:isMonaco?'CAW2111':'CV2010',sold:false,inactive:false,reserved:false,availabilityText:'en stock',price:{value:x.price,currency:'EUR'},seller:{dealer:{contactInfo:{countryCode:x.country}}},url:`https://www.chrono24.fr/tagheuer/${isMonaco?'monaco':'carrera'}--id${x.id}.htm`,scopeOfDelivery:'WithBoxAndPapers',attributeGroups:[{attributes:[{name:'braceletMaterial',value:'Acier'}]}],topLevelAttributes:[{name:'condition',value:'Très bon'}]};
}
const originalFetch=globalThis.fetch;
globalThis.fetch=async(input,init)=>{
 const url=String(input),u=new URL(url);
 if(u.hostname==='api.pckt.sh'){
  if(config.mode==='blocked')return packet(url,null,426);
  if(u.pathname.endsWith('/search')){
   const page=Number(u.searchParams.get('page')),rows=dataset.pages[page-1];
   if(!rows)throw Error(`QA REPLAY: unexpected search page ${page}`);
   return packet(url,{paging:{total:dataset.total,totalPages:dataset.pages.length,pageSize:2,from:(page-1)*2},listings:rows.map(listing)});
  }
  if(u.pathname.endsWith('/product')){
   const id=Number(u.searchParams.get('id')),x=dataset.pages.flat().find(row=>row.id===id);
   if(!x)throw Error(`QA REPLAY: unknown product ${id}`);
   return packet(url,product(x));
  }
 }
 if(u.hostname==='www.creditmunicipal.fr'&&u.pathname.includes('/rechercher-un-lot/'))return response(url,searchCredit(url));
 const hit=routes.get(url);
 if(hit){
  let data=readFileSync(resolve(folder,hit.entry.file));
  if(config.mode==='no_fees'&&hit.name==='sale2026')data=Buffer.from(data.toString().replaceAll(/href="[^"]*\.pdf(?:\?[^"]*)?"/gi,'href="#"'));
  return response(url,data);
 }
 throw Error(`QA REPLAY: no captured public route for ${url}`);
};
