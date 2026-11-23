const organizer='https://www.interencheres.com/commissaire-priseur/credit-municipal-de-paris-419';
const label=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');

export function verifyCreditSale(evidence,sales){
 if(!evidence||evidence.organizer!==organizer||!/^\d{4}-\d{2}-\d{2}$/.test(evidence.date)||!label(evidence.title))return null;
 let url;
 try{url=new URL(evidence.url)}catch{return null}
 if(url.origin!=='https://www.interencheres.com'||!/^[\/][a-z0-9-]+\/[a-z0-9-]+-\d+\/$/.test(url.pathname)||url.search||url.hash)return null;
 const matching=sales.filter(s=>s.date===evidence.date&&label(s.category)===label(evidence.title));
 return matching.length===1?matching[0].url:null;
}
