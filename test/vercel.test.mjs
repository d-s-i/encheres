import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {blobStudyStore} from '../src/blob-study-store.mjs';
import {createApplication} from '../src/app.mjs';

const id='a'.repeat(64);
test('private blob store lists pages, reads, rejects duplicates and deletes',async()=>{
 const items=new Map();class BlobNotFoundError extends Error{}
 const calls=[];
 const sdk={BlobNotFoundError,
  async head(path){calls.push(['head',path]);if(!items.has(path))throw new BlobNotFoundError();return {pathname:path}},
  async put(path,data,options){calls.push(['put',path,options]);assert.equal(options.access,'private');assert.equal(options.addRandomSuffix,false);if(items.has(path))throw Error('overwrite');items.set(path,JSON.parse(data))},
  async get(path,options){calls.push(['get',path,options]);assert.equal(options.access,'private');assert.equal(options.useCache,false);return items.has(path)?{statusCode:200,stream:new Response(JSON.stringify(items.get(path))).body}:null},
  async list({cursor,prefix}){assert.equal(prefix,'studies/');return cursor?{blobs:[{pathname:`studies/${id}.json`}],hasMore:false}:{blobs:[{pathname:'studies/invalid.json'}],hasMore:true,cursor:'next'}},
  async del(path){calls.push(['del',path]);items.delete(path)}
 };
 const store=blobStudyStore(sdk);assert.equal(await store.has(id),false);assert.equal(await store.get(id),null);
 assert.equal(await store.put(id,{id,number:268}),true);assert.equal(await store.put(id,{id,number:123}),false);
 assert.deepEqual(await store.list(),[{id,number:268}]);assert.deepEqual(await store.get(id),{id,number:268});
 assert.equal(await store.delete(id),true);assert.equal(await store.delete(id),false);
 assert.ok(calls.some(([name])=>name==='del'));
});

test('favorites in private Blob use their own prefix and never leak into study listings',async()=>{
 const id='b'.repeat(64),items=new Map();class BlobNotFoundError extends Error{}
 const sdk={BlobNotFoundError,
  async head(path){if(!items.has(path))throw new BlobNotFoundError()},
  async put(path,data,options){assert.equal(options.access,'private');items.set(path,data)},
  async get(path){return items.has(path)?{statusCode:200,stream:new Response(items.get(path)).body}:null},
  async list({prefix}){return {blobs:[...items.keys()].filter(path=>path.startsWith(prefix)).map(path=>({pathname:path})),hasMore:false}}
 };
 const favorites=blobStudyStore(sdk,{prefix:'favorites/'}),studies=blobStudyStore(sdk);
 assert.equal(await favorites.put(id,{id,number:1002}),true);
 assert.deepEqual(await favorites.list(),[{id,number:1002}]);
 assert.deepEqual(await studies.list(),[]);
});

test('Vercel-style parsed POST body works without auth; cross-origin POST remains forbidden',async()=>{
 const store={list:async()=>[],get:async()=>null,has:async()=>false,put:async()=>true,delete:async()=>false};
 const handler=createApplication({store,study:async()=>({watches:[],missing:[1]})});
 // Vercel supplies a pre-parsed request.body; the raw request stream is not required.
 const server=await new Promise(resolve=>{const s=createServer((req,res)=>{if(req.url==='/studies')req.body={saleUrl:'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/261205000/',number:'1'};handler(req,res)});s.listen(0,'127.0.0.1',()=>resolve(s))});
 const url=`http://127.0.0.1:${server.address().port}`;
 try{
  assert.equal((await fetch(url)).status,200);
  assert.equal((await fetch(url+'/app.css')).status,200);
  assert.equal((await fetch(url+'/studies/'+id)).status,404);
  const body=new URLSearchParams({saleUrl:'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/261205000/',number:'1'});
  const headers={Origin:`https://127.0.0.1:${server.address().port}`,'Content-Type':'application/x-www-form-urlencoded'};
  assert.equal((await fetch(url+'/studies',{method:'POST',headers,body})).status,422);
  assert.equal((await fetch(url+'/studies',{method:'POST',headers:{...headers,Origin:'https://attacker.example'},body})).status,403);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
