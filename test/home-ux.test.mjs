import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import {home} from '../src/app-view.mjs';

const sale='https://www.interencheres.com/art-decoration/horlogerie-692045/';
const credit='https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/261205000/';
const favorite=n=>({saleUrl:sale,creditSaleUrl:credit,number:n,url:`${sale}lot-${89000000+n}.html`});
const saved=n=>({id:String(n).padStart(64,'0'),watch:{saleUrl:credit,source:credit+`lot-${n}/`},r:{lot:n,brand:'ROLEX',model:'Datejust',asOf:'2026-11-22',chrono:{average:2000,count:2,offers:[]},credit:{average:null,count:0,sales:[]},ceiling:{amount:1677.85}}});

test('home shows one primary new-analysis control and the full study table below it',()=>{
 const $=load(home([saved(201)],[],[favorite(201),favorite(202)]));
 assert.equal($('#start-analysis').text().trim(),'Commencer une nouvelle analyse');
 assert.equal($('#start-analysis:not([hidden])').length,1);
 assert.equal($('#analysis-modal[hidden][role="dialog"][aria-modal="true"]').length,1);
 assert.equal($('#analysis-choices[hidden] button').length,2);
 assert.equal($('#favorite-import[hidden]').length,1);
 assert.equal($('#manual-study[hidden] #study-form').length,1);
 assert.equal($('.favorite-batch').length,0);
 assert.equal($('#studies .table-wrap table[aria-label="Tableau des études"] tbody tr').length,1);
 assert.ok($.html().indexOf('id="new-analysis"')<$.html().indexOf('id="studies"'));
});

test('only the sale just imported offers a single analyze button without pending counters',()=>{
 const $=load(home([saved(201)],[],[favorite(201),favorite(202)],sale));
 assert.equal($('#start-analysis[hidden]').length,1);
 assert.equal($('#analysis-modal:not([hidden]) button[data-batch-sale]').length,1);
 assert.equal($('#analysis-modal button[data-batch-sale]').text().trim(),"Lancer l'analyse");
 assert.equal($('#analysis-modal button[data-batch-sale]').attr('data-batch-lots'),'201,202');
 assert.doesNotMatch($('#analysis-modal').text(),/à étudier|restants|déjà étudiés/);
 assert.equal($('#studies .table-wrap table[aria-label="Tableau des études"] tbody tr').length,1);
 assert.equal(load(home([],[],[favorite(201)],'https://www.interencheres.com/art-decoration/autre-1/'))('button[data-batch-sale]').length,0);
});

test('without imported sale the user chooses between import and a single lot, then sees the table',()=>{
 const $=load(home([],[],[]));
 assert.equal($('#start-analysis:not([hidden])').length,1);
 assert.equal($('#analysis-modal[hidden][role="dialog"]').length,1);
 assert.equal($('#analysis-choices[hidden] button').length,2);
 assert.equal($('#favorite-import[hidden]').length,1);
 assert.equal($('#manual-study[hidden] #study-form').length,1);
 assert.equal($('#studies .table-wrap table[aria-label="Tableau des études"]').length,1);
});
