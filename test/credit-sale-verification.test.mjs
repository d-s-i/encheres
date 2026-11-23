import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyCreditSale} from '../src/credit-sale.mjs';

const credit='https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/261205000/';
const cm='https://www.interencheres.com/art-decoration/horlogerie-692045/';
const cap='https://www.interencheres.com/art-decoration/belle-vente-de-noel-chez-cap-encheres-689953/';
const sales=[{url:credit,date:'2026-12-05',category:'HORLOGERIE'}];
const evidence=(url=cm,organizer='https://www.interencheres.com/commissaire-priseur/credit-municipal-de-paris-419',date='2026-12-05',title='HORLOGERIE')=>({url,organizer,date,title});

test('only documented Credit Municipal organizer with matching dated catalogue maps to a target sale',()=>{
 assert.equal(verifyCreditSale(evidence(),sales),credit);
 for(const bad of [evidence(cap,'https://www.interencheres.com/commissaire-priseur/cap-encheres-451'),evidence(cm,undefined,'2026-12-04'),evidence(cm,undefined,'2026-12-05','BIJOUX'),evidence(cm,'https://evil.example/419'),{...evidence(),url:'javascript:alert(1)'}])assert.equal(verifyCreditSale(bad,sales),null);
 assert.equal(verifyCreditSale(evidence(),[]),null);
 assert.equal(verifyCreditSale(evidence(),[...sales,{url:credit.replace('261205000','261205001'),date:'2026-12-05',category:'HORLOGERIE'}]),null);
});
