export const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const euro=n=>Number.isFinite(n)?`${n.toLocaleString('fr-FR',{minimumFractionDigits:Number.isInteger(n)?0:2,maximumFractionDigits:2})} €`:'indisponible';
const official='www.creditmunicipal.fr';
function safeLink(url,label){
 try{const u=new URL(url);if(u.protocol!=='https:'||!([official,'serret-portier-expertises.com'].includes(u.hostname)||u.hostname==='www.chrono24.fr'))return escape(label);return `<a href="${escape(u.href)}" target="_blank" rel="noopener noreferrer">${escape(label)}</a>`}
 catch{return escape(label)}
}
function safePhoto(url){
 try{const u=new URL(url);return u.protocol==='https:'&&(u.hostname===official||u.hostname.endsWith('.chrono24.com'))?u.href:null}catch{return null}
}
function photos(images,alt){
 const elements=(Array.isArray(images)?images:[]).map(safePhoto).filter(Boolean);
 if(!elements.length)return '<p>Image indisponible</p>';
 return `<div class="photos">${elements.map(src=>`<span class="photo"><img src="${escape(src)}" alt="${escape(alt)}" loading="lazy" data-fallback><span hidden>Image indisponible</span></span>`).join('')}</div>`;
}
const title=r=>`Lot ${r.lot} — ${r.brand} ${r.model}`;
const absentCeiling={chrono_inaccessible:'non vérifiable : accès à Chrono24 impossible',target_fees_unverified:'indisponible : frais de la vente cible non vérifiés',chrono_unavailable_sample:'indisponible : aucune annonce admissible dans l’échantillon',chrono_unavailable:'indisponible : moyenne Chrono24 non vérifiée',sale_not_upcoming:'non applicable : vente ciblée déjà passée'};
const differences=d=>Object.entries(d??{}).map(([key,value])=>`${key} : ${value}`).join(' ; ')||'aucune différence relevée';
function estimation(watch){return watch.estimation?.length===2?`${euro(watch.estimation[0])} à ${euro(watch.estimation[1])}`:'non publiée'}
function chronoDetailAverage(chrono){
 if(chrono.status==='inaccessible')return `non vérifiable : accès empêché (${escape(chrono.reason??'source indisponible')})`;
 return chrono.status==='sample_empty'?'indisponible dans l’échantillon':euro(chrono.average);
}
function chronoDetail(chrono){
 return `${chronoDetailAverage(chrono)}${chrono.status==='partial'?' (moyenne partielle)':''} · ${chrono.count??0} annonce${chrono.count===1?'':'s'}`;
}
function creditDetailAverage(credit){
 return credit.status==='inaccessible'?`non vérifiable : ${escape(credit.reason??'source indisponible')}`:euro(credit.average);
}
function creditDetail(credit){
 return `${creditDetailAverage(credit)} · ${credit.count??0} vente${credit.count===1?'':'s'} avec frais vérifiés`;
}
function ceilingDetail(ceiling){
 if(ceiling?.amount==null)return absentCeiling[ceiling?.reason]??'indisponible : sources insuffisantes';
 return `${euro(ceiling.amount)} · frais vente cible ${escape(ceiling.buyerPercent)}% acheteur + ${escape(ceiling.livePercent)}% live · ${safeLink(ceiling.feeSource,'catalogue de la vente cible')}`;
}
function fields(watch,r){
 return `<table aria-label="Tableau d'analyse du lot"><tbody>
 <tr><th>Vente</th><td>${safeLink(watch.saleUrl,watch.saleUrl)}</td><th>Numéro de lot</th><td>${escape(r.lot)}</td></tr>
 <tr><th>Marque</th><td>${escape(r.brand)}</td><th>Modèle / type</th><td>${escape(r.model)}</td></tr>
 <tr><th>Référence</th><td>${escape(r.reference??'non indiquée')}</td><th>Boîte / écrin</th><td>${escape(watch.box??'non renseigné')}</td></tr>
 <tr><th>Bracelet</th><td>${escape(watch.bracelet??'non renseigné')}</td><th>Estimation</th><td>${escape(estimation(watch))}</td></tr>
 <tr><th>Moyenne Chrono24 — prix demandés hors port</th><td>${chronoDetail(r.chrono)}</td><th>Moyenne Crédit Municipal — coûts en ligne vérifiés</th><td>${creditDetail(r.credit)}</td></tr>
 <tr><th>Prix à ne pas dépasser — hors frais</th><td colspan="3">${ceilingDetail(r.ceiling)}</td></tr>
 </tbody></table>`;
}
function sampleLine(chrono){
 const s=chrono.sample;if(!s)return '';
 return `<p>Recherche Chrono24 : ${s.inspectedPages} pages, ${s.inspectedListings} annonces analysées sur ${s.totalListings} résultats, triées par pertinence${s.inspectedPages<s.totalPages?' ; échantillon des trois premières pages seulement : offres moins chères de tout Chrono24 non garanties':' ; recherche intégralement parcourue'}.</p>`;
}
function historicalCost(s){
 return s.onlineCost===null?'coût en ligne non vérifié':`${euro(s.onlineCost)} frais compris ; ${escape(s.buyerPercent)}% acheteur + ${escape(s.livePercent)}% live ${safeLink(s.feeSource,'conditions datées')}`;
}
function historicalRow(s){
 return `<tr><td>${escape(s.date)}</td><td>${escape(s.number)}</td><td>${escape(s.reference??'non indiquée')}</td><td>${euro(s.hammerPrice)} hors frais</td><td>${historicalCost(s)}</td><td>${safeLink(s.url,'fiche de vente')}</td><td>${escape(differences(s.differences))}</td></tr>`;
}
function historicalMean(credit){
 return `${credit.status==='inaccessible'?'non vérifiable':euro(credit.average)} (${credit.count??0} vente${credit.count===1?'':'s'} avec frais vérifiés)`;
}
function historical(r){
 const rows=r.credit.sales.map(historicalRow).join('');
 return `<section><h2>Adjudications historiques</h2>${rows?`<table><thead><tr><th>Date</th><th>Lot</th><th>Référence</th><th>Adjudication</th><th>Coût en ligne</th><th>Source</th><th>Observations</th></tr></thead><tbody>${rows}</tbody></table>`:'<p>Aucun comparable historique vérifié.</p>'}<p>Moyenne des coûts en ligne vérifiés : ${historicalMean(r.credit)}.</p></section>`;
}
function creditCard(s,images){
 const cost=s.onlineCost===null?'coût en ligne non vérifié':`coût ${euro(s.onlineCost)} frais compris · ${safeLink(s.feeSource,'frais vérifiés')}`;
 return `<article class="comparable"><h3>Adjudication historique · ${escape(s.date)} · lot ${escape(s.number)}</h3><p>Adjudication ${euro(s.hammerPrice)} hors frais · ${cost}</p><p>${safeLink(s.url,'Voir la fiche historique')} · différences : ${escape(differences(s.differences))}</p>${photos(images.credit?.[s.url],`Lot historique ${s.number}`)}</article>`;
}
function offerCard(o,images){
 return `<article class="comparable"><h3>Annonce Chrono24 · prix demandé ${euro(o.price)} hors port</h3><p>Vendeur ${escape(o.sellerCountry)} · référence ${escape(o.reference??'non indiquée')} · état : ${escape(o.condition??'non renseigné')}</p><p>${safeLink(o.url,'Voir l’annonce')} · différences : ${escape(differences(o.differences))}</p>${photos(images.offers?.[o.url],`Annonce ${o.id}`)}</article>`;
}
function cards(r,images){
 const credit=r.credit.sales.map(s=>creditCard(s,images));
 const offers=r.chrono.offers.map(o=>offerCard(o,images));
 return `<section><h2>Comparables analysés et leurs photos</h2>${[...credit,...offers].join('')||'<p>Aucun comparable retenu.</p>'}</section>`;
}
export function layout(content){return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Études de montres</title><link rel="stylesheet" href="/app.css"><script defer src="/app.js"></script></head><body><main><nav><a href="/">Études de montres</a></nav>${content}</main></body></html>`}
export function detail(record){const {watch,r,images}=record;return layout(`<a class="back-home" href="/">← Retour au menu principal</a><h1>${escape(title(r))}</h1><p>Date d'analyse : ${escape(r.asOf)}</p><section><h2>Lot étudié</h2><p>${safeLink(watch.source,'Fiche du lot')}</p>${photos(images.target,`Lot ${r.lot}`)}</section>${fields(watch,r)}${sampleLine(r.chrono)}${historical(r)}${cards(r,images)}`)}
function historicalDates(records){return [...new Set(records.flatMap(({r})=>r.credit.sales.map(s=>s.date)))].sort().slice(-4)}
function historyCell(sales){
 if(!sales.length)return '—';
 return sales.map(s=>`<div class="historical-value">${safeLink(s.url,`Adj. ${euro(s.hammerPrice)}`)}<br><small>${s.onlineCost===null?'coût non vérifié':`coût ${euro(s.onlineCost)}`}</small></div>`).join('');
}
function observation(r){
 const remarks=[...r.credit.sales,...r.chrono.offers].map(x=>differences(x.differences)).filter(x=>x!=='aucune différence relevée');
 if(r.chrono.status==='inaccessible')remarks.push('Chrono24 non vérifiable : accès empêché');
 if(r.chrono.sample?.inspectedPages<r.chrono.sample?.totalPages)remarks.push('Chrono24 : échantillon des trois premières pages');
 return remarks.length?escape([...new Set(remarks)].join(' ; ')):'—';
}
function extraDates(r,dates){
 const hidden=[...new Set(r.credit.sales.map(s=>s.date).filter(date=>!dates.includes(date)))].sort();
 if(!hidden.length)return '';
 const label=`${hidden.length} date${hidden.length>1?'s':''} historiques supplémentaires en fiche`;
 const tooltip=hidden.map(d=>new Date(`${d}T00:00:00Z`).toLocaleDateString('fr-FR')).join(', ');
 return `<strong class="extra-dates" title="${escape(tooltip)}">${label}</strong>`;
}
function chronoLinks(chrono){
 if(!chrono.offers?.length)return '';
 return `<div class="offer-links">Liens : ${chrono.offers.map((o,i)=>safeLink(o.url,`annonce ${i+1}`)).join(' · ')}</div>`;
}
function overviewEstimate(watch){return watch.estimation?.length===2?`${euro(watch.estimation[0])} à ${euro(watch.estimation[1])}`:'—'}
function unavailableAverage(result){
 if(result.status==='inaccessible')return 'non vérifiable';
 return result.average===null?'indisponible':null;
}
function pricedOverview(result,countLabel){
 const unavailable=unavailableAverage(result);
 return unavailable ?? `${euro(result.average)} (${countLabel})`;
}
function overviewChrono(chrono){
 return pricedOverview(chrono,`${chrono.count} annonce${chrono.count===1?'':'s'}${chrono.status==='partial'?', moyenne partielle':''}`);
}
function overviewCredit(credit){
 return pricedOverview(credit,`${credit.count} vente${credit.count===1?'':'s'} avec frais vérifiés`);
}
function overviewHistory(sales,dates){
 return dates.map(date=>`<td data-date="${escape(date)}">${historyCell(sales.filter(s=>s.date===date))}</td>`).join('');
}
function overviewSaleNumber(watch){return watch.saleUrl?.match(/\/(\d{9})\/$/)?.[1]??'vente non identifiée'}
function overviewCeiling(ceiling){return ceiling?.amount==null?'indisponible':`${euro(ceiling.amount)} hors frais`}
function overviewRow({id,r,watch},dates){
 return `<tr data-lot="${escape(r.lot)}" data-sale="${escape(watch.saleUrl)}"><td title="${escape(watch.saleUrl)}">${escape(overviewSaleNumber(watch))}<br>${escape(r.asOf)}</td><td><a href="/studies/${escape(id)}">${escape(title(r))}</a></td><td>${escape(r.brand)}</td><td>${escape(r.model)}</td><td>${escape(watch.box??'non renseigné')}</td><td>${escape(watch.bracelet??'non renseigné')}</td><td>${overviewEstimate(watch)}</td><td data-column="chrono24">${overviewChrono(r.chrono)}${chronoLinks(r.chrono)}</td><td>${overviewCredit(r.credit)}</td>${overviewHistory(r.credit.sales,dates)}<td>${extraDates(r,dates)}<span class="grid-clamp">${observation(r)}</span></td><td>${overviewCeiling(r.ceiling)}</td><td><form method="post" action="/studies/${escape(id)}/delete"><button type="submit">Supprimer la ligne</button></form></td></tr>`;
}
function favoriteTable(favorites){
 const rows=favorites.map(f=>{
  const sale=f.saleUrl.match(/\/([^/]+)-(\d+)\/$/);
  const name=sale?`${sale[1].replaceAll('-',' ')} (${sale[2]})`:f.saleUrl;
  return `<tr data-favorite-sale="${escape(f.saleUrl)}"><td><a href="${escape(f.saleUrl)}" target="_blank" rel="noopener noreferrer">${escape(name)}</a></td><td>${escape(f.number)}</td><td><a href="${escape(f.url)}" target="_blank" rel="noopener noreferrer">Fiche Interencheres</a></td><td><button type="button" data-prepare-lot="${escape(f.number)}">Préparer une étude</button><form method="post" action="/favorites/${escape(f.id)}/delete"><button type="submit">Retirer de l’application</button></form></td></tr>`;
 }).join('');
 return `<h2>Favoris importés</h2><p>Complétude de l’import non vérifiée : si Interencheres affiche plusieurs pages, l’extension doit le signaler. Aucun prix n’est recherché lors de l’import.</p><table aria-label="Favoris importés"><thead><tr><th>Vente Interencheres</th><th>Lot</th><th>Source</th><th>Étude</th></tr></thead><tbody>${rows}</tbody></table>`;
}
export function home(records,sales=null,favorites=[]){
 const dates=historicalDates(records);
 const headers=['Vente','Lot','Marque','Type','Boîtes','Bracelet','Estimation (mise à prix non attestée)','Prix Chrono24 moyen — prix demandés hors port','Moyenne Crédit Municipal — coûts en ligne vérifiés',...dates.map(d=>`Vente du ${new Date(`${d}T00:00:00Z`).toLocaleDateString('fr-FR')}`),'Observations','Prix à ne pas dépasser hors frais','Actions'];
 const table=`<p class="grid-legend">Ventes datées : « Adj. » = adjudication hors frais ; « coût » = coût en ligne frais compris, lorsqu'il est vérifié.</p><div class="table-wrap"><table aria-label="Tableau des études"><thead><tr>${headers.map(h=>`<th>${escape(h)}</th>`).join('')}</tr></thead><tbody>${records.map(record=>overviewRow(record,dates)).join('')}</tbody></table></div>`;
 const options=sales?.map(s=>`<option value="${escape(s.url)}">Vente ${escape(s.category.toLocaleLowerCase('fr-FR'))} — ${escape(new Date(`${s.date}T12:00:00Z`).toLocaleDateString('fr-FR'))}</option>`).join('');
 const selection=sales===null?'<p>Présélection indisponible pour le moment : saisissez le lien manuellement.</p>':sales.length?`<label>Ventes à venir (catalogue publié) <select id="sale-choice"><option value="">Choisir une vente ou saisir un lien</option>${options}</select></label>`:'<p>Aucune vente à venir avec catalogue publié. Vous pouvez saisir un lien manuellement.</p>';
 return layout(`<h1>Étudier un lot de montre</h1><form id="study-form" method="post" action="/studies">${selection}<label>Lien de la vente <input type="url" name="saleUrl" required></label><label>Numéro de lot <input type="number" name="number" min="1" step="1" required></label><button type="submit">Lancer l'étude</button></form><div id="study-loading" class="study-loading" role="status" aria-live="polite" hidden><div class="study-loading-panel"><span class="study-spinner" aria-hidden="true"></span><h2>Étude en cours</h2><p>Consultation du catalogue et comparaison des prix. Cela peut prendre plusieurs minutes.</p><p id="study-elapsed">Temps écoulé : 0 s</p><p>La fiche s'affichera automatiquement une fois l'étude terminée. Ne fermez pas cette page.</p></div></div><section id="favorite-import"><h2>Importer mes favoris Interencheres</h2><p>Installez une fois l’extension Chromium depuis le dossier <code>extension/</code> du projet : ouvrez <code>chrome://extensions</code>, activez Mode développeur puis choisissez « Charger l’extension non empaquetée ».</p><ol><li>Connectez-vous à <a href="https://www.interencheres.com/compte/favoris/" target="_blank" rel="noopener noreferrer">Mon compte → Favoris</a> sur Interencheres.</li><li>Cliquez sur l’icône de l’extension, choisissez « Vercel » (préconfiguré) ou « Local » pour un essai, choisissez une vente et cliquez sur « Importer cette vente ».</li><li>Retrouvez ici les lots de cette vente. Aucun code à copier ni liste à coller.</li></ol><p>L’extension ne transmet que les liens et numéros des lots choisis, jamais votre mot de passe ou vos cookies. Les favoris importés sur Vercel sont visibles par toute personne ayant l’URL. Pour une vente Crédit Municipal, sélectionnez son catalogue avant de préparer l’étude du lot.</p></section>${favoriteTable(favorites)}<h2>Études sauvegardées</h2>${table}`);
}
