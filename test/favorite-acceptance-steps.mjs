import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {load} from 'cheerio';
import {runInNewContext} from 'node:vm';
import {createApplication} from '../src/app.mjs';
import {collectFavoritePage,inspectCreditSale} from '../extension/collector.mjs';

const a='https://www.interencheres.com/art-decoration/horlogerie-692045/';
const b='https://www.interencheres.com/art-decoration/belle-vente-de-noel-chez-cap-encheres-689953/';
const credit='https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/261205000/';
const evidence={url:a,organizer:'https://www.interencheres.com/commissaire-priseur/credit-municipal-de-paris-419',date:'2026-12-05',title:'HORLOGERIE'};
const lot=(sale,number)=>({url:`${sale}lot-${number+89000000}.html`,number});
const extensionOrigin='chrome-extension://abcdefghijklmnopabcdefghijklmnop';
const rows=($,sale)=>($(`.favorite-batch[data-import-sale="${sale}"] button[data-batch-lots]`).attr('data-batch-lots')??'').split(',').filter(Boolean).map(n=>`Lot ${n}`);
const page=async(c,path='/')=>load(await(await fetch(c.base+path)).text());
const importedPath='/?imported='+encodeURIComponent(a);
async function pageSnapshot(url,lots,nextLots=null){
 const previous={document:globalThis.document,fetch:globalThis.fetch,DOMParser:globalThis.DOMParser};
 const doc=(items,next=null)=>({location:new URL(url),querySelectorAll:()=>items.map(item=>({getAttribute:()=>item.url,textContent:`Lot ${item.number} — montre`})),querySelector:()=>next?{getAttribute:()=>'?page=2'}:null});
 try{
  globalThis.document=doc(lots,nextLots);
  if(nextLots){globalThis.fetch=async()=>({ok:true,text:async()=>'<next-page>'});globalThis.DOMParser=class{parseFromString(){return doc(nextLots)}}}
  return await collectFavoritePage();
 }finally{Object.assign(globalThis,previous)}
}
async function visibleCreditSales(c){
 const previous={document:globalThis.document,fetch:globalThis.fetch,DOMParser:globalThis.DOMParser};
 try{
  globalThis.document={location:new URL('https://www.interencheres.com/compte/favoris/')};
  globalThis.fetch=async()=>({ok:true,text:async()=>'<sale>'});
  const allowed=[];
  for(const sale of c.snapshot.sales){
   globalThis.DOMParser=class{parseFromString(){const organizer=sale.saleUrl===a?evidence.organizer:'https://www.interencheres.com/commissaire-priseur/cap-encheres-451';return {querySelectorAll:()=>[{textContent:JSON.stringify({'@type':'Event',organizer:{url:organizer},location:{url:sale.saleUrl},name:'HORLOGERIE',startDate:'2026-12-05'})}]}}};
   if(await inspectCreditSale(sale.saleUrl))allowed.push(sale.saleUrl);
  }
  return allowed;
 }finally{Object.assign(globalThis,previous)}
}
async function importSelected(c){
 const selected=c.snapshot.sales.find(s=>s.saleUrl===a);
 assert.ok(selected,'La vente A doit être proposée par l’extension');
 const r=await fetch(c.base+'/favorites/from-extension',{method:'POST',headers:{Origin:extensionOrigin,'content-type':'application/json'},body:JSON.stringify({source:c.snapshot.source,saleUrl:selected.saleUrl,saleEvidence:evidence,lots:selected.lots})});
 assert.equal(r.status,200);
 c.$=await page(c,importedPath);
}
async function runBatch(c){
 const script=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const before=await page(c,importedPath),button=before('button[data-batch-sale]').first();assert.equal(button.length,1);
 const events={},messages=[];
 const progress={set textContent(v){messages.push(v)},get textContent(){return messages.at(-1)}};
 const bar={value:0},summary={hidden:true,textContent:''},finish={hidden:true,addEventListener:(_name,fn)=>{events.finish=fn}};
 let spinnerShown=false;const spinner={set hidden(value){if(value===false)spinnerShown=true},get hidden(){return !spinnerShown}};
 const elapsed={hidden:true,textContent:''};
 const panel={hidden:true,querySelector:s=>({'[data-batch-progress]':progress,progress:bar,'[data-batch-summary]':summary,'[data-batch-finish]':finish,'[data-batch-spinner]':spinner,'[data-batch-elapsed]':elapsed})[s]};
 const card={querySelector:s=>s==='.batch-progress'?panel:undefined};
 const batch={dataset:{batchSale:button.attr('data-batch-sale'),batchLots:button.attr('data-batch-lots'),alreadyStudied:button.attr('data-already-studied')},closest:()=>card,disabled:false,addEventListener:(name,fn)=>{events[name]=fn}};
 const modal={hidden:false,focus:()=>{}};
 const document={querySelector:s=>s==='#analysis-modal'?modal:undefined,querySelectorAll:s=>s==='button[data-batch-sale]'?[batch]:[]};
 const window={confirm:()=>true,location:{assign:()=>{}},addEventListener:()=>{}};
 runInNewContext(script,{document,window,fetch:(path,options)=>fetch(c.base+path,options),URLSearchParams,setInterval:()=>1,clearInterval:()=>{}});
 await events.click();c.$=await page(c);c.progress=messages;c.summary=summary.textContent;c.loadingShown=panel.hidden===false&&modal.hidden===false;c.spinnerShown=spinnerShown;c.elapsedShown=elapsed.hidden===false;c.batchFinal=bar.value;
}
const handlers=[
 [/^l'utilisateur est connecté sur le site Interencheres et a mis en favoris les lots 201 et 202 de la vente A Crédit Municipal$/,c=>{c.a=[lot(a,201),lot(a,202)]}],
 [/^la vente B Cap Enchères contient le lot 1002 mis en favori$/,c=>{c.b=[lot(b,1002)]}],
 [/^l'utilisateur choisit la vente A dans l'extension depuis la page Favoris et lance l'import direct$/,async c=>{
  c.snapshot=await pageSnapshot('https://www.interencheres.com/compte/favoris/',c.pages?c.pages[0]:[...c.a,...(c.b??[])],c.pages?.[1]);
  assert.equal(c.snapshot.ok,true);await importSelected(c);
 }],
 [/^une fenêtre modale ouverte propose le bouton Lancer l'analyse pour les lots 201 et 202 de la vente A$/,c=>{assert.equal(c.$('#analysis-modal:not([hidden])[role="dialog"]').length,1);assert.equal(c.$(`.favorite-batch[data-import-sale="${a}"] button[data-batch-sale]`).text().trim(),"Lancer l'analyse");assert.deepEqual(rows(c.$,a),['Lot 201','Lot 202'])}],
 [/^le lot 1002 de la vente B n'est pas inclus dans cette analyse$/,c=>{assert.equal(rows(c.$,b).length,0);assert.deepEqual(rows(c.$,a),['Lot 201','Lot 202'])}],
 [/^aucune étude de prix n'est lancée par cet import$/,c=>{assert.equal(c.studies,0);assert.equal(c.$('table[aria-label="Tableau des études"] tbody tr').length,0)}],
 [/^aucun raccourci javascript ou collage manuel de liste n'est nécessaire$/,c=>{assert.equal(c.$('#favorite-import textarea').length,0);assert.doesNotMatch(c.$('#favorite-import').text(),/copier le code|collez le résultat/i)}],
 [/^la vente A affiche le lot 201 mis en favori et le lot 203 suivi uniquement par un ordre d'achat dans la source contrôlée$/,c=>{c.a=[lot(a,201)];c.order=lot(a,203)}],
 [/^l'analyse proposée contient le lot 201 de la vente A$/,c=>assert.deepEqual(rows(c.$,a),['Lot 201'])],
 [/^le lot 203 n'est pas inclus dans cette analyse$/,c=>{assert.deepEqual(rows(c.$,a),['Lot 201']);assert.doesNotMatch(rows(c.$,a).join(' '),/203/)}],
 [/^les favoris de la vente A sont répartis sur plusieurs pages dans une source contrôlée$/,c=>{c.pages=[]}],
 [/^le lot 201 est sur la première page et le lot 202 sur une page suivante$/,c=>{c.pages=[[lot(a,201)],[lot(a,202)]]}],
 [/^l'analyse proposée couvre les lots 201 et 202 de la vente A$/,c=>assert.deepEqual(rows(c.$,a),['Lot 201','Lot 202'])],
 [/^l'application n'annonce pas un import complet si une page de favoris n'a pas été consultée$/,c=>{assert.equal(c.snapshot.complete,false);assert.doesNotMatch(c.$('#new-analysis').text(),/tous les favoris importés/i)}],
 [/^la source de la vente A ne permet pas de distinguer un favori d'un lot suivi seulement par un ordre$/,c=>{c.ambiguous=true}],
 [/^l'utilisateur tente d'importer la vente A par l'extension depuis cette source ambiguë$/,async c=>{c.snapshot=await pageSnapshot(a+'?segment=interests',[lot(a,201)]);assert.equal(c.snapshot.ok,false);c.$=await page(c)}],
 [/^l'application n'ajoute aucun lot non identifié comme favori$/,c=>assert.equal(rows(c.$,a).length,0)],
 [/^elle indique que la liste des favoris de cette vente n'a pas pu être vérifiée$/,c=>assert.match(c.snapshot.error,/ne convient pas/)],
 [/^les lots 201 et 202 de la vente A ont été importés dans l'application Vercel$/,async c=>{c.a=[lot(a,201),lot(a,202)];c.snapshot=await pageSnapshot('https://www.interencheres.com/compte/favoris/',c.a);await importSelected(c)}],
 [/^une autre personne ouvre le lien public de retour d'import de la vente A$/,async c=>{c.$=await page(c,importedPath)}],
 [/^elle peut voir le bouton Lancer l'analyse de cette vente$/,c=>{assert.equal(c.$('button[data-batch-sale]').text().trim(),"Lancer l'analyse");assert.deepEqual(rows(c.$,a),['Lot 201','Lot 202'])}],
 [/^elle ne voit aucune étude de prix créée par le seul import$/,c=>{assert.equal(c.studies,0);assert.equal(c.$('table[aria-label="Tableau des études"] tbody tr').length,0)}],
 [/^le dossier de l'extension est disponible sur la machine et Chromium est installé$/,async c=>{c.manifest=JSON.parse(await readFile(new URL('../extension/manifest.json',import.meta.url),'utf8'));assert.equal(c.manifest.manifest_version,3)}],
 [/^l'utilisateur charge ce dossier comme extension non empaquetée dans Chromium$/,c=>{assert.equal(c.manifest.action.default_popup,'popup.html')}],
 [/^il ouvre la page Favoris de son compte Interencheres$/,async c=>{c.snapshot=await pageSnapshot('https://www.interencheres.com/compte/favoris/',[lot(a,201),lot(b,1002)]);assert.equal(c.snapshot.ok,true)}],
 [/^l'extension est disponible dans son navigateur et présente les ventes Crédit Municipal de ses favoris$/,async c=>assert.deepEqual(await visibleCreditSales(c),[a])],
 [/^la sélection d'une vente seule n'importe encore aucun lot$/,async c=>{c.$=await page(c);assert.equal(c.$('.favorite-batch').length,0)}],
 [/^la page Favoris contient le lot 1002 d'une vente Cap Enchères et le lot 201 d'une vente Crédit Municipal$/,async c=>{c.snapshot=await pageSnapshot('https://www.interencheres.com/compte/favoris/',[lot(b,1002),lot(a,201)])}],
 [/^l'utilisateur ouvre l'extension depuis la page Favoris$/,async c=>{c.eligible=await visibleCreditSales(c);c.$=await page(c)}],
 [/^seule la vente Crédit Municipal est proposée à l'import$/,c=>assert.deepEqual(c.eligible,[a])],
 [/^aucun lot de Cap Enchères n'est ajouté à l'application$/,c=>assert.equal(rows(c.$,b).length,0)],
 [/^les lots 201 et 202 favoris de la vente Crédit Municipal sont importés sans étude$/,async c=>{c.a=[lot(a,201),lot(a,202)];c.numbers=[201,202];c.snapshot=await pageSnapshot('https://www.interencheres.com/compte/favoris/',c.a);await importSelected(c);assert.equal(c.studies,0)}],
 [/^l'utilisateur confirme le lancement de l'étude pour tous les lots de cette vente$/,async c=>runBatch(c)],
 [/^la progression dans la fenêtre modale indique le numéro du lot en cours et le nombre de lots traités$/,c=>{assert.ok(c.loadingShown);assert.equal(c.batchFinal,c.numbers.length);for(const n of c.numbers)assert.ok(c.progress.some(message=>message.includes(`Lot ${n}`)&&message.includes(`/${c.numbers.length}`)),n)}],
 [/^un indicateur animé et le temps écoulé restent visibles pendant l'étude de chaque lot$/,c=>{assert.equal(c.spinnerShown,true);assert.equal(c.elapsedShown,true)}],
 [/^une étude distincte est sauvegardée pour les lots 201 et 202$/,c=>{assert.equal(c.$('table[aria-label="Tableau des études"] tbody tr').length,2);for(const n of [201,202])assert.equal(c.$(`table[aria-label="Tableau des études"] tr[data-lot="${n}"]`).length,1)}],
 [/^l'import seul n'avait lancé aucune recherche de prix$/,c=>assert.equal(c.studies,2)],
 [/^les lots 201, 202 et 203 sont importés pour une vente Crédit Municipal dans une source contrôlée et le lot 201 a déjà son étude$/,async c=>{c.a=[lot(a,201),lot(a,202),lot(a,203)];c.numbers=[201,202,203];c.snapshot=await pageSnapshot('https://www.interencheres.com/compte/favoris/',c.a);await importSelected(c);const response=await fetch(c.base+'/studies',{method:'POST',redirect:'manual',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({saleUrl:credit,number:'201'})});assert.equal(response.status,303);c.before=await page(c);c.studies=0}],
 [/^le lot 203 ne peut pas être étudié$/,c=>{c.missing203=true}],
 [/^l'utilisateur lance l'étude pour tous les lots de cette vente$/,async c=>runBatch(c)],
 [/^le lot 202 est étudié sans modifier l'étude existante du lot 201$/,c=>{assert.equal(c.$('table[aria-label="Tableau des études"] tbody tr').length,2);assert.equal(c.$('tr[data-lot="201"]').length,1);assert.equal(c.$('tr[data-lot="202"]').length,1);assert.equal(c.studies,2);assert.equal(c.$('tr[data-lot="202"] td').eq(2).text(),'PIAGET');assert.equal(c.$('tr[data-lot="202"] td').eq(3).text(),'non indiqué')}],
 [/^le bilan indique un lot créé, un déjà étudié et un échec pour le lot 203$/,c=>assert.match(c.summary,/1 étude créée.*1 déjà étudié.*1 échec.*lot 203/)],
 [/^l'utilisateur ouvre la page principale sans lien de retour d'import$/,async c=>{c.html=await(await fetch(c.base)).text();c.$=load(c.html)}],
 [/^le bouton Commencer une nouvelle analyse précède le tableau visible et la fenêtre modale est fermée$/,c=>{assert.equal(c.$('#start-analysis:not([hidden])').length,1);assert.equal(c.$('#analysis-modal[hidden][role="dialog"]').length,1);assert.ok(c.html.indexOf('id="start-analysis"')<c.html.indexOf('id="studies"'));assert.equal(c.$('#studies .table-wrap table[aria-label="Tableau des études"]').length,1)}],
 [/^aucun lot en attente ni liste de favoris n'est affiché sur la page principale$/,c=>{assert.equal(c.$('.favorite-batch').length,0);assert.equal(c.$('#sales-workbench').length,0)}],
 [/^le formulaire manuel et l'aide à l'import restent cachés jusqu'au choix de l'utilisateur$/,c=>{assert.equal(c.$('#manual-study[hidden] #study-form').length,1);assert.equal(c.$('#favorite-import[hidden] details:not([open])').length,1);assert.equal(c.$('#analysis-choices[hidden]').length,1)}],
 [/^les lots 201 et 202 favoris de la vente Crédit Municipal sont importés et le lot 201 est déjà étudié$/,async c=>{c.a=[lot(a,201),lot(a,202)];c.snapshot=await pageSnapshot('https://www.interencheres.com/compte/favoris/',c.a);await importSelected(c);const response=await fetch(c.base+'/studies',{method:'POST',redirect:'manual',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({saleUrl:credit,number:'201'})});assert.equal(response.status,303)}],

 [/^l'étude du lot 201 apparaît dans le tableau visible avec un lien vers sa fiche$/,c=>{assert.equal(c.$('#studies .table-wrap table[aria-label="Tableau des études"] tr[data-lot="201"]').length,1);assert.match(c.$('#studies tr[data-lot="201"] a').first().attr('href'),/^\/studies\/[a-f0-9]{64}$/)}],
 [/^aucun accordéon ne masque le tableau des études$/,c=>{assert.equal(c.$('#studies details').length,0);assert.equal(c.$('#studies .table-wrap table[aria-label="Tableau des études"] tbody tr').length,1)}],
 [/^aucun bouton Lancer l'analyse n'apparaît sans lien de retour d'import$/,c=>assert.equal(c.$('button[data-batch-sale]').length,0)],
 [/^la page principale est ouverte sans lien de retour d'import$/,async c=>{c.html=await(await fetch(c.base)).text();c.$=load(c.html);assert.equal(c.$('#start-analysis:not([hidden])').length,1)}],
 [/^l'utilisateur clique sur Commencer une nouvelle analyse$/,async c=>{
  const script=await readFile(new URL('../public/app.js',import.meta.url),'utf8'),handlers={};
  const start={hidden:false,addEventListener:(_name,fn)=>{handlers.click=fn}},choices={hidden:true},modal={hidden:true,focus:()=>{}};
  const document={querySelector:s=>({'#start-analysis':start,'#analysis-modal':modal,'#analysis-choices':choices,'#favorite-import':{hidden:true},'#manual-study':{hidden:true}})[s],querySelectorAll:()=>[]};
  runInNewContext(script,{document,window:{}});handlers.click();c.choicesShown=choices.hidden===false;c.startHidden=start.hidden;c.modalOpened=modal.hidden===false;
 }],
 [/^une fenêtre modale lui propose Importer mes favoris ou Analyser un lot seul$/,c=>{assert.ok(c.modalOpened&&c.choicesShown&&c.startHidden);assert.equal(c.$('#analysis-choices button').length,2);assert.match(c.$('#analysis-choices').text(),/Importer mes favoris.*Analyser un lot seul/)}],
 [/^aucune étude ne démarre par ce seul clic$/,c=>assert.equal(c.studies,0)],
 [/^le lot 202 est identifiable dans une vente Crédit Municipal et n'a pas encore d'étude$/,c=>{c.manualGate=Promise.withResolvers();c.manualStarted=Promise.withResolvers()}],
 [/^l'utilisateur ouvre la fenêtre modale, choisit Analyser un lot seul et lance son étude$/,async c=>{
  c.$=await page(c);
  const script=await readFile(new URL('../public/app.js',import.meta.url),'utf8'),events={};
  const button={disabled:false},sale={value:credit},number={value:'202'},loading={hidden:true},elapsed={textContent:'Temps écoulé : 0 s'},result={hidden:true,textContent:''};
  const detail={hidden:true,href:''},finish={hidden:true,addEventListener:(_type,fn)=>{events.finish=fn},click:()=>events.finish?.()};
  const form={querySelector:s=>({'button[type="submit"]':button,'input[name="saleUrl"]':sale,'input[name="number"]':number})[s],addEventListener:(type,fn)=>{events[type]=fn}};
  const modal={hidden:false,focus:()=>{}},close={disabled:false,addEventListener:()=>{}};
  const document={querySelector:s=>({'#study-form':form,'#analysis-modal':modal,'#close-analysis':close,'#study-loading':loading,'#study-elapsed':elapsed,'#manual-result':result,'#manual-detail':detail,'#manual-finish':finish})[s],querySelectorAll:()=>[]};
  const window={location:{origin:c.base,assign:path=>{c.destination=path}},addEventListener:()=>{}};
  runInNewContext(script,{document,window,URL,URLSearchParams,fetch:(path,options)=>fetch(c.base+path,options),Date:{now:()=>c.now??0},setInterval:fn=>{c.tick=fn;return 1},clearInterval:()=>{}});
  c.manualRunning=events.submit({preventDefault:()=>{}});await c.manualStarted.promise;
  c.manualUI={modal,loading,elapsed,result,detail,finish};
 }],
 [/^le chargement et le temps écoulé restent dans la fenêtre modale pendant la recherche$/,c=>{assert.equal(c.manualUI.modal.hidden,false);assert.equal(c.manualUI.loading.hidden,false);assert.equal(c.manualUI.result.hidden,true);c.now=5000;c.tick();assert.match(c.manualUI.elapsed.textContent,/0 min 5 s/);assert.equal(c.$('#analysis-modal .modal-loading .study-spinner').length,1);c.manualGate.resolve()}],
 [/^une fois l'étude terminée la fenêtre modale indique le résultat avec un lien vers la fiche du lot$/,async c=>{await c.manualRunning;assert.equal(c.manualUI.modal.hidden,false);assert.equal(c.manualUI.result.hidden,false);assert.match(c.manualUI.result.textContent,/Étude terminée/);assert.match(c.manualUI.detail.href,/^\/studies\/[a-f0-9]{64}$/)}],
 [/^le bouton Voir le tableau termine le parcours$/,async c=>{assert.equal(c.manualUI.finish.hidden,false);c.manualUI.finish.click();assert.equal(c.destination,'/');const $=await page(c);assert.equal($('table[aria-label="Tableau des études"] tr[data-lot="202"]').length,1);assert.equal($('tr[data-lot="202"] td').eq(2).text(),'PIAGET')}],
];
export async function runScenario(scenario){
 const c={dir:await mkdtemp(join(tmpdir(),'import001-')),studies:0};
 const server=createServer(createApplication({dataDir:c.dir,listSales:async()=>[{url:credit,date:'2026-12-05',category:'HORLOGERIE'}],study:async({numbers,saleUrl})=>{c.studies++;assert.equal(saleUrl,credit);const number=numbers[0];if(c.manualGate&&number===202){c.manualStarted.resolve();await c.manualGate.promise}return {watches:c.missing203&&number===203?[]:[{number,brand:number===202?'PIAGET':'ROLEX',model:number===202?null:'Datejust',reference:null,saleUrl,source:saleUrl+`lot-${number}/`,box:'absent',bracelet:'acier'}],missing:[]}},compare:async watch=>({lot:watch.number,brand:watch.brand,model:watch.model,reference:watch.reference,asOf:'2026-11-15',credit:{status:'unavailable',average:null,count:0,sales:[]},chrono:{status:'unavailable',average:null,count:0,offers:[]},ceiling:{status:'unavailable',amount:null,reason:'target_fees_unverified'}}),images:async()=>({target:[],credit:{},offers:{}})}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));c.base=`http://127.0.0.1:${server.address().port}`;
 try{for(const step of scenario.steps){const matches=handlers.map(([regex,fn])=>[step.text.match(regex),fn]).filter(([m])=>m);assert.equal(matches.length,1,`Handler unique requis : ${step.text}`);await matches[0][1](c,matches[0][0])}}
 finally{await new Promise(resolve=>server.close(resolve));await rm(c.dir,{recursive:true,force:true})}
}
