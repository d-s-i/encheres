import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {load} from 'cheerio';
import {createApplication} from '../src/app.mjs';
import {parseFavorites} from '../src/favorites.mjs';

const a='https://www.interencheres.com/art-decoration/horlogerie-692045/';
const b='https://www.interencheres.com/art-decoration/belle-vente-de-noel-chez-cap-encheres-689953/';
const credit='https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/261205000/';
const item=(sale,id,number)=>({url:`${sale}lot-${id}.html`,number});
const payload=(lots,source='https://www.interencheres.com/compte/favoris/')=>JSON.stringify({source,lots});

test('only individually numbered official lot URLs from the dedicated favorites page are accepted',()=>{
 assert.deepEqual(parseFavorites(payload([item(a,11,1002),item(a,12,1003),item(b,13,1002),item(a,11,1002)])).map(x=>[x.saleUrl,x.number]),[[a,1002],[a,1003],[b,1002]]);
 for(const data of [payload([item(a,11,1002)],a+'?segment=interests'),payload([{url:'https://evil.example/lot-11.html',number:1002}]),payload([{url:`${a}lot-11.html`,number:0}]),payload([{url:`${a}lot-11.html?token=secret`,number:1002}]),payload([{url:`${a}lot-11.html`,number:1002},{url:`${a}lot-12.html`,number:'oops'}])])assert.throws(()=>parseFavorites(data));
});

test('application keeps import behind the new-analysis choice and reveals only the selected sale after import',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'extension-view-'));
 const record={...parseFavorites(payload([item(a,11,1002)]))[0],creditSaleUrl:credit};
 const server=createServer(createApplication({dataDir:dir,listSales:async()=>[],favoriteStore:{list:async()=>[record],delete:async id=>id===record.id}}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const $=load(await(await fetch(base)).text());
  assert.equal($('#start-analysis').text().trim(),'Commencer une nouvelle analyse');
  assert.equal($('#new-analysis button[data-batch-sale]').length,0);
  const imported=load(await(await fetch(base+'/?imported='+encodeURIComponent(a))).text());
  assert.match(imported('#favorite-import').text(),/extension Chromium/);
  assert.match(imported('#favorite-import').text(),/chrome:\/\/extensions/);
  assert.equal(imported('#favorite-import details:not([open]) summary').length,1);
  assert.equal(imported('#favorite-import a[href="https://www.interencheres.com/compte/favoris/"]').length,1);
  assert.equal(imported('button[data-batch-sale]').attr('data-batch-lots'),'1002');
  assert.equal(imported('table[aria-label="Favoris importés"]').length,0);
  assert.equal(imported('form[action*="/favorites/"]').length,0);
  assert.equal((await fetch(base+`/favorites/${record.id}/delete`,{method:'POST',redirect:'manual'})).status,303);
 }finally{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true})}
});
