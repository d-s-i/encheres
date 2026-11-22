import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {load} from 'cheerio';
import {parseUpcomingSales,upcomingSales} from '../src/upcoming-sales.mjs';
import {createApplication} from '../src/app.mjs';

const root='https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/';
const card=(date,category,href)=>`<div class="columns--2"><div class="card__presentation-left"><time class="card__date" datetime="${date}T14:00"></time><div class="card__title"><h2>${category}</h2></div></div><div class="card__presentation-right">${href?`<a href="${href}">Voir les lots</a>`:'Information'}</div></div>`;
const html=card('2026-11-01','HORLOGERIE',root+'261101000/')+card('2026-12-05','HORLOGERIE',root+'261205000/')+card('2026-12-06','BIJOUX',root+'261206000/')+card('2026-12-08','HORLOGERIE',null)+card('2026-12-09','FAUX','https://evil.example/261209000/')+card('2026-12-10','FAUX',root+'261211000/')+card('2026-12-11','FAUX',root+'ventes-passees/261211000/');

test('only future published official sale catalogues with matching dates are selected',()=>{
 assert.deepEqual(parseUpcomingSales(html,'2026-12-05'),[
  {url:root+'261205000/',category:'HORLOGERIE',date:'2026-12-05'},
  {url:root+'261206000/',category:'BIJOUX',date:'2026-12-06'}]);
});

test('fetch errors are explicit and not replaced by invented sales',async()=>{
 assert.deepEqual(await upcomingSales({today:'2026-12-05',fetchImpl:async()=>({ok:true,url:root,text:async()=>html})}),parseUpcomingSales(html,'2026-12-05'));
 await assert.rejects(upcomingSales({fetchImpl:async()=>({ok:false})}),/indisponible/);
});

async function page(listSales){
 const store={list:async()=>[]};
 const server=createServer(createApplication({store,listSales}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{return await(await fetch(`http://127.0.0.1:${server.address().port}/`)).text()}
 finally{await new Promise(resolve=>server.close(resolve))}
}

test('home offers dated labelled sales while keeping manual URL entry and lot input',async()=>{
 const $=load(await page(async()=>parseUpcomingSales(html,'2026-12-05')));
 assert.equal($('#sale-choice option').eq(1).text(),'Vente horlogerie — 05/12/2026');
 assert.equal($('#sale-choice option').eq(1).val(),root+'261205000/');
 assert.equal($('input[name="saleUrl"][required]').length,1);
 assert.equal($('input[name="number"][required]').length,1);
 assert.equal($('#sale-choice option').length,3);
 const fallback=await page(async()=>{throw Error('offline')});
 assert.match(fallback,/Présélection indisponible/);
 assert.match(fallback,/name="saleUrl"/);
});
