import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {load} from 'cheerio';
import {home} from '../src/app-view.mjs';

const credit='https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/261205000/';
const sale='https://www.interencheres.com/art-decoration/horlogerie-692045/';
const favorite=(number,verified=true)=>({id:String(number).padStart(64,'0'),saleUrl:sale,number,url:`${sale}lot-${number+89000000}.html`,...(verified?{creditSaleUrl:credit}:{})});

test('only the imported verified Credit Municipal sale receives one analyze button',()=>{
 const favorites=[favorite(221),favorite(268),favorite(999,false)];
 assert.equal(load(home([],[],favorites))('button[data-batch-sale]').length,0);
 const $=load(home([],[],favorites,sale));
 const buttons=$('button[data-batch-sale]');assert.equal(buttons.length,1);
 assert.equal(buttons.attr('data-batch-sale'),credit);
 assert.equal(buttons.attr('data-batch-lots'),'221,268');
 assert.equal(buttons.text().trim(),"Lancer l'analyse");
 assert.equal($('table[aria-label="Favoris importés"]').length,0);
 assert.equal($('button[data-prepare-lot]').length,0);
 assert.equal($('.favorite-batch .batch-progress[hidden] progress[max="2"]').length,1);
 assert.equal($('.favorite-batch .batch-progress .study-spinner[hidden]').length,1);
 assert.equal($('.favorite-batch .batch-progress [data-batch-elapsed][hidden]').length,1);
});

test('batch confirmation submits each lot sequentially, reports duplicate and error, and retains the loading panel until completion',async()=>{
 const script=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const events={},requests=[];let resolveFirst,reloaded=false,confirmation='',now=0,cleared=false;
 const progress={textContent:''},bar={value:0},summary={hidden:true,textContent:''};
 const spinner={hidden:true},elapsed={hidden:true,textContent:''};
 const finish={hidden:true,addEventListener:(_name,fn)=>{events.finish=fn}};
 const panel={hidden:true,querySelector:selector=>({'[data-batch-progress]':progress,progress:bar,'[data-batch-summary]':summary,'[data-batch-finish]':finish,'[data-batch-spinner]':spinner,'[data-batch-elapsed]':elapsed})[selector]};
 const card={querySelector:selector=>selector==='.batch-progress'?panel:undefined};
 const batch={disabled:false,dataset:{batchSale:credit,batchLots:'221,268,343',alreadyStudied:'0'},closest:()=>card,addEventListener:(name,fn)=>{events[name]=fn}};
 const document={querySelector:()=>undefined,querySelectorAll:selector=>selector==='button[data-batch-sale]'?[batch]:[]};
 const window={confirm:message=>{confirmation=message;return true},location:{assign:path=>{reloaded=path==='/'||reloaded}},addEventListener:()=>{}};
 const fetch=async(_url,options)=>{const body=new URLSearchParams(options.body);requests.push([body.get('saleUrl'),Number(body.get('number'))]);if(requests.length===1)return new Promise(resolve=>{resolveFirst=resolve});return {status:requests.length===2?409:422}};
 runInNewContext(script,{document,window,fetch,URLSearchParams,Date:{now:()=>now},setInterval:fn=>{events.tick=fn;return 1},clearInterval:()=>{cleared=true}});
 const ongoing=events.click();await Promise.resolve();
 assert.equal(requests.length,1);assert.equal(panel.hidden,false);assert.equal(batch.disabled,true);assert.match(confirmation,/3 lots/);
 assert.equal(spinner.hidden,false);assert.equal(elapsed.hidden,false);
 now=65000;events.tick();assert.match(elapsed.textContent,/1 min 5 s/);
 resolveFirst({status:200,redirected:true});await ongoing;
 assert.deepEqual(requests,[[credit,221],[credit,268],[credit,343]]);
 assert.match(summary.textContent,/1 étude créée/);assert.match(summary.textContent,/1 déjà étudié/);assert.match(summary.textContent,/1 échec/);
 assert.equal(panel.hidden,false);assert.equal(finish.hidden,false);assert.equal(bar.value,3);
 assert.equal(spinner.hidden,true);assert.equal(cleared,true);
 events.finish();assert.equal(reloaded,true);
});
