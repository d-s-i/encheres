import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {load} from 'cheerio';
import {createApplication} from '../src/app.mjs';
import {fileStudyStore} from '../src/study-store.mjs';
import {parseFavorites} from '../src/favorites.mjs';
import {collectFavoritePage} from '../extension/collector.mjs';
import {applicationOrigin,permissionPattern,VERCEL_APP_URL,LOCAL_APP_URL} from '../extension/target.mjs';

const a='https://www.interencheres.com/art-decoration/horlogerie-692045/';
const b='https://www.interencheres.com/art-decoration/belle-vente-de-noel-chez-cap-encheres-689953/';
const credit='https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/261205000/';
const evidence=(saleUrl,organizer='https://www.interencheres.com/commissaire-priseur/credit-municipal-de-paris-419')=>({url:saleUrl,organizer,date:'2026-12-05',title:'HORLOGERIE'});
const lot=(sale,id,number)=>({url:`${sale}lot-${id}.html`,number});
const nodes=values=>values.map(({url,number})=>({getAttribute:()=>url,textContent:`Lot ${number} — Montre`}));
const fixture=(url,lots,next=null)=>({location:new URL(url),querySelectorAll:()=>nodes(lots),querySelector:()=>next?{getAttribute:()=>next}:null});

test('extension only collects dedicated favorites page, groups by sale and refuses ambiguous items',async()=>{
 const doc=globalThis.document;
 try{
  globalThis.document=fixture('https://www.interencheres.com/compte/favoris/',[lot(a,11,1002),lot(a,12,1003),lot(b,13,152)]);
  const result=await collectFavoritePage();
  assert.equal(result.ok,true);assert.deepEqual(result.sales.map(s=>[s.saleUrl,s.lots.map(l=>l.number)]),[[a,[1002,1003]],[b,[152]]]);
  assert.equal(result.complete,false);
  globalThis.document=fixture(a+'?segment=interests',[lot(a,11,1002)]);
  assert.equal((await collectFavoritePage()).ok,false);
  globalThis.document=fixture('https://www.interencheres.com/compte/favoris/',[{url:a+'lot-11.html',number:'inconnu'}]);
  assert.equal((await collectFavoritePage()).ok,false);
 }finally{globalThis.document=doc}
});

test('extension follows an official next-page link but refuses foreign or unreadable pages',async()=>{
 const old={document:globalThis.document,fetch:globalThis.fetch,DOMParser:globalThis.DOMParser};
 try{
  globalThis.document=fixture('https://www.interencheres.com/compte/favoris/',[lot(a,11,1002)],'?page=2');
  globalThis.fetch=async()=>({ok:true,text:async()=>'<page-two>'});
  globalThis.DOMParser=class{parseFromString(){return fixture('https://www.interencheres.com/compte/favoris/?page=2',[lot(a,12,1003)])}};
  const result=await collectFavoritePage();assert.equal(result.ok,true);assert.deepEqual(result.sales[0].lots.map(x=>x.number),[1002,1003]);
  globalThis.document=fixture('https://www.interencheres.com/compte/favoris/',[lot(a,11,1002)],'https://evil.example/page');
  assert.equal((await collectFavoritePage()).ok,false);
  globalThis.document=fixture('https://www.interencheres.com/compte/favoris/',[lot(a,11,1002)],'?page=2');
  globalThis.fetch=async()=>({ok:false});assert.equal((await collectFavoritePage()).ok,false);
 }finally{Object.assign(globalThis,old)}
});

test('extension targets only the configured Vercel deployment or local test app',()=>{
 assert.equal(VERCEL_APP_URL,'https://encheres-kohl.vercel.app/');
 assert.equal(LOCAL_APP_URL,'http://127.0.0.1:3000/');
 assert.equal(applicationOrigin(VERCEL_APP_URL),'https://encheres-kohl.vercel.app');
 assert.equal(permissionPattern('https://encheres-kohl.vercel.app'),'https://encheres-kohl.vercel.app/*');
 assert.equal(applicationOrigin(LOCAL_APP_URL),'http://127.0.0.1:3000');
 assert.equal(permissionPattern('http://127.0.0.1:3000'),'http://127.0.0.1/*');
 for(const value of ['https://attacker.example/','https://other.vercel.app/','http://encheres-kohl.vercel.app/','https://encheres-kohl.vercel.app/path','https://user:pass@encheres-kohl.vercel.app/'])assert.throws(()=>applicationOrigin(value));
});

