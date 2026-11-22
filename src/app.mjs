import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileStudyStore} from './study-store.mjs';
import {studyLots} from './lots.mjs';
import {compareWatch} from './prices.mjs';
import {readAppImages} from './app-images.mjs';
import {upcomingSales} from './upcoming-sales.mjs';
import {parseFavorites} from './favorites.mjs';

import {detail,home,layout} from './app-view.mjs';

const official='www.creditmunicipal.fr';
function saleUrl(value){
 try{const u=new URL(value);if(u.protocol!=='https:'||u.hostname!==official||!/^\/ventes-aux-encheres\/catalogue-des-ventes\/(?:ventes-passees\/)?\d{9}\/?$/.test(u.pathname))return null;return u.origin+u.pathname.replace(/\/?$/,'/')}
 catch{return null}
}

function send(res,status,body,headers={}){res.writeHead(status,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','content-security-policy':"default-src 'self'; img-src 'self' https://www.creditmunicipal.fr https://*.chrono24.com; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'",...headers});res.end(body)}
async function bodyOf(req,maxLength=10_000){
 if(req.body!==undefined){
  const data=typeof req.body==='string'?req.body:Buffer.isBuffer(req.body)?req.body.toString('utf8'):new URLSearchParams(req.body).toString();
  if(data.length>maxLength)throw Error('Formulaire trop long.');
  return new URLSearchParams(data);
 }
 let data='';for await(const chunk of req){data+=chunk;if(data.length>maxLength)throw Error('Formulaire trop long.')}return new URLSearchParams(data);
}
function sameOrigin(req){
 if(!req.headers.origin)return true;
 try {const origin=new URL(req.headers.origin);return (origin.protocol==='http:'||origin.protocol==='https:')&&origin.host===req.headers.host}
 catch{return false}
}
const key=(sale,n)=>createHash('sha256').update(`${sale}#${n}`).digest('hex');
function notFound(res){return send(res,404,layout('<h1>Page introuvable</h1>'))}
async function readStudy(res,store,id){
 const study=await store.get(id);
 return study?send(res,200,detail(study)):send(res,404,layout('<h1>Étude introuvable</h1>'));
}
async function removeStudy(res,{store,pending},id){
 if(pending.has(id))return send(res,409,layout('<h1>Analyse en cours pour ce lot</h1>'));
 if(!await store.delete(id))return send(res,404,layout('<h1>Étude introuvable</h1>'));
 return send(res,303,'',{'location':'/'});
}
function duplicate(res,id){return send(res,409,layout(`<h1>Lot déjà analysé</h1><p><a href="/studies/${id}">Voir l'étude existante</a></p>`))}
const validNumber=value=>Boolean(value)&&/^[1-9]\d*$/.test(value)&&Number.isSafeInteger(Number(value));
async function analyse(sale,number,{study,compare,images,asOf}){
 const result=await study({saleUrl:sale,numbers:[number]});
 if(!result.watches?.length)return null;
 const watch=result.watches[0],r=await compare(watch,{asOf:asOf()}),picture=await images(watch,r);
 return {watch,r,images:picture};
}
async function persistStudy(res,options,id,result){
 if(!await options.store.put(id,{id,...result}))return duplicate(res,id);
 return send(res,303,'',{'location':`/studies/${id}`});
}
async function createStudy(req,res,options){
 const form=await bodyOf(req),sale=saleUrl(form.get('saleUrl')),value=form.get('number');
 if(!sale||!validNumber(value))return send(res,422,layout('<h1>Lien de vente ou numéro de lot invalide</h1>'));
 const number=Number(value),id=key(sale,number);
 if(options.pending.has(id))return send(res,409,layout('<h1>Analyse en cours pour ce lot</h1>'));
 options.pending.add(id);
 try{
  if(await options.store.has(id))return duplicate(res,id);
  const result=await analyse(sale,number,options);
  if(!result)return send(res,422,layout('<h1>Lot introuvable dans cette vente</h1>'));
  return await persistStudy(res,options,id,result);
 }finally{options.pending.delete(id)}
}
async function getRoute(path,res,{store,favoriteStore,listSales}){
 if(path==='/app.css')return send(res,200,await readFile(new URL('../public/app.css',import.meta.url),'utf8'),{'content-type':'text/css; charset=utf-8'});
 if(path==='/app.js')return send(res,200,await readFile(new URL('../public/app.js',import.meta.url),'utf8'),{'content-type':'text/javascript; charset=utf-8'});
 if(path==='/'){
  const records=await store.list();
  let sales=null;
  try{sales=await listSales()}catch(e){console.error('Présélection des ventes indisponible :',e)}
  return send(res,200,home(records,sales,await favoriteStore.list()));
 }
 if(/^\/studies\/[a-f0-9]{64}$/.test(path))return readStudy(res,store,path.slice('/studies/'.length));
 return notFound(res);
}
const extensionOrigin=req=>/^chrome-extension:\/\/[a-p]{32}$/.test(req.headers.origin??'')?req.headers.origin:null;
function extensionHeaders(origin){return {'access-control-allow-origin':origin,'vary':'Origin','content-type':'application/json; charset=utf-8'}}
async function jsonOf(req){
 let data;
 if(req.body!==undefined)data=typeof req.body==='string'?req.body:Buffer.isBuffer(req.body)?req.body.toString('utf8'):JSON.stringify(req.body);
 else {const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>100_000)throw Error('Requête trop longue.');chunks.push(chunk)}data=Buffer.concat(chunks).toString('utf8')}
 if(Buffer.byteLength(data)>100_000)throw Error('Requête trop longue.');
 return JSON.parse(data);
}
async function importFromExtension(req,res,{favoriteStore},origin){
 let favorites,sale;
 try{
  const input=await jsonOf(req);
  favorites=parseFavorites(JSON.stringify({source:input.source,lots:input.lots}));
  sale=input.saleUrl;
  if(!favorites.length||favorites.some(f=>f.saleUrl!==sale))throw Error('Vente invalide.');
 }catch{return send(res,422,JSON.stringify({error:'Liste de favoris ou vente non vérifiable.'}),extensionHeaders(origin))}
 for(const favorite of favorites)await favoriteStore.put(favorite.id,favorite);
 return send(res,200,JSON.stringify({imported:favorites.length,complete:false}),extensionHeaders(origin));
}
async function postRoute(path,req,res,options){
 const favoriteDeletion=path.match(/^\/favorites\/([a-f0-9]{64})\/delete$/);
 if(favoriteDeletion){
  if(!await options.favoriteStore.delete(favoriteDeletion[1]))return notFound(res);
  return send(res,303,'',{'location':'/'});
 }
 const deletion=path.match(/^\/studies\/([a-f0-9]{64})\/delete$/);
 if(deletion)return removeStudy(res,options,deletion[1]);
 if(path==='/studies')return createStudy(req,res,options);
 return notFound(res);
}
async function dispatch(req,res,path,options){
 if(path==='/favorites/from-extension'){
  const origin=extensionOrigin(req);
  if(!origin)return send(res,403,JSON.stringify({error:'Extension non autorisée.'}),{'content-type':'application/json; charset=utf-8'});
  if(req.method==='OPTIONS')return send(res,204,'',{'access-control-allow-origin':origin,'access-control-allow-methods':'POST','access-control-allow-headers':'content-type','vary':'Origin'});
  return req.method==='POST'?importFromExtension(req,res,options,origin):notFound(res);
 }
 if(req.method==='POST'&&!sameOrigin(req))return send(res,403,layout('<h1>Origine du formulaire non autorisée</h1>'));
 if(req.method==='GET')return getRoute(path,res,options);
 if(req.method==='POST')return postRoute(path,req,res,options);
 return notFound(res);
}
export function createApplication({dataDir,store=fileStudyStore(dataDir),favoriteStore=fileStudyStore(join(dataDir??join(process.cwd(),'data'),'favorites')),study=studyLots,compare=compareWatch,images=readAppImages,listSales=upcomingSales,asOf=()=>new Date().toISOString().slice(0,10)}={}){
 const options={store,favoriteStore,study,compare,images,listSales,asOf,pending:new Set()};
 return async function handler(req,res){
  const path=new URL(req.url,'http://localhost').pathname;
  try{await dispatch(req,res,path,options)}
  catch(e){console.error(e);send(res,500,layout('<h1>Étude non disponible</h1>'))}
 }
}
