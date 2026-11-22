import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {load} from 'cheerio';
import {createApplication} from '../src/app.mjs';
import {collectFavoritePage} from '../extension/collector.mjs';

const a='https://www.interencheres.com/art-decoration/belle-vente-de-noel-chez-cap-encheres-689953/';
const b='https://www.interencheres.com/art-decoration/horlogerie-693921/';
const lot=(sale,number)=>({url:`${sale}lot-${number+89000000}.html`,number});
const extensionOrigin='chrome-extension://abcdefghijklmnopabcdefghijklmnop';
const rows=($,sale)=>$(`table[aria-label="Favoris importés"] tr[data-favorite-sale="${sale}"]`).map((_,el)=>$(el).text()).get();
const page=async c=>load(await(await fetch(c.base)).text());
async function pageSnapshot(url,lots,nextLots=null){
 const previous={document:globalThis.document,fetch:globalThis.fetch,DOMParser:globalThis.DOMParser};
 const doc=(items,next=null)=>({location:new URL(url),querySelectorAll:()=>items.map(item=>({getAttribute:()=>item.url,textContent:`Lot ${item.number} — montre`})),querySelector:()=>next?{getAttribute:()=>'?page=2'}:null});
 try{
  globalThis.document=doc(lots,nextLots);
  if(nextLots){globalThis.fetch=async()=>({ok:true,text:async()=>'<next-page>'});globalThis.DOMParser=class{parseFromString(){return doc(nextLots)}}}
  return await collectFavoritePage();
 }finally{Object.assign(globalThis,previous)}
}
async function importSelected(c){
 const selected=c.snapshot.sales.find(s=>s.saleUrl===a);
 assert.ok(selected,'La vente A doit être proposée par l’extension');
 const r=await fetch(c.base+'/favorites/from-extension',{method:'POST',headers:{Origin:extensionOrigin,'content-type':'application/json'},body:JSON.stringify({source:c.snapshot.source,saleUrl:selected.saleUrl,lots:selected.lots})});
 assert.equal(r.status,200);
 c.$=await page(c);
}
const handlers=[
 [/^l'utilisateur est connecté sur le site Interencheres et a mis en favoris les lots 1002 et 1003 de la vente A$/,c=>{c.a=[lot(a,1002),lot(a,1003)]}],
 [/^la vente B contient aussi un lot 1002 mis en favori$/,c=>{c.b=[lot(b,1002)]}],
 [/^l'utilisateur choisit la vente A dans l'extension depuis la page Favoris et lance l'import direct$/,async c=>{
  c.snapshot=await pageSnapshot('https://www.interencheres.com/compte/favoris/',c.pages?c.pages[0]:[...c.a,...(c.b??[])],c.pages?.[1]);
  assert.equal(c.snapshot.ok,true);await importSelected(c);
 }],
 [/^l'application présente les lots 1002 et 1003 rattachés à la vente A$/,c=>{assert.equal(rows(c.$,a).length,2);for(const n of [1002,1003])assert.ok(rows(c.$,a).some(row=>row.includes(String(n))))}],
 [/^elle ne présente pas le lot 1002 de la vente B parmi les favoris importés de la vente A$/,c=>{assert.equal(rows(c.$,b).length,0);assert.equal(rows(c.$,a).length,2)}],
 [/^aucune étude de prix n'est lancée par cet import$/,c=>{assert.equal(c.studies,0);assert.equal(c.$('table[aria-label="Tableau des études"] tbody tr').length,0)}],
 [/^aucun raccourci javascript ou collage manuel de liste n'est nécessaire$/,c=>{assert.equal(c.$('#favorite-import textarea').length,0);assert.doesNotMatch(c.$('#favorite-import').text(),/copier le code|collez le résultat/i)}],
 [/^la vente A affiche le lot 1002 mis en favori et le lot 1004 suivi uniquement par un ordre d'achat$/,c=>{c.a=[lot(a,1002)];c.order=lot(a,1004)}],
 [/^le lot 1002 apparaît parmi les favoris importés de la vente A$/,c=>assert.match(rows(c.$,a).join(' '),/1002/)],
 [/^le lot 1004 n'apparaît pas parmi les favoris importés de la vente A$/,c=>{assert.equal(rows(c.$,a).length,1);assert.doesNotMatch(rows(c.$,a).join(' '),/1004/)}],
 [/^les favoris de la vente A sont répartis sur plusieurs pages du site Interencheres$/,c=>{c.pages=[]}],
 [/^le lot 1002 est sur la première page et le lot 1003 sur une page suivante$/,c=>{c.pages=[[lot(a,1002)],[lot(a,1003)]]}],
 [/^les lots 1002 et 1003 apparaissent parmi les favoris importés de la vente A$/,c=>{assert.equal(rows(c.$,a).length,2);for(const n of [1002,1003])assert.ok(rows(c.$,a).some(row=>row.includes(String(n))))}],
 [/^l'application n'annonce pas un import complet si une page de favoris n'a pas été consultée$/,c=>assert.match(c.$('body').text(),/Complétude de l’import non vérifiée/)],
 [/^la source de la vente A ne permet pas de distinguer un favori d'un lot suivi seulement par un ordre$/,c=>{c.ambiguous=true}],
 [/^l'utilisateur tente d'importer la vente A par l'extension depuis cette source ambiguë$/,async c=>{c.snapshot=await pageSnapshot(a+'?segment=interests',[lot(a,1002)]);assert.equal(c.snapshot.ok,false);c.$=await page(c)}],
 [/^l'application n'ajoute aucun lot non identifié comme favori$/,c=>assert.equal(rows(c.$,a).length,0)],
 [/^elle indique que la liste des favoris de cette vente n'a pas pu être vérifiée$/,c=>assert.match(c.snapshot.error,/ne convient pas/)],
 [/^les lots 1002 et 1003 de la vente A ont été importés dans l'application Vercel$/,async c=>{c.a=[lot(a,1002),lot(a,1003)];c.snapshot=await pageSnapshot('https://www.interencheres.com/compte/favoris/',c.a);await importSelected(c)}],
 [/^une autre personne ouvre l'application Vercel avec son adresse publique$/,async c=>{c.$=await page(c)}],
 [/^elle peut voir les favoris importés 1002 et 1003 de la vente A$/,c=>assert.equal(rows(c.$,a).length,2)],
 [/^elle ne voit aucune étude de prix créée par le seul import$/,c=>{assert.equal(c.studies,0);assert.equal(c.$('table[aria-label="Tableau des études"] tbody tr').length,0)}],
 [/^le dossier de l'extension est disponible sur la machine et Chromium est installé$/,async c=>{c.manifest=JSON.parse(await readFile(new URL('../extension/manifest.json',import.meta.url),'utf8'));assert.equal(c.manifest.manifest_version,3)}],
 [/^l'utilisateur charge ce dossier comme extension non empaquetée dans Chromium$/,c=>{assert.equal(c.manifest.action.default_popup,'popup.html')}],
 [/^il ouvre la page Favoris de son compte Interencheres$/,async c=>{c.snapshot=await pageSnapshot('https://www.interencheres.com/compte/favoris/',[lot(a,1002),lot(b,152)]);assert.equal(c.snapshot.ok,true)}],
 [/^l'extension est disponible dans son navigateur et présente les ventes de ses favoris$/,c=>assert.deepEqual(c.snapshot.sales.map(s=>s.saleUrl),[a,b])],
 [/^la sélection d'une vente seule n'importe encore aucun lot$/,async c=>{c.$=await page(c);assert.equal(c.$('table[aria-label="Favoris importés"] tbody tr').length,0)}],
];
export async function runScenario(scenario){
 const c={dir:await mkdtemp(join(tmpdir(),'import001-')),studies:0};
 const server=createServer(createApplication({dataDir:c.dir,listSales:async()=>[],study:async()=>{c.studies++;throw Error('study unexpectedly called')}}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));c.base=`http://127.0.0.1:${server.address().port}`;
 try{for(const step of scenario.steps){const matches=handlers.map(([regex,fn])=>[step.text.match(regex),fn]).filter(([m])=>m);assert.equal(matches.length,1,`Handler unique requis : ${step.text}`);await matches[0][1](c,matches[0][0])}}
 finally{await new Promise(resolve=>server.close(resolve));await rm(c.dir,{recursive:true,force:true})}
}
