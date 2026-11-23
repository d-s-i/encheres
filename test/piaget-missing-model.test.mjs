import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import {extractWatch} from '../src/watch.mjs';
import {compareWatch} from '../src/prices.mjs';
import {searchCreditMunicipal} from '../src/price-credit.mjs';
import {detail,home} from '../src/app-view.mjs';

const saleUrl='https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/261205000/';
const watch=()=>extractWatch({number:202,title:'PIAGET Montre bracelet de forme ronde. Boîtier en',description:'PIAGET Montre bracelet de forme ronde. Boîtier en or jaune. Sans écrin ni papiers.',source:saleUrl+'piagetmontre-bracelet/',saleUrl,estimation:[1000,2000]});

test('official bare-brand title identifies PIAGET without inventing a model',()=>{
 assert.deepEqual([watch().brand,watch().model],['PIAGET',null]);
 assert.equal(extractWatch({number:1,title:'Montre bracelet de forme ronde.',description:'Montre en acier.',source:'x'}).brand,null);
});

test('missing model does not query incomparable auctions or listings and is unavailable, not a source failure',async()=>{
 let searches=0;
 const r=await compareWatch(watch(),{asOf:'2026-11-22',cmSearch:async()=>{searches++;throw Error('must not search')},offerSearch:async()=>{searches++;throw Error('must not search')},targetFeeLookup:async()=>{searches++;throw Error('must not fetch fees')}});
 assert.equal(searches,0);
 assert.deepEqual(await searchCreditMunicipal(watch(),{fetchImpl:()=>{throw Error('must not fetch')}}),[]);
 assert.equal(r.brand,'PIAGET');assert.equal(r.model,null);
 assert.equal(r.credit.status,'unavailable');assert.equal(r.credit.count,0);
 assert.equal(r.chrono.status,'unavailable');assert.equal(r.chrono.average,null);
 assert.equal(r.ceiling.amount,null);
 const record={id:'a'.repeat(64),watch:watch(),r,images:{target:[],credit:{},offers:{}}};
 const overview=load(home([record])),card=load(detail(record));
 assert.equal(overview('tr[data-lot="202"] td').eq(2).text(),'PIAGET');
 assert.equal(overview('tr[data-lot="202"] td').eq(3).text(),'non indiqué');
 assert.match(card('table[aria-label="Tableau d\'analyse du lot"]').text(),/Modèle \/ type\s*non indiqué/);
});
