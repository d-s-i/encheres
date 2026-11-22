// Runs in the user's browser only, on Interencheres's dedicated favorites page.
export function captureFavorites(doc){
 if(doc.location.origin!=='https://www.interencheres.com'||doc.location.pathname!=='/compte/favoris/'){
  alert('Ouvrez Interencheres > Mon compte > Favoris avant de copier.');return;
 }
 const lots=[];
 for(const a of doc.querySelectorAll('a[href*="/lot-"]')){
  const link=new URL(a.getAttribute('href'),doc.location.href);
  const number=Number(a.textContent.match(/\bLot\s*(?:n[°o]\s*)?(\d+)\b/i)?.[1]);
  if(!/^\/[a-z0-9-]+\/[a-z0-9-]+-\d+\/lot-\d+\.html$/.test(link.pathname)||!Number.isSafeInteger(number)||number<=0){alert('Un favori n’a pas de lien ou de numéro vérifiable. Rien n’a été copié.');return}
  lots.push({url:link.origin+link.pathname,number});
 }
 if(!lots.length){alert('Aucun lot favori identifiable sur cette page. Rien n’a été copié.');return}
 navigator.clipboard.writeText(JSON.stringify({source:'https://www.interencheres.com/compte/favoris/',lots})).then(()=>alert(`${lots.length} favoris visibles copiés. Collez-les dans l’application. Si votre compte a plusieurs pages, répétez l’opération sur chacune.`),()=>alert('Copie impossible : vérifiez l’autorisation du presse-papiers.'));
}

export function bookmarkletHref(){return `javascript:${encodeURIComponent(`(${captureFavorites.toString()})(document)`)}`}
