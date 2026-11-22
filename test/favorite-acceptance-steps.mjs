import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {load} from 'cheerio';
import {createApplication} from '../src/app.mjs';

const a='https://www.interencheres.com/art-decoration/belle-vente-de-noel-chez-cap-encheres-689953/';
const b='https://www.interencheres.com/art-decoration/horlogerie-692045/';
const lot=(sale,number)=>({url:`${sale}lot-${number+89000000}.html`,number});
const exportPage=(lots,source='https://www.interencheres.com/compte/favoris/')=>JSON.stringify({source,lots});
async function post(c,lots,source){
 const headers={'content-type':'application/x-www-form-urlencoded'},payload=exportPage(lots,source);
 const preview=await fetch(c.base+'/favorites/preview',{method:'POST',headers,body:new URLSearchParams({payload})});
 if(preview.status!==200)return preview;
 const $=load(await preview.text()),sale=lots[0].url.replace(/lot-\d+\.html$/,'');
 assert.equal($(`form input[name="saleUrl"][value="${sale}"]`).length,1);
 return fetch(c.base+'/favorites',{method:'POST',redirect:'manual',headers,body:new URLSearchParams({payload,saleUrl:sale})});
}
const rows=($,sale)=>$(`table[aria-label="Favoris importés"] tr[data-favorite-sale="${sale}"]`).map((_,el)=>$(el).text()).get();
const page=async c=>load(await(await fetch(c.base)).text());

const handlers=[
 [/^l'utilisateur est connecté sur le site Interencheres et a mis en favoris les lots 1002 et 1003 de la vente A$/,c=>{c.a=[lot(a,1002),lot(a,1003)]}],
 [/^la vente B contient aussi un lot 1002 mis en favori$/,c=>{c.b=[lot(b,1002)]}],
 [/^l'utilisateur importe les favoris de la vente A dans l'application$/,async c=>{
  const items=c.ambiguous?[lot(a,1002)]:c.pages?c.pages.flat():c.a;
  const source=c.ambiguous?'https://www.interencheres.com/art-decoration/horlogerie-692045?segment=interests':undefined;
  if(c.pages){for(const lots of c.pages){const r=await post(c,lots);assert.equal(r.status,303);if(lots===c.pages[0]){const first=await page(c);assert.match(first('body').text(),/Complétude de l’import non vérifiée/)}}}
  else {const r=await post(c,items,source);assert.equal(r.status,c.ambiguous?422:303)}
  if(c.b)assert.equal((await post(c,c.b)).status,303);
  c.$=await page(c);
 }],
 [/^l'application présente les lots 1002 et 1003 rattachés à la vente A$/,c=>{assert.equal(rows(c.$,a).length,2);for(const n of [1002,1003])assert.ok(rows(c.$,a).some(row=>row.includes(String(n))))}],
 [/^elle ne présente pas le lot 1002 de la vente B parmi les favoris importés de la vente A$/,c=>{assert.equal(rows(c.$,b).length,1);assert.equal(rows(c.$,a).length,2)}],
 [/^aucune étude de prix n'est lancée par cet import$/,c=>{assert.equal(c.studies,0);assert.equal(c.$('table[aria-label="Tableau des études"] tbody tr').length,0)}],
 [/^la vente A affiche le lot 1002 mis en favori et le lot 1004 suivi uniquement par un ordre d'achat$/,c=>{c.a=[lot(a,1002)];c.order=lot(a,1004)}],
 [/^le lot 1002 apparaît parmi les favoris importés de la vente A$/,c=>assert.match(rows(c.$,a).join(' '),/1002/)],
 [/^le lot 1004 n'apparaît pas parmi les favoris importés de la vente A$/,c=>{assert.equal(rows(c.$,a).length,1);assert.doesNotMatch(rows(c.$,a).join(' '),/1004/)}],
 [/^les favoris de la vente A sont répartis sur plusieurs pages du site Interencheres$/,c=>{c.pages=[]}],
 [/^le lot 1002 est sur la première page et le lot 1003 sur une page suivante$/,c=>{c.pages=[[lot(a,1002)],[lot(a,1003)]]}],
 [/^les lots 1002 et 1003 apparaissent parmi les favoris importés de la vente A$/,c=>{assert.equal(rows(c.$,a).length,2);for(const n of [1002,1003])assert.ok(rows(c.$,a).some(row=>row.includes(String(n))))}],
 [/^l'application n'annonce pas un import complet si une page de favoris n'a pas été consultée$/,c=>assert.match(c.$('body').text(),/Complétude de l’import non vérifiée/)],
 [/^la source de la vente A ne permet pas de distinguer un favori d'un lot suivi seulement par un ordre$/,c=>{c.ambiguous=true}],
 [/^l'application n'ajoute aucun lot non identifié comme favori$/,c=>assert.equal(rows(c.$,a).length,0)],
 [/^elle indique que la liste des favoris de cette vente n'a pas pu être vérifiée$/,async c=>{const r=await post(c,[lot(a,1002)],'https://www.interencheres.com/art-decoration/horlogerie-692045?segment=interests');assert.equal(r.status,422);assert.match(await r.text(),/Import de favoris refusé/)}],
 [/^les lots 1002 et 1003 de la vente A ont été importés dans l'application Vercel$/,async c=>{assert.equal((await post(c,[lot(a,1002),lot(a,1003)])).status,303)}],
 [/^une autre personne ouvre l'application Vercel avec son adresse publique$/,async c=>{c.$=await page(c)}],
 [/^elle peut voir les favoris importés 1002 et 1003 de la vente A$/,c=>assert.equal(rows(c.$,a).length,2)],
 [/^elle ne voit aucune étude de prix créée par le seul import$/,c=>{assert.equal(c.studies,0);assert.equal(c.$('table[aria-label="Tableau des études"] tbody tr').length,0)}],
];
export async function runScenario(scenario){
 const c={dir:await mkdtemp(join(tmpdir(),'import001-')),studies:0};
 const server=createServer(createApplication({dataDir:c.dir,listSales:async()=>[],study:async()=>{c.studies++;throw Error('study unexpectedly called')}}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));c.base=`http://127.0.0.1:${server.address().port}`;
 try{for(const step of scenario.steps){const matches=handlers.map(([regex,fn])=>[step.text.match(regex),fn]).filter(([m])=>m);assert.equal(matches.length,1,`Handler unique requis : ${step.text}`);await matches[0][1](c,matches[0][0])}}
 finally{await new Promise(resolve=>server.close(resolve));await rm(c.dir,{recursive:true,force:true})}
}
