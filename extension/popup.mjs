import {collectFavoritePage,inspectCreditSale} from './collector.mjs';
import {applicationOrigin,permissionPattern} from './target.mjs';

const select=document.querySelector('#sale'),button=document.querySelector('#import');
const address=document.querySelector('#app-url'),sourceStatus=document.querySelector('#source-status'),result=document.querySelector('#result');
const spinner=document.querySelector('#popup-spinner');
let sales=[];

function showError(error){result.textContent=error instanceof Error?error.message:String(error)}
function saleName(url){return new URL(url).pathname.split('/').filter(Boolean).at(-1).replace(/-\d+$/,'').replaceAll('-',' ')}
async function readPage(){
 spinner.hidden=false;sourceStatus.textContent='Lecture des pages de favoris visibles…';
 try{
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab?.id||!tab.url?.startsWith('https://www.interencheres.com/compte/favoris/'))throw Error('Ouvrez la page Mon compte → Favoris sur Interencheres avant de cliquer sur l’extension.');
  const [execution]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:collectFavoritePage});
  const snapshot=execution?.result;
  if(!snapshot?.ok)throw Error(snapshot?.error??'Favoris indisponibles : aucun lot importé.');
  sales=[];
  for(const [index,candidate] of snapshot.sales.entries()){
   sourceStatus.textContent=`Vérification de la vente ${index+1}/${snapshot.sales.length}…`;
   const [check]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:inspectCreditSale,args:[candidate.saleUrl]});
   if(check?.result)sales.push({...candidate,evidence:check.result});
  }
  if(!sales.length)throw Error('Aucune vente Crédit Municipal vérifiée dans vos favoris. Les autres maisons ne peuvent pas être importées.');
  for(const sale of sales){const option=document.createElement('option');option.value=sale.saleUrl;option.textContent=`${saleName(sale.saleUrl)} — ${sale.lots.length} lot(s)`;select.append(option)}
  select.disabled=false;sourceStatus.textContent=`${sales.reduce((total,s)=>total+s.lots.length,0)} favoris Crédit Municipal visibles, dans ${sales.length} vente(s). Complétude des pages non vérifiée.`;
 }catch(e){sourceStatus.textContent='Lecture ou vérification interrompue.';showError(e)}
 finally{spinner.hidden=true}
}

select.addEventListener('change',()=>{button.disabled=!select.value;result.textContent=''});
button.addEventListener('click',async()=>{
 button.disabled=true;spinner.hidden=false;result.textContent='Vérification de la destination et de son autorisation…';
 try{
  const origin=applicationOrigin(address.value);
  const granted=await chrome.permissions.request({origins:[permissionPattern(origin)]});
  if(!granted)throw Error('Autorisation pour votre application refusée : aucun lot envoyé.');
  const sale=sales.find(s=>s.saleUrl===select.value);
  if(!sale)throw Error('Choisissez une vente dans la liste.');
  result.textContent=`Envoi des ${sale.lots.length} lots de cette vente vers ${origin}…`;
  const response=await fetch(origin+'/favorites/from-extension',{method:'POST',mode:'cors',credentials:'omit',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify({source:'https://www.interencheres.com/compte/favoris/',saleUrl:sale.saleUrl,saleEvidence:sale.evidence,lots:sale.lots})});
  if(!response.ok)throw Error(`Import refusé par l’application (HTTP ${response.status}). Vérifiez la destination et les lots.`);
  result.textContent='Favoris importés. Ouverture de l’application pour lancer l’analyse…';
  try{await chrome.tabs.create({url:`${origin}/?imported=${encodeURIComponent(sale.saleUrl)}`})}
  catch{result.textContent=`Import réussi. Ouvrez ${origin}/?imported=${encodeURIComponent(sale.saleUrl)} pour lancer l’analyse.`}
 }catch(e){showError(e)}
 finally{spinner.hidden=true;button.disabled=!select.value}
});

readPage();
