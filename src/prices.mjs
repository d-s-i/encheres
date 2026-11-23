import { selectHistoricalSales, selectOffers } from './price-selection.mjs';
import { searchCreditMunicipal } from './price-credit.mjs';
import { searchPacket } from './price-packet.mjs';
import { verifiedFees, verifiedTargetFees } from './price-fees.mjs';
import { calculateBidCeiling } from './price-ceiling.mjs';

export { selectHistoricalSales, selectOffers, searchCreditMunicipal, searchPacket, calculateBidCeiling };

function targetSaleDate(watch) {
  const match = watch.saleUrl?.match(/\/catalogue-des-ventes\/(?:ventes-passees\/)?(\d{2})(\d{2})(\d{2})\d{3}\//);
  return match ? `20${match[1]}-${match[2]}-${match[3]}` : null;
}

function unavailable(reason) {
  return {status:'unavailable',amount:null,reason};
}
async function targetFees(watch,lookup) {
  try { return await lookup(watch); } catch { return null; }
}
function pricedCeiling(chrono,fees) {
  try { return {status:chrono.status,...calculateBidCeiling(chrono.average,fees),sourceAverage:chrono.average,sourceCount:chrono.count,...(chrono.sample ? {sample:chrono.sample} : {})}; }
  catch { return unavailable('target_fees_unverified'); }
}
function missingPrice(chrono) {
  if (chrono.status === 'inaccessible') return {status:'inaccessible',amount:null,reason:'chrono_inaccessible'};
  if (chrono.average === null) return unavailable(chrono.status === 'sample_empty' ? 'chrono_unavailable_sample' : 'chrono_unavailable');
  return null;
}
async function bidCeiling(watch, chrono, asOf, targetFeeLookup) {
  const absent = missingPrice(chrono);
  if (absent) return absent;
  const saleDate = targetSaleDate(watch);
  if (saleDate && saleDate <= asOf) return unavailable('sale_not_upcoming');
  const fees = await targetFees(watch,targetFeeLookup);
  return fees ? pricedCeiling(chrono,fees) : unavailable('target_fees_unverified');
}

export async function compareWatch(watch, {asOf = new Date().toISOString().slice(0,10),cmSearch = searchCreditMunicipal,feeLookup = verifiedFees,offerSearch = searchPacket,targetFeeLookup = verifiedTargetFees} = {}) {
  if(!watch.brand?.trim()||!watch.model?.trim())return {
    lot:watch.number,brand:watch.brand,model:watch.model,reference:watch.reference,asOf,
    credit:{status:'unavailable',average:null,count:0,sales:[],reason:'model_unavailable'},
    chrono:{status:'unavailable',average:null,count:0,offers:[],reason:'model_unavailable',priceKind:'prix demandés hors port'},
    ceiling:unavailable('model_unavailable'),
  };
  let credit,chrono;
  try {
    const sales = await cmSearch(watch);const fees = new Map();
    for(const s of sales) { try { fees.set(s.url,await feeLookup(s)); } catch { fees.set(s.url,null); } }
    credit = selectHistoricalSales(watch,sales,asOf,s=>fees.get(s.url));
  } catch (e) { credit = {status:'inaccessible',average:null,count:null,sales:[],reason:e.message}; }
  try { chrono = selectOffers(watch,await offerSearch(watch)); }
  catch (e) { chrono = {status:'inaccessible',average:null,count:null,offers:[],reason:e.message,priceKind:'prix demandés hors port'}; }
  const ceiling = await bidCeiling(watch,chrono,asOf,targetFeeLookup);
  return {lot:watch.number,brand:watch.brand,model:watch.model,reference:watch.reference,asOf,credit,chrono,ceiling};
}
