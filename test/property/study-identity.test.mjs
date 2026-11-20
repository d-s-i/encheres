import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApplication} from '../../src/app.mjs';

const sales=['261205000','261206000','261207000'].map(id=>`https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/${id}/`);

test('one saved study per sale and lot survives duplicates, deletion and re-creation across distinct identities',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'app-identity-'));
 let studies=0,phase=0;
 const handler=createApplication({dataDir:dir,asOf:()=>phase?'2026-11-16':'2026-11-15',
  study:async({saleUrl,numbers})=>{studies++;return {watches:[{number:numbers[0],saleUrl,source:`${saleUrl}lot-${numbers[0]}/`,brand:'TAG HEUER',model:'Monaco',reference:'CAW2111',box:'absent',bracelet:'cuir'}],missing:[]}},
  compare:async(watch,{asOf})=>({lot:watch.number,brand:watch.brand,model:watch.model,reference:watch.reference,asOf,credit:{status:'unavailable',average:null,count:0,sales:[]},chrono:{status:'unavailable',average:null,count:0,offers:[],sample:null},ceiling:{status:'unavailable',amount:null,reason:'chrono_unavailable'}}),
  images:async()=>({target:[],credit:{},offers:{}}),
 });
 const server=await new Promise(resolve=>{const s=createServer(handler);s.listen(0,'127.0.0.1',()=>resolve(s))});
 const base=`http://127.0.0.1:${server.address().port}`;
 const submit=(saleUrl,number)=>fetch(base+'/studies',{method:'POST',redirect:'manual',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({saleUrl,number:String(number)})});
 try{
  const paths=new Map();
  for(const saleUrl of sales)for(let number=1;number<=9;number++){
   const response=await submit(saleUrl,number);
   assert.equal(response.status,303);
   const path=response.headers.get('location');
   assert.ok(/^\/studies\/[a-f0-9]{64}$/.test(path));
   assert.ok(![...paths.values()].includes(path),'distinct sale/lot identities collided');
   paths.set(`${saleUrl}#${number}`,path);
  }
  assert.equal(paths.size,27);assert.equal(studies,27);
  for(const saleUrl of sales){
   const duplicate=await submit(saleUrl,5);
   assert.equal(duplicate.status,409);assert.ok((await duplicate.text()).includes(paths.get(`${saleUrl}#5`)));
  }
  assert.equal(studies,27,'a duplicate accessed the source');
  const selected=`${sales[1]}#5`,path=paths.get(selected);
  assert.equal((await fetch(base+path+'/delete',{method:'POST',redirect:'manual'})).status,303);
  assert.equal((await fetch(base+path)).status,404);
  for(const saleUrl of [sales[0],sales[2]])assert.equal((await fetch(base+paths.get(`${saleUrl}#5`))).status,200);
  phase=1;
  const recreated=await submit(sales[1],5);
  assert.equal(recreated.status,303);assert.equal(recreated.headers.get('location'),path);
  assert.equal(studies,28);
  const newPage=await(await fetch(base+path)).text();assert.match(newPage,/2026-11-16/);assert.doesNotMatch(newPage,/2026-11-15/);
  const grid=await(await fetch(base)).text();assert.equal((grid.match(/<tr data-lot=/g)||[]).length,27);
 }finally{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true})}
});
