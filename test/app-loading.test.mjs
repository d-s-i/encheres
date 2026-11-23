import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {load} from 'cheerio';
import {home} from '../src/app-view.mjs';

test('loading panel describes work without inventing a progress percentage',()=>{
 const $=load(home([]));
 assert.equal($('#study-form[action="/studies"][method="post"]').length,1);
 assert.equal($('#manual-study[hidden] #study-form').length,1);
 assert.equal($('#analysis-modal[hidden][role="dialog"] #study-loading[role="status"][hidden]').length,1);
 assert.match($('#study-loading').text(),/catalogue et comparaison des prix/);
 assert.match($('#study-loading').text(),/plusieurs minutes/);
 assert.doesNotMatch($('#study-loading').text(),/%/);
});

test('new analysis button offers import or a single lot without launching work',async()=>{
 const script=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const events={},start={hidden:false,addEventListener:(_type,fn)=>{events.start=fn}},choices={hidden:true},modal={hidden:true,focus:()=>{}};
 const importing={hidden:true},manual={hidden:true},studies={inert:false},nav={inert:false};
 const close={addEventListener:(_type,fn)=>{events.close=fn}};
 const imp={addEventListener:(_type,fn)=>{events.import=fn}},single={addEventListener:(_type,fn)=>{events.single=fn}};
 const back={addEventListener:(_type,fn)=>{events.back=fn}};
 const document={querySelector:selector=>({'#start-analysis':start,'#analysis-modal':modal,'#close-analysis':close,'#studies':studies,'main nav':nav,'#analysis-choices':choices,'#favorite-import':importing,'#manual-study':manual,'#choose-import':imp,'#choose-manual':single})[selector],querySelectorAll:selector=>selector==='button[data-change-analysis]'?[back]:[]};
 runInNewContext(script,{document,window:{}});
 events.start();assert.equal(modal.hidden,false);assert.equal(choices.hidden,false);assert.equal(studies.inert,true);assert.equal(nav.inert,true);
 events.import();assert.equal(importing.hidden,false);assert.equal(choices.hidden,true);
 events.back();assert.equal(importing.hidden,true);assert.equal(choices.hidden,false);
 events.single();assert.equal(manual.hidden,false);assert.equal(choices.hidden,true);
 events.close();assert.equal(modal.hidden,true);assert.equal(studies.inert,false);assert.equal(nav.inert,false);
});

test('single-lot study keeps the modal open through loading and presents a result only after the response',async()=>{
 const script=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const events={};let resolveRequest,prevented=false,now=0,cleared=false,redirect='';
 const button={disabled:false},elapsed={textContent:'Temps écoulé : 0 s'},loading={hidden:true};
 const outcome={hidden:true,textContent:''},finish={hidden:true,addEventListener:(_name,fn)=>{events.finish=fn}},detail={hidden:true,href:''};
 const sale={value:'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/261205000/'},number={value:'221'};
 const form={querySelector:selector=>({'button[type="submit"]':button,'input[name="saleUrl"]':sale,'input[name="number"]':number})[selector],addEventListener:(name,fn)=>{events[name]=fn}};
 const modal={hidden:false,focus:()=>{}},close={disabled:false,addEventListener:()=>{}};
 const document={querySelector:selector=>({'#study-form':form,'#analysis-modal':modal,'#close-analysis':close,'#study-loading':loading,'#study-elapsed':elapsed,'#manual-result':outcome,'#manual-finish':finish,'#manual-detail':detail})[selector],querySelectorAll:()=>[]};
 const window={location:{origin:'http://127.0.0.1:3000',assign:path=>{redirect=path}},addEventListener:()=>{}};
 const fetch=()=>new Promise(resolve=>{resolveRequest=resolve});
 runInNewContext(script,{document,window,fetch,URL,URLSearchParams,Date:{now:()=>now},setInterval:fn=>{events.tick=fn;return 1},clearInterval:()=>{cleared=true}});
 const running=events.submit({preventDefault:()=>{prevented=true}});
 assert.equal(prevented,true);assert.equal(modal.hidden,false);assert.equal(loading.hidden,false);assert.equal(close.disabled,true);assert.equal(button.disabled,true);
 now=65000;events.tick();assert.equal(elapsed.textContent,'Temps écoulé : 1 min 5 s');
 resolveRequest({status:200,redirected:true,url:'http://127.0.0.1:3000/studies/'+'a'.repeat(64)});await running;
 assert.equal(cleared,true);assert.equal(outcome.hidden,false);assert.match(outcome.textContent,/étude terminée/i);
 assert.equal(detail.hidden,false);assert.match(detail.href,/\/studies\/[a-f0-9]{64}$/);
 events.finish();assert.equal(redirect,'/');
});
