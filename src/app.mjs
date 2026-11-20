import {createHash,timingSafeEqual} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileStudyStore} from './study-store.mjs';
import {studyLots} from './lots.mjs';
import {compareWatch} from './prices.mjs';
import {readAppImages} from './app-images.mjs';

import {detail,home,layout} from './app-view.mjs';

const official='www.creditmunicipal.fr';
function saleUrl(value){
 try{const u=new URL(value);if(u.protocol!=='https:'||u.hostname!==official||!/^\/ventes-aux-encheres\/catalogue-des-ventes\/(?:ventes-passees\/)?\d{9}\/$/.test(u.pathname))return null;return u.origin+u.pathname}
 catch{return null}
}

function send(res,status,body,headers={}){res.writeHead(status,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','content-security-policy':"default-src 'self'; img-src 'self' https://www.creditmunicipal.fr https://*.chrono24.com; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'",...headers});res.end(body)}
async function bodyOf(req){
 if(req.body!==undefined){
  const data=typeof req.body==='string'?req.body:Buffer.isBuffer(req.body)?req.body.toString('utf8'):new URLSearchParams(req.body).toString();
  if(data.length>10_000)throw Error('Formulaire trop long.');
  return new URLSearchParams(data);
 }
 let data='';for await(const chunk of req){data+=chunk;if(data.length>10_000)throw Error('Formulaire trop long.')}return new URLSearchParams(data);
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
async function getRoute(path,res,{store}){
 if(path==='/app.css')return send(res,200,await readFile(new URL('../public/app.css',import.meta.url),'utf8'),{'content-type':'text/css; charset=utf-8'});
 if(path==='/app.js')return send(res,200,await readFile(new URL('../public/app.js',import.meta.url),'utf8'),{'content-type':'text/javascript; charset=utf-8'});
 if(path==='/')return send(res,200,home(await store.list()));
 if(/^\/studies\/[a-f0-9]{64}$/.test(path))return readStudy(res,store,path.slice('/studies/'.length));
 return notFound(res);
}
async function postRoute(path,req,res,options){
 const deletion=path.match(/^\/studies\/([a-f0-9]{64})\/delete$/);
 if(deletion)return removeStudy(res,options,deletion[1]);
 if(path==='/studies')return createStudy(req,res,options);
 return notFound(res);
}
async function dispatch(req,res,path,options){
 if(req.method==='POST'&&!sameOrigin(req))return send(res,403,layout('<h1>Origine du formulaire non autorisée</h1>'));
 if(req.method==='GET')return getRoute(path,res,options);
 if(req.method==='POST')return postRoute(path,req,res,options);
 return notFound(res);
}
function authorized(req,{username,password}){
 const value=req.headers.authorization;
 if(typeof value!=='string'||!value.startsWith('Basic ')||value.length>2048)return false;
 try{
  const candidate=Buffer.from(value.slice(6),'base64');
  const expected=Buffer.from(`${username}:${password}`);
  return candidate.length===expected.length&&timingSafeEqual(candidate,expected);
 }catch{return false}
}
export function createApplication({dataDir,store=fileStudyStore(dataDir),study=studyLots,compare=compareWatch,images=readAppImages,asOf=()=>new Date().toISOString().slice(0,10),auth}={}){
 if(auth&&(!auth.username||!auth.password))throw Error('Identifiants APP_USER et APP_PASSWORD requis');
 const options={store,study,compare,images,asOf,pending:new Set()};
 return async function handler(req,res){
  if(auth&&!authorized(req,auth))return send(res,401,'Authentification requise',{'www-authenticate':'Basic realm="Études montres", charset="UTF-8"'});
  const path=new URL(req.url,'http://localhost').pathname;
  try{await dispatch(req,res,path,options)}
  catch(e){console.error(e);send(res,500,layout('<h1>Étude non disponible</h1>'))}
 }
}
