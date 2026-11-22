import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runInNewContext} from 'node:vm';
import {createApplication} from '../src/app.mjs';
import {compareWatch} from '../src/prices.mjs';

const root='https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/';
const sale26=root+'261205000/',sale21=root+'ventes-passees/210605000/';
const target=sale26+'tag-heuer-monaco/',target21=sale21+'tag-heuer-carrera/';
const credit=root+'ventes-passees/240615000/tag-heuer-monaco/',other=root+'ventes-passees/220611000/tag-heuer-carrera/';
const catalogue='https://www.creditmunicipal.fr/app/uploads/sales/261205000/generate-catalogue-261205000.pdf';
const dated='https://serret-portier-expertises.com/wp-content/uploads/2021/05/Catalogue-Bijoux-Montres-juin2024_bdef_web.pdf';
const photo26='https://www.creditmunicipal.fr/app/uploads/sales/261205000/images/268-1.jpg';
const photo24='https://www.creditmunicipal.fr/app/uploads/sales/240615000/images/246-1.jpg';
const photo22='https://www.creditmunicipal.fr/app/uploads/sales/220611000/images/368-1.jpg';
const photo21='https://www.creditmunicipal.fr/app/uploads/sales/210605000/images/318-1.jpg';
const pic=id=>`https://img.chrono24.com/images/uhren/${id}.jpg`;
const watch26={number:268,brand:'TAG HEUER',model:'Monaco',reference:'CAW2111',box:'absent',bracelet:'cuir',estimation:[1500,2000],source:target,saleUrl:sale26,description:'TAG HEUER Monaco chronographe calibre 12. Référence CAW2111.'};
const watch21={number:318,brand:'TAG HEUER',model:'Carrera',reference:'CV2010-3',box:'absent',bracelet:'caoutchouc',estimation:[600,800],source:target21,saleUrl:sale21,description:'Carrera chronographe Calibre 16 CV2010-3.'};
const historic26={number:246,date:'2024-06-15',url:credit,brand:'TAG HEUER',model:'Monaco',reference:'CW2113-0',description:'Monaco chronographe avec deux sous-compteurs.',hammerPrice:3700,box:'absent',bracelet:'acier'};
const historic21=[{...historic26,number:368,date:'2022-06-11',url:other,model:'Carrera',reference:'CV2010-2',description:'Carrera Calibre 16 chronographe',hammerPrice:1650},{...historic26,number:288,model:'Carrera',reference:'CV2010-4',description:'Carrera Calibre 16 chronographe',hammerPrice:1900}];
const euro=s=>Number(s.replace(/[ \u202f\u00a0]/g,'').replace(',','.'));
const content=(ctx)=>ctx.page??'';
async function launch(ctx,number=ctx.number??268,sale=ctx.sale??sale26){
 const dir=await mkdtemp(join(tmpdir(),'app001-accept-'));
 const study=async({saleUrl,numbers})=>{assert.equal(saleUrl,sale);assert.deepEqual(numbers,[number]);return {watches:number===99999?[]:[ctx.watch??watch26],missing:number===99999?[99999]:[]}};
 const compare=async(w,{asOf})=>compareWatch(w,{asOf,cmSearch:async()=>ctx.historical??[historic26],feeLookup:async s=>ctx.unknownFees?null:s.date==='2024-06-15'?{buyerPercent:18,livePercent:0,source:dated}:null,offerSearch:async()=>{if(ctx.blocked)throw Error('Packet inaccessible (426)');return ctx.offers??[]},targetFeeLookup:async()=>({buyerPercent:18,livePercent:1.2,source:catalogue})});
 const images=async(w,r)=>({target:ctx.noPhoto?[]:[w.source===target?photo26:photo21],credit:Object.fromEntries(r.credit.sales.map(s=>[s.url,ctx.noPhoto&&s.url===credit?[]:[s.url===other?photo22:photo24]])),offers:Object.fromEntries(r.chrono.offers.map(o=>[o.url,ctx.noPhoto&&o.id===1?[]:[pic(o.id)]]))});
 const server=await new Promise(resolve=>{const s=createServer(createApplication({dataDir:dir,study,compare,images,listSales:async()=>[],asOf:()=>ctx.asOf??'2026-11-15'}));s.listen(0,'127.0.0.1',()=>resolve(s))});
 const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const home=await(await fetch(base)).text();assert.match(home,/name="saleUrl"/);assert.match(home,/name="number"/);
  const reply=await fetch(base+'/studies',{method:'POST',redirect:'manual',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({saleUrl:sale,number:String(number)})});
  ctx.status=reply.status;ctx.page=reply.status===303?await(await fetch(new URL(reply.headers.get('location'),base))).text():await reply.text();
  ctx.list=await(await fetch(base)).text();
  if(ctx.imageFails)ctx.browserScript=await(await fetch(base+'/app.js')).text();
 }finally{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true})}
}
const offer=(id,price,model='Monaco Calibre 12')=>({id,price,currency:'EUR',sellerCountry:'FR',available:true,brand:'TAG Heuer',model,reference:'CAW2111',condition:'Très bon',url:`https://www.chrono24.fr/tagheuer/monaco--id${id}.htm`,images:[pic(id)],box:'présent',bracelet:'acier'});
const has=(ctx,...values)=>values.forEach(v=>assert.ok(content(ctx).includes(v),`Absent ${v}`));
const handlers=[
 [/^la vente du (\d+) décembre (\d{4}) contient le lot (\d+) TAG Heuer Monaco CAW2111$/, (c,m)=>{assert.equal(`${m[2]}-12-${m[1].padStart(2,'0')}`,'2026-12-05');c.number=Number(m[3]);assert.equal(c.number,268);c.sale=sale26;c.watch=watch26;}],
 [/^sa fiche, ses photos et les conditions datées de la vente sont consultables$/,c=>{assert.equal(c.watch.source,target);assert.ok(photo26.includes('/268-1.jpg'));}],
 [/^deux annonces comparables de vendeurs français sont vérifiées à ([\d ]+) € et ([\d ]+) € hors port$/, (c,m)=>{c.offers=[offer(1,euro(m[1])),offer(2,euro(m[2]))];c.offers.sample={inspectedPages:3,inspectedListings:150,totalPages:24,totalListings:1195};assert.equal(c.offers.length,2);}],
 [/^une adjudication historique comparable de (\d{4}) est vérifiée à ([\d ]+) € hors frais avec (\d+) % de frais et aucune majoration live$/, (c,m)=>{assert.equal(m[1],historic26.date.slice(0,4));assert.equal(euro(m[2]),historic26.hammerPrice);assert.equal(Number(m[3]),18);c.historical=[historic26];}],
 [/^l'utilisateur saisit le lien de cette vente et le numéro du lot indiqué dans le formulaire puis lance l'étude$/,async c=>launch(c)],
 [/^un tableau sauvegardé identifie la vente, le lot, la marque, le modèle, la boîte, le bracelet et l'estimation lorsqu'elle est publiée$/,c=>{assert.equal(c.status,303);has(c,'Lot 268','TAG HEUER','Monaco','CAW2111','Boîte / écrin','Bracelet','Estimation',sale26);assert.match(c.list,/Lot 268/);}],
 [/^la photo disponible du lot étudié apparaît au-dessus du tableau avec le lien de sa fiche source$/,c=>{has(c,photo26,target);assert.ok(c.page.indexOf(photo26)<c.page.indexOf('<table'));}],
 [/^le tableau distingue la moyenne partielle Chrono24 de ([\d ]+) € sur (\d+) prix demandés hors port, l'adjudication historique de ([\d ]+) € et son coût vérifié de ([\d ]+) € avec la date et les liens sources$/, (c,m)=>{assert.equal((euro(m[3])*1.18),euro(m[4]));has(c,euro(m[1]).toLocaleString('fr-FR'),`${m[2]} annonces`,'moyenne partielle','prix demandés',historic26.date,credit,dated);assert.equal(c.offers.length,Number(m[2]));}],
 [/^le prix à ne pas dépasser est de ([\d ]+,\d{2}) € hors frais sur la base des taux vérifiés de la vente ciblée$/, (c,m)=>{has(c,euro(m[1]).toLocaleString('fr-FR',{minimumFractionDigits:2}),'hors frais',catalogue);}],
 [/^la date d'analyse, les différences observées entre le lot et les comparables et la limite de couverture des annonces sont visibles$/,c=>{has(c,'2026-11-15','différences :','150 annonces','1195 résultats','échantillon des trois premières pages');}],
 [/^une analyse du lot (\d+) présente une adjudication historique et deux annonces Chrono24 comparables$/, (c,m)=>{assert.equal(Number(m[1]),268);c.offers=[offer(1,4100),offer(2,4590)];}],
 [/^la fiche de chaque comparable fournit au moins une photo accessible$/,c=>{assert.equal(c.offers.length,2);assert.ok(photo24&&pic(1)&&pic(2));}],
 [/^l'utilisateur ouvre le tableau de cette analyse$/,async c=>launch(c)],
 [/^une fiche pour chacun de ces trois comparables apparaît sous le tableau avec ses photos accessibles et son lien source$/,c=>{assert.equal((c.page.match(/class="comparable"/g)||[]).length,3);has(c,photo24,pic(1),pic(2),credit,c.offers[0].url,c.offers[1].url);assert.ok(c.page.indexOf(photo24)>c.page.indexOf('</table>'));}],
 [/^la fiche historique indique sa date, son adjudication et ses frais vérifiés ou non vérifiés$/,c=>has(c,historic26.date,'3 700','frais vérifiés')],
 [/^les deux fiches Chrono24 indiquent des prix demandés hors port et ne sont pas présentées comme des ventes conclues$/,c=>{has(c,'Annonce Chrono24 · prix demandé','hors port');assert.doesNotMatch(c.page,/vente conclue/);}],
 [/^les annonces simplement inspectées mais non retenues ne sont pas présentées comme des comparables du tableau$/,c=>{assert.equal((c.page.match(/class="comparable"/g)||[]).length,3);assert.doesNotMatch(c.page,/id999\.htm/);}],
 [/^une étude sauvegardée possède une photo du lot et une photo pour chaque comparable présenté$/,c=>{c.offers=[offer(1,4100),offer(2,4590)];assert.ok(photo26&&photo24);}],
 [/^la photo du lot et celle d'un comparable ne sont plus accessibles$/,c=>{c.imageFails=true;}],
 [/^l'utilisateur rouvre cette étude$/,async c=>{
  await launch(c);
  const node=broken=>({complete:true,naturalWidth:broken?0:100,hidden:false,nextElementSibling:{hidden:true},addEventListener(){}});
  c.browserImages=[node(true),node(true),node(false)];
  runInNewContext(c.browserScript,{document:{querySelectorAll:()=>c.browserImages}});
 }],
 [/^le tableau, les prix sauvegardés et les liens vers les fiches sources restent visibles$/,c=>has(c,'4 345',credit,target,c.offers[0].url,photo26,pic(1))],
 [/^les deux emplacements concernés indiquent une image indisponible sans afficher une image d'un autre lot$/,c=>{assert.ok((c.page.match(/Image indisponible/g)||[]).length>=2);assert.ok(c.browserImages.slice(0,2).every(img=>img.hidden&&img.nextElementSibling.hidden===false));assert.ok(!c.page.includes('wrong-lot.jpg'));}],
 [/^les photos toujours accessibles des autres comparables restent visibles$/,c=>{has(c,pic(2));assert.equal(c.browserImages[2].hidden,false);}],
 [/^la vente et le lot (\d+) sont vérifiables avec un comparable historique dont les frais sont inconnus$/, (c,m)=>{c.number=Number(m[1]);c.watch=watch26;c.sale=sale26;c.unknownFees=true;}],
 [/^la source des annonces Chrono24 refuse l'accès au moment de l'analyse$/,c=>{c.blocked=true;}],
 [/^l'utilisateur lance l'étude depuis le formulaire$/,async c=>launch(c)],
 [/^le tableau du lot est sauvegardé avec son adjudication historique brute et son coût en ligne non vérifié$/,c=>{assert.equal(c.status,303);has(c,'3 700','coût en ligne non vérifié',credit);assert.match(c.list,/Lot 268/);}],
 [/^la moyenne Chrono24 et le prix à ne pas dépasser sont indiqués comme non vérifiables faute d'accès$/,c=>has(c,'non vérifiable : accès empêché','non vérifiable : accès à Chrono24 impossible')],
 [/^aucun zéro ou tarif supposé ne remplace ces montants indisponibles$/,c=>assert.doesNotMatch(c.page,/Prix à ne pas dépasser — hors frais<\/th><td colspan="3">0 €/)],
 [/^aucune étude n'existe pour une vente donnée et le numéro de lot (\d+)$/, (c,m)=>{c.number=Number(m[1]);c.sale=sale26;}],
 [/^ce lot n'est pas dans cette vente accessible$/,c=>assert.equal(c.number,99999)],
 [/^l'application indique que le lot est introuvable dans cette vente$/,c=>{assert.equal(c.status,422);has(c,'Lot introuvable dans cette vente');}],
 [/^aucun tableau ni ligne sauvegardée n'est créé pour ce lot$/,c=>{assert.doesNotMatch(c.list,/Lot 99999/);assert.doesNotMatch(c.page,/<table/);}],
 [/^le lot (\d+) Carrera de la vente du (\d+) juin (\d{4}) est identifiable$/, (c,m)=>{c.number=Number(m[1]);assert.equal(c.number,318);assert.equal(`${m[3]}-06-${m[2].padStart(2,'0')}`,'2021-06-05');c.sale=sale21;c.watch=watch21;c.asOf='2026-11-11';}],
 [/^deux comparables historiques sont adjugés à ([\d ]+) € le (\d+) juin (\d{4}) et ([\d ]+) € le (\d+) juin (\d{4})$/, (c,m)=>{assert.equal(euro(m[1]),historic21[0].hammerPrice);assert.equal(`${m[3]}-06-${m[2].padStart(2,'0')}`,historic21[0].date);assert.equal(euro(m[4]),historic21[1].hammerPrice);assert.equal(`${m[6]}-06-${m[5].padStart(2,'0')}`,historic21[1].date);c.historical=historic21;}],
 [/^seul le catalogue de la vente de (\d{4}) vérifie un coût en ligne de ([\d ]+) € pour son lot comparable$/, (c,m)=>{assert.equal(m[1],'2024');assert.equal(euro(m[2]),Math.round(historic21[1].hammerPrice*1.18));}],
 [/^l'utilisateur étudie le lot (\d+) depuis le formulaire$/,async(c,m)=>{assert.equal(Number(m[1]),c.number);await launch(c,c.number,c.sale)}],
 [/^le tableau présente séparément les deux adjudications avec leur date, leur montant hors frais et leur lien source$/,c=>{assert.equal(c.status,303);has(c,historic21[0].date,historic21[1].date,other,credit,'1 650','1 900');}],
 [/^le coût de (\d{4}) est non vérifié tandis que le coût de (\d{4}) est de ([\d ]+) € frais compris$/, (c,m)=>{assert.equal(m[1],'2022');assert.equal(m[2],'2024');has(c,'coût en ligne non vérifié','2 242 € frais compris');assert.equal(euro(m[3]),2242);}],
 [/^la moyenne des coûts en ligne vérifiés compte une seule vente et vaut ([\d ]+) €$/, (c,m)=>{has(c,'Moyenne des coûts en ligne vérifiés : 2 242 € (1 vente');assert.equal(euro(m[1]),2242);}],
 [/^les fiches des deux ventes historiques et leurs photos accessibles apparaissent sous le tableau$/,c=>{has(c,photo22,photo24);assert.equal((c.page.match(/class="comparable"/g)||[]).length,2);assert.ok(c.page.indexOf(photo22)>c.page.indexOf('</table>'));}],
];
export {sale26,watch26,historic26,offer,credit,dated,catalogue,photo26};
export async function runScenario(scenario){
 const ctx={offers:[],historical:[historic26],number:268,sale:sale26,watch:watch26};
 for(const step of scenario.steps){
  const matches=handlers.map(([pattern,fn])=>[step.text.match(pattern),fn]).filter(([m])=>m);
  assert.equal(matches.length,1,`Handler unique attendu pour ${scenario.name}: ${step.text}`);
  try{await matches[0][1](ctx,matches[0][0])}catch(e){e.message=`${scenario.name}: ${step.text}: ${e.message}`;throw e}
 }
}
