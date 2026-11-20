import { comparable } from './price-matching.mjs';
import { packetImages } from './offer-images.mjs';

const base = 'https://api.pckt.sh/v1/chrono24/';
let lastRequest = 0;
const pause = async () => {
  const wait = Math.max(0, lastRequest + 1100 - Date.now());
  if (wait) await new Promise(resolve => setTimeout(resolve, wait));
  lastRequest = Date.now();
};

const contactCountry = seller => seller?.contactInfo?.countryCode;
function sellerCountry(product) {
  const seller = product.seller ?? {};
  return contactCountry(seller.dealer) ?? contactCountry(seller.privateSeller);
}
const attributes = product => (product.attributeGroups ?? []).flatMap(group => group.attributes ?? []);
const isBracelet = attribute => /braceletMaterial|strapMaterial|bracelet/i.test(attribute.name ?? '') || /mati[eè]re du bracelet/i.test(attribute.label ?? '');
function braceletMaterial(product) {
  return attributes(product).find(isBracelet)?.value?.toLowerCase() ?? null;
}
function boxPresence(scope) {
  if (scope === 'WatchOnly') return 'absent';
  return /Box/i.test(scope ?? '') ? 'présent' : 'non renseigné';
}
function inStock(product) {
  return product.sold === false && product.inactive === false && product.reserved === false && /en stock|in stock/i.test(product.availabilityText ?? '');
}
function productPrice(product) {
  const price = product.price ?? {};
  return {price:Number(price.value ?? price.amount),currency:price.currency};
}
function productName(product) {
  return {brand:product.manufacturer?.name,model:modelName(product),reference:product.referenceNumber || null};
}
function modelName(product) {
  return `${product.model?.modelName ?? ''} ${product.title ?? ''}`.trim();
}
function productCondition(product) {
  return product.topLevelAttributes?.find(attribute=>attribute.name==='condition')?.value ?? null;
}
function productUrl(product) {
  return product.url?.startsWith('https://www.chrono24.fr/') ? product.url : null;
}
function fromProduct(product) {
  return {id:product.id,...productPrice(product),...productName(product),sellerCountry:sellerCountry(product),available:inStock(product),bracelet:braceletMaterial(product),box:boxPresence(product.scopeOfDelivery),condition:productCondition(product),url:productUrl(product),images:packetImages(product.images)};
}

async function payloadFrom(response) {
  if (!response.ok) throw new Error(`Packet inaccessible (${response.status ?? 'erreur'}).`);
  let json;
  try { json = await response.json(); } catch { throw new Error('Packet inaccessible : réponse illisible.'); }
  if (!json?.payload) throw new Error('Packet inaccessible : réponse incomplète.');
  return json.payload;
}
async function packetGet(path, params, apiKey, fetchImpl) {
  const url = new URL(path, base);
  url.search = new URLSearchParams(params).toString();
  let response;
  try { response = await fetchImpl(url, {headers:{Authorization:`Bearer ${apiKey}`}}); }
  catch { throw new Error('Packet inaccessible : erreur réseau.'); }
  return payloadFrom(response);
}

function validPage(data) {
  return Array.isArray(data.listings) && Number.isSafeInteger(data.paging?.totalPages) && data.paging.totalPages >= 1;
}
function checkedPage(data, previousTotal) {
  if (!validPage(data)) throw new Error('Packet : pagination incomplète.');
  if (!stableTotal(data.paging.total,previousTotal)) throw new Error('Packet : résultats instables ou incomplets.');
  return data.paging;
}
function stableTotal(total,previous) {
  return Number.isSafeInteger(total) && total >= 0 && (previous === null || previous === total);
}
function availableListing(listing) {
  return listing.listingStatus === 'Available' && listing.watchStockInfo === 'InStock';
}
function frenchListing(listing) {
  return listing?.location?.countryCode === 'FR' && listing.listingId;
}
function addCandidates(entries, candidates) {
  for (const entry of entries) {
    const listing = entry.listing;
    if (frenchListing(listing) && availableListing(listing) && !candidates.has(listing.listingId)) candidates.set(listing.listingId, listing);
  }
}

async function searchPages(query, {pageSize,maxPages,apiKey,fetchImpl,pace}) {
  const common = {currency:'EUR',language:'fr_FR'}, candidates = new Map();
  let totalPages = 1, totalListings = null, inspectedListings = 0, inspectedPages = 0;
  for (let page = 1; page <= Math.min(totalPages,maxPages); page++) {
    await pace();
    const data = await packetGet('search',{query,limit:String(pageSize),page:String(page),...common},apiKey,fetchImpl);
    const paging = checkedPage(data, totalListings);
    totalPages = paging.totalPages;
    totalListings = paging.total;
    inspectedListings += data.listings.length;
    inspectedPages++;
    addCandidates(data.listings,candidates);
  }
  return {candidates,common,sample:{inspectedPages,inspectedListings,totalPages,totalListings,query}};
}

function completeOffer(offer) {
  return Boolean(offer.sellerCountry && offer.url && offer.brand && offer.model && Number.isFinite(offer.price));
}
function checkedProduct(listing, data) {
  if (data.id !== listing.listingId) throw new Error('Packet : fiche différente de l’annonce demandée.');
  if (data.productType !== 'Watch_Wristwatch') return null;
  const offer = fromProduct(data);
  if (!completeOffer(offer)) throw new Error('Packet : fiche incomplète, classement non vérifiable.');
  return offer;
}
async function verifiedListing(watch, listing, common, {apiKey,fetchImpl,pace}) {
  await pace();
  const data = await packetGet('product',{id:String(listing.listingId),...common},apiKey,fetchImpl);
  const offer = checkedProduct(listing,data);
  return offer && offer.sellerCountry === 'FR' && offer.available && comparable(watch,offer) ? offer : null;
}
async function verifiedProducts(watch, candidates, common, options) {
  const products = [];
  for (const listing of [...candidates.values()].sort((a,b) => Number(a.price?.amount) - Number(b.price?.amount))) {
    const offer = await verifiedListing(watch,listing,common,options);
    if (offer) products.push(offer);
  }
  return products;
}

export async function searchPacket(watch, { apiKey = process.env.PCKT_API_KEY, fetchImpl = fetch, pageSize = 50, maxPages = 3, maxProducts = 100, pace = pause } = {}) {
  if (!apiKey) throw new Error('Packet inaccessible : clé PCKT_API_KEY absente.');
  const query = `${watch.brand} ${watch.model}`;
  const {candidates,common,sample} = await searchPages(query,{pageSize,maxPages,apiKey,fetchImpl,pace});
  if (candidates.size > maxProducts) throw new Error('Packet : trop de fiches françaises à vérifier, couverture non vérifiable.');
  const products = await verifiedProducts(watch,candidates,common,{apiKey,fetchImpl,pace});
  products.sample = sample;
  return products;
}
