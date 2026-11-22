import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {load} from 'cheerio';
import {home} from '../src/app-view.mjs';

test('loading panel describes work without inventing a progress percentage',()=>{
 const $=load(home([]));
 assert.equal($('#study-form[action="/studies"][method="post"]').length,1);
 assert.equal($('#study-loading[role="status"][hidden]').length,1);
 assert.match($('#study-loading').text(),/catalogue et comparaison des prix/);
 assert.match($('#study-loading').text(),/plusieurs minutes/);
 assert.doesNotMatch($('#study-loading').text(),/%/);
});

test('submission shows an elapsed-time overlay; double submit is prevented; back navigation resets',async()=>{
 const script=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const formEvents={},windowEvents={};let tick,now=0,cleared=false;
 const button={disabled:false},elapsed={textContent:'Temps écoulé : 0 s'},loading={hidden:true};
 const form={querySelector:()=>button,addEventListener:(name,fn)=>{formEvents[name]=fn}};
 const document={querySelector:selector=>({'#study-form':form,'#study-loading':loading,'#study-elapsed':elapsed})[selector],querySelectorAll:()=>[]};
 const window={addEventListener:(name,fn)=>{windowEvents[name]=fn}};
 runInNewContext(script,{document,window,Date:{now:()=>now},setInterval:fn=>{tick=fn;return 1},clearInterval:()=>{cleared=true}});
 let prevented=false;formEvents.submit({preventDefault:()=>{prevented=true}});
 assert.equal(loading.hidden,false);assert.equal(button.disabled,true);assert.equal(prevented,false);
 now=65000;tick();assert.equal(elapsed.textContent,'Temps écoulé : 1 min 5 s');
 formEvents.submit({preventDefault:()=>{prevented=true}});assert.equal(prevented,true);
 windowEvents.pageshow();assert.equal(loading.hidden,true);assert.equal(button.disabled,false);assert.equal(cleared,true);
});
