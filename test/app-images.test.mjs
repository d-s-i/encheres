import test from 'node:test';
import assert from 'node:assert/strict';
import {lotImages,readAppImages} from '../src/app-images.mjs';
import {packetImages} from '../src/offer-images.mjs';
import {searchPacket} from '../src/price-packet.mjs';
const sale='https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/261205000/';
const target=sale+'tag-heuer-monaco/';
const credit='https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/240615000/tag-heuer-monaco/';
const image=id=>`https://www.creditmunicipal.fr/rs:fit:200:200/app/uploads/sales/${id}/images/${id}.jpg`;
const html=id=>`<div class="lot__gallery"><img src="${image(id)}"><img src="${image(id)}"><img src="https://attacker.example/x.jpg"><img src="not-a-url"><img src="${image('wrong-id')}"></div>`;

test('official photos only belong to the fetched sale and duplicates are removed',async()=>{
 assert.deepEqual(await lotImages(target,{fetchImpl:async()=>({ok:true,url:target,text:async()=>html('261205000')})}),[image('261205000')]);
 assert.deepEqual(await lotImages(target,{fetchImpl:async()=>({ok:false,status:403})}),[]);
 assert.deepEqual(await lotImages('https://not-official.example.org/x',{fetchImpl:async()=>{throw Error('must not fetch')}}),[]);
 assert.deepEqual(await lotImages('not-a-url',{fetchImpl:async()=>{throw Error('must not fetch')}}),[]);
 assert.deepEqual(await lotImages(target,{fetchImpl:async()=>({ok:true,url:'https://attacker.example/x',text:async()=>html('261205000')})}),[]);
 assert.deepEqual(await lotImages(target,{fetchImpl:async()=>{throw Error('network down')}}),[]);
});

test('selected offers keep their verified Chrono24 images without adding nonselected products',()=>{
 const valid='https://img.chrono24.com/images/uhren/example.jpg';
 const values=[{imageResources:[{width:720,url:valid}],thumbnailUrl:'https://img.chrono24.com/thumb.jpg'},{thumbnailUrl:'https://foreign.example.org/evil.jpg'},{imageResources:[{width:720,url:valid}]}];
 assert.deepEqual(packetImages(values),[valid]);assert.deepEqual(packetImages(null),[]);
});

test('Packet product photos travel with a verified French watch offer',async()=>{
 const id=41128458,photo='https://img.chrono24.com/images/uhren/41128458.jpg';
 const watch={brand:'TAG HEUER',model:'Monaco',reference:'CAW2111',description:'Montre chronographe calibre 12'};
 const fetchImpl=async url=>({ok:true,status:200,json:async()=>new URL(url).pathname.endsWith('/search')?{payload:{paging:{total:1,totalPages:1},listings:[{listing:{listingId:id,location:{countryCode:'FR'},listingStatus:'Available',watchStockInfo:'InStock'}}]}}:{payload:{id,productType:'Watch_Wristwatch',manufacturer:{name:'TAG HEUER'},model:{modelName:'Monaco Calibre 12'},title:'Monaco chronographe',referenceNumber:'CAW2111',sold:false,inactive:false,reserved:false,availabilityText:'en stock',seller:{dealer:{contactInfo:{countryCode:'FR'}}},price:{value:3800,currency:'EUR'},url:`https://www.chrono24.fr/tagheuer/monaco--id${id}.htm`,images:[{imageResources:[{width:400,url:photo}]}]}}});
 const offers=await searchPacket(watch,{apiKey:'test-key',fetchImpl,pace:async()=>{}});
 assert.equal(offers.length,1);assert.deepEqual(offers[0].images,[photo]);
});

test('image gallery uses the selected sale and selected offers only and survives a failed photo source',async()=>{
 const offer='https://www.chrono24.fr/tagheuer/monaco--id1.htm',offerImage='https://img.chrono24.com/images/uhren/1.jpg';
 const result=await readAppImages({source:target},{credit:{sales:[{url:credit}]},chrono:{offers:[{url:offer,images:[offerImage]}]}},{fetchImpl:async url=>String(url)===target?{ok:true,url:target,text:async()=>html('261205000')}:{ok:false,status:403}});
 assert.deepEqual(result.target,[image('261205000')]);assert.deepEqual(result.credit[credit],[]);assert.deepEqual(result.offers[offer],[offerImage]);
});
