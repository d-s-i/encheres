// Browser driver uses only visible DOM actions and CDP network interception for captured public images.
import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:net';
import {resolve} from 'node:path';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function freePort(){const s=createServer();await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));const port=s.address().port;await new Promise(resolve=>s.close(resolve));return port}
export {freePort};
export async function openBrowser(appUrl,work,{images,blocked=[]}={}){
 const debug=await freePort(),args=['--headless','--no-sandbox','--disable-gpu','--disable-extensions','--disable-dev-shm-usage','--no-first-run',`--user-data-dir=${resolve(work,'chrome')}`,`--remote-debugging-port=${debug}`,'--window-size=1357,698',appUrl];
 const proc=spawn('chromium',args,{stdio:'ignore'});let tab;
 for(let i=0;i<80;i++){
  try{const tabs=await(await fetch(`http://127.0.0.1:${debug}/json`,{signal:AbortSignal.timeout(1000)})).json();tab=tabs.find(x=>x.url?.startsWith(appUrl));if(tab)break}catch{}
  if(proc.exitCode!==null)throw Error('Chromium exited before browser preflight');await wait(150);
 }
 if(!tab)throw Error('Chromium DevTools tab unavailable');
 const ws=new WebSocket(tab.webSocketDebuggerUrl),waiting=new Map(),imageCalls=[],blockedSet=new Set(blocked);let next=0;
 await new Promise((ok,fail)=>{ws.onopen=ok;ws.onerror=fail});
 const rpc=(method,params={})=>new Promise((ok,fail)=>{const id=++next;waiting.set(id,{ok,fail});ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(waiting.delete(id))fail(Error('Browser CDP timeout: '+method))},12000)});
 ws.onmessage=event=>{const msg=JSON.parse(event.data);
  if(msg.id&&waiting.has(msg.id)){const cb=waiting.get(msg.id);waiting.delete(msg.id);if(msg.error)cb.fail(Error(`${msg.error.message} (${msg.error.code})`));else cb.ok(msg.result);return}
  if(msg.method==='Fetch.requestPaused'){
   const url=msg.params.request.url,fixture=images.get(url),status=blockedSet.has(url)||!fixture?404:200;
   imageCalls.push({url,status});
   const handle=async()=>rpc('Fetch.fulfillRequest',{requestId:msg.params.requestId,responseCode:status,responseHeaders:[{name:'Content-Type',value:status===200?'image/jpeg':'text/plain'}],body:status===200?(await readFile(fixture)).toString('base64'):Buffer.from('Image indisponible').toString('base64')});
   handle().catch(()=>{});
  }
 };
 await rpc('Fetch.enable',{patterns:[{urlPattern:'https://*',requestStage:'Request'}]});
 const evaluate=async expression=>{const response=await rpc('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(response.exceptionDetails)throw Error(response.exceptionDetails.text);return response.result.value};
 const inspect=()=>evaluate('({url:location.href,path:location.pathname,text:document.body.innerText,html:document.documentElement.outerHTML,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,tableWidth:document.querySelector(".table-wrap table")?.getBoundingClientRect().width,containerWidth:document.querySelector(".table-wrap")?.getBoundingClientRect().width})');
 const until=async(predicate,label,ms=75000)=>{const start=Date.now();while(Date.now()-start<ms){try{const state=await inspect();if(predicate(state))return state}catch{}await wait(180)}throw Error('Browser user action timed out: '+label)};
 const navigate=async path=>{await rpc('Page.navigate',{url:new URL(path,appUrl).href});return until(s=>s.path===path&&s.html.includes('</html>'),'navigation '+path,18000)};
 const submit=async(saleUrl,number)=>{await navigate('/');await evaluate(`(()=>{const f=document.querySelector('main>form');f.elements.saleUrl.value=${JSON.stringify(saleUrl)};f.elements.number.value=${JSON.stringify(String(number))};f.requestSubmit()})()`);return until(s=>s.path.startsWith('/studies')&&s.text.includes('Lot '),'submit '+number)};
 const remove=async number=>{await navigate('/');await evaluate(`(()=>{const row=document.querySelector('tr[data-lot=${JSON.stringify(String(number))}]');if(!row)throw Error('lot row missing');row.querySelector('form').requestSubmit()})()`);return until(s=>s.path==='/'&&!s.html.includes(`data-lot="${number}"`),'delete '+number)};
 const screenshot=async file=>{const {data}=await rpc('Page.captureScreenshot',{format:'png'});await writeFile(file,Buffer.from(data,'base64'))};
 const close=async()=>{ws.close();proc.kill();await Promise.race([new Promise(resolve=>proc.once('exit',resolve)),wait(1500)])};
 return {proc,images,blockedSet,imageCalls,rpc,evaluate,inspect,until,navigate,submit,remove,screenshot,close};
}
