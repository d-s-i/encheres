import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {load} from 'cheerio';
import {createApplication} from '../src/app.mjs';
import {parseFavorites} from '../src/favorites.mjs';
import {captureFavorites,bookmarkletHref} from '../src/favorite-capture.mjs';

const a='https://www.interencheres.com/art-decoration/belle-vente-de-noel-chez-cap-encheres-689953/';
const b='https://www.interencheres.com/art-decoration/horlogerie-692045/';
const item=(sale,id,number)=>({url:`${sale}lot-${id}.html`,number});
const payload=(lots,source='https://www.interencheres.com/compte/favoris/')=>JSON.stringify({source,lots});

test('only individually numbered official lot URLs on dedicated favorites page are imported',()=>{
 assert.deepEqual(parseFavorites(payload([item(a,11,1002),item(a,12,1003),item(b,13,1002),item(a,11,1002)])).map(x=>[x.saleUrl,x.number]),[[a,1002],[a,1003],[b,1002]]);
 for(const data of [payload([item(a,11,1002)],'https://www.interencheres.com/art-decoration/belle-vente-de-noel-chez-cap-encheres-689953?segment=interests'),payload([{url:'https://evil.example/lot-11.html',number:1002}]),payload([{url:`${a}lot-11.html`,number:0}]),payload([{url:`${a}lot-11.html?token=secret`,number:1002}]),payload([{url:`${a}lot-11.html`,number:1002}, {url:`${a}lot-12.html`,number:'oops'}])])assert.throws(()=>parseFavorites(data));
});

test('bookmarklet copies only lot links and numbers on the dedicated favorites page',async()=>{
 const originalAlert=globalThis.alert,originalNavigator=globalThis.navigator;
 const messages=[];let copied;
 try{
  globalThis.alert=message=>messages.push(message);
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async text=>{copied=text}}}});
  const doc={location:new URL('https://www.interencheres.com/compte/favoris/'),querySelectorAll:()=>[
   {getAttribute:()=>`${a}lot-11.html`,textContent:'Lot 1002 ROLEX'},
   {getAttribute:()=>`${a}lot-12.html`,textContent:'Lot 1003'},
   {getAttribute:()=>`${b}lot-13.html`,textContent:'Lot 152'}]};
  captureFavorites(doc);
  await Promise.resolve();
  assert.deepEqual(JSON.parse(copied),{source:'https://www.interencheres.com/compte/favoris/',lots:[item(a,11,1002),item(a,12,1003),item(b,13,152)]});
  assert.match(decodeURIComponent(bookmarkletHref()),/captureFavorites|function captureFavorites/);
  copied=null;captureFavorites({...doc,location:new URL(a+'?segment=interests')});
  assert.equal(copied,null);assert.match(messages.at(-1),/Mon compte > Favoris/);
  copied=null;captureFavorites({...doc,querySelectorAll:()=>[{getAttribute:()=>`${a}lot-11.html`,textContent:'Aucun numéro'}]});
  assert.equal(copied,null);assert.match(messages.at(-1),/Rien n’a été copié/);
 }finally{globalThis.alert=originalAlert;Object.defineProperty(globalThis,'navigator',{configurable:true,value:originalNavigator})}
});

async function withApp(fn){
 const dir=await mkdtemp(join(tmpdir(),'favorites-test-'));
 const handler=createApplication({dataDir:dir,listSales:async()=>[],study:async()=>{throw Error('study must not run')},compare:async()=>{throw Error('compare must not run')}});
 const server=createServer(handler);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 try{await fn(base)}finally{await new Promise(resolve=>server.close(resolve));await rm(dir,{force:true,recursive:true})}
}
async function submit(base,data,sale){
 const headers={'content-type':'application/x-www-form-urlencoded'};
 const preview=await fetch(base+'/favorites/preview',{method:'POST',headers,body:new URLSearchParams({payload:data})});
 if(preview.status!==200)return preview;
 const $=load(await preview.text());
 const form=$(`form input[name="saleUrl"][value="${sale}"]`).closest('form');
 assert.equal(form.length,1);assert.match(form.text(),/Importer cette vente/);
 return fetch(base+'/favorites',{method:'POST',headers,redirect:'manual',body:new URLSearchParams({payload:form.find('textarea[name="payload"]').val(),saleUrl:sale})});
}

test('user import keeps favorites by sale separate from saved studies and merges subsequent pages',async()=>{
 await withApp(async base=>{
  const both=payload([item(a,11,1002),item(b,13,1002)]);
  assert.equal((await submit(base,both,a)).status,303);
  assert.equal(load(await(await fetch(base)).text())(`tr[data-favorite-sale="${b}"]`).length,0);
  assert.equal((await submit(base,both,b)).status,303);
  assert.equal((await submit(base,payload([item(a,12,1003),item(a,11,1002)]),a)).status,303);
  const page=await(await fetch(base)).text(),$=load(page);
  assert.equal($('table[aria-label="Favoris importés"] tbody tr').length,3);
  assert.equal($(`tr[data-favorite-sale="${a}"]`).length,2);
  assert.equal($(`tr[data-favorite-sale="${b}"]`).length,1);
  assert.equal($('table[aria-label="Tableau des études"] tbody tr').length,0);
  assert.match(page,/complétude.*non vérifiée/i);
  assert.equal((await submit(base,payload([item(a,11,1002)],'https://www.interencheres.com/art-decoration/horlogerie-692045?segment=interests'),a)).status,422);
  const action=$('tr[data-favorite-sale] form').first().attr('action');
  assert.equal((await fetch(base+action,{method:'POST',redirect:'manual'})).status,303);
  assert.equal(load(await(await fetch(base)).text())('table[aria-label="Favoris importés"] tbody tr').length,2);
 });
});
