import {load} from 'cheerio';

const catalogue='https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/';
const salePath=/^\/ventes-aux-encheres\/catalogue-des-ventes\/(\d{2})(\d{2})(\d{2})\d{3}\/$/;

export function parseUpcomingSales(html,today){
 const $=load(html),sales=[];
 $('time.card__date[datetime]').each((_,node)=>{
  const date=$(node).attr('datetime')?.slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<today)return;
  const card=$(node).closest('.columns--2');
  const category=card.find('.card__title h2').first().text().trim().replace(/\s+/g,' ');
  const href=card.find('.card__presentation-right a[href]').first().attr('href');
  if(!category||!href)return; // No published catalogue yet.
  let url;
  try{url=new URL(href,catalogue)}catch{return}
  const match=url.pathname.match(salePath);
  if(url.origin!=='https://www.creditmunicipal.fr'||url.search||url.hash||!match)return;
  if(`20${match[1]}-${match[2]}-${match[3]}`!==date||!Number.isFinite(Date.parse(`${date}T00:00:00Z`))||new Date(`${date}T00:00:00Z`).toISOString().slice(0,10)!==date)return;
  const normalized=url.origin+url.pathname;
  if(!sales.some(s=>s.url===normalized))sales.push({url:normalized,category,date});
 });
 return sales.sort((a,b)=>a.date.localeCompare(b.date));
}

export async function upcomingSales({fetchImpl=fetch,today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}={}){
 const response=await fetchImpl(catalogue,{redirect:'manual',signal:AbortSignal.timeout(4000)});
 if(!response.ok||response.url&&response.url!==catalogue)throw new Error('Catalogue des ventes indisponible.');
 return parseUpcomingSales(await response.text(),today);
}
