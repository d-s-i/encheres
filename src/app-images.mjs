import {load} from 'cheerio';

const official='www.creditmunicipal.fr';
function officialImage(src, saleId) {
 try { const url=new URL(src);return url.protocol==='https:' && url.hostname===official && url.pathname.includes(`/app/uploads/sales/${saleId}/images/`) ? url.href : null; }
 catch { return null; }
}
function saleId(url) { return new URL(url).pathname.match(/\/catalogue-des-ventes\/(?:ventes-passees\/)?(\d{9})\//)?.[1]; }

function officialDetailId(url) {
 try {const parsed=new URL(url);return parsed.protocol==='https:'&&parsed.hostname===official?saleId(url):null}
 catch{return null}
}
async function galleryHtml(url,fetchImpl) {
 const res=await fetchImpl(url,{redirect:'manual'});
 if(!res.ok || (res.url && new URL(res.url).hostname!==official))return null;
 return res.text();
}
function galleryImages(html,id) {
 const $=load(html);
 return [...new Set($('.lot__gallery img[src]').map((_,el)=>officialImage($(el).attr('src'),id)).get().filter(Boolean))];
}
export async function lotImages(url,{fetchImpl=fetch}={}) {
 const id=officialDetailId(url);
 if(!id)return [];
 try {const html=await galleryHtml(url,fetchImpl);return html===null?[]:galleryImages(html,id)}
 catch{return []}
}
export async function readAppImages(watch,comparison,{fetchImpl=fetch}={}) {
 const urls=[watch.source,...comparison.credit.sales.map(s=>s.url)];
 const results=await Promise.all(urls.map(url=>lotImages(url,{fetchImpl})));
 return {target:results[0],credit:Object.fromEntries(comparison.credit.sales.map((s,i)=>[s.url,results[i+1]])),offers:Object.fromEntries(comparison.chrono.offers.map(o=>[o.url,o.images??[]]))};
}
