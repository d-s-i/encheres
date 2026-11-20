// QA transport replay for the unchanged public app. Responses come from independently captured public pages and product projections.
import {readFileSync,appendFileSync} from 'node:fs';
import {resolve} from 'node:path';
const fixture=resolve(import.meta.dirname,'../fixtures');
const priceFixture=resolve(import.meta.dirname,'../../../PRICE-001/qa/fixtures');
const app=JSON.parse(readFileSync(resolve(fixture,'manifest.json'))).sources;
const price=JSON.parse(readFileSync(resolve(priceFixture,'manifest.json'))).sources;
const routes=new Map([...Object.entries(app).map(([key,x])=>[x.url,{key,dir:fixture,file:x.file}]),...Object.entries(price).map(([key,x])=>[x.url,{key,dir:priceFixture,file:x.file}])]);
const config=()=>JSON.parse(readFileSync(process.env.QA_APP_CONFIG,'utf8'));
const log=(url,status)=>appendFileSync(process.env.QA_APP_LOG,JSON.stringify({url,status})+'\n');
const reply=(url,body,status=200,type='text/html')=>{log(url,status);const r=new Response(body,{status,headers:{'content-type':type}});Object.defineProperty(r,'url',{value:url});return r};
const nativeDate=Date;
globalThis.Date=class extends nativeDate{
 constructor(...args){super(...(args.length?args:[config().asOf+'T12:00:00Z']))}
 static now(){return new nativeDate(config().asOf+'T12:00:00Z').getTime()}
};
const creditCards={
 monaco:['lot246'],
 grid:['lot2022_monaco','lot246'],
 wide:['lot2021_monaco','lot2023_monaco_june','lot2023_monaco_dec','lot246','lot2025_monaco','lot2026_june'],
 unknown:['lot2023_monaco_june'],
 carrera:['lot368','lot288'],
 panerai:['lot2023_panerai'],
};
const item=(id,country='FR',price=4000)=>({listing:{listingId:id,location:{countryCode:country},listingStatus:'Available',watchStockInfo:'InStock',price:{amount:String(price),currency:'EUR'}}});
function searchCards(url,cfg){
 const query=new URL(url).searchParams.get('search')?.toLowerCase()??'';
 const group=query.includes('monaco')?(cfg.mode==='wide'?'wide':cfg.mode==='unknown'?'unknown':cfg.mode==='grid'?'grid':'monaco'):query.includes('carrera')?'carrera':query.includes('luminor marina')?'panerai':null;
 const names=creditCards[group]??[];
 const cards=names.map(name=>{
  const source=app[name]??price[name];if(!source)throw Error(`QA search missing captured card: ${name}`);
  return `<div class="card--lot"><div class="card__title"><a href="${source.url}">Montre comparable</a></div></div>`;
 });
 return `<main>${cards.join('')||'Aucun résultat'}</main>`;
}
function packetPages(cfg,query){
 if(!/monaco/i.test(query))return {total:0,pages:[[]]};
 const foreign=item(48045150,'ES',1500);
 const selected=cfg.mode==='new'?[item(41128458,'FR',3800),item(45122294,'FR',3899),item(48909624,'FR',4100)]:[item(48909624,'FR',4100),item(48704080,'FR',4590)];
 const pages=[[selected[0],foreign],[selected[1],foreign],[selected[2]??foreign,foreign],[foreign,foreign],[foreign,foreign]];
 return {total:10,pages};
}
const realFetch=globalThis.fetch;
globalThis.fetch=async(input,init)=>{
 const url=String(input),u=new URL(url),cfg=config();
 if(u.hostname==='api.pckt.sh'){
  if(cfg.blocked)return reply(url,JSON.stringify({payload:null}),426,'application/json');
  if(u.pathname.endsWith('/search')){
   const data=packetPages(cfg,u.searchParams.get('query')),page=Number(u.searchParams.get('page'));
   const listings=data.pages[page-1];if(!listings)throw Error(`QA Packet page not mapped: ${page}`);
   return reply(url,JSON.stringify({payload:{paging:{total:data.total,totalPages:data.pages.length,pageSize:2,from:(page-1)*2},listings}}),200,'application/json');
  }
  if(u.pathname.endsWith('/product')){
   const id=u.searchParams.get('id'),entry=app['packet-'+id];if(!entry)throw Error(`QA Packet product not captured: ${id}`);
   return reply(url,readFileSync(resolve(fixture,entry.file)),200,'application/json');
  }
 }
 if(u.hostname==='www.creditmunicipal.fr'&&u.pathname.includes('/rechercher-un-lot/'))return reply(url,searchCards(url,cfg));
 const hit=routes.get(url);
 if(hit){
  let body=readFileSync(resolve(hit.dir,hit.file));
  if(cfg.noTargetFees&&hit.key==='sale2026')body=Buffer.from(body.toString().replaceAll(/href="[^"]*\.pdf(?:\?[^\"]*)?"/gi,'href="#"'));
  return reply(url,body,200,hit.file.endsWith('.pdf')?'application/pdf':hit.file.endsWith('.jpg')?'image/jpeg':'text/html');
 }
 throw Error(`QA HTTPS response not captured: ${url}`);
};
