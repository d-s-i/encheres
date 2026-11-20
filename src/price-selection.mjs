import { comparable, differences } from './price-matching.mjs';

const mean = values => values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length * 100) / 100 : null;

function period(asOf) {
  const end = new Date(`${asOf}T00:00:00Z`);
  if (Number.isNaN(end.getTime()) || end.toISOString().slice(0, 10) !== asOf) throw new Error('Date d’analyse invalide : utiliser AAAA-MM-JJ.');
  const start = new Date(end);
  start.setUTCFullYear(start.getUTCFullYear() - 5);
  return {start, end};
}

function datedSale(sale, watch, {start, end}) {
  const date = new Date(`${sale.date}T00:00:00Z`);
  return Boolean(sale.url && sale.url !== watch.source && !Number.isNaN(date.getTime()) && date >= start && date <= end);
}

const validRate = rate => Number.isFinite(rate) && rate >= 0;
function documentedFees(fees) {
  return fees && validRate(fees.buyerPercent) && validRate(fees.livePercent) && fees.source;
}

function pricedSale(watch, sale, feeForSale) {
  const fees = feeForSale(sale);
  const valid = documentedFees(fees);
  return {
    ...sale,
    onlineCost: valid ? Math.round(sale.hammerPrice * (1 + (fees.buyerPercent + fees.livePercent) / 100) * 100) / 100 : null,
    buyerPercent: valid ? fees.buyerPercent : null,
    livePercent: valid ? fees.livePercent : null,
    feeSource: valid ? fees.source : null,
    differences: differences(watch, sale),
  };
}

function eligibleSale(watch,sale,window,seen) {
  if (!datedSale(sale,watch,window) || seen.has(sale.url)) return false;
  if (!Number.isFinite(sale.hammerPrice) || sale.hammerPrice <= 0 || !comparable(watch,sale)) return false;
  seen.add(sale.url);
  return true;
}

export function selectHistoricalSales(watch, candidates, asOf, feeForSale) {
  const window = period(asOf), seen = new Set();
  const sales = candidates.filter(s=>eligibleSale(watch,s,window,seen)).map(s => pricedSale(watch, s, feeForSale));
  const amounts = sales.flatMap(s => s.onlineCost === null ? [] : [s.onlineCost]);
  return { status: !amounts.length ? 'unavailable' : sales.length === amounts.length ? 'available' : 'partial', average: mean(amounts), count: amounts.length, sales };
}

function frenchAvailable(offer) {
  return Boolean(offer.id && offer.sellerCountry === 'FR' && offer.available);
}
function eligibleOffer(watch, offer) {
  if (!frenchAvailable(offer)) return false;
  if (offer.productType && offer.productType !== 'Watch_Wristwatch') return false;
  return validOfferPrice(offer) && comparable(watch, offer);
}
function validOfferPrice(offer) {
  return offer.currency === 'EUR' && Number.isFinite(offer.price) && offer.price > 0;
}

function sampleStatus(count, sample) {
  const limited = sample && sample.inspectedPages < sample.totalPages;
  if (!count) return limited ? 'sample_empty' : 'unavailable';
  if (count < 3) return 'partial';
  return limited ? 'sample' : 'available';
}

export function selectOffers(watch, candidates) {
  const seen = new Set();
  const offers = candidates.filter(o => {
    if (!eligibleOffer(watch, o) || seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  }).sort((a,b) => a.price - b.price || a.id - b.id).slice(0,3).map(o => ({...o,differences:differences(watch,o)}));
  const sample = candidates.sample ?? null;
  return { status:sampleStatus(offers.length,sample), average:mean(offers.map(o=>o.price)), count:offers.length, offers, sample, priceKind:'prix demandés hors port' };
}
