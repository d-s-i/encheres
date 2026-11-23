// Serialized into the active Interencheres tab by chrome.scripting.executeScript.
// Keep it self-contained: imported helpers do not exist in the page context.
export async function inspectCreditSale(saleUrl){
 if(document.location.origin!=='https://www.interencheres.com'||document.location.pathname!=='/compte/favoris/')return null;
 let url;
 try{url=new URL(saleUrl)}catch{return null}
 if(url.origin!==document.location.origin||!/^\/[a-z0-9-]+\/[a-z0-9-]+-\d+\/$/.test(url.pathname)||url.search||url.hash)return null;
 try{
  const response=await fetch(url.href,{credentials:'same-origin',redirect:'error'});
  if(!response.ok)return null;
  const page=new DOMParser().parseFromString(await response.text(),'text/html');
  const events=[...page.querySelectorAll('script[type="application/ld+json"]')].flatMap(node=>{try{const value=JSON.parse(node.textContent);return Array.isArray(value)?value:[value]}catch{return []}});
  const matches=events.filter(event=>event['@type']==='Event'&&event.organizer?.url==='https://www.interencheres.com/commissaire-priseur/credit-municipal-de-paris-419'&&new URL(event.location?.url??url.href).origin===url.origin&&new URL(event.location?.url??url.href).pathname.replace(/\/?$/,'/')===url.pathname&&/^\d{4}-\d{2}-\d{2}$/.test(event.startDate)&&event.name);
  if(matches.length!==1)return null;
  return {url:url.href,organizer:matches[0].organizer.url,date:matches[0].startDate,title:matches[0].name};
 }catch{return null}
}

export async function collectFavoritePage(){
 const source='https://www.interencheres.com/compte/favoris/';
 if(document.location.origin!=='https://www.interencheres.com'||document.location.pathname!=='/compte/favoris/')return {ok:false,error:'Ouvrez Mon compte → Favoris sur Interencheres. La liste « Mes favoris et ordres » ne convient pas.'};
 const groups=new Map(),identities=new Map(),visited=new Set();
 let page=document,pageUrl=document.location.href;
 for(let index=0;index<30;index++){
  if(visited.has(pageUrl))return {ok:false,error:'Pagination des favoris en boucle : import refusé.'};
  visited.add(pageUrl);
  const anchors=page.querySelectorAll('a[href*="/lot-"]');
  if(!anchors.length)return {ok:false,error:'Page de favoris illisible ou vide : import refusé.'};
  for(const anchor of anchors){
   let url;
   try{url=new URL(anchor.getAttribute('href'),pageUrl)}catch{return {ok:false,error:'Lien de favori illisible : import refusé.'}}
   const number=Number(anchor.textContent.match(/\bLot\s*(?:n[°o]\s*)?(\d+)\b/i)?.[1]);
   if(url.origin!=='https://www.interencheres.com'||!/^\/[a-z0-9-]+\/[a-z0-9-]+-\d+\/lot-\d+\.html$/.test(url.pathname)||url.search||url.hash||!Number.isSafeInteger(number)||number<=0)return {ok:false,error:'Un favori ne possède pas de lien et numéro vérifiables : import refusé.'};
   const saleUrl=url.origin+url.pathname.replace(/lot-\d+\.html$/,'');
   const key=`${saleUrl}#${number}`;
   if(identities.has(key)){
    if(identities.get(key)!==url.href)return {ok:false,error:'Deux fiches différentes portent le même numéro dans une vente : import refusé.'};
    continue;
   }
   identities.set(key,url.href);
   groups.set(saleUrl,[...(groups.get(saleUrl)??[]),{url:url.href,number}]);
  }
  const next=page.querySelector('a[rel="next"], a[aria-label*="suivant" i]');
  if(!next)return {ok:true,source,sales:[...groups].map(([saleUrl,lots])=>({saleUrl,lots})),complete:false};
  let url;
  try{url=new URL(next.getAttribute('href'),pageUrl)}catch{return {ok:false,error:'Pagination des favoris non vérifiable : import refusé.'}}
  if(url.origin!=='https://www.interencheres.com'||url.pathname!=='/compte/favoris/'||visited.has(url.href))return {ok:false,error:'Page suivante des favoris non vérifiable : import refusé.'};
  try{
   const response=await fetch(url.href,{credentials:'same-origin',redirect:'error'});
   if(!response.ok)return {ok:false,error:'Page suivante des favoris indisponible : import refusé.'};
   page=new DOMParser().parseFromString(await response.text(),'text/html');
  }catch{return {ok:false,error:'Page suivante des favoris indisponible : import refusé.'}}
  pageUrl=url.href;
 }
 return {ok:false,error:'Pagination trop longue pour confirmer les favoris : import refusé.'};
}
