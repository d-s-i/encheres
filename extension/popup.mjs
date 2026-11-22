import {collectFavoritePage} from './collector.mjs';
import {applicationOrigin,permissionPattern} from './target.mjs';

const select=document.querySelector('#sale'),button=document.querySelector('#import');
const address=document.querySelector('#app-url'),sourceStatus=document.querySelector('#source-status'),result=document.querySelector('#result');
let sales=[];

function showError(error){result.textContent=error instanceof Error?error.message:String(error)}
function saleName(url){return new URL(url).pathname.split('/').filter(Boolean).at(-1).replace(/-\d+$/,'').replaceAll('-',' ')}
async function readPage(){
 try{
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab?.id||!tab.url?.startsWith('https://www.interencheres.com/compte/favoris/'))throw Error('Ouvrez la page Mon compte → Favoris sur Interencheres avant de cliquer sur l’extension.');
  const [execution]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:collectFavoritePage});
  const snapshot=execution?.result;
  if(!snapshot?.ok)throw Error(snapshot?.error??'Favoris indisponibles : aucun lot importé.');
  sales=snapshot.sales;
  for(const sale of sales){const option=document.createElement('option');option.value=sale.saleUrl;option.textContent=`${saleName(sale.saleUrl)} — ${sale.lots.length} lot(s)`;select.append(option)}
  select.disabled=false;sourceStatus.textContent=`${sales.reduce((total,s)=>total+s.lots.length,0)} favoris visibles, dans ${sales.length} vente(s). Complétude des pages non vérifiée.`;
 }catch(e){sourceStatus.textContent='Favoris non lisibles.';showError(e)}
}

select.addEventListener('change',()=>{button.disabled=!select.value;result.textContent=''});
button.addEventListener('click',async()=>{
 button.disabled=true;result.textContent='Import en cours…';
 try{
  const origin=applicationOrigin(address.value);
  const granted=await chrome.permissions.request({origins:[permissionPattern(origin)]});
  if(!granted)throw Error('Autorisation pour votre application refusée : aucun lot envoyé.');
  const sale=sales.find(s=>s.saleUrl===select.value);
  if(!sale)throw Error('Choisissez une vente dans la liste.');
  const response=await fetch(origin+'/favorites/from-extension',{method:'POST',mode:'cors',credentials:'omit',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify({source:'https://www.interencheres.com/compte/favoris/',saleUrl:sale.saleUrl,lots:sale.lots})});
  if(!response.ok)throw Error(`Import refusé par l’application (HTTP ${response.status}). Vérifiez la destination et les lots.`);
  result.textContent=`${sale.lots.length} lot(s) de cette vente envoyés. Ouvrez ${origin}/ pour les consulter. Complétude non vérifiée.`;
 }catch(e){showError(e)}
 finally{button.disabled=!select.value}
});

readPage();
