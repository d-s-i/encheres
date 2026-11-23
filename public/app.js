const startAnalysis=document.querySelector?.('#start-analysis');
const modal=document.querySelector?.('#analysis-modal');
const closeAnalysis=document.querySelector?.('#close-analysis');
const choices=document.querySelector?.('#analysis-choices');
const importFlow=document.querySelector?.('#favorite-import');
const manualFlow=document.querySelector?.('#manual-study');
let analysisRunning=false,studyFinished=false;
const studies=document.querySelector?.('#studies'),navigation=document.querySelector?.('main nav');
function openModal(){if(!modal)return;modal.hidden=false;if(startAnalysis)startAnalysis.hidden=true;if(studies)studies.inert=true;if(navigation)navigation.inert=true;if(document.body)document.body.style.overflow='hidden';modal.focus?.()}
function closeModal(){
 if(analysisRunning||!modal)return;
 if(studyFinished){window.location.assign('/');return}
 modal.hidden=true;if(startAnalysis){startAnalysis.hidden=false;startAnalysis.focus?.()}
 if(studies)studies.inert=false;if(navigation)navigation.inert=false;
 if(choices)choices.hidden=true;if(importFlow)importFlow.hidden=true;if(manualFlow)manualFlow.hidden=true;
 if(document.body)document.body.style.overflow='';
 window.history?.replaceState?.({},'', '/');
}
if(modal&&!modal.hidden)openModal();
startAnalysis?.addEventListener('click',()=>{openModal();choices.hidden=false});
closeAnalysis?.addEventListener('click',closeModal);
globalThis.window?.addEventListener?.('keydown',event=>{if(event.key==='Escape'&&!modal?.hidden){event.preventDefault();closeModal()}});
document.querySelector?.('#choose-import')?.addEventListener('click',()=>{choices.hidden=true;importFlow.hidden=false});
document.querySelector?.('#choose-manual')?.addEventListener('click',()=>{choices.hidden=true;manualFlow.hidden=false});
document.querySelectorAll('button[data-change-analysis]').forEach(button=>button.addEventListener('click',()=>{importFlow.hidden=true;manualFlow.hidden=true;choices.hidden=false}));
const studyForm=document.querySelector?.('#study-form');
const saleChoice=document.querySelector?.('#sale-choice');
const saleInput=studyForm?.querySelector('input[name="saleUrl"]');
if(saleChoice&&saleInput){
 saleChoice.addEventListener('change',()=>{if(saleChoice.value)saleInput.value=saleChoice.value});
 saleInput.addEventListener('input',()=>{if(saleInput.value!==saleChoice.value)saleChoice.value=''});
}
const loading=document.querySelector?.('#study-loading');
const batchButtons=[...document.querySelectorAll('button[data-batch-sale]')];
let batchRunning=false;
for(const batch of batchButtons)batch.addEventListener('click',async()=>{
 if(batchRunning)return;
 const numbers=[...new Set(batch.dataset.batchLots.split(',').map(Number))].filter(n=>Number.isSafeInteger(n)&&n>0);
 const sale=batch.dataset.batchSale,already=Number(batch.dataset.alreadyStudied)||0;
 if(!numbers.length||!/^https:\/\/www\.creditmunicipal\.fr\/ventes-aux-encheres\/catalogue-des-ventes\/\d{9}\/$/.test(sale))return;
 const card=batch.closest('.favorite-batch'),panel=card?.querySelector('.batch-progress');
 const progress=panel?.querySelector('[data-batch-progress]'),bar=panel?.querySelector('progress');
 const summary=panel?.querySelector('[data-batch-summary]'),finish=panel?.querySelector('[data-batch-finish]');
 const spinner=panel?.querySelector('[data-batch-spinner]'),elapsed=panel?.querySelector('[data-batch-elapsed]');
 if(!panel||!progress||!bar||!summary||!finish||!spinner||!elapsed)return;
 if(!window.confirm(`Étudier les ${numbers.length} lots restants de cette vente Crédit Municipal ? ${already} déjà étudié(s) seront ignorés. Ces recherches consomment le quota Packet.`))return;
 batchRunning=true;analysisRunning=true;if(closeAnalysis)closeAnalysis.disabled=true;
 batchButtons.forEach(b=>b.disabled=true);panel.hidden=false;spinner.hidden=false;elapsed.hidden=false;
 let created=0,duplicates=0,lotStarted=Date.now();const errors=[],started=lotStarted;
 const timer=setInterval(()=>{
  const total=Math.floor((Date.now()-started)/1000),current=Math.floor((Date.now()-lotStarted)/1000);
  elapsed.textContent=`Temps écoulé : ${Math.floor(total/60)} min ${total%60} s · lot en cours : ${Math.floor(current/60)} min ${current%60} s`;
 },1000);
 try{
  for(const [index,number] of numbers.entries()){
   lotStarted=Date.now();
   progress.textContent=`Lot ${number} (${index+1}/${numbers.length}) : recherche des sources et comparaison des prix, réponse en attente…`;
   try{
    const response=await fetch('/studies',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({saleUrl:sale,number:String(number)})});
    if(response.status===200&&response.redirected)created++;
    else if(response.status===409)duplicates++;
    else errors.push(`lot ${number} (HTTP ${response.status})`);
   }catch{errors.push(`lot ${number} (connexion interrompue)`)}
   bar.value=index+1;
  }
 }finally{clearInterval(timer);spinner.hidden=true}
 progress.textContent=`${numbers.length}/${numbers.length} lots traités`;
 const skipped=already+duplicates;
 summary.textContent=`${created} étude${created===1?'':'s'} créée${created===1?'':'s'} · ${skipped} déjà étudié${skipped===1?'':'s'} · ${errors.length} échec${errors.length===1?'':'s'}${errors.length?` : ${errors.join(', ')}`:''}`;
 summary.hidden=false;finish.hidden=false;studyFinished=true;analysisRunning=false;
 if(closeAnalysis)closeAnalysis.disabled=false;
 finish.addEventListener('click',()=>window.location.assign('/'),{once:true});
});
if(studyForm&&loading){
 const button=studyForm.querySelector('button[type="submit"]');
 const sale=studyForm.querySelector('input[name="saleUrl"]'),number=studyForm.querySelector('input[name="number"]');
 const elapsed=document.querySelector('#study-elapsed'),result=document.querySelector('#manual-result');
 const detail=document.querySelector('#manual-detail'),finish=document.querySelector('#manual-finish');
 finish?.addEventListener('click',()=>window.location.assign('/'));
 studyForm.addEventListener('submit',async event=>{
  event.preventDefault();
  if(analysisRunning)return;
  analysisRunning=true;if(closeAnalysis)closeAnalysis.disabled=true;
  loading.hidden=false;button.disabled=true;if(result)result.hidden=true;
  const started=Date.now();
  const timer=setInterval(()=>{if(elapsed){const seconds=Math.floor((Date.now()-started)/1000);elapsed.textContent=`Temps écoulé : ${Math.floor(seconds/60)} min ${seconds%60} s`}},1000);
  let message='';
  try{
   const response=await fetch('/studies',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({saleUrl:sale.value,number:number.value})});
   if(response.status===200&&response.redirected){
    message=`Étude terminée pour le lot ${number.value}.`;
    const url=new URL(response.url);
    if(detail&&url.origin===window.location?.origin&&/^\/studies\/[a-f0-9]{64}$/.test(url.pathname)){detail.href=url.pathname;detail.hidden=false}
    studyFinished=true;
   }else if(response.status===409){message='Ce lot est déjà étudié. Retrouvez-le dans le tableau.';studyFinished=true}
   else message=`Étude non disponible pour le lot ${number.value} (HTTP ${response.status}).`;
  }catch{message=`Étude interrompue pour le lot ${number.value}. Réessayez sans fermer cette fenêtre.`}
  finally{clearInterval(timer);loading.hidden=true;analysisRunning=false;if(closeAnalysis)closeAnalysis.disabled=false}
  if(result){result.textContent=message;result.hidden=false}
  if(studyFinished){if(finish)finish.hidden=false}else button.disabled=false;
 });
}

document.querySelectorAll('img[data-fallback]').forEach(image=>{
 image.addEventListener('error',()=>{image.hidden=true;image.nextElementSibling.hidden=false});
 if(image.complete && image.naturalWidth===0){image.hidden=true;image.nextElementSibling.hidden=false}
});
