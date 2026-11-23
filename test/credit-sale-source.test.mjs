import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectCreditSale} from '../extension/collector.mjs';
const cm='https://www.interencheres.com/art-decoration/horlogerie-692045/';
const json=organizer=>JSON.stringify({'@type':'Event',name:'HORLOGERIE',startDate:'2026-12-05',location:{url:cm.slice(0,-1)},organizer:{url:organizer}});
const official='https://www.interencheres.com/commissaire-priseur/credit-municipal-de-paris-419';
test('browser only attests an official Credit Municipal sale from its dated Event metadata',async()=>{
 const old={document:globalThis.document,fetch:globalThis.fetch,DOMParser:globalThis.DOMParser};let scripts=[];
 try{
  globalThis.document={location:new URL('https://www.interencheres.com/compte/favoris/')};
  globalThis.fetch=async()=>({ok:true,text:async()=>'<event>'});
  globalThis.DOMParser=class{parseFromString(){return {querySelectorAll:()=>scripts.map(textContent=>({textContent}))}}};
  scripts=[json(official)];assert.deepEqual(await inspectCreditSale(cm),{url:cm,organizer:official,date:'2026-12-05',title:'HORLOGERIE'});
  scripts=[json('https://www.interencheres.com/commissaire-priseur/cap-encheres-451')];assert.equal(await inspectCreditSale(cm),null);
  assert.equal(await inspectCreditSale('https://evil.example/lot'),null);
  globalThis.fetch=async()=>({ok:false});assert.equal(await inspectCreditSale(cm),null);
 }finally{Object.assign(globalThis,old)}
});
