import {createHash} from 'node:crypto';

const source='https://www.interencheres.com/compte/favoris/';
const lotPath=/^\/[a-z0-9-]+\/[a-z0-9-]+-\d+\/lot-\d+\.html$/;

export function parseFavorites(raw){
 let input;
 try{input=JSON.parse(raw)}catch{throw Error('Export de favoris illisible.')}
 if(input?.source!==source||!Array.isArray(input.lots)||!input.lots.length||input.lots.length>500)throw Error('Export issu de la page Favoris Interencheres requis.');
 const seen=new Set(),records=[];
 for(const lot of input.lots){
  let url;
  try{url=new URL(lot.url)}catch{throw Error('Lien de lot invalide.')}
  if(url.origin!=='https://www.interencheres.com'||!lotPath.test(url.pathname)||url.search||url.hash||!Number.isSafeInteger(lot.number)||lot.number<=0)throw Error('Lien ou numéro de lot invalide.');
  const saleUrl=url.origin+url.pathname.replace(/lot-\d+\.html$/,'');
  const id=createHash('sha256').update(`${saleUrl}#${lot.number}`).digest('hex');
  if(seen.has(id))continue;
  seen.add(id);records.push({id,saleUrl,number:lot.number,url:url.href});
 }
 return records;
}
