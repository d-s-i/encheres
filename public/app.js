const bookmarkletButton=document.querySelector?.('#copy-bookmarklet');
bookmarkletButton?.addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(document.querySelector('#favorite-bookmarklet').value);bookmarkletButton.textContent='Code copié'}
 catch{bookmarkletButton.textContent='Copie impossible : sélectionnez le code ci-dessus'}
});
const studyForm=document.querySelector?.('#study-form');
const saleChoice=document.querySelector?.('#sale-choice');
const saleInput=studyForm?.querySelector('input[name="saleUrl"]');
if(saleChoice&&saleInput){
 saleChoice.addEventListener('change',()=>{if(saleChoice.value)saleInput.value=saleChoice.value});
 saleInput.addEventListener('input',()=>{if(saleInput.value!==saleChoice.value)saleChoice.value=''});
}
document.querySelectorAll('button[data-prepare-lot]').forEach(button=>{
 button.addEventListener('click',()=>{
  const number=studyForm?.querySelector('input[name="number"]');
  if(number&&saleInput){number.value=button.dataset.prepareLot;saleInput.focus();studyForm.scrollIntoView({behavior:'smooth'});}
 });
});
const loading=document.querySelector?.('#study-loading');
if(studyForm&&loading){
 const button=studyForm.querySelector('button[type="submit"]');
 const elapsed=document.querySelector('#study-elapsed');
 let started=0,timer;
 const reset=()=>{clearInterval(timer);timer=undefined;loading.hidden=true;button.disabled=false};
 studyForm.addEventListener('submit',event=>{
  if(timer!==undefined){event.preventDefault();return}
  started=Date.now();
  loading.hidden=false;
  button.disabled=true;
  timer=setInterval(()=>{
   const seconds=Math.floor((Date.now()-started)/1000);
   elapsed.textContent=`Temps écoulé : ${Math.floor(seconds/60)} min ${seconds%60} s`;
  },1000);
 });
 window.addEventListener('pageshow',reset);
 window.addEventListener('pagehide',reset);
}

document.querySelectorAll('img[data-fallback]').forEach(image=>{
 image.addEventListener('error',()=>{image.hidden=true;image.nextElementSibling.hidden=false});
 if(image.complete && image.naturalWidth===0){image.hidden=true;image.nextElementSibling.hidden=false}
});