test('manifest restricts source access to an active tab and target permission is requested explicitly',async()=>{
 const manifest=JSON.parse(await readFile('extension/manifest.json','utf8'));
 assert.equal(manifest.manifest_version,3);
 assert.ok(manifest.permissions.includes('activeTab'));
 assert.ok(manifest.permissions.includes('scripting'));
 assert.ok(!manifest.host_permissions?.some(x=>x.includes('interencheres.com')));
 assert.deepEqual(manifest.optional_host_permissions,['https://encheres-kohl.vercel.app/*','http://127.0.0.1/*']);
 assert.ok(!manifest.permissions.includes('storage'));
 assert.equal(manifest.action.default_popup,'popup.html');
 const popup=await readFile('extension/popup.html','utf8');
 assert.match(popup,/value="https:\/\/encheres-kohl\.vercel\.app\/"/);
 assert.match(popup,/value="http:\/\/127\.0\.0\.1:3000\/"/);
 assert.match(popup,/id="popup-spinner"/);
 assert.match(popup,/id="source-status" role="status" aria-live="polite"/);
 const popupScript=await readFile('extension/popup.mjs','utf8');
 assert.match(popupScript,/chrome\.tabs\.create/);
 assert.match(popupScript,/encodeURIComponent\(sale\.saleUrl\)/);
 assert.match(popupScript,/Vérification de la vente/);
 assert.match(popupScript,/Envoi des \$\{sale\.lots\.length\} lots/);
 assert.match(popupScript,/spinner\.hidden=true/);
});

async function withApp(fn){
 const dir=await mkdtemp(join(tmpdir(),'import-extension-'));let studies=0;
 const handler=createApplication({dataDir:dir,listSales:async()=>[{url:credit,date:'2026-12-05',category:'HORLOGERIE'}],study:async()=>{studies++;throw Error('must not study')}});
 const server=createServer(handler);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{await fn(`http://127.0.0.1:${server.address().port}`,()=>studies,dir)}finally{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true})}
}
const origin='chrome-extension://abcdefghijklmnopabcdefghijklmnop';
async function importSale(base,lots,saleUrl,headers={},saleEvidence=evidence(saleUrl)){
 return fetch(base+'/favorites/from-extension',{method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify({source:'https://www.interencheres.com/compte/favoris/',saleUrl,saleEvidence,lots})});
}

test('extension sends one selected sale directly; other sales, orders and studies stay untouched',async()=>{
 await withApp(async(base,studies)=>{
  const preflight=await fetch(base+'/favorites/from-extension',{method:'OPTIONS',headers:{origin,'access-control-request-method':'POST','access-control-request-headers':'content-type'}});
  assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),origin);
  const r=await importSale(base,[lot(a,11,1002),lot(a,12,1003)],a);
  assert.equal(r.status,200);assert.equal(r.headers.get('access-control-allow-origin'),origin);
  assert.equal(load(await(await fetch(base)).text())('.favorite-batch').length,0);
  const page=load(await(await fetch(base+'/?imported='+encodeURIComponent(a))).text());
  assert.equal(page('.favorite-batch').length,1);
  assert.equal(page(`button[data-batch-sale="${credit}"]`).attr('data-batch-lots'),'1002,1003');
  assert.equal(page('table[aria-label="Tableau des études"] tbody tr').length,0);assert.equal(studies(),0);
  assert.equal((await importSale(base,[lot(a,11,1002)],a)).status,200);
  assert.equal((await importSale(base,[lot(b,13,152)],b,{},evidence(b,'https://www.interencheres.com/commissaire-priseur/cap-encheres-451'))).status,422);
  assert.equal((await importSale(base,[lot(a,14,224)],a,{}, {...evidence(a),date:'2026-12-06'})).status,422);
  assert.equal(load(await(await fetch(base+'/?imported='+encodeURIComponent(a))).text())('button[data-batch-sale]').attr('data-batch-lots'),'1002,1003');
 });
});

test('verified reimport upgrades an older favorite without losing its identity',async()=>{
 await withApp(async(base,_studies,dir)=>{
  const old=parseFavorites(JSON.stringify({source:'https://www.interencheres.com/compte/favoris/',lots:[lot(a,11,221)]}))[0];
  const store=fileStudyStore(join(dir,'favorites'));
  assert.equal(await store.put(old.id,old),true);
  assert.equal((await importSale(base,[lot(a,11,221)],a)).status,200);
  assert.deepEqual(await store.get(old.id),{...old,creditSaleUrl:credit});
  assert.equal(load(await(await fetch(base+'/?imported='+encodeURIComponent(a))).text())(`button[data-batch-sale="${credit}"]`).attr('data-batch-lots'),'221');
 });
});

test('extension endpoint refuses foreign origin, wrong sale, mixed page and malformed lots without storing them',async()=>{
 await withApp(async base=>{
  assert.equal((await importSale(base,[lot(a,11,1002)],a,{origin:'https://attacker.example'})).status,403);
  assert.equal((await importSale(base,[lot(b,13,152)],a)).status,422);
  const mixed=await fetch(base+'/favorites/from-extension',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({source:a+'?segment=interests',saleUrl:a,lots:[lot(a,11,1002)]})});
  assert.equal(mixed.status,422);
  assert.equal((await importSale(base,[{url:a+'lot-11.html?token=secret',number:1002}],a)).status,422);
  assert.equal((await importSale(base,[lot(a,12,1003)],a,{}, {...evidence(a),title:'BIJOUX'})).status,422);
  assert.equal(load(await(await fetch(base)).text())('.favorite-batch').length,0);
 });
});
